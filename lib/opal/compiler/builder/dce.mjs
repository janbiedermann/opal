// EXPERIMENTAL dead code elimination: removes method and constant
// definitions that nothing in the program calls. Port of
// lib/opal/builder/post_processor/dce.rb and dce/call_tree.rb.
//
// Names are strings; a call can also be a RegExp, which keeps every
// definition it matches.
import { Directive, Fragment } from "../fragment.mjs";

const toArray = (x) => (Array.isArray(x) ? x : x instanceof Set ? [...x] : [x]);

// Regexp.union of the operator names, in this order
const OPERATOR = ["**", "<<", ">>", "<=", ">=", "<=>", "===", "==", "!=", "=~", "!~", "+@", "-@", "[]=", "[]", "!", "+", "-", "*", "/", "%", "&", "|", "^", "~", "<", ">"]
  .map((op) => op.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|");
const METHOD_NAME = String.raw`(?:[\p{L}_][\p{L}\p{N}_]*(?:[!?=])?|${OPERATOR})`;
const OPAL_IDENT = String.raw`[a-zA-Z_][a-zA-Z0-9_]*`;
const METHOD_CALL_RE = new RegExp(
  String.raw`\.\$(${METHOD_NAME})|\['\$(${METHOD_NAME})'\]|\["\$(${METHOD_NAME})"\]|(?<!typeof\s)Opal\.(${OPAL_IDENT})|(?<![\w$.]|function\s)\$(${OPAL_IDENT})`,
  "gu",
);

// Fragments of these nodes contribute calls (their code is verbatim JS).
const INCOMING_TYPES = new Set(["XStringNode", "InterpolatedXStringNode", "OpalXstrPart", "StringNode", "OpalStr", "OpalStrPiece", "OpalJsCall"]);

export function extractNamesFrom(str) {
  const names = [];
  for (const m of str.matchAll(METHOD_CALL_RE)) names.push(m.slice(1).find((x) => x !== undefined));
  return names;
}

class CallTree {
  constructor(loc = "") {
    this.loc = loc;
    this.definitions = new Map();
    this.calls = new Set();
  }

  dig(path) {
    if (path.length === 0) return [this];
    const [first, ...rest] = path;
    return toArray(first).flatMap((leaf) => this.definitions.get(leaf).dig(rest));
  }

  addCalls(calls, path = []) {
    if (path.length === 0) {
      for (const c of toArray(calls)) this.calls.add(c);
    } else {
      for (const leaf of this.dig(path)) leaf.addCalls(calls);
    }
  }

  addDefinitions(path = []) {
    const rest = path.slice(0, -1);
    const last = path[path.length - 1];
    if (rest.length === 0) {
      for (const leaf of toArray(last)) {
        if (!this.definitions.has(leaf)) this.definitions.set(leaf, new CallTree(`${this.loc}/${leaf}`));
      }
    } else {
      for (const leaf of this.dig(rest)) leaf.addDefinitions([last]);
    }
  }
}

class ShadowedCallTree {
  constructor(callTree) {
    this.shadowed = new Set();
    this.callTree = callTree;
  }

  shadow(items) {
    for (const i of toArray(items)) this.shadowed.add(i);
  }

  dfs(fn, callTree = this.callTree, key = null) {
    fn(callTree, key);
    for (const [subkey, value] of callTree.definitions) {
      if (this.shadowed.has(subkey)) continue;
      this.dfs(fn, value, subkey);
    }
  }

  allDefinitions() {
    const defs = new Set();
    this.dfs((_, key) => defs.add(key));
    return defs;
  }

  allCalls() {
    const calls = new Set();
    this.dfs((node) => node.calls.forEach((c) => calls.add(c)));
    return calls;
  }

  allCallsFromRoot() {
    const byKey = new Map();
    this.dfs((node, key) => {
      let set = byKey.get(key);
      if (!set) byKey.set(key, (set = new Set()));
      node.calls.forEach((c) => set.add(c));
    });
    const finalCalls = new Set();
    const calls = [...(byKey.get(null) || [])];
    while (calls.length) {
      const call = calls.pop();
      if (finalCalls.has(call)) continue;
      finalCalls.add(call);
      calls.push(...(byKey.get(call) || []));
    }
    return finalCalls;
  }

  unusedDefinitions() {
    const used = this.allCallsFromRoot();
    const matchers = [...used].filter((c) => c instanceof RegExp);
    const unused = new Set();
    for (const d of this.allDefinitions()) {
      if (used.has(d)) continue;
      if (matchers.some((m) => typeof d === "string" && new RegExp(m.source, m.flags.replace("g", "")).test(d))) continue;
      unused.add(d);
    }
    return unused;
  }

  tryShadowingConstants() {
    const constants = [...this.allDefinitions()].filter((k) => typeof k === "string" && /^[A-Z]/.test(k));
    for (const key of [...constants, ["Complex", "Rational"]]) {
      const old = new Set(this.shadowed);
      this.shadow(key);
      this.shadow(this.unusedDefinitions());
      const allCalls = this.allCalls();
      const unusedKey = toArray(key).every((k) => !allCalls.has(k));
      this.shadowed = old;
      if (unusedKey) this.shadow(key);
    }
  }

  process() {
    let defCount = this.allDefinitions().size;
    for (;;) {
      this.shadow(this.unusedDefinitions());
      this.tryShadowingConstants();
      const old = defCount;
      defCount = this.allDefinitions().size;
      if (defCount === old) break;
    }
    this.kept = this.allDefinitions();
  }

  keepDefinition(name) {
    return this.kept.has(name);
  }
}

export class DCE {
  constructor(processed, types, { status = null } = {}) {
    this.processed = processed;
    this.types = new Set([...types, "*"]);
    this.callTree = new CallTree();
    this.status = status || (() => {});
  }

  isDirective(frag) {
    return frag instanceof Directive &&
      ["dce_def_begin", "dce_def_end", "dce_use"].includes(frag.name) &&
      this.types.has(frag.params.type);
  }

  call() {
    const len = this.processed.length;
    this.processed.forEach((file, idx) => {
      this.status(`Processing ${file.filename}...`, idx, len);
      if (file.compiler) this.readRuby(file.compiler);
      else this.readJs(file.source);
    });
    this.status("Computing...");
    // dynamic calls
    this.callTree.addCalls(["_reduce_none", "_racc_do_parse_rb", /^_reduce_\d+$/, "Symbol", "Number"]);
    this.sct = new ShadowedCallTree(this.callTree);
    this.sct.process();
    this.processed.forEach((file, idx) => {
      this.status(`Rebuilding ${file.filename}...`, idx, len);
      if (file.compiler) file.replaceFragments(this.rebuildRuby(file.compiler.fragments));
    });
    this.status("finished");
    return this.processed;
  }

  readJs(str) {
    this.callTree.addCalls(extractNamesFrom(str));
  }

  readRuby(compiler) {
    const stack = [];
    for (const frag of compiler.fragments) {
      if (this.isDirective(frag)) {
        if (frag.name === "dce_def_begin") {
          stack.push(frag.params.name);
          this.callTree.addDefinitions(stack);
        } else if (frag.name === "dce_use") {
          this.callTree.addCalls(frag.params.name, frag.params.force ? [] : stack);
        } else {
          stack.pop();
        }
      } else if (!this.ignoreIncoming(frag)) {
        this.callTree.addCalls(extractNamesFrom(frag.code), stack);
      }
    }
  }

  ignoreIncoming(frag) {
    return !(frag.node && INCOMING_TYPES.has(frag.node.type));
  }

  keepDefinition(stack) {
    return stack.every((ident) => toArray(ident.name).some((n) => this.sct.keepDefinition(n)));
  }

  rebuildRuby(fragments) {
    const out = [];
    const stack = [];
    for (const frag of fragments) {
      if (this.isDirective(frag)) {
        if (frag.name === "dce_def_begin") {
          stack.push({ name: frag.params.name, handled: false, placeholder: frag.params.placeholder });
          if (this.keepDefinition(stack)) out.push(frag);
        } else if (frag.name === "dce_def_end") {
          if (this.keepDefinition(stack)) out.push(frag);
          stack.pop();
        } else if (this.keepDefinition(stack)) {
          out.push(frag);
        }
      } else if (this.keepDefinition(stack)) {
        out.push(frag);
      } else if (!stack.some((s) => s.handled)) {
        const func = stack[stack.length - 1];
        out.push(new Fragment(`${func.placeholder}/* Removed by DCE: ${rubyNameToS(func.name)} */`, frag.scope, frag.node));
        func.handled = true;
      }
    }
    return out;
  }
}

// Ruby's Symbol#to_s / Array#to_s of the name, as in the removal comment.
function rubyNameToS(name) {
  return Array.isArray(name) ? `[${name.map((n) => `:${n}`).join(", ")}]` : String(name);
}

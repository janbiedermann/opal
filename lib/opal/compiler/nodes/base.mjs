// Base class of all code generators. Port of the former Ruby
// lib/opal/nodes/base.rb and lib/opal/nodes/helpers.rb, operating on potch
// (Prism) nodes.
import { Fragment, Directive } from "../fragment.mjs";
import { ClosureSupport } from "../closure.mjs";
import { property, isValidName, midToJsid } from "../helpers.mjs";

export const handlers = new Map();

// Comparison operators whose results on literal receivers need no
// $truthy() wrapping (Compiler::COMPARE).
const COMPARE = new Set(["<", ">", "<=", ">="]);

export class Base {
  // Registers the class as the code generator for the given node types.
  static handle(...types) {
    for (const type of types) handlers.set(type, this);
  }

  static truthyOptimize() {
    return false;
  }

  constructor(node, level, compiler) {
    this.node = node;
    this.type = node.type;
    this.level = level;
    this.compiler = compiler;
    if (!compiler.topScope) compiler.topScope = this;
  }

  compileToFragments() {
    if (this.fragments) return this.fragments;
    this.fragments = [];
    this.compile();
    return this.fragments;
  }

  compile() {
    throw new Error(`compile not implemented for ${this.type}`);
  }

  push(...strs) {
    const fragments = this.fragments;
    for (let i = 0; i < strs.length; i++) {
      const str = strs[i];
      fragments.push(typeof str === "string" ? new Fragment(str, this.scope, this.node) : str);
    }
  }

  unshift(...strs) {
    for (let i = 0; i < strs.length; i++) {
      if (typeof strs[i] === "string") strs[i] = new Fragment(strs[i], this.scope, this.node);
    }
    this.fragments.unshift(...strs);
  }

  wrap(pre, post) {
    this.unshift(pre);
    this.push(post);
  }

  fragment(str, options) {
    // without a location ({ loc: false }) the fragment is skipped in
    // source maps
    return new Fragment(str, this.scope, options !== undefined && !options.loc ? false : this.node);
  }

  // "'::'" for the top-level scope of a ::Const path (s(:cbase)).
  cbaseFragment(constantPath) {
    const location = constantPath.delimiter_loc || constantPath.location;
    return new Fragment("'::'", this.scope, { type: "OpalCbase", location });
  }

  error(msg) {
    this.compiler.error(msg, this.compiler.lineOf(this.node));
  }

  get scope() {
    return this.compiler.scope;
  }

  get topScope() {
    return this.compiler.topScope;
  }

  // Builds a compiler-internal node carrying this node's location.
  s(type, props = {}) {
    return { type, location: this.node.location, ...props };
  }

  isExpr() {
    return this.level === "expr";
  }

  isRecv() {
    return this.level === "recv";
  }

  isStmt() {
    return this.level === "stmt";
  }

  process(node, level = "expr") {
    return this.compiler.process(node, level);
  }

  expr(node) {
    return this.compiler.process(node, "expr");
  }

  recv(node) {
    return this.compiler.process(node, "recv");
  }

  stmt(node) {
    return this.compiler.process(node, "stmt");
  }

  exprOrNil(node) {
    return node ? this.expr(node) : "nil";
  }

  addLocal(name) {
    this.scope.addScopeLocal(name);
  }

  addIvar(name) {
    this.scope.addScopeIvar(name);
  }

  addGvar(name) {
    this.scope.addScopeGvar(name);
  }

  addTemp(temp) {
    this.scope.addScopeTemp(temp);
  }

  helper(name) {
    // A fast path, not the mechanism: push drops the null dceUse returns when
    // DCE is off. It pays because this runs on every helper use, and without
    // it the { type: "*" } literal is built before the guard is reached.
    if (this.compiler.isDce) this.push(this.dceUse(name, { type: "*" }));
    this.compiler.helper(name);
  }

  withTemp(fn) {
    return this.compiler.withTemp(fn);
  }

  inWhile() {
    return this.compiler.inWhileP();
  }

  get whileLoop() {
    return this.compiler.whileLoop;
  }

  hasRescueElse() {
    return this.scope.hasRescueElse();
  }

  inEnsure(fn) {
    return this.scope.inEnsure(fn);
  }

  isInEnsure() {
    return this.scope.isInEnsure();
  }

  inResbody(fn) {
    return this.scope.inResbody(fn);
  }

  isInResbody() {
    return this.scope.isInResbody();
  }

  inRescue(node, fn) {
    return this.scope.inRescue(node, fn);
  }

  classVariableOwnerNestingLevel() {
    let cvarScope = this.scope;
    let nestingLevel = 0;

    while (cvarScope && !cvarScope.isClassScope()) {
      // Needs only `class << self`, `module`, and `class`
      // can increase nesting, but `class` & `module` are
      // covered by `isClassScope`.
      if (cvarScope.isSclass()) nestingLevel += 1;
      cvarScope = cvarScope.parent;
    }

    return nestingLevel;
  }

  classVariableOwner() {
    if (this.scope) return `${this.scope.getNesting()}[${this.classVariableOwnerNestingLevel()}]`;
    return "Opal.Object";
  }

  sourceLocation() {
    let file = this.compiler.file;
    if (file.startsWith("corelib/")) file = `<internal:${file}>`;
    if (file.endsWith(".js")) file = `<js:${file}>`;
    return `['${file}', ${this.compiler.lineOf(this.node)}]`;
  }

  // Post-processor directives (DCE). With DCE off they return null rather than
  // a placeholder, and push/unshift drop the null, so the fragments array of a
  // compile that DCE will not read holds no Directive at all. Sites that build
  // their own array (Scope#toVars) have to test the result.
  postProcessorDirective(name, params) {
    return new Directive(name, params);
  }

  dceDefBegin(name, { placeholder = null, type = "method" } = {}) {
    placeholder = placeholder == null ? "nil" : placeholder;
    if (placeholder !== "") placeholder += " ";
    return this.postProcessorDirective("dce_def_begin", { name, placeholder, type });
  }

  dceDefEnd(name, { type = "method" } = {}) {
    return this.postProcessorDirective("dce_def_end", { name, type });
  }

  dceUse(name, { type = "method", force = false } = {}) {
    return this.postProcessorDirective("dce_use", { name, type, force });
  }

  // lib/opal/nodes/helpers.rb

  property(name) {
    return property(name);
  }

  isValidName(name) {
    return isValidName(name);
  }

  midToJsid(mid) {
    return midToJsid(mid);
  }

  indent(fn) {
    return this.compiler.indent(fn);
  }

  get currentIndent() {
    return this.compiler.parserIndent;
  }

  line(...strs) {
    this.push(this.fragment(`\n${this.currentIndent}`, { loc: false }));
    this.push(...strs);
  }

  emptyLine() {
    this.push(this.fragment("\n", { loc: false }));
  }

  jsTruthy(node) {
    const optimized = this.jsTruthyOptimize(node);
    if (optimized) return optimized;

    this.helper("truthy");
    return [this.fragment("$truthy("), this.expr(node), this.fragment(")")];
  }

  jsTruthyOptimize(node) {
    switch (node.type) {
      case "CallNode": {
        // (a safe-navigation call was a s(:csend), which is not optimized)
        if (node.flags && node.flags.includes("safe_navigation")) return null;
        const { receiver, name: mid } = node;
        const args = callArguments(node);
        const handler = receiver && handlers.get(receiver.type);

        // Only operator calls on the truthyOptimize node classes should be optimized.
        // Monkey patch method calls might return 'self'/aka a bridged instance and need
        // the nil check - see discussion at https://github.com/opal/opal/pull/1097
        const allowOptimizationOnType = COMPARE.has(mid) && handler && handler.truthyOptimize(receiver);

        if (allowOptimizationOnType || (mid === "block_given?" && !node.block)) {
          return this.expr(node);
        } else if (args.length === 1 && !node.block) {
          const helperFor = { "==": "eqeq", "===": "eqeqeq", "!=": "neqeq" }[mid];
          if (helperFor) {
            this.helper(helperFor);
            this.compiler.recordMethodCall(mid);
            return [this.fragment(`$${helperFor}(`), this.expr(receiver), this.fragment(", "), this.expr(args[0]), this.fragment(")")];
          }
        } else if (args.length === 0 && mid === "!" && receiver && !node.block) {
          this.helper("not");
          this.compiler.recordMethodCall(mid);
          return [this.fragment("$not("), this.expr(receiver), this.fragment(")")];
        }
        return null;
      }
      case "XStringNode": {
        // Backtick JS used as a Ruby condition: unwrap $truthy() when the
        // snippet is statically a boolean expression. The parentheses keep
        // the negated form (`unless`) correct.
        const text = node.unescaped;
        if (typeof text === "string" && !text.includes("\n") && isJsBooleanExpression(text)) {
          return [this.fragment("("), this.expr(node), this.fragment(")")];
        }
        return null;
      }
      case "ParenthesesNode": {
        const stmts = statementsOf(node.body);
        if (stmts.length === 1) return this.jsTruthyOptimize(stmts[0]);
        return null;
      }
      case "OpalIf": {
        // Ensure we recurse the jsTruthy call on the false body of the
        // if expression. This transforms an expression like:
        //   $truthy($truthy(a) || b)
        // into:
        //   $truthy(a) || $truthy(b)
        if (node.trueBody && node.trueBody.type === "TrueNode") {
          node.doJsTruthyOnFalseBody = true;
          return this.expr(node);
        } else if (node.falseBody && node.falseBody.type === "FalseNode") {
          node.doJsTruthyOnTrueBody = true;
          return this.expr(node);
        }
        return null;
      }
      default:
        return null;
    }
  }
}

Object.assign(Base.prototype, ClosureSupport);

// The positional arguments of a call (block arguments excluded).
export function callArguments(node) {
  return node.arguments ? node.arguments.arguments : [];
}

// The statements of a body node: a StatementsNode's body, [] for null, or
// [node] for anything else.
export function statementsOf(node) {
  if (!node) return [];
  if (node.type === "StatementsNode") return node.body;
  return [node];
}

// --- Static classification of backtick JS conditions -----------------------
//
// jsTruthyOptimize() drops the $truthy() wrapper around a single-line
// x-string only when the snippet is certainly a JS boolean expression. The
// scan is deliberately conservative: template literals, comments, multiple
// statements, ternaries and anything unparsable count as "not a boolean".

const TWO_CHAR_OPS = new Set(["==", "!=", "<=", ">=", "&&", "||", "??", "?.", "=>", "++", "--",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", ">>"]);
const SINGLE_OPS = new Set(["+", "-", "*", "/", "%", "<", ">", "=", "!", "&", "|", "^", "~", "?", ":", ",", "."]);
const COMPARISONS = new Set(["===", "!==", "==", "!=", "<=", ">=", "<", ">"]);

function skipString(text, start) {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "\\") { i++; continue; }
    if (text[i] === quote) return i + 1;
  }
  return -1;
}

function skipRegex(text, start) {
  let inClass = false;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") { i++; continue; }
    if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "/" && !inClass) {
      while (i + 1 < text.length && /[a-z]/.test(text[i + 1])) i++;
      return i + 1;
    }
  }
  return -1;
}

// The operators at parenthesis depth 0, with the member name recorded for
// `.`. Null when the text is not a single JS expression.
function topLevelOperators(text) {
  const ops = [];
  let i = 0, depth = 0, prev = null;

  while (i < text.length) {
    const ch = text[i];
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") { i++; continue; }
    if (ch === '"' || ch === "'") {
      const end = skipString(text, i);
      if (end < 0) return null;
      i = end; prev = "v"; continue;
    }
    if (ch === "`" || (ch === "/" && text[i + 1] === "/")) return null;
    if (ch === "/" && (prev === null || prev === "o")) {
      const end = skipRegex(text, i);
      if (end < 0) return null;
      i = end; prev = "v"; continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") { depth++; i++; prev = "o"; continue; }
    if (ch === ")" || ch === "]" || ch === "}") { depth--; i++; prev = "v"; continue; }
    if (ch === ";") return null;

    const three = text.slice(i, i + 3);
    const two = text.slice(i, i + 2);
    let op = null, len = 0;
    if (three === "===" || three === "!==" || three === "??=" || three === "&&=" || three === "||=") { op = three; len = 3; }
    else if (TWO_CHAR_OPS.has(two)) { op = two; len = 2; }
    else if (SINGLE_OPS.has(ch)) { op = ch; len = 1; }
    else if (/[A-Za-z_$]/.test(ch)) {
      const word = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(text.slice(i))[0];
      if (depth === 0 && (word === "instanceof" || word === "in")) ops.push({ op: word, at: i, len: word.length });
      i += word.length; prev = "v"; continue;
    } else { i++; prev = "v"; continue; }

    if (depth === 0) {
      let name = null;
      if (op === ".") {
        const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(text.slice(i + 1));
        if (m) name = m[0];
      }
      ops.push({ op, at: i, len, name });
    }
    i += len; prev = "o";
  }

  return depth === 0 ? ops : null;
}

// True when the `(` at openIndex closes at the very end of the text.
function closesAtEnd(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'") { i = skipString(text, i) - 1; if (i < 0) return false; continue; }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return text.slice(i + 1).trim() === "";
    }
  }
  return false;
}

export function isJsBooleanExpression(text) {
  text = text.trim();
  const ops = topLevelOperators(text);
  if (!ops) return false;

  for (const sep of ["||", "&&"]) {
    const found = ops.find((o) => o.op === sep);
    if (found) {
      return isJsBooleanExpression(text.slice(0, found.at)) &&
        isJsBooleanExpression(text.slice(found.at + found.len));
    }
  }

  if (ops.some((o) => o.op === "?")) return false;
  if (ops.some((o) => COMPARISONS.has(o.op) || o.op === "instanceof" || o.op === "in")) return true;
  if (ops.length > 0 && ops[0].op === "!" && ops[0].at === 0) return true;

  if (text.trimEnd().endsWith(")")) {
    for (const o of ops) {
      if (o.op === "." && o.name === "test") {
        const open = text.slice(o.at + o.len + 1).indexOf("(");
        if (open >= 0 && closesAtEnd(text, o.at + o.len + 1 + open)) return true;
      }
    }
  }

  return false;
}

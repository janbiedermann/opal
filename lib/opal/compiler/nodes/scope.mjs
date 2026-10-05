// Base class of nodes that open a new scope (file, class, module, def,
// block, ...). Port of the former Ruby lib/opal/nodes/scope.rb.
import { Base } from "./base.mjs";

// Ruby's String#succ for the names used here: increments the rightmost
// letter or digit, carrying into the characters to its left
// ("a" -> "b", "z" -> "aa", "retry_9" -> "retry_10").
function succ(str) {
  const chars = str.split("");
  let i = chars.length - 1;
  while (i >= 0 && !/[a-z0-9]/i.test(chars[i])) i--;
  if (i < 0) return str + "a";
  for (;;) {
    const c = chars[i];
    if (c === "z" || c === "Z" || c === "9") {
      chars[i] = c === "9" ? "0" : c === "z" ? "a" : "A";
      let j = i - 1;
      while (j >= 0 && !/[a-z0-9]/i.test(chars[j])) j--;
      if (j < 0 || (/[0-9]/.test(c) !== /[0-9]/.test(chars[j]))) {
        chars.splice(i, 0, c === "9" ? "1" : c === "z" ? "a" : "A");
        return chars.join("");
      }
      i = j;
    } else {
      chars[i] = String.fromCharCode(c.charCodeAt(0) + 1);
      return chars.join("");
    }
  }
}

export class ScopeNode extends Base {
  constructor(node, level, compiler) {
    super(node, level, compiler);

    // Every scope can have a parent scope
    this.parent = null;
    // The class or module name if this scope is a class scope
    this.name = null;
    // The given block name for a def scope
    this.blockName = null;
    this.scopeName = null;
    this.mid = null;
    // true if singleton def, false otherwise
    this.defs = null;
    this.catchReturn = false;
    this.hasBreak = false;
    this.hasRetry = false;
    this.rescueElseNode = null;
    this.awaitEncountered = false;

    this.locals = [];
    this.temps = [];
    this.args = [];
    // Sets of the above for fast lookups (a method can have many locals)
    this.known = new Set();
    this.ivars = [];
    this.gvars = [];
    this.queue = [];
    this.unique = "a";
    this.whileStack = [];
    this.identity = null;
    // used by modules to know what methods to donate to includees
    this.methods = [];
    this.usesBlockFlag = false;
    this.inEnsureFlag = false;
    this.inResbodyFlag = false;
    // used by classes to store all ivars used in direct def methods
    this.protoIvars = [];
    this.isLambdaFlag = false;
    this.lambdaDefinition = false;
  }

  // The kind of scope: "top", "class", "module", "sclass", "def", "iter".
  get scopeType() {
    throw new Error("scopeType not implemented");
  }

  inScope(fn) {
    this.indent(() => {
      this.parent = this.compiler.scope;
      this.compiler.scope = this;
      fn(this);
      this.compiler.scope = this.parent;
    });
  }

  // Returns true if this scope is a class/module body scope
  isClassScope() {
    return this.scopeType === "class" || this.scopeType === "module";
  }

  // Returns true if this is strictly a class scope
  isClass() {
    return this.scopeType === "class";
  }

  // True if this is a module scope
  isModule() {
    return this.scopeType === "module";
  }

  isSclass() {
    return this.scopeType === "sclass";
  }

  // Returns true if this is a top scope (main file body)
  isTop() {
    return this.scopeType === "top";
  }

  // True if a block/iter scope
  isIter() {
    return this.scopeType === "iter";
  }

  isDef() {
    return this.scopeType === "def";
  }

  isLambda() {
    return this.isIter() && this.isLambdaFlag;
  }

  markLambda() {
    this.isLambdaFlag = true;
  }

  definesLambda(fn) {
    this.lambdaDefinition = true;
    fn();
    this.lambdaDefinition = false;
  }

  isLambdaDefinition() {
    return this.lambdaDefinition;
  }

  // Is this a normal def method directly inside a class? This is
  // used for optimizing ivars as we can set them to nil in the
  // class body
  isDefInClass() {
    return !this.defs && this.scopeType === "def" && this.parent && this.parent.isClass();
  }

  // Vars to use inside each scope
  toVars() {
    const f = (x) => this.fragment(x);

    let vars = this.temps.map((t) => {
      const m = /^\$([a-z][a-zA-Z0-9_]*) = Opal\.\1$/.exec(t);
      const helper = m && m[1];
      const a = [];
      if (helper) a.push(this.dceDefBegin(helper, { placeholder: "" }));
      a.push(f(t));
      a.push(f(", "));
      if (helper) a.push(this.dceDefEnd(helper));
      return a;
    });

    vars.push(...this.locals.map((l) => [f(`${l} = nil`), f(", ")]));

    const iv = this.ivars.map((ivar) => `if (self${ivar} == null) self${ivar} = nil;\n`);
    const gv = this.gvars.map((gvar) => `if ($gvars${gvar} == null) $gvars${gvar} = nil;\n`);

    if (this.isClass() && this.protoIvars.length > 0) {
      vars.push(f("$proto = self.$$prototype"), f(", "));
    }

    vars = vars.flat(Infinity);
    if (vars.length > 0 && vars[vars.length - 1].code === ", ") vars.pop();

    const indent = this.compiler.parserIndent;
    const fragments = vars.length === 0 ? [] : [f("var "), ...vars, f(";\n")];
    if (this.ivars.length > 0) fragments.push(f(`${indent}${iv.join(indent)}`));
    if (this.gvars.length > 0) fragments.push(f(`${indent}${gv.join(indent)}`));

    if (this.isClass() && this.protoIvars.length > 0) {
      const pvars = this.protoIvars.map((i) => `$proto${i}`).join(" = ");
      fragments.push(f(`\n${indent}${pvars} = nil;`));
    }

    return fragments;
  }

  addScopeIvar(ivar) {
    if (this.isDefInClass()) {
      this.parent.addProtoIvar(ivar);
    } else if (!this.ivars.includes(ivar)) {
      this.ivars.push(ivar);
    }
  }

  addScopeGvar(gvar) {
    if (!this.gvars.includes(gvar)) this.gvars.push(gvar);
  }

  addProtoIvar(ivar) {
    if (!this.protoIvars.includes(ivar)) this.protoIvars.push(ivar);
  }

  addArg(arg) {
    if (!this.args.includes(arg)) {
      this.args.push(arg);
      this.known.add(arg);
    }
    return arg;
  }

  addScopeLocal(local) {
    if (this.hasLocal(local)) return;
    this.locals.push(local);
    this.known.add(local);
  }

  // Adds a local even if it is known (a shadowing block-local variable).
  pushLocal(local) {
    this.locals.push(local);
    this.known.add(local);
  }

  hasLocal(local) {
    if (this.known.has(local)) return true;
    if (this.parent && this.scopeType === "iter") return this.parent.hasLocal(local);
    return false;
  }

  scopeLocals() {
    const locals = [...this.locals];
    for (const a of this.args) if (!locals.includes(a)) locals.push(a);
    // eval code also sees the caller's locals
    if (this.isTop() && this.compiler.isEval) {
      for (const v of this.compiler.scopeVariables) if (!locals.includes(v)) locals.push(v);
    }
    if (this.parent && this.scopeType === "iter") {
      for (const l of this.parent.scopeLocals()) if (!locals.includes(l)) locals.push(l);
    }
    return locals.filter((i) => !String(i).startsWith("$"));
  }

  addScopeTemp(tmp) {
    if (this.hasTemp(tmp)) return;
    this.temps.push(tmp);
    this.tempSet().add(tmp);
    this.known.add(tmp);
  }

  prependScopeTemp(tmp) {
    if (this.hasTemp(tmp)) return;
    this.temps.unshift(tmp);
    this.tempSet().add(tmp);
    this.known.add(tmp);
  }

  hasTemp(tmp) {
    return this.tempSet().has(tmp);
  }

  tempSet() {
    if (!this.tempsSet) this.tempsSet = new Set(this.temps);
    return this.tempsSet;
  }

  newTemp() {
    if (this.queue.length > 0) return this.queue.pop();

    const tmp = this.nextTemp();
    this.temps.push(tmp);
    this.tempSet().add(tmp);
    this.known.add(tmp);
    return tmp;
  }

  nextTemp() {
    let tmp;
    for (;;) {
      tmp = `$${this.unique}`;
      this.unique = succ(this.unique);
      if (!this.hasLocal(tmp)) break;
    }
    return tmp;
  }

  queueTemp(name) {
    this.queue.push(name);
  }

  pushWhile() {
    const info = {};
    this.whileStack.push(info);
    return info;
  }

  popWhile() {
    this.whileStack.pop();
  }

  inWhileP() {
    return this.whileStack.length > 0;
  }

  usesBlock() {
    if (this.scopeType === "iter" && this.parent) {
      this.parent.usesBlock();
    } else {
      this.usesBlockFlag = true;
      this.identify();
    }
  }

  identify(name = null) {
    if (this.identity) return this.identity;

    if (this.mid != null && this.isValidName(this.mid)) {
      // There are some special utf8 chars that can be used as valid JS
      // identifiers, some examples:
      //
      // utf8_pond = 'ⵌ'
      // utf8_question = 'ʔ̣'
      // utf8_exclamation 'ǃ'
      //
      // For now we're just using $$, to maintain compatibility with older IEs.
      this.identity = `$$${this.mid}`;
    } else {
      // Parent scope is the defining module/class
      if (name == null) {
        name = [this.parent && (this.parent.name || this.parent.scopeName), this.mid]
          .filter((i) => i != null)
          .join("_");
      }
      this.identity = this.compiler.uniqueTemp(name);
    }

    return this.identity;
  }

  findParentDef() {
    let scope = this;
    while ((scope = scope.parent)) {
      if (scope.isDef() || scope.isLambda()) return scope;
    }
    return null;
  }

  superChain() {
    const chain = [];
    let scope = this;
    let defn = "null";
    let mid = "null";

    while (scope) {
      if (scope.scopeType === "iter") {
        chain.push(scope.identify());
        if (scope.parent) scope = scope.parent;
      } else if (scope.scopeType === "def") {
        defn = scope.identify();
        mid = `'${scope.mid}'`;
        break;
      } else {
        break;
      }
    }

    return [chain, defn, mid];
  }

  isUsesBlock() {
    return this.usesBlockFlag;
  }

  hasRescueElse() {
    return this.rescueElseNode != null;
  }

  inRescue(node, fn) {
    if (!this.rescues) this.rescues = [];
    this.rescues.push(node);
    const result = fn();
    this.rescues.pop();
    return result;
  }

  currentRescue() {
    return this.rescues[this.rescues.length - 1];
  }

  inResbody(fn) {
    this.inResbodyFlag = true;
    const result = fn();
    this.inResbodyFlag = false;
    return result;
  }

  isInResbody() {
    return this.inResbodyFlag;
  }

  inEnsure(fn) {
    this.inEnsureFlag = true;
    const result = fn();
    this.inEnsureFlag = false;
    return result;
  }

  isInEnsure() {
    return this.inEnsureFlag;
  }

  genRetryId() {
    this.nextRetryId = this.nextRetryId ? succ(this.nextRetryId) : "retry_1";
    return this.nextRetryId;
  }

  acceptsUsing() {
    // IterNode of a special kind of Module.new {} is accepted...
    // though we don't check for it that thoroughly.
    return ["top", "module", "class", "iter"].includes(this.scopeType);
  }

  collectRefinementsTemps(temps = []) {
    if (this.refinementsTempName) temps.push(this.refinementsTempName);
    if (this.parent) return this.parent.collectRefinementsTemps(temps);
    return temps;
  }

  newRefinementsTemp() {
    const v = this.compiler.uniqueTemp("$refn");
    this.addScopeLocal(v);
    return v;
  }

  refinementsTemp() {
    const prev = this.refinementsTempName;
    const curr = this.newRefinementsTemp();
    this.refinementsTempName = curr;
    return [prev, curr];
  }

  // Returns 'self', but also ensures that the self variable is set
  getSelf() {
    this.defineSelf = true;
    return "self";
  }

  // Returns '$nesting', but also ensures we compile the nesting chain
  getNesting() {
    this.defineNesting = true;
    return "$nesting";
  }

  // Returns '$$', but also ensures we compile it
  relativeAccess() {
    this.defineRelativeAccess = this.defineNesting = true;
    return "$$";
  }

  prepareBlock(blockName = null) {
    const scopeName = this.scope.identity;
    if (blockName) this.blockName = blockName;

    this.addTemp(`${this.blockName} = ${scopeName}.$$p || nil`);

    if (!this.blockPrepared) {
      this.line(`${scopeName}.$$p = null;`);
      this.blockPrepared = true;
    }
  }
}

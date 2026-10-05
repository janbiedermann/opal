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
    this.push(this.dceUse(name, { type: "*" }));
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

  // Post-processor directives (DCE)
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

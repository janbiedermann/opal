// Method definitions, blocks and lambdas. Port of the former Ruby
// lib/opal/nodes/def.rb, defs.rb, iter.rb, lambda.rb, node_with_args.rb,
// node_with_args/ shortcuts.rb and args/arity_check.rb.
import { ScopeNode } from "./scope.mjs";
import { Base } from "./base.mjs";
import { DEF, ITER, JS_FUNCTION, LAMBDA } from "../closure.mjs";
import { argList, planArgs, prependToBody, parametersCode, Arguments } from "./args.mjs";
import { bodyOf } from "../transforms/walk.mjs";
import { rubyInspect, fixIvarName, fixVarName } from "../helpers.mjs";
import { isPlainStringLiteral } from "./literal.mjs";

const SIMPLE_VALUE_TYPES = new Set(["TrueNode", "FalseNode", "NilNode", "IntegerNode", "FloatNode", "SymbolNode"]);

function isSimpleValue(node, compiler) {
  return !!node && (SIMPLE_VALUE_TYPES.has(node.type) || isPlainStringLiteral(compiler, node));
}

// Name of an ivar without the @, as fixed for JS.
function ivarName(name) {
  return fixIvarName(name).slice(1);
}

// Shortcuts for the simplest kinds of methods: [name, appliesTo, when, compile]
const SHORTCUTS = [
  // def a; self; end
  ["return_self", "def", (n) => n.stmts.type === "SelfNode", (n) => n.push("$return_self")],
  // def a; 123; end
  ["return_val", "*", (n) => isSimpleValue(n.stmts, n.compiler), (n) => n.push("$return_val(", n.expr(n.stmts), ")")],
  // def a; @x; end
  ["return_ivar", "def", (n) => n.stmts.type === "InstanceVariableReadNode", (n) => {
    n.push("$return_ivar(", n.expr(n.s("OpalSym", { value: ivarName(n.stmts.name) })), ")");
  }],
  // def a(x); @x = x; end
  ["assign_ivar", "def", (n) => {
    const stmts = n.stmts;
    const inline = n.inlineArgs;
    const last = inline[inline.length - 1];
    return stmts.type === "InstanceVariableWriteNode" &&
      inline.length === 1 &&
      last.type === "OpalArgNode" &&
      stmts.value.type === "LocalVariableReadNode" &&
      fixVarName(stmts.value.name) === last.name;
  }, (n) => {
    n.push("$assign_ivar(", n.expr(n.s("OpalSym", { value: ivarName(n.stmts.name) })), ")");
  }],
  // def a; @x = 5; end
  ["assign_ivar_val", "def", (n) => n.stmts.type === "InstanceVariableWriteNode" && isSimpleValue(n.stmts.value, n.compiler), (n) => {
    const name = n.expr(n.s("OpalSym", { value: ivarName(n.stmts.name) }));
    n.push("$assign_ivar_val(", name, ", ", n.expr(n.stmts.value), ")");
  }],
];

export class NodeWithArgs extends ScopeNode {
  constructor(node, level, compiler) {
    super(node, level, compiler);
    this.usedKwargs = [];
    this.arity = 0;
    this.originalArgs = argList(this.parametersNode);

    const plan = planArgs(node, this.originalArgs, this.argsType);
    this.inlineArgs = plan.inline;

    // MlhsArgs and InlineArgs prepend their initialization to the body
    let body = this.bodyNode;
    if (plan.mlhsInit.length > 0) body = prependToBody(node, body || this.s("NilNode"), plan.mlhsInit);
    body = prependToBody(node, body || this.s("NilNode"), plan.initialization);
    this.stmts = body;
  }

  get bodyNode() {
    return bodyOf(this.node.body);
  }

  get parametersNode() {
    return this.node.parameters;
  }

  compileArityCheck(iter) {
    this.push(this.process(this.s("OpalArityCheck", { args: this.originalArgs, iter })));
  }

  compileBlockArg() {
    if (this.scope.isUsesBlock()) this.scope.prepareBlock();
  }

  parametersCode() {
    return parametersCode(this.originalArgs);
  }

  compileBodyOrShortcut(nodeType) {
    // The shortcuts don't check arity. If we want to check arity,
    // we can't use them.
    if (this.compiler.isArityCheck) return this.compileBody();

    for (const [name, appliesTo, when, compile] of SHORTCUTS) {
      if ((appliesTo === nodeType || appliesTo === "*") && when(this)) {
        this.helper(name);
        return compile(this);
      }
    }

    return this.compileBody();
  }

  pushBlockopts(blockopts) {
    const keys = Object.keys(blockopts);
    if (keys.length === 1 && keys[0] === "$$arity") {
      this.push(`, ${blockopts.$$arity}`);
    } else if (keys.length > 0) {
      this.push(", {", keys.map((k) => `${k}: ${blockopts[k]}`).join(", "), "}");
    }
  }
}

export class DefNode extends NodeWithArgs {
  static {
    this.handle("DefNode");
  }

  get scopeType() {
    return "def";
  }

  get argsType() {
    return this.node.receiver ? "defs" : "def";
  }

  get mid() {
    return this.node.name;
  }

  set mid(_value) {
    // the method name comes from the node
  }

  compile() {
    this.compileBodyOrShortcut("def");

    const blockopts = {};

    if (this.arity < 0) blockopts.$$arity = this.arity;
    if (this.compiler.isArityCheck) blockopts.$$parameters = this.parametersCode();
    if (this.compiler.isParseComments) blockopts.$$comments = this.commentsCode();
    if (this.compiler.isEnableSourceLocation) blockopts.$$source_location = this.sourceLocation();

    this.pushBlockopts(blockopts);

    this.wrapWithDefinition();
    this.wrapWithPostprocessorDirectives();

    if (this.defineNesting) this.scope.getNesting();
    if (this.defineRelativeAccess) this.scope.relativeAccess();
  }

  compileBody() {
    let inlineParams = null;
    let scopeName = null;

    this.inScope(() => {
      if (this.node.receiver) this.defs = true;

      this.identify();
      scopeName = this.identity;

      // Setting a default block name (later can be overwritten by a blockarg)
      this.blockName = "$yield";

      inlineParams = this.process(this.s("OpalArgs", { args: this.inlineArgs }));

      this.inClosure(DEF | JS_FUNCTION, () => {
        const stmtCode = this.stmt(this.compiler.returns(this.stmts));

        this.compileBlockArg();

        if (this.defineSelf) this.addTemp("self = this");

        this.compileArityCheck(false);

        this.unshift(`\n${this.currentIndent}`, this.toVars());

        this.line(stmtCode);
      });
    });

    this.unshift(") {");
    this.unshift(inlineParams);
    this.unshift(`function ${scopeName}(`);
    if (this.awaitEncountered) this.unshift("async ");
    this.line("}");
  }

  wrapWithDefinition() {
    const mid = this.mid;
    if (this.node.receiver) {
      if (this.compiler.isRuntimeMode) {
        this.unshift(`Opal.$${mid} = Opal.${mid} = `);
      } else {
        this.helper("defs");
        this.unshift("$defs(", this.expr(this.node.receiver), `, '$${mid}', `);
        this.push(")");
      }
      return;
    }

    this.helper("def");
    this.wrap(`$def(${this.scope.getSelf()}, '$${mid}', `, ")");

    if (!this.isExpr()) this.unshift(`\n${this.currentIndent}`);
  }

  wrapWithPostprocessorDirectives() {
    this.unshift(this.dceDefBegin(this.mid));
    this.push(this.dceDefEnd(this.mid));
  }

  commentsCode() {
    const comments = this.compiler.commentsBefore(this.node);
    return "[" + comments.map((text) => rubyInspect(text)).join(", ") + "]";
  }
}

export class IterNode extends NodeWithArgs {
  static {
    this.handle("BlockNode", "OpalLambdaIter");
  }

  get scopeType() {
    return "iter";
  }

  get argsType() {
    return "iter";
  }

  compile() {
    if (this.scope.isLambdaDefinition()) this.markLambda();

    this.compileBodyOrShortcut("iter");

    const blockopts = {};
    if (this.arity < 0) blockopts.$$arity = this.arity;
    if (this.defineSelf) blockopts.$$s = this.scope.getSelf();
    if (this.closure && this.closure.throwers.has("break")) blockopts.$$brk = this.closure.throwers.get("break");
    if (this.closure && this.closure.throwers.has("return")) blockopts.$$ret = this.closure.throwers.get("return");

    if (this.compiler.isArityCheck) blockopts.$$parameters = this.parametersCode();
    if (this.compiler.isEnableSourceLocation) blockopts.$$source_location = this.sourceLocation();

    // MRI expands a passed argument if the block:
    // 1. takes a single argument that is an array
    // 2. has more that one argument
    // With a few exceptions:
    // 1. mlhs arg: if a block takes |(a, b)| argument
    // 2. trailing ',' in the arg list (|a, |)
    // This flag on the method indicates that a block has a top level mlhs argument
    // which means that we have to expand passed array explicitly in runtime.
    if (this.originalArgs.some((arg) => arg.argType === "mlhs")) blockopts.$$has_top_level_mlhs_arg = "true";
    if (this.hasTrailingCommaInArgs()) blockopts.$$has_trailing_comma_in_args = "true";

    if (!this.isPlainJsFunction()) this.pushBlockopts(blockopts);

    if (this.defineNesting) this.scope.getNesting();
    if (this.defineRelativeAccess) this.scope.relativeAccess();
  }

  isPlainJsFunction() {
    return !!this.node.plainJsFunction;
  }

  compileBody() {
    let inlineParams = null;
    let toVars = null;
    let identity = null;

    this.inScope(() => {
      identity = this.identify();

      inlineParams = this.process(this.s("OpalArgs", { args: this.inlineArgs }));

      this.compileArityCheck(true);

      this.inClosure(JS_FUNCTION | ITER | (this.isLambdaFlag ? LAMBDA : 0), () => {
        const bodyCode = this.stmt(this.compiler.returns(this.stmts || this.s("NilNode")));

        if (this.defineSelf && !this.isPlainJsFunction()) {
          this.addTemp(`self = ${identity}.$$s == null ? this : ${identity}.$$s`);
        }

        toVars = this.toVars();

        this.line(bodyCode);
      });
    });

    this.unshift(toVars);

    if (this.awaitEncountered) {
      this.unshift(`async function ${identity}(`, inlineParams, "){");
    } else {
      this.unshift(`function ${identity}(`, inlineParams, "){");
    }
    this.push("}");
  }

  hasTrailingCommaInArgs() {
    const params = this.node.parameters;
    if (!params || params.type !== "BlockParametersNode") return false;
    const source = this.compiler.source.slice(params.location.start, params.location.end);
    return /,\s*\|/.test(source);
  }
}

// -> (args) { body }
export class LambdaNode extends Base {
  static {
    this.handle("LambdaNode");
  }

  compile() {
    this.helper("lambda");

    this.scope.definesLambda(() => {
      this.push("$lambda(", this.expr({ ...this.node, type: "OpalLambdaIter" }), ")");
    });
  }
}

// The arity of a method/block and, with the arity_check option, the
// runtime check of the number of arguments.
export class ArityCheckNode extends Base {
  static {
    this.handle("OpalArityCheck");
  }

  constructor(node, level, compiler) {
    super(node, level, compiler);
    const a = Arguments.of(node.args);
    this.a = a;
    if (node.args.length === 0) {
      this.kwargs = this.allArgs = node.args;
      return;
    }
    this.kwargs = [...a.kwargs, ...a.kwoptargs, ...(a.kwrestarg ? [a.kwrestarg] : [])];
    this.allArgs = [...a.args, ...a.optargs, ...(a.restarg ? [a.restarg] : []), ...a.postargs, ...this.kwargs];
  }

  compile() {
    if (this.compiler.isRuntimeMode) return;

    this.scope.arity = this.arity();

    if (!this.compiler.isArityCheck) return;

    const checks = this.arityChecks();
    if (checks.length === 0) return;

    if (!this.node.iter) {
      this.helper("ac");
      const meth = rubyInspect(String(this.scope.mid));
      this.line("var $arity = arguments.length;");
      this.push(` if (${checks.join(" || ")}) { $ac($arity, ${this.arity()}, this, ${meth}); }`);
      return;
    }

    let parentScope = this.scope;
    while (!(parentScope.isDef() || parentScope.isClassScope() || parentScope.isTop())) parentScope = parentScope.parent;

    let context;
    if (parentScope.isTop()) context = "'<main>'";
    else if (parentScope.isDef()) context = `'${parentScope.mid}'`;
    else if (parentScope.isClass()) context = `'<class:${parentScope.name}>'`;
    else if (parentScope.isModule()) context = `'<module:${parentScope.name}>'`;

    const identity = this.scope.identity;

    this.helper("block_ac");

    this.line(`if (${identity}.$$is_lambda || ${identity}.$$define_meth) {`);
    this.line("  var $arity = arguments.length;");
    this.line(`  if (${checks.join(" || ")}) { $block_ac($arity, ${this.arity()}, ${context}); }`);
    this.line("}");
  }

  // Returns an array of JS conditions for raising and argument
  // error caused by arity check
  arityChecks() {
    const a = this.a;
    let arity = this.allArgs.length;
    arity -= a.optargs.length;
    if (a.restarg) arity -= 1;
    arity -= this.kwargs.length;
    if (a.optargs.length > 0 || this.kwargs.length > 0 || a.restarg) arity = -arity - 1;

    const checks = [];
    if (arity < 0) {
      // splat or opt args
      const minArity = -(arity + 1);
      const maxArity = this.allArgs.length;
      if (minArity > 0) checks.push(`$arity < ${minArity}`);
      if (!a.restarg) checks.push(`$arity > ${maxArity}`);
    } else {
      checks.push(`$arity !== ${arity}`);
    }
    return checks;
  }

  arity() {
    const a = this.a;
    const kwargs = this.kwargs;
    const onlyOptionalKwargs = kwargs.length > 0 && kwargs.every((arg) => arg.argType === "kwoptarg" || arg.argType === "kwrestarg");

    if (a.restarg || a.optargs.length > 0 || onlyOptionalKwargs) {
      let result = this.allArgs.filter((arg) => arg.argType === "arg" || arg.argType === "mlhs").length;
      if (kwargs.some((arg) => arg.argType === "kwarg")) result += 1;
      return -result - 1;
    }

    let result = this.allArgs.length;
    result -= kwargs.length;
    if (kwargs.length > 0) result += 1;
    return result;
  }
}

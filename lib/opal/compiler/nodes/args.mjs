// Method and block parameters. Port of the argument rewriters
// (lib/opal/rewriters/{forward_args,js_reserved_words,deduplicate_arg_name,
// dump_args,mlhs_args,inline_args,arguments}.rb) and of the argument nodes
// in lib/opal/nodes/args/*.rb.
//
// argList() turns Prism parameters into the parser gem's s(:args) children
// (as plain descriptors: {argType, name, argName, value, children}), with
// anonymous parameters named like the ForwardArgs rewriter did, names fixed
// for JS (argName keeps the Ruby name) and duplicates renamed.
// planArgs() then splits them into the inline JS parameters and the
// statements that initialize the rest at the start of the body.
import { Base } from "./base.mjs";
import { fixVarName, rubyInspect } from "../helpers.mjs";

const s = (origin, type, props) => ({ type, location: origin.location, ...props });

function descriptor(param, argType, name, extra = {}) {
  return { argType, name, argName: name, location: param.location, ...extra };
}

// MultiTargetNode in a parameter list -> mlhs descriptor
function mlhsDescriptor(node) {
  const children = [];
  for (const left of node.lefts) children.push(paramDescriptor(left));
  if (node.rest && node.rest.type === "SplatNode") {
    const target = node.rest.expression;
    children.push(descriptor(node.rest, "restarg", target ? target.name : null));
  }
  for (const right of node.rights) children.push(paramDescriptor(right));
  return { argType: "mlhs", location: node.location, children };
}

function paramDescriptor(param) {
  switch (param.type) {
    case "RequiredParameterNode":
      return descriptor(param, "arg", param.name);
    case "MultiTargetNode":
      return mlhsDescriptor(param);
    default:
      throw new Error(`unsupported parameter ${param.type}`);
  }
}

// The s(:args) children of a def/block/lambda's parameters.
export function argList(parameters) {
  const list = [];
  if (!parameters) return list;

  if (parameters.type === "NumberedParametersNode") {
    for (let i = 1; i <= parameters.maximum; i++) list.push(descriptor(parameters, "arg", `_${i}`));
    return finish(list);
  }
  if (parameters.type === "ItParametersNode") {
    list.push(descriptor(parameters, "arg", "it"));
    return finish(list);
  }

  let params = parameters;
  let shadows = [];
  if (parameters.type === "BlockParametersNode") {
    params = parameters.parameters;
    shadows = parameters.locals || [];
  }

  if (params) {
    for (const p of params.requireds) list.push(paramDescriptor(p));
    for (const p of params.optionals) list.push(descriptor(p, "optarg", p.name, { value: p.value }));
    if (params.rest && params.rest.type === "RestParameterNode") list.push(descriptor(params.rest, "restarg", params.rest.name));
    for (const p of params.posts) list.push(paramDescriptor(p));
    for (const p of params.keywords) {
      if (p.type === "RequiredKeywordParameterNode") list.push(descriptor(p, "kwarg", p.name));
      else list.push(descriptor(p, "kwoptarg", p.name, { value: p.value }));
    }
    const kwrest = params.keyword_rest;
    let forwarding = false;
    if (kwrest) {
      if (kwrest.type === "KeywordRestParameterNode") list.push(descriptor(kwrest, "kwrestarg", kwrest.name));
      else if (kwrest.type === "NoKeywordsParameterNode") list.push({ argType: "kwnilarg", location: kwrest.location });
      else if (kwrest.type === "ForwardingParameterNode") forwarding = true;
    }
    if (params.block) list.push(descriptor(params.block, "blockarg", params.block.name));
    if (forwarding) {
      // def m(...): ForwardArgs adds *$fwd_rest and &$fwd_block
      list.push(descriptor(kwrest, "restarg", "$fwd_rest"));
      list.push(descriptor(kwrest, "blockarg", "$fwd_block"));
    }
  }

  for (const shadow of shadows) list.push(descriptor(shadow, "shadowarg", shadow.name));

  return finish(list);
}

// Names anonymous parameters, fixes names for JS and deduplicates them.
function finish(list) {
  const counts = new Map();
  const fix = (arg) => {
    if (arg.argType === "mlhs") {
      arg.children.forEach(fix);
      return;
    }
    if (arg.argType === "kwnilarg") return;

    // ForwardArgs: anonymous *, ** and & are named for forwarding
    if (arg.name == null) {
      if (arg.argType === "restarg") arg.name = "$fwd_rest";
      else if (arg.argType === "kwrestarg") arg.name = "$fwd_kwrest";
      else if (arg.argType === "blockarg") arg.name = "$fwd_block";
    }
    if (arg.name == null) return;

    // JsReservedWords: argName keeps the Ruby name
    arg.argName = arg.name;
    arg.name = fixVarName(arg.name);

    // DeduplicateArgName: def m(_, _) -> function(_, _$2)
    if (["arg", "restarg", "kwarg", "kwrestarg", "blockarg", "optarg", "kwoptarg"].includes(arg.argType)) {
      const count = (counts.get(arg.name) || 0) + 1;
      counts.set(arg.name, count);
      if (count > 1) arg.name = `${arg.name}_$${count}`;
    }
  };
  list.forEach(fix);
  return list;
}

// An empty argument list (shared by methods and blocks without parameters)
const NO_ARGS = Object.freeze([]);

// The parser gem's argument kinds sorted into groups
// (Opal::Rewriters::Arguments).
export class Arguments {
  // The Arguments of a list, shared for an empty list.
  static of(args) {
    return args.length === 0 ? NO_ARGUMENTS : new Arguments(args);
  }

  constructor(args) {
    this.args = [];
    this.optargs = [];
    this.restarg = null;
    this.postargs = [];
    this.kwargs = [];
    this.kwoptargs = [];
    this.kwrestarg = null;
    this.kwnilarg = false;
    this.shadowargs = [];
    this.blockarg = null;

    for (const arg of args) {
      switch (arg.argType) {
        case "arg":
        case "mlhs":
          (this.restarg || this.optargs.length > 0 ? this.postargs : this.args).push(arg);
          break;
        case "optarg":
          this.optargs.push(arg);
          break;
        case "restarg":
          this.restarg = arg;
          break;
        case "kwarg":
          this.kwargs.push(arg);
          break;
        case "kwoptarg":
          this.kwoptargs.push(arg);
          break;
        case "kwnilarg":
          this.kwnilarg = true;
          break;
        case "kwrestarg":
          this.kwrestarg = arg;
          break;
        case "shadowarg":
          this.shadowargs.push(arg);
          break;
        case "blockarg":
          this.blockarg = arg;
          break;
        default:
          throw new Error(`Unsupported arg type ${arg.argType}`);
      }
    }
  }

  hasPostArgs() {
    return this.restarg != null || this.postargs.length > 0 || (this.hasAnyKwargs() && !this.canInlineKwargs());
  }

  hasAnyKwargs() {
    return this.kwargs.length > 0 || this.kwoptargs.length > 0 || this.kwrestarg != null;
  }

  canInlineKwargs() {
    return this.optargs.length === 0 && this.restarg == null && this.postargs.length === 0;
  }
}

// (frozen, with its lists)
const NO_ARGUMENTS = Object.freeze(new Arguments(NO_ARGS));
for (const value of Object.values(NO_ARGUMENTS)) if (Array.isArray(value)) Object.freeze(value);

// The mlhs of a parameter as a multiple assignment target (MlhsRewriter).
function mlhsTargets(origin, mlhs) {
  const lefts = [];
  let rest = null;
  const rights = [];
  for (const child of mlhs.children) {
    if (child.argType === "restarg") {
      const expression = child.name ? s(child, "LocalVariableTargetNode", { name: child.name, internal: true }) : null;
      rest = s(child, "SplatNode", { expression });
    } else {
      const target = child.argType === "mlhs"
        ? mlhsTargets(child, child)
        : s(child, "LocalVariableTargetNode", { name: child.name, internal: true });
      (rest ? rights : lefts).push(target);
    }
  }
  return s(origin, "MultiTargetNode", { lefts, rest, rights });
}

// Splits arguments into the inline JS parameters and the statements that
// initialize the others: { inline, initialization, args }. `args` are the
// arguments after mlhs parameters were replaced by $mlhs_tmpN temps.
// type is "def", "defs" or "iter".
export function planArgs(origin, originalArgs, type) {
  if (originalArgs.length === 0) return { inline: [], initialization: NO_ARGS, mlhsInit: NO_ARGS, args: originalArgs };

  // MlhsArgs: def m((a, b)) -> def m($mlhs_tmp1); (a, b) = $mlhs_tmp1
  let counter = 0;
  const mlhsInit = [];
  const args = originalArgs.map((arg) => {
    if (arg.argType !== "mlhs") return arg;
    const varName = `$mlhs_tmp${++counter}`;
    const multi = mlhsTargets(arg, arg);
    mlhsInit.push(s(arg, "MultiWriteNode", {
      lefts: multi.lefts,
      rest: multi.rest,
      rights: multi.rights,
      value: s(arg, "OpalLvar", { name: varName }),
    }));
    return { argType: "arg", name: varName, argName: varName, location: arg.location };
  });

  // InlineArgs
  const a = Arguments.of(args);
  const inline = [];
  const initialization = [];
  const argsToKeep = a.postargs.length;
  const node = (arg, type, props = {}) => s(arg, type, { name: arg.name, argName: arg.argName, ...props });

  if (a.blockarg) initialization.push(node(a.blockarg, "OpalExtractBlockarg"));
  for (const arg of a.shadowargs) initialization.push(node(arg, "OpalInitializeShadowarg"));

  for (const arg of a.args) {
    // block args are not required, so we need to tell compiler that
    // required args must be initialized with nil-s
    if (type === "iter") initialization.push(node(arg, "OpalInitializeIterArg"));
    inline.push(node(arg, "OpalArgNode"));
  }

  // A lone rest arg (no post, optional or extracted kwargs) can slice
  // arguments directly instead of going through $post_args.
  const restOnly = a.restarg != null && a.postargs.length === 0 && a.optargs.length === 0 && !a.hasAnyKwargs();

  if (a.hasPostArgs() && !restOnly) initialization.push(s(origin, "OpalPreparePostArgs", { offset: a.args.length }));

  if (a.hasAnyKwargs()) {
    if (a.canInlineKwargs()) {
      inline.push(s(origin, "OpalArgNode", { name: "$kwargs", argName: "$kwargs" }));
    } else {
      initialization.push(s(origin, "OpalExtractKwargs"));
      inline.push(s(origin, "OpalFakeArg"));
    }
    initialization.push(s(origin, "OpalEnsureKwargsAreKwargs"));
  }

  const hasPostArgs = a.hasPostArgs();
  for (const arg of a.optargs) {
    if (hasPostArgs) {
      // optional post argument like 'def m(opt = 1, a)'
      initialization.push(node(arg, "OpalExtractPostOptarg", { defaultValue: arg.value, argsToKeep }));
      inline.push(s(arg, "OpalFakeArg"));
    } else {
      // optional inline argument like 'def m(a, opt = 1)'
      inline.push(node(arg, "OpalArgNode"));
      initialization.push(node(arg, "OpalExtractOptarg", { defaultValue: arg.value }));
    }
  }

  if (a.restarg) {
    initialization.push(node(a.restarg, "OpalExtractRestarg", { argsToKeep, offset: restOnly ? a.args.length : null }));
    inline.push(s(a.restarg, "OpalFakeArg"));
  }

  // post arguments must be extracted with an offset
  for (const arg of a.postargs) {
    initialization.push(node(arg, "OpalExtractPostArg"));
    inline.push(s(arg, "OpalFakeArg"));
  }

  for (const arg of a.kwargs) initialization.push(node(arg, "OpalExtractKwarg"));
  for (const arg of a.kwoptargs) initialization.push(node(arg, "OpalExtractKwoptarg", { defaultValue: arg.value }));
  if (a.kwrestarg) initialization.push(node(a.kwrestarg, "OpalExtractKwrestarg"));

  return { inline, initialization, mlhsInit, args };
}

// The statements of a body (null, a single node or a begin) with the given
// statements in front (Rewriters::Base#prepend_to_body).
export function prependToBody(origin, body, stmts) {
  const all = [...stmts, ...stmtsOf(body)];
  if (all.length === 0) return null;
  if (all.length === 1) return all[0];
  return s(origin, "OpalBegin", { body: all });
}

function stmtsOf(node) {
  if (!node) return [];
  if (node.type === "StatementsNode" || node.type === "OpalBegin" || node.type === "OpalKwbegin") return node.body;
  if (node.type === "ParenthesesNode") return node.body ? node.body.body : [];
  return [node];
}

// The default value of an optional argument: `def m(a = a)` refers to the
// argument itself, which is nil (Ruby 3.4).
function defaultValue(node) {
  const value = node.defaultValue;
  if (value && value.type === "LocalVariableReadNode" && value.name === node.argName) {
    return { type: "NilNode", location: value.location };
  }
  return value;
}

// Is the optional argument's default value the magic `undefined`?
function isUndefinedDefault(value) {
  return value && value.type === "CallNode" && value.name === "undefined" && !value.receiver && !value.arguments && !value.block;
}

// The inline JS parameters, joined with commas.
export class ArgsNode extends Base {
  static {
    this.handle("OpalArgs");
  }

  compile() {
    this.node.args.forEach((arg, idx) => {
      if (idx !== 0) this.push(", ");
      this.push(this.process(arg));
    });
  }
}

// A single inline required argument: def m(a); end
export class ArgNode extends Base {
  static {
    this.handle("OpalArgNode");
  }

  compile() {
    this.scope.addArg(this.node.name);
    this.push(this.node.name);
  }
}

// An argument that gets initialized later in the function body:
// def m(a = 1, b); end
//              ^
export class FakeArgNode extends Base {
  static {
    this.handle("OpalFakeArg");
  }

  compile() {
    const name = this.scope.nextTemp();
    this.scope.addArg(name);
    this.push(name);
  }
}

// def m(&block); end
export class ExtractBlockarg extends Base {
  static {
    this.handle("OpalExtractBlockarg");
  }

  compile() {
    this.scope.usesBlock();
    this.scope.addArg(this.node.name);
    this.scope.prepareBlock(this.node.name);
  }
}

// proc { |;a| }
export class InitializeShadowarg extends Base {
  static {
    this.handle("OpalInitializeShadowarg");
  }

  compile() {
    const name = this.node.name;
    this.scope.pushLocal(name);
    this.scope.addArg(name);
    this.push(`${name} = nil`);
  }
}

// Procs don't have arity checking and code like
//   proc { |a| }.call
// must return nil
export class InitializeIterarg extends Base {
  static {
    this.handle("OpalInitializeIterArg");
  }

  compile() {
    const name = this.node.name;
    this.push(`${name} ??= nil`);
  }
}

// def m(a, opt = 1); end
export class ExtractOptargNode extends Base {
  static {
    this.handle("OpalExtractOptarg");
  }

  compile() {
    const { name } = this.node;
    if (isUndefinedDefault(this.node.defaultValue)) return;
    this.push(`${name} ??= `, this.expr(defaultValue(this.node)));
  }
}

export class PreparePostArgs extends Base {
  static {
    this.handle("OpalPreparePostArgs");
  }

  compile() {
    this.addTemp("$post_args");
    this.helper("slice");
    const offset = this.node.offset;
    this.push(offset === 0 ? "$post_args = $slice(arguments)" : `$post_args = $slice(arguments, ${offset})`);
  }
}

// When kwargs cannot be inlined: def m(a = 1, kw:); end
export class ExtractKwargs extends Base {
  static {
    this.handle("OpalExtractKwargs");
  }

  compile() {
    this.addTemp("$kwargs");
    this.helper("extract_kwargs");
    this.push("$kwargs = $extract_kwargs($post_args)");
  }
}

export class EnsureKwargsAreKwargs extends Base {
  static {
    this.handle("OpalEnsureKwargsAreKwargs");
  }

  compile() {
    this.helper("ensure_kwargs");
    this.push("$kwargs = $ensure_kwargs($kwargs)");
  }
}

// def m(a: 1); end with `a` required
export class ExtractKwarg extends Base {
  static {
    this.handle("OpalExtractKwarg");
  }

  compile() {
    const { name, argName } = this.node;
    this.scope.usedKwargs.push(argName);
    this.addTemp(name);
    this.helper("get_kwarg");
    this.push(`${name} = $get_kwarg($kwargs, ${rubyInspect(argName)})`);
  }
}

export class ExtractKwoptarg extends Base {
  static {
    this.handle("OpalExtractKwoptarg");
  }

  compile() {
    const { name, argName } = this.node;
    this.helper("hash_get");
    this.scope.usedKwargs.push(argName);
    this.addTemp(name);

    this.line(`${name} = $hash_get($kwargs, ${rubyInspect(argName)});`);

    if (isUndefinedDefault(this.node.defaultValue)) return;

    this.push(`${name} ??= `, this.expr(defaultValue(this.node)));
  }
}

export class ExtractKwrestarg extends Base {
  static {
    this.handle("OpalExtractKwrestarg");
  }

  compile() {
    const name = this.node.name || "$kw_rest_arg";
    this.addTemp(name);
    this.helper("kwrestargs");
    const used = this.scope.usedKwargs.map((arg) => `'${arg}': true`).join(",");
    this.push(`${name} = $kwrestargs($kwargs, {${used}})`);
  }
}

export class ExtractPostArg extends Base {
  static {
    this.handle("OpalExtractPostArg");
  }

  compile() {
    const name = this.node.name;
    this.addTemp(name);
    this.line(`${name} = $post_args.shift();`);
    this.push(`${name} ??= nil`);
  }
}

export class ExtractPostOptarg extends Base {
  static {
    this.handle("OpalExtractPostOptarg");
  }

  compile() {
    const { name, argsToKeep } = this.node;
    this.addTemp(name);
    this.line(`if ($post_args.length > ${argsToKeep}) ${name} = $post_args.shift();`);
    if (isUndefinedDefault(this.node.defaultValue)) return;
    this.push(`${name} ??= `, this.expr(defaultValue(this.node)));
  }
}

export class ExtractRestarg extends Base {
  static {
    this.handle("OpalExtractRestarg");
  }

  compile() {
    const name = this.node.name || "$rest_arg";
    const { argsToKeep, offset } = this.node;
    this.addTemp(name);
    if (offset != null) {
      // restOnly: no $post_args to copy, slice the arguments directly
      this.helper("slice");
      this.push(offset === 0 ? `${name} = $slice(arguments)` : `${name} = $slice(arguments, ${offset})`);
    } else if (argsToKeep === 0) {
      // no post-args, we are free to grab everything
      this.push(`${name} = $post_args`);
    } else {
      this.push(`${name} = $post_args.splice(0, $post_args.length - ${argsToKeep})`);
    }
  }
}

// $$parameters for arity checks (Args::Parameters).
export function parametersCode(args) {
  const parts = [];
  for (const arg of args) {
    switch (arg.argType) {
      case "arg":
        parts.push(`['req', '${arg.argName}']`);
        break;
      case "mlhs":
        parts.push("['req']");
        break;
      case "optarg":
        parts.push(`['opt', '${arg.argName}']`);
        break;
      case "restarg":
        parts.push(arg.argName ? `['rest', '${arg.argName}']` : "['rest']");
        break;
      case "kwarg":
        parts.push(`['keyreq', '${arg.argName}']`);
        break;
      case "kwoptarg":
        parts.push(`['key', '${arg.argName}']`);
        break;
      case "kwrestarg":
        parts.push(arg.argName ? `['keyrest', '${arg.argName}']` : "['keyrest']");
        break;
      case "blockarg":
        parts.push(`['block', '${arg.argName}']`);
        break;
      case "kwnilarg":
        parts.push("['nokey']");
        break;
    }
  }
  return `[${parts.join(", ")}]`;
}

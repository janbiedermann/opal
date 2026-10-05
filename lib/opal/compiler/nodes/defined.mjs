// defined?(...). Port of the former Ruby lib/opal/nodes/defined.rb.
import { Base, callArguments } from "./base.mjs";
import { rubyInspect } from "../helpers.mjs";

const ASSIGNMENTS = new Set([
  "LocalVariableWriteNode", "InstanceVariableWriteNode", "GlobalVariableWriteNode",
  "ClassVariableWriteNode", "ConstantWriteNode", "ConstantPathWriteNode",
]);

export class DefinedNode extends Base {
  static {
    this.handle("DefinedNode");
  }

  compile() {
    const value = this.node.value;
    switch (value.type) {
      case "SelfNode":
        return this.push(rubyInspect("self"));
      case "NilNode":
        return this.push(rubyInspect("nil"));
      case "FalseNode":
        return this.push(rubyInspect("false"));
      case "TrueNode":
        return this.push(rubyInspect("true"));
      case "LocalVariableReadNode":
        return this.push("'local-variable'");
      case "ParenthesesNode": {
        const body = value.body && value.body.type === "StatementsNode" ? value.body.body : [];
        if (body.length === 1 && body[0].type === "MultiWriteNode") return this.push("'assignment'");
        return this.push("'expression'");
      }
      case "CallNode":
        this.compileDefinedSend(value);
        return this.wrap("(", " ? 'method' : nil)");
      case "InstanceVariableReadNode":
        this.compileDefinedIvar(value);
        return this.wrap("(", " ? 'instance-variable' : nil)");
      case "ForwardingSuperNode":
      case "SuperNode":
        return this.compileDefinedSuper();
      case "YieldNode":
        this.compileDefinedYield();
        return this.wrap("(", " ? 'yield' : nil)");
      case "XStringNode":
      case "InterpolatedXStringNode":
        return this.compileDefinedXstr(value);
      case "ConstantReadNode":
      case "ConstantPathNode":
        this.compileDefinedConst(value);
        return this.wrap("((", ") != null ? 'constant' : nil)");
      case "ClassVariableReadNode":
        this.compileDefinedCvar(value);
        return this.wrap("(", " ? 'class variable' : nil)");
      case "GlobalVariableReadNode":
        this.compileDefinedGvar(value);
        return this.wrap("(", " ? 'global-variable' : nil)");
      case "BackReferenceReadNode":
        this.compileDefinedBackRef();
        return this.wrap("(", " ? 'global-variable' : nil)");
      case "NumberedReferenceReadNode":
        this.compileDefinedNthRef();
        return this.wrap("(", " ? 'global-variable' : nil)");
      case "ArrayNode":
        this.compileDefinedArray(value);
        return this.wrap("(", " ? 'expression' : nil)");
      default:
        if (ASSIGNMENTS.has(value.type) || value.type === "MultiWriteNode") return this.push("'assignment'");
        return this.push("'expression'");
    }
  }

  compileDefined(node) {
    switch (node.type) {
      case "CallNode": return this.compileDefinedSend(node);
      case "InstanceVariableReadNode": return this.compileDefinedIvar(node);
      case "SuperNode": return this.compileDefinedSuper();
      case "YieldNode": return this.compileDefinedYield();
      case "XStringNode":
      case "InterpolatedXStringNode": return this.compileDefinedXstr(node);
      case "ConstantReadNode":
      case "ConstantPathNode": return this.compileDefinedConst(node);
      case "ClassVariableReadNode": return this.compileDefinedCvar(node);
      case "GlobalVariableReadNode": return this.compileDefinedGvar(node);
      case "BackReferenceReadNode": return this.compileDefinedBackRef();
      case "NumberedReferenceReadNode": return this.compileDefinedNthRef();
      case "ArrayNode": return this.compileDefinedArray(node);
      default: {
        const nodeTmp = this.scope.newTemp();
        this.push(`(${nodeTmp} = `, this.expr(node), ")");
        return nodeTmp;
      }
    }
  }

  wrapWithTryCatch(code) {
    const returningTmp = this.scope.newTemp();

    this.helper("pop_exception");
    this.helper("rescue");

    this.push(`(${returningTmp} = (function() { try {`);
    this.push(`  return ${code};`);
    this.push("} catch ($err) {");
    this.push("  if ($rescue($err, [Opal.Exception])) {");
    this.push("    try {");
    this.push("      return false;");
    this.push("    } finally { $pop_exception($err); }");
    this.push("  } else { throw $err; }");
    this.push("}})())");

    return returningTmp;
  }

  compileDefinedSend(node) {
    const recv = node.receiver;
    const methodName = node.name;
    const mid = this.midToJsid(methodName);
    let recvTmp;

    if (recv) {
      let recvCode = this.compileDefined(recv);
      this.push(" && ");

      if (recv.type === "CallNode") {
        recvCode = this.wrapWithTryCatch(recvCode);
        this.push(" && ");
      }

      recvTmp = this.scope.newTemp();
      this.push(`(${recvTmp} = `, recvCode, `, ${recvTmp}) && `);
    } else {
      recvTmp = this.scope.getSelf();
    }

    const recvValueTmp = this.scope.newTemp();
    this.push(`(${recvValueTmp} = ${recvTmp}) && `);

    const methTmp = this.scope.newTemp();
    this.push(`(((${methTmp} = ${recvValueTmp}${mid}) && !${methTmp}.$$stub)`);

    this.push(` || ${recvValueTmp}['$respond_to_missing?']('${methodName}'))`);

    for (const arg of callArguments(node)) {
      this.push(" && ");
      this.compileDefined(arg);
    }

    this.wrap("(", ")");
    return `${methTmp}()`;
  }

  compileDefinedIvar(node) {
    const name = node.name.slice(1);
    // FIXME: this check should be positive for ivars initialized as nil too.
    // Since currently all known ivars are inialized to nil in the constructor
    // we can't tell if it was the user that put nil and made the ivar #defined?
    // or not.
    const tmp = this.scope.newTemp();
    this.push(`(${tmp} = ${this.scope.getSelf()}['${name}'], ${tmp} != null && ${tmp} !== nil)`);
    return tmp;
  }

  compileDefinedSuper() {
    this.push(this.expr(this.s("OpalDefinedSuper", { arguments: null, block: null })));
  }

  compileDefinedYield() {
    this.scope.usesBlock();
    const blockName = this.scope.blockName || this.scope.findParentDef().blockName;
    this.push(`(${blockName} != null && ${blockName} !== nil)`);
    return blockName;
  }

  compileDefinedXstr(node) {
    this.push("(typeof(", this.expr(node), ') !== "undefined")');
  }

  compileDefinedConst(node) {
    const constTmp = this.scope.newTemp();
    const name = node.name;

    if (node.type === "ConstantReadNode") {
      this.push(`(${constTmp} = ${this.scope.relativeAccess()}('${name}', 'skip_raise'))`);
    } else if (!node.parent) {
      this.push(`(${constTmp} = ${this.topScope.absoluteConst()}('::', '${name}', 'skip_raise'))`);
    } else {
      const constScopeTmp = this.compileDefined(node.parent);
      this.push(` && (${constTmp} = ${this.topScope.absoluteConst()}(${constScopeTmp}, '${name}', 'skip_raise'))`);
    }
    return constTmp;
  }

  compileDefinedCvar(node) {
    const cvarTmp = this.scope.newTemp();
    this.push(`(${cvarTmp} = ${this.classVariableOwner()}.$$cvars['${node.name}'], ${cvarTmp} != null)`);
    return cvarTmp;
  }

  compileDefinedGvar(node) {
    this.helper("gvars");

    const name = node.name.slice(1);
    const gvarTemp = this.scope.newTemp();

    if (name === "~" || name === "!") {
      this.push(`(${gvarTemp} = `, this.expr(node), " || true)");
    } else {
      this.push(`(${gvarTemp} = $gvars[${rubyInspect(name)}], ${gvarTemp} != null)`);
    }
    return gvarTemp;
  }

  compileDefinedBackRef() {
    this.helper("gvars");
    const backRefTemp = this.scope.newTemp();
    this.push(`(${backRefTemp} = $gvars['~'], ${backRefTemp} != null && ${backRefTemp} !== nil)`);
    return backRefTemp;
  }

  compileDefinedNthRef() {
    this.helper("gvars");
    const nthRefTmp = this.scope.newTemp();
    this.push(`(${nthRefTmp} = $gvars['~'], ${nthRefTmp} != null && ${nthRefTmp} != nil)`);
    return nthRefTmp;
  }

  compileDefinedArray(node) {
    node.elements.forEach((child, idx) => {
      if (idx !== 0) this.push(" && ");
      this.compileDefined(child);
    });
  }
}

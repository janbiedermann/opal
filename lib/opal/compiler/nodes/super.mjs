// super. Port of lib/opal/nodes/super.rb.
//
// SuperNode is `super(...)` with explicit arguments (s(:super)),
// ForwardingSuperNode is a bare `super` passing the method's own
// arguments (s(:zsuper)).
import { CallNode, expandArguments, callBlock } from "./call.mjs";

export class BaseSuperNode extends CallNode {
  constructor(node, level, compiler) {
    super(node, level, compiler);
    this.iter = callBlock(node) || this.s("OpalJsTmp", { value: "null" });
    this.arglist = expandArguments(node);
    this.recvr = this.s("SelfNode");
  }

  compileUsingSend() {
    this.helper("send2");

    this.push("$send2(");
    this.compileReceiver();
    this.compileMethodBody();
    this.compileMethodName();
    this.compileArguments();
    this.compileBlockPass();
    this.push(")");
  }

  // Using super in a block inside a method is allowed, e.g.
  // def a
  //  { super }
  // end
  //
  // This method finds returns a closest def (or lambda) scope
  defScope() {
    if (this.defScopeValue === undefined) {
      this.defScopeValue = this.scope.isDef() ? this.scope : this.scope.findParentDef();
    }
    return this.defScopeValue;
  }

  definedCheckParam() {
    return "false";
  }

  implicitArgumentsParam() {
    return "false";
  }

  methodId() {
    return String(this.defScope().mid);
  }

  defScopeIdentity() {
    const defScope = this.defScope();
    return defScope.identify(defScope.mid);
  }

  allowStubs() {
    return "true";
  }

  superMethodInvocation() {
    this.helper("find_super");
    return `$find_super(${this.scope.getSelf()}, '${this.methodId()}', ${this.defScopeIdentity()}, ${this.definedCheckParam()}, ${this.allowStubs()})`;
  }

  superBlockInvocation() {
    this.helper("find_block_super");
    const [chain, curDefn, mid] = this.scope.superChain();
    const trys = chain.map((c) => `${c}.$$def`).join(" || ");
    return `$find_block_super(${this.scope.getSelf()}, ${mid}, (${trys} || ${curDefn}), ${this.definedCheckParam()}, ${this.implicitArgumentsParam()})`;
  }

  compileMethodBody() {
    this.push(", ");
    if (this.scope.isDef()) {
      this.push(this.superMethodInvocation());
    } else if (this.scope.isIter()) {
      this.push(this.superBlockInvocation());
    } else {
      throw new Error("super must be called from method body or block");
    }
  }

  compileMethodName() {
    if (this.scope.isDef()) {
      this.push(`, '${this.methodId()}'`);
    } else if (this.scope.isIter()) {
      const [, , mid] = this.scope.superChain();
      this.push(`, ${mid}`);
    }
  }
}

// defined?(super)
export class DefinedSuperNode extends BaseSuperNode {
  static {
    this.handle("OpalDefinedSuper");
  }

  allowStubs() {
    return "false";
  }

  definedCheckParam() {
    return "true";
  }

  compile() {
    this.compileReceiver();
    this.compileMethodBody();

    this.wrap("((", ') != null ? "super" : nil)');
  }
}

// super with explicit args
export class SuperNode extends BaseSuperNode {
  static {
    this.handle("SuperNode");
  }

  constructor(node, level, compiler) {
    super(node, level, compiler);
    if (this.scope.isDef()) this.scope.usesBlock();
  }

  compile() {
    this.compileUsingSend();
  }
}

// super with implicit args
export class ZsuperNode extends SuperNode {
  static {
    this.handle("ForwardingSuperNode");
  }

  constructor(node, level, compiler) {
    super(node, level, compiler);

    // preserve a block if we have one already but otherwise, assume a block is coming from higher
    // up the chain
    if (this.iter.type !== "BlockNode") {
      // Need to support passing block up even if it's not referenced in this method at all
      this.scope.usesBlock();
      this.iter = this.s("OpalJsTmp", { value: this.scope.blockName || "$yield" });
    }
  }

  implicitArgumentsParam() {
    return "true";
  }

  compile() {
    if (this.defScope()) this.arglist = this.implicitArglist();
    this.compileUsingSend();
  }

  implicitArglist() {
    const args = [];
    const kwargs = [];
    const lvar = (name) => this.s("OpalLvar", { name });

    for (const arg of this.defScope().originalArgs) {
      switch (arg.argType) {
        case "arg":
        case "optarg":
          args.push(lvar(arg.name));
          break;
        case "restarg":
          args.push(this.s("SplatNode", { expression: arg.name ? lvar(arg.name) : this.s("OpalJsTmp", { value: "$rest_arg" }) }));
          break;
        case "kwarg":
        case "kwoptarg":
          kwargs.push(this.s("AssocNode", { key: this.s("SymbolNode", { unescaped: arg.argName }), value: lvar(arg.name) }));
          break;
        case "kwrestarg":
          kwargs.push(this.s("AssocSplatNode", { value: arg.name ? lvar(arg.name) : this.s("OpalJsTmp", { value: "$kw_rest_arg" }) }));
          break;
      }
    }

    if (kwargs.length > 0) args.push(this.s("OpalHash", { elements: kwargs }));
    return args;
  }
}

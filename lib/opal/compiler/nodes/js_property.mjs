// The .JS syntax. Port of the former Ruby lib/opal/nodes/call/js_property.rb.
import { Base } from "./base.mjs";
import { CallNode } from "./call.mjs";

// recvr.JS[:prop]  =>  recvr.prop
export class JsAttrNode extends Base {
  static {
    this.handle("OpalJsAttr");
  }

  compile() {
    this.push(this.recv(this.node.recvr || this.s("SelfNode")), "[", this.expr(this.node.property), "]");
  }
}

// recvr.JS[:prop] = value  =>  recvr.prop = value
export class JsAttrAsgnNode extends Base {
  static {
    this.handle("OpalJsAttrAsgn");
  }

  compile() {
    this.push(this.recv(this.node.recvr || this.s("SelfNode")), "[", this.expr(this.node.property), "] = ", this.expr(this.node.value));
  }
}

// recvr.JS.meth(args)  =>  recvr.meth(args)
export class JsCallNode extends CallNode {
  static {
    this.handle("OpalJsCall");
  }

  constructor(node, level, compiler) {
    super(node, level, compiler);

    // For .JS. call we pass a block as a plain JS callback
    if (this.iter) {
      if (this.iter.type === "BlockNode") this.iter = { ...this.iter, plainJsFunction: true };
      this.arglist = [...this.arglist, this.iter];
    }
    this.iter = null;
  }

  compile() {
    this.defaultCompile();
  }

  methodJsid() {
    return `.${this.meth}`;
  }

  compileUsingSend() {
    this.push(this.recv(this.receiverNode()), this.methodJsid(), ".apply(null");
    this.compileArguments();
    if (this.iter) this.push(".concat(", this.expr(this.iter), ")");
    this.push(")");
  }
}

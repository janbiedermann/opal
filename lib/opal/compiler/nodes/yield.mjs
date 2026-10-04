// yield. Port of lib/opal/nodes/yield.rb.
import { Base, callArguments } from "./base.mjs";

export class YieldNode extends Base {
  static {
    this.handle("YieldNode", "OpalReturnableYield");
  }

  // The YieldNode (OpalReturnableYield wraps one that must be returned).
  get yieldNode() {
    return this.type === "OpalReturnableYield" ? this.node.yield : this.node;
  }

  compile() {
    const children = callArguments(this.yieldNode);
    const yieldingScope = this.findYieldingScope();

    yieldingScope.usesBlock();
    if (!yieldingScope.blockName) yieldingScope.blockName = "$yield";

    const blockName = yieldingScope.blockName;
    const usesSplat = children.some((child) => child.type === "SplatNode");

    if (!usesSplat && children.length === 1) {
      this.push(this.expr(children[0]));
      this.helper("yield1");
      this.wrap(`$yield1(${blockName}, `, ")");
    } else {
      this.push(this.expr(this.s("OpalArglist", { args: children })));

      this.helper("yieldX");
      if (usesSplat) {
        this.wrap(`$yieldX(${blockName}, `, ")");
      } else {
        this.wrap(`$yieldX(${blockName}, [`, "])");
      }
    }

    // Created by Compiler#returns when a yield statement should return
    // its value (it's last in a block etc).
    if (this.type === "OpalReturnableYield") this.wrap("return ", ";");
  }

  findYieldingScope() {
    let working = this.scope;
    while (working) {
      if (working.blockName || working.isDef()) break;
      working = working.parent;
    }
    return working;
  }
}

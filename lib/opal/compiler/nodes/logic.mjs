// Control flow keywords. Port of the former Ruby lib/opal/nodes/logic.rb.
import { Base } from "./base.mjs";

// The value of next/return: nil, the single argument, or an array of them.
function keywordValue(node, origin) {
  const args = node.arguments ? node.arguments.arguments : [];
  if (args.length === 0) return null;
  if (args.length === 1) return args[0];
  return { type: "ArrayNode", location: origin.location, elements: args };
}

export class NextNode extends Base {
  static {
    this.handle("NextNode");
  }

  compile() {
    this.thrower("next", keywordValue(this.node, this.node) || this.s("NilNode"));
  }
}

export class BreakNode extends Base {
  static {
    this.handle("BreakNode");
  }

  compile() {
    // The Ruby compiler only uses the first value of `break a, b`
    const args = this.node.arguments ? this.node.arguments.arguments : [];
    this.thrower("break", args[0] || null);
  }
}

export class RedoNode extends Base {
  static {
    this.handle("RedoNode");
  }

  compile() {
    if (this.inWhile()) {
      this.push(`${this.whileLoop.redoVar} = true;`);
      this.thrower("redo");
    } else if (this.scope.isIter()) {
      this.helper("slice");
      this.push(`return ${this.scope.identity}.apply(null, $slice(arguments))`);
    } else {
      this.push("REDO()");
    }
  }
}

export class RetryNode extends Base {
  static {
    this.handle("RetryNode");
  }

  compile() {
    this.thrower("retry");
  }
}

export class ReturnNode extends Base {
  static {
    this.handle("ReturnNode");
  }

  compile() {
    this.thrower("return", keywordValue(this.node, this.node) || this.s("NilNode"));
  }
}

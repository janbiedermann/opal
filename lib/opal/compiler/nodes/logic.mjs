// Control flow keywords. Port of the former Ruby lib/opal/nodes/logic.rb.
import { Base } from "./base.mjs";

// The value of next/break/return: nil, the single argument, or an array of
// them (also for a single splat: `break *a`).
function keywordValue(node, origin) {
  const args = node.arguments ? node.arguments.arguments : [];
  if (args.length === 0) return null;
  if (args.length === 1 && args[0].type !== "SplatNode") return args[0];
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
    this.thrower("break", keywordValue(this.node, this.node));
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
      this.scope.identityUsed = true;
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

// END { } (see transforms/pre_post_execution.mjs): registers its at_exit
// block once, even when it runs several times; the value is nil.
export class EndOnceNode extends Base {
  static {
    this.handle("OpalEndOnce");
  }

  compile() {
    const flag = this.compiler.uniqueTemp("end_registered");
    this.topScope.addScopeTemp(`${flag} = false`);
    this.push(`(${flag} ? nil : (${flag} = true, `, this.expr(this.node.call), ", nil))");
  }
}


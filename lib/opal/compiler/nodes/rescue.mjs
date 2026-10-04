// begin/rescue/else/ensure. Port of lib/opal/nodes/rescue.rb and KwBeginNode
// from lib/opal/nodes/definitions.rb, on the OpalKwbegin, OpalEnsure,
// OpalRescue and OpalResbody nodes built by transforms/normalize.mjs.
import { BeginNode } from "./begin.mjs";
import { Base } from "./base.mjs";
import { NONE, JS_FUNCTION, JS_LOOP, JS_LOOP_INSIDE, RESCUE_RETRIER } from "../closure.mjs";

// begin; ...; end
export class KwBeginNode extends BeginNode {
  static {
    this.handle("OpalKwbegin");
  }
}

export class EnsureNode extends Base {
  static {
    this.handle("OpalEnsure");
  }

  compile() {
    const wrapInClosure = this.wrapInClosure();
    if (wrapInClosure) this.pushClosure();

    this.push("try {");

    this.inEnsure(() => this.line(this.stmt(this.bodyNode())));

    this.line("} finally {");

    this.indent(() => {
      if (this.hasRescueElseHere()) {
        // $no_errors indicates thate there were no error raised
        this.unshift("var $no_errors = true; ");

        // when there's a begin;rescue;else;ensure;end statement,
        // ruby returns a result of the 'else' branch
        // but invokes it before 'ensure'.
        // so, here we
        // 1. save the result of calling else to $rescue_else_result
        // 2. call ensure
        // 2. return $rescue_else_result
        this.line("var $rescue_else_result;");
        this.line("if ($no_errors) { ");
        this.indent(() => {
          this.line("$rescue_else_result = (function() {");
          this.indent(() => this.line(this.stmt(this.rescueElseCode())));
          this.line("})();");
        });
        this.line("}");
        this.line(this.compiler.process(this.ensrNode(), this.level));
        this.line("if ($no_errors) { return $rescue_else_result; }");
      } else {
        this.line(this.compiler.process(this.ensrNode(), this.level));
      }
    });

    this.line("}");

    if (wrapInClosure) this.popClosure();

    if (wrapInClosure) {
      if (this.scope.awaitEncountered) {
        this.wrap("(await (async function() { ", "; })())");
      } else {
        this.wrap("(function() { ", "; })()");
      }
    }
  }

  bodyNode() {
    if (this.wrapInClosure()) return this.compiler.returns(this.node.body);
    return this.node.body;
  }

  ensrNode() {
    return this.node.ensureBody || this.s("NilNode");
  }

  wrapInClosure() {
    return this.isRecv() || this.isExpr() || this.hasRescueElseHere();
  }

  rescueElseCode() {
    let code = this.scope.rescueElseNode;
    if (!this.isStmt()) code = this.compiler.returns(code);
    return code;
  }

  hasRescueElseHere() {
    return !!this.node.hasRescueElse;
  }
}

export class RescueNode extends Base {
  static {
    this.handle("OpalRescue");
  }

  compile() {
    this.scope.rescueElseNode = this.node.elseBody;

    if (this.handleRescueElseManually()) this.line("var $no_errors = true;");

    let closureType = NONE;
    if (this.isExpr() || this.isRecv()) closureType |= JS_FUNCTION;
    if (this.hasRetry()) closureType |= JS_LOOP | JS_LOOP_INSIDE | RESCUE_RETRIER;
    if (closureType !== NONE) this.pushClosure(closureType);

    this.inRescue(this, () => {
      this.push("try {");
      this.indent(() => this.line(this.stmt(this.bodyCode())));
      this.line("} catch ($err) {");

      this.indent(() => {
        if (this.hasRescueElse()) this.line("$no_errors = false;");

        this.node.resbodies.forEach((child, idx) => {
          if (idx !== 0) this.push(" else ");
          this.line(this.process(child, this.level));
        });

        // if no resbodys capture our error, then rethrow
        this.push(" else { throw $err; }");
      });

      this.line("}");

      if (this.handleRescueElseManually()) {
        // here we must add 'finally' explicitly
        this.push("finally {");
        this.indent(() => {
          this.line("if ($no_errors) { ");
          this.indent(() => this.line(this.stmt(this.rescueElseCode())));
          this.line("}");
        });
        this.push("}");
      }
    });

    if (closureType !== NONE) this.popClosure();

    if (this.hasRetry()) this.wrap("do { ", " break; } while(1)");

    // Wrap a try{} catch{} into a function
    // when it's an expression
    // or when there's a method call after begin;rescue;end
    if (this.isExpr() || this.isRecv()) {
      if (this.scope.awaitEncountered) {
        this.wrap("(await (async function() { ", "})())");
      } else {
        this.wrap("(function() { ", "})()");
      }
    }
  }

  bodyCode() {
    let code = this.node.body || this.s("NilNode");
    if (!this.isStmt()) code = this.compiler.returns(code);
    return code;
  }

  rescueElseCode() {
    let code = this.scope.rescueElseNode;
    if (!this.isStmt()) code = this.compiler.returns(code);
    return code;
  }

  // Returns true when there's no 'ensure' statement
  //  wrapping current rescue.
  handleRescueElseManually() {
    return !this.isInEnsure() && this.hasRescueElse();
  }

  hasRetry() {
    return !!this.node.hasRetry;
  }
}

export class ResBodyNode extends Base {
  static {
    this.handle("OpalResbody");
  }

  compile() {
    this.helper("rescue");
    this.helper("pop_exception");

    this.push("if ($rescue($err, ", this.expr(this.klasses()), ")) {");
    this.indent(() => {
      if (this.node.lvar) this.push(this.expr(this.node.lvar));

      // Need to ensure we clear the current exception out after the rescue block ends
      this.line("try {");
      this.indent(() => {
        this.inResbody(() => this.line(this.stmt(this.rescueBody())));
      });
      this.line("} finally { $pop_exception($err); }");
    });
    this.line("}");
  }

  klasses() {
    return this.node.klasses || this.s("ArrayNode", { elements: [this.s("ConstantReadNode", { name: "StandardError" })] });
  }

  rescueBody() {
    let code = this.node.body || this.s("NilNode");
    if (!this.isStmt()) code = this.compiler.returns(code);
    return code;
  }
}

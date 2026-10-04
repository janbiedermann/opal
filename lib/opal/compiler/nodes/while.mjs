// while/until loops, including the `begin ... end while` forms. Port of
// lib/opal/nodes/while.rb.
import { Base } from "./base.mjs";
import { JS_FUNCTION, JS_LOOP, JS_LOOP_INSIDE, LOOP, LOOP_INSIDE, RETRY_CONTAINER } from "../closure.mjs";
import { eachChild } from "../transforms/walk.mjs";
import { bodyOf } from "../transforms/walk.mjs";

function containsType(node, type) {
  let found = false;
  const visit = (child) => {
    if (found) return;
    if (child.type === type) found = true;
    else eachChild(child, visit);
  };
  if (node) visit(node);
  return found;
}

export class WhileNode extends Base {
  static {
    this.handle("WhileNode", "UntilNode");
  }

  get isUntil() {
    return this.type === "UntilNode";
  }

  // `begin ... end while cond` runs the body before the first test
  get isPost() {
    return !!(this.node.flags && this.node.flags.includes("begin_modifier"));
  }

  compile() {
    const test = this.node.predicate;
    const body = bodyOf(this.node.statements);
    const testCode = this.jsTruthy(test);

    if (this.usesRedo()) this.redoVar = this.scope.newTemp();

    this.compiler.inWhile(() => {
      if (this.wrapInClosure()) this.whileLoop.closure = true;
      this.whileLoop.redoVar = this.redoVar;

      const hasRetry = containsType(body, "RetryNode");

      this.inClosure(LOOP | JS_LOOP | (this.wrapInClosure() ? JS_FUNCTION : 0) | (hasRetry ? RETRY_CONTAINER : 0), () => {
        this.inClosure(LOOP_INSIDE | JS_LOOP_INSIDE | (hasRetry ? RETRY_CONTAINER : 0), () => {
          this.line(this.indent(() => this.stmt(body)));
        });

        if (this.usesRedo()) {
          this.compileWhile(testCode, `${this.redoVar} = false;`);
        } else {
          this.compileWhile(testCode);
        }
      });
    });

    if (this.usesRedo()) this.scope.queueTemp(this.redoVar);

    if (this.wrapInClosure()) {
      if (this.scope.awaitEncountered) {
        this.wrap("(await (async function() {", "; return nil; })())");
      } else {
        this.wrap("(function() {", "; return nil; })()");
      }
    }
  }

  compileWhile(testCode, redoCode = null) {
    if (this.isPost) {
      if (redoCode) this.unshift(redoCode);
      this.unshift("do {");
      this.line("} ", this.whileOpen(), testCode, this.whileClose());
    } else {
      if (redoCode) this.unshift(redoCode);
      this.unshift(this.whileOpen(), testCode, this.whileClose());
      if (redoCode) this.unshift(redoCode);
      this.line("}");
    }
  }

  whileOpen() {
    const redoPart = this.usesRedo() ? `${this.redoVar} || ` : "";
    return this.isUntil ? `while (${redoPart}!(` : `while (${redoPart}`;
  }

  whileClose() {
    if (this.isPost) return this.isUntil ? "));" : ");";
    return this.isUntil ? ")) {" : ") {";
  }

  usesRedo() {
    return !!this.node.hasRedo;
  }

  wrapInClosure() {
    return this.isExpr() || this.isRecv();
  }
}

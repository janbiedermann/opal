// Conditionals. Port of lib/opal/nodes/if.rb.
//
// Works on OpalIf nodes (see transforms/conditionals.mjs), which have the
// parser gem's s(:if, test, true_body, false_body) shape: `case`, `&&` and
// `||` have been rewritten into them before code generation.
import { Base, callArguments } from "./base.mjs";
import { eachChild, isNode } from "../transforms/walk.mjs";
import { xstringIsSingleLine } from "./x_string.mjs";

// Literal types a `case` branch must test for to become a JS switch case.
const SWITCH_LITERALS = new Set(["FloatNode", "IntegerNode", "SymbolNode", "StringNode", "SourceFileNode", "SourceLineNode"]);
const BEGIN_TYPES = new Set(["StatementsNode", "OpalBegin", "ParenthesesNode"]);

// `<literal> === <rhs>` with exactly one argument: returns [literal, rhs].
function tripleEqualOnLiteral(test) {
  if (!test || test.type !== "CallNode" || test.name !== "===" || test.block) return null;
  if (!test.receiver || !SWITCH_LITERALS.has(test.receiver.type)) return null;
  const args = callArguments(test);
  if (args.length !== 1) return null;
  return [test.receiver, args[0]];
}

// Matches: `case some_value_or_expression; when 123`
// Captures: [<123>, "$ret_or_1", <some_value_or_expression>]
function switchTest(test) {
  const m = tripleEqualOnLiteral(test);
  if (!m || m[1].type !== "OpalLvasgn") return null;
  return [m[0], m[1].name, m[1].value];
}

// Matches: `when 456` (from `case foo; when 123; when 456; end`)
// Captures: [<456>, "$ret_or_1"]
function switchBranchTest(test) {
  const m = tripleEqualOnLiteral(test);
  if (!m || m[1].type !== "OpalJsTmp") return null;
  return [m[0], m[1].value];
}

// Matches an OpalIf whose test matches `inner` and whose true body is
// `true`: one `when` with several values (`when 123, 456`). Captures the
// inner captures plus the false body (the remaining values).
function continued(inner) {
  return (node) => {
    if (!node || node.type !== "OpalIf" || !node.trueBody || node.trueBody.type !== "TrueNode") return null;
    const m = inner(node.test);
    return m ? [...m, node.falseBody] : null;
  };
}

const switchTestContinued = continued(switchTest);
const switchBranchTestContinued = continued(switchBranchTest);

export class IfNode extends Base {
  static {
    this.handle("OpalIf");
  }

  get test() { return this.node.test; }
  get trueBody() { return this.node.trueBody; }
  get falseBody() { return this.node.falseBody; }

  compile() {
    if (this.shouldCompileAsSimpleExpression()) {
      if (this.trueBody && this.trueBody.type === "TrueNode") {
        this.compileWithBinaryOr();
      } else if (this.falseBody && this.falseBody.type === "FalseNode") {
        this.compileWithBinaryAnd();
      } else {
        this.compileWithTernary();
      }
    } else if (this.couldBecomeSwitch()) {
      this.compileWithSwitch();
    } else {
      this.compileWithIf();
    }
  }

  compileWithIf() {
    const expectsExpression = this.expectsExpression();
    if (expectsExpression) this.pushClosure();

    let truthy = this.truthy();
    let falsy = this.falsy();

    if (falsy && !truthy) {
      // Let's optimize a little bit `unless` calls.
      this.push("if (!", this.jsTruthy(this.test), ") {");
      [falsy, truthy] = [truthy, falsy];
    } else {
      this.push("if (", this.jsTruthy(this.test), ") {");
    }

    // skip if-body if no truthy node
    if (truthy) this.indent(() => this.line(this.stmt(truthy)));

    if (falsy) {
      if (falsy.type === "OpalIf") {
        this.line("} else ", this.stmt(falsy));
      } else {
        this.line("} else {");
        this.indent(() => this.line(this.stmt(falsy)));
        this.line("}");
      }
    } else {
      this.line("}");

      // This resolution isn't finite. Let's ensure this block
      // always return something if we expect a return
      if (expectsExpression) this.line("return nil;");
    }

    if (expectsExpression) this.popClosure();

    if (expectsExpression) {
      const returnKw = this.node.returning ? "return " : "";

      if (this.scope.awaitEncountered) {
        this.wrap(`${returnKw}(await (async function() {`, "})())");
      } else {
        this.wrap(`${returnKw}(function() {`, "})()");
      }
    }
  }

  truthy() {
    return this.returnify(this.trueBody);
  }

  falsy() {
    return this.returnify(this.falseBody);
  }

  returnify(body) {
    if (this.expectsExpression() && body) return this.compiler.returns(body);
    return body;
  }

  expectsExpression() {
    return this.isExpr() || this.isRecv();
  }

  // There was a particular case in the past, that when we
  // expected an expression from if, we always had to closure
  // it. This produced an ugly code that was hard to minify.
  // This addition tries to make a few cases compiled with
  // a ternary operator instead and possibly a binary operator
  // even?
  shouldCompileAsSimpleExpression() {
    const source = this.compiler.source;
    return this.expectsExpression() && isSimple(this.trueBody, source) && isSimple(this.falseBody, source);
  }

  compileWithTernary() {
    const truthy = this.trueBody;
    const falsy = this.falseBody;
    const nil = this.s("NilNode");

    this.push("(");
    this.push(this.jsTruthy(this.test), " ? ");
    this.push("(", this.expr(truthy || nil), ") : ");
    if (!falsy || falsy.type === "OpalIf") {
      this.push(this.expr(falsy || nil));
    } else {
      this.push("(", this.expr(falsy), ")");
    }
    this.push(")");
  }

  compileWithBinaryAnd() {
    const body = this.trueBody || this.s("NilNode");
    const truthy = this.node.doJsTruthyOnTrueBody ? this.jsTruthy(body) : this.expr(body);

    this.push("(");
    this.push(this.jsTruthy(this.test), " && ");
    this.push("(", truthy, ")");
    this.push(")");
  }

  compileWithBinaryOr() {
    const body = this.falseBody || this.s("NilNode");
    const falsy = this.node.doJsTruthyOnFalseBody ? this.jsTruthy(body) : this.expr(body);

    this.push("(");
    this.push(this.jsTruthy(this.test), " || ");
    this.push("(", falsy, ")");
    this.push(")");
  }

  couldBecomeSwitch() {
    if (this.expectsExpression()) return false;

    if (this.node.switchChild) return true;

    const testMatch = switchTest(this.test) || switchTestContinued(this.test);
    if (!testMatch) return false;
    let additionalRules;
    [this.switchTestNode, this.switchVariable, this.switchFirstTest, additionalRules] = testMatch;

    additionalRules = this.handleAdditionalSwitchRules(additionalRules);
    // It's ok for them to be empty, but false denotes a mismatch
    if (!additionalRules) return false;
    this.switchAdditionalRules = additionalRules;

    if (!this.isValidSwitchBody(this.trueBody)) return false;

    return this.couldBecomeSwitchBranch(this.falseBody);
  }

  handleAdditionalSwitchRules(additionalRules) {
    const rules = [];
    while (additionalRules) {
      const match = switchBranchTest(additionalRules) || switchBranchTestContinued(additionalRules);
      if (!match) return false;

      const [test, variable, rest] = match;
      if (variable !== this.switchVariable) return false;

      rules.push(test);
      additionalRules = rest;
    }
    return rules;
  }

  couldBecomeSwitchBranch(body) {
    if (!body) return true;

    if (body.type !== "OpalIf") {
      if (this.isValidSwitchBody(body)) {
        body.switchDefault = true;
        return true;
      }
      return false;
    }

    const testMatch = switchBranchTest(body.test) || switchBranchTestContinued(body.test);
    if (!testMatch) {
      if (this.isValidSwitchBody(body, true)) {
        body.switchDefault = true;
        return true;
      }
      // The Ruby compiler destructures the missing match as nil here.
      return this.couldBecomeSwitchBranchWith(body, null, null, null);
    }
    const [test, variable, additionalRules] = testMatch;
    return this.couldBecomeSwitchBranchWith(body, test, variable, additionalRules);
  }

  couldBecomeSwitchBranchWith(body, test, variable, additionalRules) {
    const rules = this.handleAdditionalSwitchRules(additionalRules);
    // It's ok for them to be empty, but false denotes a mismatch
    if (!rules) return false;

    if (variable !== this.switchVariable) return false;

    if (!this.isValidSwitchBody(body.trueBody)) return false;
    if (!this.couldBecomeSwitchBranch(body.falseBody)) return false;

    body.switchChild = true;
    body.switchTest = test;
    body.switchVariable = this.switchVariable;
    body.switchAdditionalRules = rules;

    return true;
  }

  isValidSwitchBody(body, checkVariable = false) {
    if (!isNode(body)) return true;
    switch (body.type) {
      case "BreakNode":
      case "RedoNode":
      case "RetryNode":
        return false;
      case "BlockNode":
      case "LambdaNode":
        // Don't traverse the iters or whiles!
        return true;
      case "WhileNode":
        if (!(body.flags && body.flags.includes("begin_modifier"))) return true;
        break;
    }

    // Perhaps we ended abruptly and we lack a $ret_or variable... but sometimes
    // we can ignore this.
    if (referencesVariable(body, this.switchVariable) && checkVariable) return false;

    let valid = true;
    eachChild(body, (child) => {
      if (valid && !this.isValidSwitchBody(child, checkVariable)) valid = false;
    });
    return valid;
  }

  compileWithSwitch() {
    if (this.node.switchChild) {
      this.switchVariable = this.node.switchVariable;
      this.switchAdditionalRules = this.node.switchAdditionalRules;
      this.compileSwitchCase(this.node.switchTest);
    } else {
      this.line("switch (", this.expr(this.switchFirstTest), ".valueOf()) {");
      this.indent(() => this.compileSwitchCase(this.switchTestNode));
      this.line("}");
    }
  }

  isReturning(body) {
    const returning = new Set(["ReturnNode", "OpalJsReturn", "NextNode"]);
    if (returning.has(body.type)) return true;
    if (BEGIN_TYPES.has(body.type)) {
      const children = body.type === "ParenthesesNode" ? (body.body ? body.body.body : []) : body.body;
      return children.length > 0 && returning.has(children[children.length - 1].type);
    }
    return false;
  }

  compileSwitchCase(test) {
    this.line("case ", this.expr(test), ":");
    if (this.switchAdditionalRules) {
      for (const rule of this.switchAdditionalRules) this.line("case ", this.expr(rule), ":");
    }
    this.indent(() => {
      this.line(this.stmt(this.trueBody));
      if (!this.trueBody || !this.isReturning(this.trueBody)) this.line("break;");
    });
    const falseBody = this.falseBody;
    if (falseBody) {
      if (falseBody.switchDefault) {
        this.line("default:");
        this.indent(() => this.line(this.stmt(falseBody)));
      } else if (falseBody.switchChild) {
        this.push(this.stmt(falseBody));
      }
    } else {
      this.push(this.stmt(this.s("NilNode")));
    }
  }
}

// Does the node itself (not its children) name the given compiler temp?
function referencesVariable(node, variable) {
  if (variable == null) return false;
  switch (node.type) {
    case "OpalJsTmp":
      return node.value === variable;
    case "OpalLvasgn":
    case "OpalLvar":
      return node.name === variable;
    default:
      return false;
  }
}

const CONTROL_FLOW = new Set(["ReturnNode", "OpalJsReturn", "BreakNode", "NextNode", "RedoNode", "RetryNode"]);

// Let's ensure there are no control flow statements inside.
export function isSimple(body, source) {
  if (!isNode(body)) return true;
  if (CONTROL_FLOW.has(body.type)) return false;
  if (body.type === "XStringNode" || body.type === "InterpolatedXStringNode") return xstringIsSingleLine(body, source);

  let simple = true;
  eachChild(body, (child) => {
    if (simple && !isSimple(child, source)) simple = false;
  });
  return simple;
}

// Flip-flops: `if (a)..(b)` keeps its state in a function property.
export class FlipFlopNode extends Base {
  static {
    this.handle("FlipFlopNode");
  }

  compile() {
    this.helper("truthy");

    const exclusive = this.node.flags && this.node.flags.includes("exclude_end");
    const funcName = this.topScope.newTemp();
    const flipFlopState = `${funcName}.$$ff`;
    const nil = this.s("NilNode");

    // Start function definition, checking and initializing it if necessary
    this.push(`(${funcName} = ${funcName} || function(_start_func, _end_func){`);

    // If flip flop state is not defined, set it to false
    this.push(`  var flip_flop = ${flipFlopState} || false;`);

    // If flip flop state is false, call the start condition function and store its truthy result into flip flop state
    this.push(`  if (!flip_flop) ${flipFlopState} = flip_flop = $truthy(_start_func());`);

    // If flip flop state is true, call the end condition function and set flip flop state to false if it is truthy
    this.push(`  ${exclusive ? "else " : ""}if (flip_flop && $truthy(_end_func())) ${flipFlopState} = false;`);

    // Return current state of flip flop
    this.push("  return flip_flop;");

    // End function definition
    this.push("})(");

    // Call the function with the conditions wrapped in functions to ensure correct binding and delay evaluation
    this.push("  function() { ", this.stmt(this.compiler.returns(this.node.left || nil)), " },");
    this.push("  function() { ", this.stmt(this.compiler.returns(this.node.right || nil)), " }");
    this.push(")");
  }
}

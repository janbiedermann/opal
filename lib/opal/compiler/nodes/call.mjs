// Method calls. Port of the former Ruby lib/opal/nodes/call.rb and
// lib/opal/nodes/arglist.rb.
//
// A Prism CallNode carries the receiver, the method name, the positional
// arguments (ArgumentsNode) and the block (BlockNode, or BlockArgumentNode
// for `&blk`). Keyword arguments arrive as a KeywordHashNode, which is
// compiled like a hash, as the Ruby compiler did.
import { Base, callArguments } from "./base.mjs";
import { SEND } from "../closure.mjs";

// Operators that get optimized by compiler
const OPERATORS = { "+": "plus", "-": "minus", "*": "times", "/": "divide", "<": "lt", "<=": "le", ">": "gt", ">=": "ge" };

export const SPECIALS = new Map();

// Registers a special handler for calls of `name`. The handler runs as a
// method of the call node and receives the default compilation as a
// function; handlers registered later wrap earlier ones.
export function addSpecial(name, handler) {
  if (!SPECIALS.has(name)) SPECIALS.set(name, []);
  SPECIALS.get(name).push(handler);
}

// The argument nodes of a call as the Ruby compiler saw them: anonymous
// splats and `...` expand to the forwarding temps.
export function expandArguments(node) {
  const out = [];
  for (let arg of callArguments(node)) {
    // `**nil` passes no keywords (Ruby 3.4)
    if (arg.type === "KeywordHashNode") {
      arg = withoutNilKwsplat(arg);
      if (arg.elements.length === 0) continue;
    }
    switch (arg.type) {
      case "SplatNode":
        out.push(arg.expression ? arg : { ...arg, expression: { type: "OpalLvar", name: "$fwd_rest", location: arg.location } });
        break;
      case "ForwardingArgumentsNode":
        out.push({ type: "SplatNode", location: arg.location, expression: { type: "OpalLvar", name: "$fwd_rest", location: arg.location } });
        break;
      default:
        out.push(arg);
    }
  }
  return out;
}

const isNilKwsplat = (e) => e.type === "AssocSplatNode" && e.value?.type === "NilNode";

// A hash without its `**nil` elements.
export function withoutNilKwsplat(hash) {
  if (!hash.elements.some(isNilKwsplat)) return hash;
  return { ...hash, elements: hash.elements.filter((e) => !isNilKwsplat(e)) };
}

// The block of a call: a BlockNode, a BlockArgumentNode, or the implied
// `&$fwd_block` of `...`.
export function callBlock(node) {
  if (node.block) {
    if (node.block.type === "BlockArgumentNode" && !node.block.expression) {
      return { ...node.block, expression: { type: "OpalLvar", name: "$fwd_block", location: node.block.location } };
    }
    return node.block;
  }
  const args = callArguments(node);
  const last = args[args.length - 1];
  if (last && last.type === "ForwardingArgumentsNode") {
    return { type: "BlockArgumentNode", location: last.location, expression: { type: "OpalLvar", name: "$fwd_block", location: last.location } };
  }
  return null;
}

export class CallNode extends Base {
  static {
    this.handle("CallNode", "OpalCall");
  }

  constructor(node, level, compiler) {
    super(node, level, compiler);
    this.recvr = node.receiver;
    this.meth = node.name;
    this.iter = callBlock(node);
    this.arglist = expandArguments(node);
  }

  compile() {
    // handle some methods specially
    // some special methods need to skip compilation, so we pass the default as a block
    // (plain calls take the direct path, which keeps the JS stack shallow
    // for long call chains)
    if (SPECIALS.has(this.meth)) {
      this.handleSpecial(() => this.compileCall());
    } else {
      this.compileCall();
    }
  }

  compileCall() {
    this.compiler.recordMethodCall(this.meth);

    if (this.isCsend() || this.callIsWriterThatNeedsHandling()) {
      this.withWrapper(() => this.compileCallBody());
    } else {
      this.compileCallBody();
    }
  }

  compileCallBody() {
    if (this.usingEval()) {
      // if trying to access an lvar in eval or irb mode
      this.compileEvalVar();
    } else if (this.usingIrb()) {
      // if trying to access an lvar in irb mode
      this.compileIrbVar();
    } else {
      this.defaultCompile();
    }
  }

  iterHasBreak() {
    return !!(this.iter && this.iter.hasBreak);
  }

  // Opal has a runtime helper 'Opal.send_method_name' that assigns
  // provided block to a '$$p' property of the method body
  // and invokes a method using 'apply'.
  //
  // We have to compile a method call using this 'Opal.send_method_name' when a method:
  // 1. takes a splat
  // 2. takes a block
  //
  // Arguments that contain splat must be handled in a different way.
  //
  // When a method takes a block we have to calculate all arguments
  // **before** assigning '$$p' property (that stores a passed block)
  // to a method body. This is some kind of protection from method calls
  // like 'a(a {}) { 1 }'.
  invokeUsingSend() {
    return !!(this.iter || this.isSplat() || this.callIsWriterThatNeedsHandling());
  }

  invokeUsingRefinement() {
    return this.scope.scope.hasRefinements();
  }

  // Is it a conditional send, ie. `foo&.bar`?
  isCsend() {
    return !!(this.node.flags && this.node.flags.includes("safe_navigation"));
  }

  defaultCompile() {
    const autoAwait = this.isAutoAwait();
    if (autoAwait) {
      this.push("(await ");
      this.scope.awaitEncountered = true;
    }

    if (this.iterHasBreak()) this.pushClosure(SEND);
    if (this.invokeUsingRefinement()) {
      this.compileUsingRefinedSend();
    } else if (this.invokeUsingSend()) {
      this.compileUsingSend();
    } else {
      this.compileSimpleCallChain();
    }
    if (this.iterHasBreak()) this.popClosure();

    if (autoAwait) this.push(")");
  }

  // Compiles method call using `Opal.send`
  //
  //   a.b(c, &block)
  //   Opal.send(a, 'b', [c], block)
  compileUsingSend() {
    this.helper("send");

    if (this.compiler.isDce) this.push(this.dceUse(this.meth));

    this.push("$send(");
    this.compileReceiver();
    this.compileMethodName();
    this.compileArguments();
    this.compileBlockPass();
    this.push(")");
  }

  // Compiles method call using `Opal.refined_send`
  //
  //   a.b(c, &block)
  //   Opal.refined_send(a, 'b', [c], block, [[Opal.MyRefinements]])
  compileUsingRefinedSend() {
    this.helper("refined_send");

    if (this.compiler.isDce) this.push(this.dceUse(this.meth));

    this.push("$refined_send(");
    this.compileRefinements();
    this.compileReceiver();
    this.compileMethodName();
    this.compileArguments();
    this.compileBlockPass();
    this.push(")");
  }

  compileReceiver() {
    this.push(this.conditionalRecvr || this.recv(this.receiverNode()));
  }

  compileMethodName() {
    this.push(`, '${this.meth}'`);
  }

  compileArguments(skipComma = false) {
    if (!skipComma) this.push(", ");

    if (this.withWriterTemp) {
      this.push(this.withWriterTemp);
    } else if (this.isSplat()) {
      this.push(this.expr(this.arglistNode()));
    } else if (this.arglist.length === 0) {
      this.push("[]");
    } else {
      this.push("[", this.expr(this.arglistNode()), "]");
    }
  }

  compileBlockPass() {
    if (this.iter) this.push(", ", this.expr(this.iter));
  }

  compileRefinements() {
    const refinements = this.scope.collectRefinementsTemps().map((i) => this.s("OpalJsTmp", { value: i }));
    this.push(this.expr(this.s("ArrayNode", { elements: refinements })), ", ");
  }

  compileSimpleCallChain() {
    this.push(this.conditionalRecvr || this.compiler.process(this.receiverNode(), "recv"));
    if (this.compiler.isDce) this.push(this.dceUse(this.meth));
    this.push(this.methodJsid(), "(", this.expr(this.arglistNode()), ")");
  }

  isSplat() {
    return this.arglist.some((a) => a.type === "SplatNode");
  }

  receiverNode() {
    return this.recvr || this.s("SelfNode");
  }

  arglistNode() {
    return this.s("OpalArglist", { args: this.arglist });
  }

  methodJsid() {
    return this.midToJsid(this.meth);
  }

  // Used to generate the code to use this node as an ivar var reference
  compileIrbVar() {
    this.withTemp((tmp) => {
      const lvar = this.meth;
      const call = this.s("OpalCall", { receiver: this.s("SelfNode"), name: lvar, arguments: null, block: null });
      const ref = `(typeof ${lvar} !== 'undefined') ? ${lvar} : `;
      this.push(`((${tmp} = Opal.irb_vars.${lvar}) == null ? `, ref, this.expr(call), ` : ${tmp})`);
    });
  }

  compileEvalVar() {
    this.push(this.meth);
  }

  // a variable reference in irb mode in top scope might be a var ref,
  // or it might be a method call
  usingIrb() {
    return this.compiler.isIrb && this.scope.isTop() && this.isVariableLike();
  }

  usingEval() {
    return this.compiler.isEval && this.scope.isTop() && this.compiler.scopeVariables.includes(this.meth);
  }

  isVariableLike() {
    return this.arglist.length === 0 && !this.recvr && !this.iter;
  }

  isAutoAwait() {
    const awaitedSet = this.compiler.asyncAwait;
    return !!(awaitedSet && awaitedSet !== true && awaitedSet.test(this.meth));
  }

  // Handle "special" method calls, e.g. require(). If no special
  // handler applies the call is compiled by `compileDefault`.
  handleSpecial(compileDefault) {
    const specials = SPECIALS.get(this.meth);
    if (!specials) return compileDefault();

    let current = compileDefault;
    for (let i = specials.length - 1; i >= 0; i--) {
      const handler = specials[i];
      const previous = current;
      current = () => handler.call(this, previous);
    }
    return current();
  }

  isPushNesting() {
    const recv = this.recvr;
    // only receiver and method, and no receiver or receiver is Module
    return this.arglist.length === 0 && !this.iter &&
      (!recv || (recv.type === "ConstantReadNode" && recv.name === "Module") ||
        (recv.type === "ConstantPathNode" && recv.name === "Module"));
  }

  withWrapper(fn) {
    if (this.isCsend() && !this.conditionalRecvr) {
      this.handleConditionalSend(() => this.withWrapper(fn));
    } else if (this.callIsWriterThatNeedsHandling()) {
      this.handleWriter(fn);
    } else {
      fn();
    }
  }

  callIsWriterThatNeedsHandling() {
    return (this.isExpr() || this.isRecv()) && this.meth.endsWith("=") && (/^\w+=$/.test(this.meth) || this.meth === "[]=");
  }

  // Handle safe-operator calls: foo&.bar / foo&.bar ||= baz / ...
  handleConditionalSend(fn) {
    // temporary variable that stores method receiver
    const receiverTemp = this.scope.newTemp();
    this.push(`${receiverTemp} = `, this.expr(this.receiverNode()));

    // execute the node only if the receiver isn't nil
    this.push(`, (${receiverTemp} === nil || ${receiverTemp} == null) ? nil : `);
    this.conditionalRecvr = receiverTemp;
    fn();
    this.wrap("(", ")");
  }

  handleWriter(fn) {
    this.withTemp((temp) => {
      this.push(`(${temp} = `);
      this.compileArguments(true);
      this.push(", ");
      this.withWriterTemp = temp;
      fn();
      this.withWriterTemp = false;
      this.push(", ");
      this.push(`${temp}[${temp}.length - 1])`);
    });
  }
}

for (const [operator, name] of Object.entries(OPERATORS)) {
  addSpecial(operator, function (compileDefault) {
    if (this.invokeUsingRefinement()) {
      compileDefault();
    } else if (this.compiler.isInlineOperators) {
      this.compiler.recordMethodCall(operator);
      this.helper(`rb_${name}`);
      const lhs = this.expr(this.recvr);
      const rhs = this.expr(this.arglistNode());

      this.push(this.fragment(`$rb_${name}(`));
      this.push(lhs);
      this.push(this.fragment(", "));
      this.push(rhs);
      this.push(this.fragment(")"));
    } else {
      compileDefault();
    }
  });
}

addSpecial("block_given?", function () {
  this.push(this.compiler.handleBlockGivenCall(this.node));
});

// Refinements support
addSpecial("using", function (compileDefault) {
  if (this.scope.acceptsUsing() && this.arglist.length === 1) {
    const arg = this.arglist[0];
    const [prev, curr] = this.scope.refinementsTemp();
    if (prev) {
      this.push(`(${curr} = ${prev}.slice(), ${curr}.push(`, this.expr(arg), `), ${this.scope.getSelf()})`);
    } else {
      this.push(`(${curr} = [`, this.expr(arg), `], ${this.scope.getSelf()})`);
    }
  } else {
    compileDefault();
  }
});

addSpecial("debugger", function () {
  this.push(this.fragment("debugger"));
});

addSpecial("lambda", function (compileDefault) {
  this.scope.definesLambda(() => compileDefault());
});

addSpecial("__await__", function (compileDefault) {
  if (this.compiler.asyncAwait) {
    this.push(this.fragment("(await ("));
    this.push(this.process(this.recvr));
    this.push(this.fragment("))"));
    this.scope.awaitEncountered = true;
  } else {
    compileDefault();
  }
});

// Argument lists: plain arguments are joined with commas; splats turn the
// list into an array built with concat().
export class ArglistNode extends Base {
  static {
    this.handle("OpalArglist");
  }

  compile() {
    let code = [];
    let work = [];

    for (const current of this.node.args) {
      const splat = current.type === "SplatNode";
      const arg = this.expr(current);

      if (splat) {
        if (work.length === 0) {
          if (code.length === 0) {
            code.push(arg);
          } else {
            code.push(this.fragment(".concat("), arg, this.fragment(")"));
          }
        } else {
          if (code.length === 0) {
            code.push(this.fragment("["), work, this.fragment("]"));
          } else {
            code.push(this.fragment(".concat(["), work, this.fragment("])"));
          }
          code.push(this.fragment(".concat("), arg, this.fragment(")"));
        }
        work = [];
      } else {
        if (work.length > 0) work.push(this.fragment(", "));
        work.push(arg);
      }
    }

    if (work.length > 0) {
      if (code.length === 0) {
        code = work;
      } else {
        code.push(this.fragment(".concat(["), work, this.fragment("])"));
      }
    }

    this.push(...code);
  }
}

export class SplatNode extends Base {
  static {
    this.handle("SplatNode");
  }

  compile() {
    const value = this.node.expression;
    if (value && value.type === "ArrayNode" && value.elements.length === 0) {
      this.push("[]");
    } else {
      this.helper("to_a");
      this.push("$to_a(", this.recv(value), ")");
    }
  }
}

// &blk is compiled as blk.to_proc
export class BlockPassNode extends Base {
  static {
    this.handle("BlockArgumentNode");
  }

  compile() {
    const value = this.node.expression;
    this.push(this.expr(this.s("OpalCall", { receiver: value, name: "to_proc", arguments: null, block: null })));
  }
}

export class JSTempNode extends Base {
  static {
    this.handle("OpalJsTmp");
  }

  compile() {
    this.push(String(this.node.value));
  }
}

export class JSReturnNode extends Base {
  static {
    this.handle("OpalJsReturn");
  }

  compile() {
    this.push("return ");
    this.push(this.expr(this.node.value));
  }
}

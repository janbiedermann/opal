// This module takes care of providing information about the
// closure stack that we have for the nodes during compile time.
//
// Also, while loops are not closures per se, this module also
// takes a note about them.
//
// Then we can use this information for control flow like
// generating breaks, nexts, returns.
// Port of the former Ruby lib/opal/nodes/closure.rb.
export const NONE = 0;
export const JS_FUNCTION = 1 << 0; // everything that generates an IIFE
export const JS_LOOP = 1 << 1; // exerything that generates a JS loop
export const JS_LOOP_INSIDE = 1 << 2; // everything that generates an inside of a loop
export const DEF = 1 << 3; // def
export const LAMBDA = 1 << 4; // lambda
export const ITER = 1 << 5; // iter, lambda
export const MODULE = 1 << 6;
export const LOOP = 1 << 7; // for building a catcher outside a loop
export const LOOP_INSIDE = 1 << 8; // for building a catcher inside a loop
export const SEND = 1 << 9; // to generate a break catcher after send with a block
export const TOP = 1 << 10;
export const RESCUE_RETRIER = 1 << 11; // a virtual loop to catch a retrier
export const RETRY_CONTAINER = 1 << 12; // a loop or inside loop that contains a retry
export const ANY = 0xffffffff;

export class Closure {
  constructor(node, type, parent) {
    this.node = node;
    this.type = type;
    this.parent = parent;
    this.catchers = [];
    this.throwers = new Map();
  }

  registerCatcher(type = "return") {
    if (!this.catchers.includes(type)) this.catchers.push(type);
    return `$t_${type}`;
  }

  registerThrower(type, id) {
    this.throwers.set(type, id);
  }

  is(type) {
    return (this.type & type) !== 0;
  }
}

// Mixed into the node base class (NodeSupport in closure.rb).
export const ClosureSupport = {
  pushClosure(type = JS_FUNCTION) {
    const closure = new Closure(this, type, this.selectClosure());
    this.compiler.closureStack.push(closure);
    this.closure = closure;
    return closure;
  },

  popClosure() {
    this.compileCatcher();
    const stack = this.compiler.closureStack;
    stack.pop();
    const last = stack[stack.length - 1];
    if (last && last.node === this) this.closure = last;
  },

  inClosure(type, fn) {
    const closure = this.pushClosure(type);
    const out = fn(closure);
    this.popClosure();
    return out;
  },

  selectClosure(type = ANY, breakAfter = NONE) {
    const stack = this.compiler.closureStack;
    for (let i = stack.length - 1; i >= 0; i--) {
      const closure = stack[i];
      if ((closure.type & breakAfter) !== 0) return undefined;
      if ((closure.type & type) !== 0) return closure;
    }
    return undefined;
  },

  generateThrower(type, closure, value) {
    const id = closure.registerCatcher(type);
    closure.registerThrower(type, id);
    this.push(id, ".$throw(", this.exprOrNil(value), ", ", this.scope.identify(), ".$$is_lambda)");
    return id;
  },

  generateThrowerWithoutCatcher(type, closure, value) {
    this.helper("thrower");

    let id;
    if (closure.throwers.has(type)) {
      id = closure.throwers.get(type);
    } else {
      id = this.compiler.uniqueTemp("t_");
      const parentScope = (closure.node.scope && closure.node.scope.parent) || this.topScope;
      parentScope.addScopeTemp(`${id} = $thrower('${type}')`);
      closure.registerThrower(type, id);
    }
    this.push(id, ".$throw(", this.exprOrNil(value), ", ", this.scope.identify(), ".$$is_lambda)");
    return id;
  },

  thrower(type, value = null) {
    switch (type) {
      case "return": {
        const throwerClosure = this.selectClosure(DEF, MODULE | TOP);
        const lastClosure = this.selectClosure(JS_FUNCTION);

        if (!throwerClosure) {
          const iterClosure = this.selectClosure(ITER, DEF | MODULE | TOP);
          if (iterClosure) {
            this.generateThrowerWithoutCatcher("return", iterClosure, value);
          } else if (this.compiler.isEval) {
            this.push("Opal.t_eval_return.$throw(", this.exprOrNil(value), ", false)");
          } else if (this.selectClosure(TOP, MODULE)) {
            // a top-level return ends the file (its value is ignored)
            const topClosure = this.selectClosure(TOP, MODULE);
            if (topClosure === lastClosure) {
              this.push("return nil");
            } else {
              const id = topClosure.registerCatcher("return");
              topClosure.registerThrower("return", id);
              this.push(id, ".$throw(nil, false)");
            }
          } else {
            this.error("Invalid return");
          }
        } else if (throwerClosure === lastClosure) {
          this.push("return ", this.exprOrNil(value));
        } else {
          const id = this.generateThrower("return", throwerClosure, value);
          // Additionally, register our thrower on the surrounding iter, if present
          const iterClosure = this.selectClosure(ITER, DEF | MODULE | TOP);
          if (iterClosure) iterClosure.registerThrower("return", id);
        }
        break;
      }
      case "eval_return": {
        const throwerClosure = this.selectClosure(DEF | LAMBDA, MODULE | TOP);
        if (throwerClosure) throwerClosure.registerCatcher("eval_return");
        break;
      }
      case "next":
      case "redo": {
        const throwerClosure = this.selectClosure(ITER | LOOP_INSIDE, DEF | MODULE | TOP);
        const lastClosure = this.selectClosure(JS_FUNCTION | JS_LOOP_INSIDE);

        if (!throwerClosure) {
          this.error("Invalid next");
        } else if (throwerClosure === lastClosure) {
          if (throwerClosure.is(RETRY_CONTAINER)) {
            this.generateThrower("next", throwerClosure, value);
          } else if (throwerClosure.is(LOOP_INSIDE)) {
            this.push("continue");
          } else if (throwerClosure.is(ITER | LAMBDA)) {
            this.push("return ", this.exprOrNil(value));
          }
        } else {
          this.generateThrower("next", throwerClosure, value);
        }
        break;
      }
      case "break": {
        const throwerClosure = this.selectClosure(SEND | LAMBDA | LOOP, DEF | MODULE | TOP);
        const lastClosure = this.selectClosure(JS_FUNCTION | JS_LOOP);

        if (!throwerClosure) {
          const iterClosure = this.selectClosure(ITER, DEF | MODULE | TOP);
          if (iterClosure) {
            this.generateThrowerWithoutCatcher("break", iterClosure, value);
          } else {
            this.error("Invalid break");
          }
        } else if (throwerClosure === lastClosure) {
          if (throwerClosure.is(RETRY_CONTAINER)) {
            this.generateThrower("break", throwerClosure, value);
          } else if (throwerClosure.is(JS_FUNCTION | LAMBDA)) {
            this.push("return ", this.exprOrNil(value));
          } else if (throwerClosure.is(LOOP)) {
            this.push("break");
          }
        } else {
          this.generateThrower("break", throwerClosure, value);
        }
        break;
      }
      case "retry": {
        const throwerClosure = this.selectClosure(RESCUE_RETRIER, DEF | MODULE | TOP);
        const lastClosure = this.selectClosure(JS_LOOP_INSIDE);

        if (!throwerClosure) {
          this.error("Invalid retry");
        } else if (throwerClosure === lastClosure) {
          this.push("continue");
        } else {
          this.generateThrower("retry", throwerClosure, value);
        }
        break;
      }
    }
  },

  closureIs(type) {
    return this.closure.is(type);
  },

  // Generate a catcher if thrower has been used
  compileCatcher() {
    const catchers = this.closure.catchers;
    if (catchers.length === 0) return;

    this.helper("thrower");

    const withoutEvalReturn = catchers.filter((type) => type !== "eval_return");

    this.push("} catch($e) {");
    this.indent(() => {
      for (const type of catchers) {
        if (type === "eval_return") {
          this.line("if ($e === Opal.t_eval_return) return $e.$v;");
        } else {
          this.line(`if ($e === $t_${type}) return $e.$v;`);
        }
      }
      this.line("throw $e;");
    });
    this.line("}");

    if (withoutEvalReturn.length > 0) {
      this.push(" finally {", ...withoutEvalReturn.map((type) => `$t_${type}.is_orphan = true;`), "}");
    }

    if (this.closureIs(SEND)) this.unshift("return ");

    if (withoutEvalReturn.length > 0) {
      this.unshift("var ", withoutEvalReturn.map((type) => `$t_${type} = $thrower('${type}')`).join(", "), "; ");
    }
    this.unshift("try { ");

    if (!this.closureIs(JS_FUNCTION)) {
      if (this.scope.awaitEncountered) {
        this.wrap("(await (async function(){", "})())");
      } else {
        this.wrap("(function(){", "})()");
      }
    }
  },
};

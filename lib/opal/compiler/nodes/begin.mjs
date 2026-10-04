// Statement sequences. Port of BeginNode from lib/opal/nodes/definitions.rb.
//
// The parser gem used a bare node for single-statement bodies and
// s(:begin, ...) for multiple statements, parentheses and `#{...}`; in
// Prism these are StatementsNode, ParenthesesNode, EmbeddedStatementsNode
// and BeginNode (begin/end without rescue or ensure).
import { Base, statementsOf } from "./base.mjs";

const COMPLEX_CHILDREN = new Set(["WhileNode", "UntilNode", "OpalJsReturn"]);

export class BeginNode extends Base {
  static {
    this.handle("OpalBegin");
  }

  get children() {
    return this.node.body;
  }

  compile() {
    const children = this.children;
    if (children.length === 0) return this.push("nil");

    if (this.isStmt()) {
      this.compileChildren(children, this.level);
    } else if (this.isSimpleChildren()) {
      this.compileInlineChildren(children, this.level);
      if (children.length > 1) this.wrap("(", ")");
    } else if (children.length === 1) {
      this.compileInlineChildren(this.returnedChildren(), this.level);
    } else {
      this.inClosure(undefined, () => {
        this.compileChildren(this.returnedChildren(), this.level);
      });

      if (this.scope.parent && this.scope.parent.awaitEncountered) {
        this.wrap("(await (async function() {", "})())");
      } else {
        this.wrap("(function() {", "})()");
      }
    }
  }

  returnedChildren() {
    if (!this.returnedChildrenValue) {
      const children = this.children;
      if (children.length === 0) {
        this.returnedChildrenValue = [this.s("NilNode")];
      } else {
        this.returnedChildrenValue = [...children.slice(0, -1), this.compiler.returns(children[children.length - 1])];
      }
    }
    return this.returnedChildrenValue;
  }

  compileChildren(children, level) {
    for (const child of children) {
      this.line(this.process(child, level), this.fragment(";", { loc: false }));
    }
  }

  isSimpleChildren() {
    return !this.children.some((child) => COMPLEX_CHILDREN.has(child.type));
  }

  compileInlineChildren(children, level) {
    const processed = children.map((child) => this.process(child, level)).filter((f) => !isEmpty(f));
    processed.forEach((child, idx) => {
      if (idx !== 0) this.push(this.fragment(", ", { loc: false }));
      this.push(child);
    });
  }
}

// A StatementsNode with a single statement is that statement; with more it
// is a begin.
export class StatementsNode extends BeginNode {
  static {
    this.handle("StatementsNode");
  }

  compileToFragments() {
    if (this.node.body.length === 1) return this.process(this.node.body[0], this.level);
    return super.compileToFragments();
  }
}

// (a; b) and begin; a; b; end
export class ParenthesesNode extends BeginNode {
  static {
    this.handle("ParenthesesNode", "EmbeddedStatementsNode");
  }

  get children() {
    if (this.type === "EmbeddedStatementsNode") return statementsOf(this.node.statements);
    return statementsOf(this.node.body);
  }
}

// An empty array of fragments (e.g. a declaration that generates no code).
function isEmpty(fragments) {
  return Array.isArray(fragments) && fragments.length === 0;
}

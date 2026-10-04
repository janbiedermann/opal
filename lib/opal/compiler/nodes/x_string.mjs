// Backtick and %x{} strings: verbatim JavaScript. Port of
// lib/opal/nodes/x_string.rb.
//
// The Ruby compiler works on the parser gem's s(:xstr) children, where the
// literal text is split into one part per source line and each part's raw
// source (not its unescaped value) is emitted. xstrChildren() rebuilds that
// list from Prism's XStringNode/InterpolatedXStringNode.
import { Base } from "./base.mjs";
import { Fragment } from "../fragment.mjs";

// Splits raw source text into lines, keeping the newlines.
function splitLines(text, start) {
  const out = [];
  let offset = 0;
  while (offset < text.length) {
    const newline = text.indexOf("\n", offset);
    const end = newline === -1 ? text.length : newline + 1;
    out.push({ type: "OpalXstrPart", source: text.slice(offset, end), location: { start: start + offset, end: start + end } });
    offset = end;
  }
  return out;
}

// The s(:xstr) children of an x-string node: OpalXstrPart for literal
// text (with its raw `source`), otherwise the interpolated node.
export function xstrChildren(node, source) {
  const parts = node.type === "XStringNode" ? [node] : node.parts;
  const children = [];
  for (const part of parts) {
    if (part.type === "XStringNode" || part.type === "StringNode") {
      const loc = part.content_loc || part.location;
      children.push(...splitLines(source.slice(loc.start, loc.end), loc.start));
    } else if (part.type === "EmbeddedVariableNode") {
      children.push(part.variable);
    } else {
      children.push(part);
    }
  }
  return children;
}

const isStr = (child) => child.type === "OpalXstrPart";

// Check if there's only one child or if they're all part of
// the same line (e.g. because of interpolations)
function isSingleLine(children) {
  return children.length === 1 || !children.some((c) => isStr(c) && c.source.endsWith("\n"));
}

// Will remove empty lines coming from cosmetic newlines in x-strings
//
//   # this will generate two additional empty
//   # children before and after `foo()`
//   %x{
//     foo()
//   }
function stripEmptyChildren(children) {
  children = [...children];
  const emptyLine = (child) => child == null || (isStr(child) && child.source.trimEnd() === "");
  while (children.length > 0 && emptyLine(children[0])) children.shift();
  while (children.length > 0 && emptyLine(children[children.length - 1])) children.pop();
  return children;
}

// IfNode#simple? for x-strings.
export function xstringIsSingleLine(node, source) {
  // a returned x-string has a single s(:js_return) child
  if (node.returning) return true;
  return isSingleLine(stripEmptyChildren(xstrChildren(node, source)));
}

export class XStringNode extends Base {
  static {
    this.handle("XStringNode", "InterpolatedXStringNode");
  }

  get children() {
    return xstrChildren(this.node, this.compiler.source);
  }

  compile() {
    if (this.compiler.isBacktickJavascriptOrWarn()) {
      this.compileJavascript();
    } else {
      this.compileSend();
    }
  }

  compileSend() {
    const parts = [];
    const strings = this.node.type === "XStringNode" ? [this.node] : this.node.parts;
    for (const part of strings) {
      if (part.type === "XStringNode" || part.type === "StringNode") {
        for (const line of part.unescaped.split(/(?<=\n)/)) {
          if (line !== "") parts.push(this.s("OpalStr", { value: line }));
        }
      } else {
        parts.push(part);
      }
    }
    const call = this.s("OpalCall", {
      receiver: null,
      name: "`",
      arguments: { type: "ArgumentsNode", location: this.node.location, arguments: [this.s("OpalDstr", { parts })] },
      block: null,
    });
    this.push(this.process(call, this.level));
  }

  compileJavascript() {
    this.shouldAddSemicolon = false;
    this.returning = !!this.node.returning;
    const children = this.children;
    const stripped = stripEmptyChildren(children);

    if (isSingleLine(stripped)) {
      // If it's a single line we'll try to:
      //
      // - strip empty lines
      // - remove a trailing `;`
      // - detect an embedded `return`
      // - prepend a `return` when needed
      // - append a `;` when needed
      // - warn the user not to use the semicolon in single-line x-strings
      this.compileSingleLine(stripped);
    } else {
      // Here we leave to the user the responsibility to add
      // a return where it's due.
      for (const child of children) this.compileChild(child);
    }

    if (this.isRecv()) this.wrap("(", ")");
    if (this.shouldAddSemicolon) this.push(";");
  }

  compileChild(child) {
    switch (child.type) {
      case "OpalXstrPart": {
        const value = child.source;
        if (value.includes("self")) this.scope.getSelf();
        this.push(new Fragment(value, this.scope, child));
        break;
      }
      case "EmbeddedStatementsNode":
      case "GlobalVariableReadNode":
      case "InstanceVariableReadNode":
      case "NilNode":
        this.push(this.expr(child));
        break;
      default:
        throw new Error(`Unsupported xstr part: ${child.type}`);
    }
  }

  compileSingleLine(children) {
    let hasEmbeddedReturn = false;

    let firstChild = children.shift();
    const singleChild = children.length === 0;

    if (!firstChild) firstChild = this.s("NilNode");

    if (isStr(firstChild)) {
      const firstValue = firstChild.source.trim();
      hasEmbeddedReturn = /^return\b/m.test(firstValue);
    }

    if (this.returning && !hasEmbeddedReturn) this.push("return ");

    const lastChild = children.pop() || firstChild;
    const lastValue = isStr(lastChild) ? this.extractLastValue(lastChild) : null;

    if (!singleChild) {
      // assuming there's an interpolation somewhere (type != str)
      this.shouldAddSemicolon = false;
      this.compileChild(firstChild);
      for (const c of children) this.compileChild(c);
    }

    if (isStr(lastChild)) {
      this.push(new Fragment(lastValue, this.scope, lastChild));
    } else {
      this.compileChild(lastChild);
    }
  }

  // Will drop the trailing semicolon if all conditions are met
  extractLastValue(lastChild) {
    let lastValue = lastChild.source.trimEnd();

    if (lastValue.includes("self")) this.scope.getSelf();

    if ((this.returning || this.isExpr()) && lastValue.endsWith(";")) {
      this.compiler.warning("Removed semicolon ending x-string expression, interpreted as unintentional", this.compiler.lineOf(lastChild));
      lastValue = lastValue.slice(0, -1);
    }

    if (this.returning) this.shouldAddSemicolon = true;

    return lastValue;
  }
}

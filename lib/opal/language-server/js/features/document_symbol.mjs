// The textDocument/documentSymbol request: the symbols a document declares,
// nested as a DocumentSymbol tree (LSP prefers the hierarchical shape over
// flat SymbolInformation). Port of ../features/document_symbol.rb: the
// visit-by-node-type collapses into one switch over node.type, and the
// nesting is unchanged - source ranges decide it, walking symbols in start
// order with a stack, the smallest other symbol strictly around a symbol is
// its parent.
import { walk } from "../node.mjs";

// LSP SymbolKind values.
const KIND_MODULE = 2;
const KIND_CLASS = 5;
const KIND_METHOD = 6;
const KIND_CONSTANT = 14;

// Lexicographic comparison of two LSP Positions ({line, character}).
function posCmp(a, b) {
  return a.line !== b.line ? a.line - b.line : a.character - b.character;
}

// Clamps an LSP Range into a container Range (a Prism-recovered loc can
// escape its node's location) and keeps the result non-inverted.
// null means "no separate selection: the container itself".
function clampSelection(sel, container) {
  if (sel == null) return container;
  const lo = container.start;
  const hi = container.end;
  let start = sel.start;
  if (posCmp(start, lo) < 0) start = lo;
  if (posCmp(start, hi) > 0) start = hi;
  let end = sel.end;
  if (posCmp(end, lo) < 0) end = lo;
  if (posCmp(end, hi) > 0) end = hi;
  if (posCmp(end, start) < 0) end = start;
  return { start, end };
}

// One found declaration.
class Symbol {
  constructor(name, kind, node, parseResult, selectionRange) {
    this.name = name;
    this.kind = kind;
    this.start = node.location.start;
    this.end = node.location.end;
    this.range = parseResult.rangeForNode(node);
    // Prism error recovery can hand a loc outside the node's own
    // location: a bare `def ` at EOF recovers to a DefNode with an
    // empty-string name whose name_loc sits one past the node end.
    // VS Code validates selectionRange inside range and rejects the
    // whole documentSymbol response when it is not, so clamp.
    this.selectionRange = clampSelection(selectionRange, this.range);
  }

  get span() {
    return this.end - this.start;
  }
}

function perform(document) {
  const parseResult = document.parse();
  const symbols = [];

  const add = (name, kind, node, selectionRange) => {
    if (name == null) return;
    symbols.push(new Symbol(name, kind, node, parseResult, selectionRange));
  };
  const childRange = (node, field) => {
    const child = node[field];
    return child == null ? null : parseResult.rangeForNode(child);
  };

  walk(parseResult.ast, (node) => {
    switch (node.type) {
      case "ClassNode":
        add(node.name, KIND_CLASS, node, childRange(node, "constant_path"));
        break;
      case "ModuleNode":
        add(node.name, KIND_MODULE, node, childRange(node, "constant_path"));
        break;
      case "SingletonClassNode":
        add("self", KIND_CLASS, node, null);
        break;
      case "DefNode":
        add(node.name, KIND_METHOD, node, parseResult.rangeForLoc(node.name_loc));
        break;
      case "ConstantWriteNode":
        add(node.name, KIND_CONSTANT, node, parseResult.rangeForLoc(node.name_loc));
        break;
      case "ConstantPathWriteNode": {
        const target = node.target;
        add(node.name, KIND_CONSTANT, node, target == null ? null : parseResult.rangeForNode(target));
        break;
      }
      default:
    }
  });

  return nest(symbols);
}

// Sort outer-first (start ascending, span descending) and walk with a
// stack: the live top is the innermost strict container.
function nest(symbols) {
  const ordered = symbols.slice().sort((a, b) => a.start - b.start || b.span - a.span);
  const children = new Map();
  const parents = new Map();
  const stack = [];

  for (const sym of ordered) {
    let top;
    while ((top = stack[stack.length - 1]) != null &&
           (top.end < sym.end || (top.start === sym.start && top.end === sym.end))) {
      stack.pop();
    }
    top = stack[stack.length - 1];
    if (top != null && top.span > sym.span) {
      parents.set(sym, top);
      const kids = children.get(top) ?? [];
      kids.push(sym);
      children.set(top, kids);
    }
    stack.push(sym);
  }

  const roots = ordered.filter((s) => !parents.has(s));
  return roots.map((s) => toPOJO(s, children));
}

function toPOJO(symbol, children) {
  const pojo = {
    name: symbol.name,
    kind: symbol.kind,
    range: symbol.range,
    selectionRange: symbol.selectionRange,
  };
  const kids = children.get(symbol);
  if (kids && kids.length > 0) pojo.children = kids.map((k) => toPOJO(k, children));
  return pojo;
}

export { perform };

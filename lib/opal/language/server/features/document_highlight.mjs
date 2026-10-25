// The textDocument/documentHighlight request (port of
// ../../features/document_highlight.rb): put the cursor on an
// identifier and every reference to it in the document lights up, Read
// for reads and Write for assignments (LSP DocumentHighlightKind). The
// cursor's identifier comes from Document#locateNode; the occurrences
// from one walk over the typed leaves that carry a `name` field.
import { walk } from "../node.mjs";

const READ = 2;
const WRITE = 3;

// Prism type => [family, kind]. Only same-family same-name nodes
// highlight together, so a local `x` does not light the method `x()`.
const TYPES = {
  // locals
  LocalVariableReadNode: ["local", READ],
  LocalVariableWriteNode: ["local", WRITE],
  LocalVariableAndWriteNode: ["local", WRITE],
  LocalVariableOrWriteNode: ["local", WRITE],
  LocalVariableOperatorWriteNode: ["local", WRITE],
  // instance variables
  InstanceVariableReadNode: ["ivar", READ],
  InstanceVariableWriteNode: ["ivar", WRITE],
  InstanceVariableAndWriteNode: ["ivar", WRITE],
  InstanceVariableOrWriteNode: ["ivar", WRITE],
  InstanceVariableOperatorWriteNode: ["ivar", WRITE],
  // class variables
  ClassVariableReadNode: ["cvar", READ],
  ClassVariableWriteNode: ["cvar", WRITE],
  // globals
  GlobalVariableReadNode: ["gvar", READ],
  GlobalVariableWriteNode: ["gvar", WRITE],
  GlobalVariableAndWriteNode: ["gvar", WRITE],
  GlobalVariableOrWriteNode: ["gvar", WRITE],
  GlobalVariableOperatorWriteNode: ["gvar", WRITE],
  // constants
  ConstantReadNode: ["constant", READ],
  ConstantPathNode: ["constant", READ],
  ConstantWriteNode: ["constant", WRITE],
  ConstantPathWriteNode: ["constant", WRITE],
  // methods: DefNode answers Write (the name is a definition),
  // calls Read - the kinds editors print for a "highlightable" method.
  DefNode: ["method", WRITE],
  CallNode: ["method", READ],
};

export function perform(document, position) {
  const parseResult = document.parse();
  const context = document.locateNode(position.line, position.character);

  const target = context.ancestors.find((node) => Object.hasOwn(TYPES, node.type));
  if (target === undefined) return [];
  const [family] = TYPES[target.type];
  if (target.name == null) return [];

  const name = target.name;
  const highlights = [];
  walk(parseResult.ast, (node) => {
    const info = TYPES[node.type];
    if (info === undefined) return;
    const [nodeFamily, kind] = info;
    if (nodeFamily !== family || node.name !== name) return;

    // Write nodes' location spans the whole assignment (@x = 1); the
    // highlight is the identifier, which starts at the node and runs
    // for the length of the name (UTF-16 units: `@count`, `CONST`).
    let range;
    if (node.type === "CallNode") {
      range = parseResult.rangeForLoc(node.message_loc) ?? parseResult.rangeForNode(node);
    } else if (node.type === "DefNode") {
      range = parseResult.rangeForLoc(node.name_loc) ?? parseResult.rangeForNode(node);
    } else if (kind === WRITE && !node.type.startsWith("ConstantPath")) {
      range = identifierRange(parseResult, node, name);
    } else {
      range = parseResult.rangeForNode(node);
    }
    highlights.push({ range, kind });
  });
  return highlights;
}

function identifierRange(parseResult, node, name) {
  const startAt = node.location.start;
  const stopAt = startAt + String(name).length;
  const [s, sc] = parseResult.positionAt(startAt);
  const [, ec] = parseResult.positionAt(stopAt);
  return {
    start: { line: s, character: sc },
    end: { line: s, character: ec },
  };
}

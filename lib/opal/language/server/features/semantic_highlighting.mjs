// The textDocument/semanticTokens/full request (port of
// ../../features/semantic_highlighting.rb): the editor colors
// identifiers with real language knowledge instead of its TextMate
// regexes. Standard LSP legend (the subset this server emits) plus the
// delta-encoded token stream the protocol defines; the walk visits the
// same typed leaves document_highlight reads.

import { walk } from "../node.mjs";

// Legend order is the protocol: the data array indexes types and
// modifiers by position in these lists.
export const TOKEN_TYPES = [
  "namespace", // module name
  "class",     // class name
  "method",    // method with an explicit receiver, and every def
  "function",  // bare method call (no receiver)
  "parameter", // block/method parameters
  "property",  // instance/class variables
  "variable",  // locals, globals, constants
];

export const TOKEN_MODIFIERS = [
  "declaration", // a def
  "readonly",    // constant reads
];

const DECLARATION = 1 << 0;
const READONLY = 1 << 1;

const PARAMETER_TYPES = new Set([
  "RequiredParameterNode", "OptionalParameterNode", "RestParameterNode",
  "PostRequiredParameterNode", "KeywordParameterNode",
  "KeywordRestParameterNode", "BlockParameterNode", "ProcBlockParameterNode",
]);

const PROPERTY_TYPES = new Set([
  "InstanceVariableReadNode", "InstanceVariableWriteNode",
  "InstanceVariableAndWriteNode", "InstanceVariableOrWriteNode",
  "InstanceVariableOperatorWriteNode",
  "ClassVariableReadNode", "ClassVariableWriteNode",
]);

// Whole-node tokens (their location is exactly the identifier):
// type => [token type index, modifier bits]
const LEAF_TOKENS = {
  LocalVariableReadNode: [6, 0],
  LocalVariableWriteNode: [6, 0],
  GlobalVariableReadNode: [6, 0],
  GlobalVariableWriteNode: [6, 0],
  ConstantReadNode: [6, READONLY],
  ConstantWriteNode: [6, 0],
};

export function legend() {
  return { tokenTypes: TOKEN_TYPES, tokenModifiers: TOKEN_MODIFIERS };
}

// Perform answers the LSP SemanticTokens result: {data: [...]},
// five numbers per token in delta encoding - (deltaLine, deltaStart,
// length, tokenType, tokenModifiers) each relative to the previous
// token (deltaStart only when the line delta is 0).
export function perform(document) {
  const parseResult = document.parse();
  const tokens = [];
  const covered = new Set();

  const pushOffsets = (startAt, endAt, type, modifiers) => {
    const [line, character] = parseResult.positionAt(startAt);
    const [, endCharacter] = parseResult.positionAt(endAt);
    const length = endCharacter - character;
    if (length <= 0) return;
    tokens.push({ line, character, length, type, modifiers });
  };
  // A loc POJO ({start:, end:}) or null - null locs are skipped.
  const pushLoc = (loc, type, modifiers) => {
    if (loc == null) return;
    pushOffsets(loc.start, loc.end, type, modifiers);
  };
  const pushNode = (node, type, modifiers = 0) => {
    pushOffsets(node.location.start, node.location.end, type, modifiers);
  };

  const visit = (node) => {
    switch (node.type) {
      case "ModuleNode":
        if (node.constant_path != null) {
          covered.add(`${node.constant_path.location.start},${node.constant_path.location.end}`);
          pushNode(node.constant_path, 0);
        }
        break;
      case "ClassNode":
        if (node.constant_path != null) {
          covered.add(`${node.constant_path.location.start},${node.constant_path.location.end}`);
          pushNode(node.constant_path, 1);
        }
        break;
      case "DefNode":
        pushLoc(node.name_loc, 2, DECLARATION);
        break;
      case "CallNode":
        pushLoc(node.message_loc, node.receiver != null ? 2 : 3, 0);
        break;
      case "SingletonClassNode":
        pushLoc(node.class_keyword_loc, 1, 0);
        break;
      default:
    }

    if (PARAMETER_TYPES.has(node.type)) {
      pushNode(node, 4);
    } else if (PROPERTY_TYPES.has(node.type)) {
      pushNode(node, 5);
    } else if (Object.hasOwn(LEAF_TOKENS, node.type)) {
      // `class Foo`: ClassNode already tokenized the ConstantReadNode
      // that is its name - one token per span.
      const [type, modifiers] = LEAF_TOKENS[node.type];
      if (!covered.has(`${node.location.start},${node.location.end}`)) pushNode(node, type, modifiers);
    }
  };

  walk(parseResult.ast, visit);

  const ordered = tokens.sort((a, b) => a.line - b.line || a.character - b.character);
  const data = [];
  let previousLine = 0;
  let previousCharacter = 0;
  for (const token of ordered) {
    const lineDelta = token.line - previousLine;
    const charDelta = lineDelta === 0 ? token.character - previousCharacter : token.character;
    data.push(lineDelta, charDelta, token.length, token.type, token.modifiers);
    previousLine = token.line;
    previousCharacter = token.character;
  }
  return { data };
}

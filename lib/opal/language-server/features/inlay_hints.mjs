// The textDocument/inlayHint request (port of
// ../../features/inlay_hints.rb): hints the editor shows inline but the
// source does not contain. Two, both real gaps in what the reader of the
// code can see, as ruby-lsp advertises them:
// - a bare `rescue` binds the error to an invisible #rescued_value special;
// - the Ruby 3.1 shorthand `{x:}` hides that the value is the local `x`.
import { walk } from "../node.mjs";

const KIND_PARAMETER = 2;

// The request's range (an LSP Range) filters by line; hints off the
// visible window cost the editor layout work for nothing.
export function perform(document, range) {
  const parseResult = document.parse();
  const hints = [];

  walk(parseResult.ast, (node) => {
    switch (node.type) {
      case "RescueNode":
        if (node.reference == null) hintAfterKeyword(node);
        break;
      case "AssocNode":
        shorthandHint(node);
        break;
      default:
    }
  });

  function shorthandHint(node) {
    const value = node.value;
    if (value == null || value.type !== "ImplicitNode") return;
    const key = node.key;
    if (key == null) return;
    const name = key.unescaped ?? null;
    if (name == null) return;
    const [line, character] = parseResult.positionAt(key.location.end);
    hints.push({ label: name, position: { line, character }, kind: KIND_PARAMETER, paddingLeft: true });
  }

  // `{x: }`: Prism fills the omitted value with an ImplicitNode
  // wrapping the same-named variable; echo the name back.
  function hintAfterKeyword(node) {
    const loc = node.keyword_loc;
    const [line, character] = parseResult.positionAt(loc == null ? node.location.start : loc.end);
    hints.push({ label: "#rescued_value", position: { line, character }, kind: KIND_PARAMETER, paddingLeft: true });
  }

  const firstLine = range?.start?.line ?? 0;
  const lastLine = range?.end?.line ?? Infinity;
  return hints.filter((hint) => hint.position.line >= firstLine && hint.position.line <= lastLine);
}

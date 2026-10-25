// The opalLsp/showSyntaxTree request (port of
// ../../features/syntax_tree.rb): the document's Prism parse tree as
// JSON, for the editor side of the `Opal: Show Syntax Tree` command. The
// envelope's AST is already a POJO (lib/opal/parser/convert.mjs) so the
// dump is one JSON.stringify; it comes back as a string because the
// parse tree is the raw compiler data - node ids, flags, everything -
// not a protocol type with its own schema.

export function perform(document) {
  const { envelope } = document.parse();
  return {
    ast: JSON.stringify(envelope.ast),
    errors: JSON.stringify(envelope.errors),
  };
}

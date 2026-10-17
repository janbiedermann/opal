// Ruby-free port of test/prism/result/heredoc_test.rb — see UNI.md.
// `StringNode#heredoc?`/`InterpolatedStringNode#heredoc?` are
// `opening&.start_with?("<<")` (lib/prism/node_ext.rb) - replicated
// directly by slicing `opening_loc` out of the source.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function isHeredoc(source) {
  const node = uniEnvelope(source).ast.statements.body[0];
  const opening = node.opening_loc;
  if (!opening) return false;
  return source.slice(Number(opening.start), Number(opening.end)).startsWith("<<");
}

test("heredoc?", () => {
  assert.equal(isHeredoc('"foo"'), false);
  assert.equal(isHeredoc('"foo #{1}"'), false);
  assert.equal(isHeredoc("`foo`"), false);
  assert.equal(isHeredoc("`foo #{1}`"), false);

  assert.equal(isHeredoc("<<~HERE\nfoo\nHERE\n"), true);
  assert.equal(isHeredoc("<<~HERE\nfoo #{1}\nHERE\n"), true);
  assert.equal(isHeredoc("<<~`HERE`\nfoo\nHERE\n"), true);
  assert.equal(isHeredoc("<<~`HERE`\nfoo #{1}\nHERE\n"), true);
});

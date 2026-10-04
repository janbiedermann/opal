// Ruby-free port of test/prism/api/parse_stream_test.rb — see UNI.md.
//
// `Prism.parse_stream` reads from a Ruby IO incrementally, stopping right
// after `__END__`; target_js_uni's library takes a complete string, so
// there's no streaming API to test. Reinterpreted: the thing parse_stream
// is actually exercising - does `__END__` correctly end parsing only when
// it's really a `__END__` marker, not inside a string/regexp/%w-list/
// heredoc - is fully present in a single parse via the `data_loc` field and
// `statements.body.length`, so this tests that directly.
//
// Dropped: test_multi_read (verifies chunked IO reads don't split tokens at
// a buffer boundary - a streaming-reader concern with no equivalent when
// there's no streaming reader).

import { test } from "node:test";
import assert from "node:assert/strict";

import { rawEnvelope } from "./support/uni-envelope.mjs";

test("single line", () => {
  const { ast, errors } = rawEnvelope("1 + 2");
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body[0].type, "CallNode");
});

test("multi line", () => {
  const { ast, errors } = rawEnvelope("1 + 2\n3 + 4");
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body.every((n) => n.type === "CallNode"), true);
});

test("__END__ stops the program and starts data_loc", () => {
  const { ast, errors, data_loc: dataLoc } = rawEnvelope("1 + 2\n3 + 4\n__END__\n5 + 6");
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body.length, 2);
  assert.deepStrictEqual(dataLoc, { start: 12, end: 25 });
});

test("__END__ with CRLF line endings", () => {
  const { data_loc: dataLoc } = rawEnvelope("__END__\r\ncomment\r\n");
  assert.deepStrictEqual(dataLoc, { start: 0, end: 18 });
});

test("a false __END__ inside a string is not a data marker", () => {
  const { ast, errors } = rawEnvelope('1 + 2\n3 + 4\n"\n__END__\n"\n5 + 6');
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body.length, 4);
});

test("a false __END__ inside a regexp is not a data marker", () => {
  const { ast, errors } = rawEnvelope("1 + 2\n3 + 4\n/\n__END__\n/\n5 + 6");
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body.length, 4);
});

test("a false __END__ inside a %w list is not a data marker", () => {
  const { ast, errors } = rawEnvelope("1 + 2\n3 + 4\n%w[\n__END__\n]\n5 + 6");
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body.length, 4);
});

test("a false __END__ inside a heredoc is not a data marker", () => {
  const { ast, errors } = rawEnvelope("1 + 2\n3 + 4\n<<-EOF\n__END__\nEOF\n5 + 6");
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body.length, 4);
});

test("NUL bytes inside comments don't end parsing", () => {
  const { ast, errors } = rawEnvelope("1 # \0\0\0 \n2 # \0\0\0\n3");
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body.length, 3);
});

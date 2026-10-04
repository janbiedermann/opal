// Ruby-free port of test/prism/result/comments_test.rb — see UNI.md.
//
// Dropped: test_attaching_comments (`ParseResult#attach_comments!`). That's
// a substantial standalone algorithm (lib/prism/parse_result/comments.rb,
// ~190 lines) built on every node type's own `comment_targets` (itself a
// generated method per node type, well beyond what config.yml's field-order
// table gives this port for free) - porting it is a much bigger, separate
// undertaking than anything else in this file, so it's out of scope here
// rather than attempted partially.

import { test } from "node:test";
import assert from "node:assert/strict";

import { rawEnvelope } from "./support/uni-envelope.mjs";
import { lineForOffset, columnForOffset } from "./support/build-options.mjs";

function assertComment(source, type, { start, end, startLine, endLine, startColumn, endColumn }) {
  const envelope = rawEnvelope(source);
  assert.equal(envelope.errors.length, 0, envelope.errors.map((e) => e.message).join("\n"));

  const comment = envelope.comments[0];
  assert.ok(comment, "expected at least one comment");
  assert.equal(comment.type, type);
  assert.equal(comment.start, start);
  assert.equal(comment.end, end);
  assert.equal(lineForOffset(envelope.offsets, 1, comment.start), startLine);
  assert.equal(lineForOffset(envelope.offsets, 1, comment.end), endLine);
  assert.equal(columnForOffset(envelope.offsets, comment.start), startColumn);
  assert.equal(columnForOffset(envelope.offsets, comment.end), endColumn);
}

test("inline comment", () => {
  assertComment("# comment", "inline", { start: 0, end: 9, startLine: 1, endLine: 1, startColumn: 0, endColumn: 9 });
});

test("inline comment inside a def", () => {
  assertComment("def foo\n  # a comment\nend\n", "inline", {
    start: 10,
    end: 21,
    startLine: 2,
    endLine: 2,
    startColumn: 2,
    endColumn: 13,
  });
});

test("__END__ marks data_loc", () => {
  const envelope = rawEnvelope("__END__\ncomment\n");
  assert.equal(envelope.data_loc.start, 0);
  assert.equal(envelope.data_loc.end, 16);
});

test("__END__ with CRLF line endings marks data_loc", () => {
  const envelope = rawEnvelope("__END__\r\ncomment\r\n");
  assert.equal(envelope.data_loc.start, 0);
  assert.equal(envelope.data_loc.end, 18);
});

test("embedded document comment", () => {
  assertComment("=begin\ncomment\n=end\n", "embdoc", {
    start: 0,
    end: 20,
    startLine: 1,
    endLine: 4,
    startColumn: 0,
    endColumn: 0,
  });
});

test("embedded document comment with content on the same line", () => {
  assertComment("=begin other stuff\n=end\n", "embdoc", {
    start: 0,
    end: 24,
    startLine: 1,
    endLine: 3,
    startColumn: 0,
    endColumn: 0,
  });
});

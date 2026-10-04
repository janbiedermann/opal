// Ruby-free port of test/prism/api/parse_comments_test.rb — see UNI.md.
//
// Dropped (no JS analog): test_parse_file_comments/
// test_parse_file_comments_error - target_js_uni's library takes a source
// string, not a path.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/potch/index.mjs";

test("parse_comments returns the source's comments", () => {
  const { comments } = parseWithMetadata("# foo");
  assert.ok(Array.isArray(comments));
  assert.equal(comments.length, 1);
});

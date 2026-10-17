// Ruby-free port of test/prism/api/parse_success_test.rb — see UNI.md.
//
// Dropped (no JS analog): test_parse_file_success? - target_js_uni's
// library takes a source string, not a path.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSuccess } from "./support/uni-envelope.mjs";

test("parse_success?", () => {
  assert.equal(parseSuccess("1"), true);
  assert.equal(parseSuccess("<>"), false);
});

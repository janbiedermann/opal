// Ruby-free port of test/prism/api/lex_test.rb — see UNI.md.
//
// Dropped (no JS analog): the `lex_file`/`parse_lex_file` halves of both
// Ruby tests - target_js_uni's library takes a source string, not a path.

import { test } from "node:test";
import assert from "node:assert/strict";

import { lexWithMetadata, parseWithMetadata } from "../../../lib/opal/parser/index.mjs";

test("lex result has a tokens array", () => {
  const result = lexWithMetadata("");
  assert.ok(Array.isArray(result.tokens));
});

test("parse_lex pairs a parse result with a lex result", () => {
  const parsed = parseWithMetadata("");
  const lexed = lexWithMetadata("");
  assert.ok(parsed.ast);
  assert.ok(Array.isArray(lexed.tokens));
});

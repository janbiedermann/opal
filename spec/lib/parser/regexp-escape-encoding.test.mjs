// /.../n with escaped non-ASCII bytes is valid; only literal non-ASCII
// characters are an encoding mismatch (as in the C parser).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWithMetadata } from "../../../lib/opal/parser/index.mjs";

test("escaped non-ASCII bytes in /.../n regexps", () => {
  for (const source of ["/\\xc2\\xa1/n", "/\\xFF/n", "x = /\\A(?:\\xef\\xbb\\xbf)?/n"]) {
    assert.deepEqual(parseWithMetadata(source, null).errors, [], source);
  }
});

test("literal non-ASCII characters in /.../n regexps", () => {
  const types = parseWithMetadata("/é/n", null).errors.map((e) => e.type);
  assert.ok(types.includes("regexp_non_escaped_mbc"), types.join(", "));
});

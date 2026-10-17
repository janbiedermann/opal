// Ruby-free port of test/prism/result/named_capture_test.rb — see UNI.md.
// Exercises target_js_uni's own named-capture-group-name escape decoding
// (src/parts/prism_part7.js) directly - no reference parser needed.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/parser/index.mjs";

function parseName(content) {
  const node = parseWithMetadata(`/(?<${content}>)/ =~ ''`).ast.statements.body[0];
  return node.targets[0].name;
}

test("hex escapes combine into one codepoint", () => assert.equal(parseName("\\xf0\\x9f\\x98\\x80"), "😀"));
test("unicode escape", () => assert.equal(parseName("\\u3057"), "し"));
test("unicode escape with braces", () => assert.equal(parseName("\\u{1f600}"), "😀"));
test("octal escapes combine into one codepoint", () => assert.equal(parseName("\\xf0\\x9f\\x98\\200"), "😀"));

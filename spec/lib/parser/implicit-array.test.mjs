// Ruby-free port of test/prism/result/implicit_array_test.rb — see UNI.md.
// Dropped the CRuby-compile cross-check (`assert_valid_syntax`) - no Ruby
// to compile against; the parse_success?/parse_failure? half is the part
// that actually exercises target_js_uni.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSuccess } from "./support/uni-envelope.mjs";

function assertImplicitArray(source) {
  assert.equal(parseSuccess(source), true, `expected ${JSON.stringify(source)} to parse`);
  assert.equal(parseSuccess(`if ${source} then end`), false, `expected "if ${source} then end" to fail`);
}

const CASES = [
  ["call node", ["a.a = *b", "a.a = 1, 2, 3", "a[a] = *b", "a[a] = 1, 2, 3"]],
  ["class variable write node", ["@@a = *b", "@@a = 1, 2, 3"]],
  ["constant path write node", ["A::A = *b", "A::A = 1, 2, 3"]],
  ["constant write node", ["A = *b", "A = 1, 2, 3"]],
  ["global variable write node", ["$a = *b", "$a = 1, 2, 3"]],
  ["instance variable write node", ["@a = *b", "@a = 1, 2, 3"]],
  ["local variable write node", ["a = *b", "a = 1, 2, 3"]],
  ["multi write node", ["a, b, c = *b", "a, b, c = 1, 2, 3"]],
];

for (const [name, sources] of CASES) {
  test(`implicit array: ${name}`, () => {
    for (const source of sources) assertImplicitArray(source);
  });
}

// Ruby-free port of test/prism/result/attribute_write_test.rb — see UNI.md.
// `CallNode#attribute_write?` is the ATTRIBUTE_WRITE flag (CallNodeFlags);
// tested directly against target_js_uni's own flags array. The Ruby
// original's `eval(source)` cross-check (does this actually behave like an
// attribute write at runtime) is dropped - no Ruby to eval against.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function isAttributeWrite(source) {
  return uniEnvelope(source).ast.statements.body[0].flags?.includes("attribute_write") ?? false;
}

test("named call with operator is an attribute write", () => assert.equal(isAttributeWrite("Target.value = 1"), true));
test("named call without operator is an attribute write", () =>
  assert.equal(isAttributeWrite("Target.value=(1)"), true));
test("indexed call with operator is an attribute write", () => assert.equal(isAttributeWrite("Target[0] = 1"), true));
test("indexed call without operator is not an attribute write", () =>
  assert.equal(isAttributeWrite("Target.[]=(0, 1)"), false));
test("comparison operators are not attribute writes", () => {
  assert.equal(isAttributeWrite("Target.value == 1"), false);
  assert.equal(isAttributeWrite("Target.value === 1"), false);
});

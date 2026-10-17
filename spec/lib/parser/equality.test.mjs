// Ruby-free port of test/prism/result/equality_test.rb — see UNI.md.
// `Node#===` is Ruby's structural-equality convenience (deconstruct_keys
// minus location/node_id). target_js_uni's nodes are already plain POJOs,
// so this is exactly what uniEnvelope()'s own stripNode() produces (flags
// sorted, node_id/newline/static_literal stripped) - parsing the same
// source twice and deep-equaling the two trees exercises the same
// property more directly than reimplementing a `===` method.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function sameStructure(a, b) {
  return JSON.stringify(uniEnvelope(a).ast) === JSON.stringify(uniEnvelope(b).ast);
}

test("structurally identical sources parse to equal trees", () => {
  assert.equal(sameStructure("1", "1"), true);

  const complex = "class Something; @var = something.else { _1 }; end";
  assert.equal(sameStructure(complex, complex), true);
});

test("structurally different sources parse to unequal trees", () => {
  assert.equal(sameStructure("1", "2"), false);
  assert.equal(sameStructure("1", "0x1"), false);

  const a = "class Something; @var = something.else { _1 }; end";
  const b = "class Something; @var = something.else { _2 }; end";
  assert.equal(sameStructure(a, b), false);
});

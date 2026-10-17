// Ruby-free port of test/prism/result/breadth_first_search_test.rb — see
// UNI.md. `Node#breadth_first_search`/`#breadth_first_search_all` are Ruby
// convenience methods with no equivalent on target_js_uni's POJO nodes (no
// methods at all) - reinterpreted using support/build-options.js's
// searchFirst()/searchAll(), which walk the tree in the same level-order
// (BFS) fashion.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";
import { searchFirst, searchAll } from "./support/build-options.mjs";

test("breadth_first_search finds the shallowest match first", () => {
  const ast = uniEnvelope("[1 + 2, 2]").ast;
  const found = searchFirst(ast, (node) => node.type === "IntegerNode" && node.value === "2");
  assert.ok(found);
  assert.equal(found.location.start, "8");
});

test("breadth_first_search_all finds every match, shallowest first", () => {
  const ast = uniEnvelope("[1 + 2, 2]").ast;
  const found = searchAll(ast, (node) => node.type === "IntegerNode");
  assert.equal(found.length, 3);
  assert.equal(found[0].location.start, "8");
});

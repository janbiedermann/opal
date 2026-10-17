// Ruby-free port of test/prism/result/regular_expression_options_test.rb —
// see UNI.md. Despite the filename, this Ruby test is actually about
// general parse options (filepath/line/frozen_string_literal/scopes), all
// already covered individually elsewhere in this port (parse.test.js,
// numeric-value.test.js, etc.) - kept as its own file for 1:1 traceability
// with the Ruby suite, bundling the same option checks the original did.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

test("parse options", () => {
  assert.equal(uniEnvelope("__FILE__").ast.statements.body[0].filepath, "");
  assert.equal(uniEnvelope("__FILE__", { filepath: "foo.rb" }).ast.statements.body[0].filepath, "foo.rb");

  assert.equal(uniEnvelope("foo").startLine, 1);
  assert.equal(uniEnvelope("foo", { line: 10 }).startLine, 10);

  assert.equal(uniEnvelope('"foo"').ast.statements.body[0].flags?.includes("frozen") ?? false, false);
  assert.equal(
    uniEnvelope('"foo"', { frozen_string_literal: true }).ast.statements.body[0].flags?.includes("frozen"),
    true,
  );
  assert.equal(
    uniEnvelope('"foo"', { frozen_string_literal: false }).ast.statements.body[0].flags?.includes("frozen") ?? false,
    false,
  );

  assert.equal(uniEnvelope("foo").ast.statements.body[0].type, "CallNode");
  assert.equal(
    uniEnvelope("foo", { scopes: [{ locals: ["foo"] }] }).ast.statements.body[0].type,
    "LocalVariableReadNode",
  );
  assert.equal(
    uniEnvelope("foo", { scopes: [{ locals: ["foo"] }, { locals: [] }] }).ast.statements.body[0].depth,
    "1",
  );

  assert.deepStrictEqual(uniEnvelope("foo", { scopes: [{ locals: ["foo"] }] }).ast.locals, ["foo"]);
});

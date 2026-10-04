// Ruby-free port of test/prism/result/integer_base_flags_test.rb — see
// UNI.md. The Ruby original tests a bit-hack recovering the numeric base
// from IntegerBaseFlags's bit alignment; ported here by its *intent*
// instead (does the right base-name flag show up), using target_js_uni's
// own flags array rather than replicating the bit arithmetic.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function base(source) {
  const flags = uniEnvelope(source).ast.statements.body[0].flags ?? [];
  if (flags.includes("binary")) return 2;
  if (flags.includes("octal")) return 8;
  if (flags.includes("hexadecimal")) return 16;
  return 10; // "decimal" flag, or no base flag at all (plain "1")
}

test("integer base flags", () => {
  assert.equal(base("0b1"), 2);
  assert.equal(base("0o1"), 8);
  assert.equal(base("0d1"), 10);
  assert.equal(base("0x1"), 16);
});

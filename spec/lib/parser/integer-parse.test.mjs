// Ruby-free port of test/prism/result/integer_parse_test.rb — see UNI.md.
// Values compared as decimal-digit strings (uniEnvelope() stringifies every
// numeric leaf - see its own doc comment on why) rather than as JS
// number/BigInt, which sidesteps any type distinction entirely.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function assertIntegerParse(expected, source = String(expected)) {
  const node = uniEnvelope(source).ast.statements.body[0];
  assert.equal(node.value, String(expected));
}

test("integer parse", () => {
  assertIntegerParse(1);
  assertIntegerParse(50);
  assertIntegerParse(100);
  assertIntegerParse(100, "1_0_0");
  assertIntegerParse(8, "0_1_0");

  assertIntegerParse(10, "0b1010");
  assertIntegerParse(10, "0B1010");
  assertIntegerParse(10, "0o12");
  assertIntegerParse(10, "0O12");
  assertIntegerParse(10, "012");
  assertIntegerParse(10, "0d10");
  assertIntegerParse(10, "0D10");
  assertIntegerParse(10, "0xA");
  assertIntegerParse(10, "0XA");

  assertIntegerParse(2n ** 32n);
  assertIntegerParse(2n ** 64n + 2n ** 32n);
  assertIntegerParse(2n ** 128n + 2n ** 64n + 2n ** 32n);

  const num = 99n ** 99n;
  assertIntegerParse(num, `0b${num.toString(2)}`);
  assertIntegerParse(num, `0o${num.toString(8)}`);
  assertIntegerParse(num, `0d${num.toString(10)}`);
  assertIntegerParse(num, `0x${num.toString(16)}`);
});

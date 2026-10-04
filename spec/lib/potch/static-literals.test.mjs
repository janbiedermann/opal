// Ruby-free port of test/prism/result/static_literals_test.rb — see
// UNI.md. Checks which pairs of literals are considered the *same* static
// value (and so trigger a duplicate-hash-key / duplicate-when-clause
// warning) - directly against target_js_uni's own warnings, no reference
// parser needed.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function parseWarnings(left, right) {
  const hashKeys = uniEnvelope(`{\n  ${left} => 1,\n  ${right} => 2\n}`).warnings;
  const whenClauses = uniEnvelope(`case foo\nwhen ${left}\nwhen ${right}\nend`).warnings;
  return [hashKeys, whenClauses];
}

function assertWarning(left, right = left, message = left) {
  const [hashKeys, whenClauses] = parseWarnings(left, right);
  assert.equal(hashKeys.length, 1, `expected exactly one hash-key warning for ${left} / ${right}`);
  assert.ok(hashKeys[0].message.includes(message));
  assert.ok(hashKeys[0].message.includes("line 3"));
  assert.equal(whenClauses.length, 1, `expected exactly one when-clause warning for ${left} / ${right}`);
  assert.ok(whenClauses[0].message.includes("line 3"));
}

function refuteWarning(left, right) {
  const [hashKeys, whenClauses] = parseWarnings(left, right);
  assert.deepStrictEqual(hashKeys, []);
  assert.deepStrictEqual(whenClauses, []);
}

test("static literals", () => {
  assertWarning("1");
  assertWarning("0xA", "10", "10");
  assertWarning("0o10", "8", "8");
  assertWarning("0b10", "2", "2");
  assertWarning("1_000", "1000", "1000");
  assertWarning(String(2n ** 32n), `0x${(2n ** 32n).toString(16)}`, String(2n ** 32n));
  assertWarning(String(2n ** 64n), `0x${(2n ** 64n).toString(16)}`, String(2n ** 64n));

  refuteWarning("1", "-1");
  refuteWarning(String(2n ** 32n), `-0x${(2n ** 32n).toString(16)}`);
  refuteWarning(String(2n ** 64n), `-0x${(2n ** 64n).toString(16)}`);

  assertWarning("__LINE__", "2", "2");
  assertWarning("3", "__LINE__", "3");

  assertWarning("1.0");
  assertWarning("1e2", "100.0", "100.0");

  assertWarning("1r", "1r", "(1/1)");
  assertWarning("1.0r", "1.0r", "(1/1)");

  assertWarning("1i", "1i", "(0+1i)");
  assertWarning("1.0i", "1.0i", "(0+1.0i)");

  assertWarning("1ri", "1ri", "(0+(1/1)*i)");
  assertWarning("1.0ri", "1.0ri", "(0+(1/1)*i)");

  assertWarning('"foo"');

  assertWarning("/foo/");
  refuteWarning("/foo/", "/foo/i");

  assertWarning(":foo");
  assertWarning("%s[foo]", ":foo", ":foo");

  assertWarning("true");
  assertWarning("false");
  assertWarning("nil");
  assertWarning("__ENCODING__", "__ENCODING__", "#<Encoding:UTF-16>");
});

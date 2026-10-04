// Ruby-free port of test/prism/result/static_inspect_test.rb — see UNI.md.
//
// The Ruby test indirectly exercises Prism's internal "static literal
// inspect" formatter (used to render a duplicate-hash-key warning's
// "key <repr> is duplicated..." message) by parsing `{ x => 1, x => 1 }`
// and picking the representation back out of the warning text. Ported the
// same way, directly against target_js_uni's own warnings - no reference
// parser needed.
//
// One case adjusted, not dropped: `__ENCODING__`'s default representation
// is `#<Encoding:UTF-16>` here, not Ruby's `#<Encoding:UTF-8>` -
// target_js_uni's own internal source encoding is always its single
// UTF-16 entry (src/encoding.js), so this is target_js_uni correctly
// describing itself, not a mismatch.
//
// Dropped: overriding `__ENCODING__` via `encoding: "Windows-31J"` - same
// "no encoding tables" architecture limitation established throughout this
// port (fixtures.test.js's exclusions, UNI.md).

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function staticInspect(source, options = null) {
  const { warnings } = uniEnvelope(`{ ${source} => 1, ${source} => 1 }`, options);
  const last = warnings[warnings.length - 1];
  const match = last?.message.match(/^key (.+) is duplicated and overwritten on line \d/);
  return match?.[1];
}

test("false", () => assert.equal(staticInspect("false"), "false"));

test("float", () => {
  assert.equal(staticInspect("0.25"), "0.25");
  assert.equal(staticInspect("5.125"), "5.125");
  assert.equal(staticInspect("0.0"), "0.0");
  assert.equal(staticInspect("-0.0"), "-0.0");
  assert.equal(staticInspect("1e100"), "1.0e+100");
  assert.equal(staticInspect("-1e100"), "-1.0e+100");
  assert.equal(staticInspect("1e1000"), "Infinity");
  assert.equal(staticInspect("-1e1000"), "-Infinity");
});

test("imaginary", () => {
  assert.equal(staticInspect("1i"), "(0+1i)");
  assert.equal(staticInspect("-1i"), "(0-1i)");
});

test("integer", () => {
  assert.equal(staticInspect("1_0_0_0"), "1000");
  assert.equal(
    staticInspect("1_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0"),
    "10000000000000000000000000000",
  );
});

test("nil", () => assert.equal(staticInspect("nil"), "nil"));

test("rational", () => {
  assert.equal(staticInspect("0r"), "(0/1)");
  assert.equal(staticInspect("1r"), "(1/1)");
  assert.equal(staticInspect("1.0r"), "(1/1)");
  assert.equal(staticInspect("77.777r"), "(77777/1000)");
});

test("regular expression", () => {
  assert.equal(staticInspect("/.*/"), "/.*/");
  assert.equal(staticInspect("/.*/i"), "/.*/i");
  assert.equal(staticInspect("/.*/u"), "/.*/");
  assert.equal(staticInspect("/.*/un"), "/.*/n");
});

test("source encoding", () => assert.equal(staticInspect("__ENCODING__"), "#<Encoding:UTF-16>"));

test("source line", () => {
  assert.equal(staticInspect("__LINE__"), "1");
  assert.equal(staticInspect("__LINE__", { line: 5 }), "5");
});

test("string", () => {
  assert.equal(staticInspect('""', { frozen_string_literal: true }), '""');
  assert.equal(staticInspect('"Hello, World!"', { frozen_string_literal: true }), '"Hello, World!"');
  assert.equal(staticInspect('"\\a"', { frozen_string_literal: true }), '"\\a"');
});

test("symbol", () => {
  assert.equal(staticInspect(":foo"), ":foo");
  assert.equal(staticInspect("%s[foo]"), ":foo");
});

test("true", () => assert.equal(staticInspect("true"), "true"));

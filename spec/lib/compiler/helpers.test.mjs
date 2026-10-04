// Ruby-compatible literal formatting used by the code generators.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rubyInspect, rubyFloatToS, jsStringLiteral, fixVarName, midToJsid } from "../../../lib/opal/compiler/helpers.mjs";

test("rubyInspect escapes like String#inspect", () => {
  assert.equal(rubyInspect('a"b\\c'), '"a\\"b\\\\c"');
  assert.equal(rubyInspect("\n\t\x07\x1b\x00\x7f"), '"\\n\\t\\a\\e\\u0000\\u007F"');
  assert.equal(rubyInspect("#{ #$ #@ #a"), '"\\#{ \\#$ \\#@ #a"');
  assert.equal(rubyInspect("​ é😀\u{e0080}"), '"​\\u2028é😀\\u{E0080}"');
});

test("jsStringLiteral rewrites escapes JS lacks", () => {
  assert.equal(jsStringLiteral("\x07\x1b\u{e0080}"), '"\\u0007\\u001b\\u{E0080}"');
  assert.equal(jsStringLiteral(" "), '"\\u2028"');
});

test("rubyFloatToS formats like Float#to_s", () => {
  const cases = {
    "1.0": 1, "-0.0": -0, "1.5": 1.5, "100.0": 100, "1.0e+15": 1e15, "1.0e+16": 1e16,
    "999999999999999.9": 999999999999999.9, "4501236620450339.5": 4501236620450339.5,
    "1.234567890123456e+15": 1234567890123456, "0.0001": 0.0001, "1.2e-05": 0.000012,
    "5.0e-324": 5e-324, "1.7976931348623157e+308": 1.7976931348623157e308, "Infinity": Infinity,
  };
  for (const [expected, value] of Object.entries(cases)) assert.equal(rubyFloatToS(value), expected);
});

test("fixVarName and midToJsid", () => {
  assert.equal(fixVarName("var"), "var$");
  assert.equal(fixVarName("foo"), "foo");
  assert.equal(midToJsid("foo"), ".$foo");
  assert.equal(midToJsid("foo?"), "['$foo?']");
  assert.equal(midToJsid("[]="), "['$[]=']");
});

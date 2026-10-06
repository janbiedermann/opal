// Errors about source encodings, as Prism 1.9 reports them (checked with
// Prism.parse): an unknown encoding in the magic comment, and a `\u`
// escape mixed with non-ASCII bytes (escaped or not) of a source in
// another encoding than UTF-8. Sources are given decoded, as potch gets
// them (a Latin-1 source one character per byte).
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/potch/index.mjs";

const errors = (source) => parseWithMetadata(source).errors.map((e) => [e.message, e.start, e.end - e.start]);
const latin1 = (literal) => `# encoding: iso-8859-1\n${literal}`;
const MIXED = "UTF-8 mixed within ISO-8859-1 source";

test("an unknown encoding in the magic comment", () => {
  assert.deepEqual(errors("# coding: latin1\n1"), [["unknown or invalid encoding in the magic comment", 10, 6]]);
  assert.equal(parseWithMetadata("# coding: latin1\n1").encoding, "UTF-8");
  assert.deepEqual(errors("# coding: bogus\n1"), [["unknown or invalid encoding in the magic comment", 10, 5]]);
});

test("known encodings in the magic comment", () => {
  for (const [name, encoding] of [["iso-8859-1", "ISO-8859-1"], ["utf-8-unix", "UTF-8"], ["Shift_JIS", "Shift_JIS"], ["sjis", "Windows-31J"], ["utf-8-hfs", "UTF8-MAC"]]) {
    const result = parseWithMetadata(`# encoding: ${name}\n1`);
    assert.deepEqual(result.errors, [], name);
    assert.equal(result.encoding, encoding, name);
  }
});

test("a \\u escape after a non-ASCII character", () => {
  assert.deepEqual(errors(latin1('"café \\u00e9"')), [[MIXED, 29, 6]]);
});

test("a non-ASCII character after a \\u escape", () => {
  // (reported at the start of the scanned content, as in C)
  assert.deepEqual(errors(latin1('"\\u00e9 café"')), [[MIXED, 30, 1]]);
});

test("\\x and \\u escapes", () => {
  assert.deepEqual(errors(latin1('"\\xe9 \\u00e9"')), [[MIXED, 29, 6]]);
  assert.deepEqual(errors(latin1('"\\u00e9 \\xe9"')), [[MIXED, 24, 11]]);
  assert.deepEqual(errors('# encoding: binary\n"ÿ \\u00e9"'), [["UTF-8 mixed within ASCII-8BIT source", 22, 6]]);
});

test("no conflict", () => {
  for (const literal of ['"café"', '"\\u0041 café"', "?\\u00e9", '"x" "\\u00e9" "café"', "'café \\u00e9'", "%w[é \\u00e9]", "/é\\u00e9/"]) {
    assert.deepEqual(errors(latin1(literal)), [], literal);
  }
  assert.deepEqual(errors('"café \\u00e9 \\xe9"'), []);
});

// A symbol whose bytes aren't valid in its encoding is an "invalid symbol"
// (Prism checks the bytes; potch has decoded text, see
// parse_symbol_encoding_validate_utf8).
test("invalid symbols", () => {
  const invalid = (source) => parseWithMetadata(source).errors.map((e) => e.message).includes("invalid symbol");
  // non-UTF-8 bytes in a symbol made UTF-8 by a \u escape
  assert.equal(invalid(latin1(':"\u00e9\\u00e9"')), true);
  assert.equal(invalid(latin1('{"\u00e9\\u00e9": 1}')), true);
  assert.equal(invalid(latin1(':"\\u00e9\u00e9"')), false);
  // \x escapes that aren't UTF-8 in a UTF-8 source
  for (const source of [':"\\xe9"', ':"\\xe9\\x80"', ':"a\\xffb"', '{"\\xe9": 1}']) assert.equal(invalid(source), true, source);
  for (const source of [':"\\xc3\\xa9"', ':"\\uFFFD"', ':"\\u{fffd}"', ':"\uFFFD"', "%s(\\xe9)", '"\\xe9"']) assert.equal(invalid(source), false, source);
});

// Ruby-free port of test/prism/regexp_test.rb — see UNI.md.
//
// Ported: named-capture extraction (`locals` on the top-level ProgramNode,
// populated by target_js_uni's own src/regexp.js scanner) and the
// valid-syntax regexp construct smoke tests.
//
// Dropped (Ruby-API convenience layer, not the parser itself): the
// `.options` tests, which check a bitmask matching Ruby's own `::Regexp`
// class constants (IGNORECASE/EXTENDED/.../FIXEDENCODING/NOENCODING) -
// defined in lib/prism/node_ext.rb on top of the raw `flags` array, not
// part of target_js_uni's own contract. The underlying flag detection
// itself (does `/foo/imx` set ignore_case/extended/multi_line) is already
// covered incidentally by fixtures.test.js/fuzzer.test.js's full-AST diffs
// against @ruby/prism wherever a fixture happens to use regex flags.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/parser/index.mjs";
import { parseSuccess } from "./support/uni-envelope.mjs";

function namedCaptures(source) {
  return parseWithMetadata(`/${source}/ =~ ""`).ast.locals;
}

function assertValidRegexp(source) {
  assert.equal(parseSuccess(`/${source}/ =~ ""`), true, `expected /${source}/ to be valid`);
}

test("named captures with arrows", () => assert.deepStrictEqual(namedCaptures("(?<foo>bar)"), ["foo"]));
test("named captures with single quotes", () => assert.deepStrictEqual(namedCaptures("(?'foo'bar)"), ["foo"]));
test("nested named captures with arrows", () =>
  assert.deepStrictEqual(namedCaptures("(?<foo>(?<bar>baz))"), ["foo", "bar"]));
test("nested named captures with single quotes", () =>
  assert.deepStrictEqual(namedCaptures("(?'foo'(?'bar'baz))"), ["foo", "bar"]));
test("allows duplicate named captures", () =>
  assert.deepStrictEqual(namedCaptures("(?<foo>bar)(?<foo>baz)"), ["foo"]));
test("named capture inside fake range quantifier", () =>
  assert.deepStrictEqual(namedCaptures("foo{1, (?<foo>2)}"), ["foo"]));
test("fake named captures inside character sets", () =>
  assert.deepStrictEqual(namedCaptures("[a-z(?<foo>)]"), []));
test("fake named capture inside character set with escaped ending", () =>
  assert.deepStrictEqual(namedCaptures("[a-z\\](?<foo>)]"), []));
test("named capture inside nested character set", () =>
  assert.deepStrictEqual(namedCaptures("[foo (?<foo>bar)]"), []));

const VALID_REGEXPS = [
  "foo|bar",
  "^foo$",
  ".",
  "[[:digit:]]",
  "[[:^digit:]]",
  "[[:foo]]",
  "[abc]",
  "[[abc]]",
  "[[abc] && [def]]",
  "[^abc]",
  "[a-z]",
  "[^a-z]",
  "(?#foo)",
  "(?#foo\\)\\))",
  "(?:foo)",
  "(?=foo)",
  "(?!foo)",
  "(?<=foo)",
  "(?<!foo)",
  "(?>foo)",
  "(?~foo)",
  "(?(1)foo)",
  "(?(foo)bar)",
  "(?(<foo>)bar)",
  "(?imxdau:foo)",
  "(?-imx:foo)",
  "(?im-x:foo)",
  "foo*",
  "foo+",
  "foo?",
  "foo{1,}",
  "foo{,1}",
  "foo{1,2}",
  "foo{1, 2}",
  "\\A{",
];

for (const source of VALID_REGEXPS) {
  test(`valid regexp: ${JSON.stringify(source)}`, () => assertValidRegexp(source));
}

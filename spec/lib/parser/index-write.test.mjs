// Ruby-free port of test/prism/result/index_write_test.rb — see UNI.md.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSuccess } from "./support/uni-envelope.mjs";

function assertParseSuccess(source, version = "latest") {
  assert.equal(parseSuccess(source, { version }), true, `expected success under ${version}: ${source}`);
}
function assertParseFailure(source, version = "latest") {
  assert.equal(parseSuccess(source, { version }), false, `expected failure under ${version}: ${source}`);
}

test("bare keywords in index writes were valid under 3.3", () => {
  assertParseSuccess("foo[bar: 1] = 1\nfoo[bar: 1] &&= 1\nfoo[bar: 1] ||= 1\nfoo[bar: 1] += 1\n", "3.3.0");
  assertParseSuccess(
    "def foo(**)\n  bar[**] = 1\n  bar[**] &&= 1\n  bar[**] ||= 1\n  bar[**] += 1\nend\n",
    "3.3.0",
  );
});

test("bare block forwarding in index writes was valid under 3.3", () => {
  assertParseSuccess("foo[&bar] = 1\nfoo[&bar] &&= 1\nfoo[&bar] ||= 1\nfoo[&bar] += 1\n", "3.3.0");
  assertParseSuccess("def foo(&)\n  bar[&] = 1\n  bar[&] &&= 1\n  bar[&] ||= 1\n  bar[&] += 1\nend\n", "3.3.0");
});

test("bare keywords in index writes fail on latest", () => {
  assertParseFailure("foo[bar: 1] = 1\nfoo[bar: 1] &&= 1\nfoo[bar: 1] ||= 1\nfoo[bar: 1] += 1\n");
  assertParseFailure("def foo(**)\n  bar[**] = 1\n  bar[**] &&= 1\n  bar[**] ||= 1\n  bar[**] += 1\nend\n");
});

test("bare block forwarding in index writes fails on latest", () => {
  assertParseFailure("foo[&bar] = 1\nfoo[&bar] &&= 1\nfoo[&bar] ||= 1\nfoo[&bar] += 1\n");
  assertParseFailure("def foo(&)\n  bar[&] = 1\n  bar[&] &&= 1\n  bar[&] ||= 1\n  bar[&] += 1\nend\n");
});

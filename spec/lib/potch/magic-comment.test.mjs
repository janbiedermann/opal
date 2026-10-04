// Ruby-free port of test/prism/magic_comment_test.rb — see UNI.md.
//
// The encoding-detection assertions (test_encoding, test_coding, ...) are
// ported directly against target_js_uni's own `encoding` field - no
// reference parser needed, these pin down specific magic-comment forms.
//
// The fixture-driven half (`Fixture.each` + Ripper's `on_magic_comment`,
// comparing counts/key/value) is reinterpreted like fixtures.test.js: parse
// every fixture with target_js_uni and `@ruby/prism` and deep-equal their
// magic_comments arrays (dropped from fixtures.test.js's own comparison,
// which only diffs {ast, errors, warnings} - added here instead so it's
// against the real C parser, not a secondary Ripper heuristic).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseWithMetadata } from "../../../lib/opal/potch/index.mjs";
import { loadPrism } from "@ruby/prism";

const WS = " \t\v";

function assertMagicEncoding(line, expected) {
  const { encoding } = parseWithMetadata(`${line}\n""`);
  assert.equal(encoding, expected);
}

test("encoding", () => assertMagicEncoding("# encoding: ascii", "US-ASCII"));
test("coding", () => assertMagicEncoding("# coding: ascii", "US-ASCII"));
test("eNcOdInG", () => assertMagicEncoding("# eNcOdInG: ascii", "US-ASCII"));
test("CoDiNg", () => assertMagicEncoding("# CoDiNg: ascii", "US-ASCII"));
test("encoding whitespace", () => assertMagicEncoding(`# ${WS} encoding ${WS} : ${WS} ascii ${WS}`, "US-ASCII"));
test("emacs encoding", () => assertMagicEncoding("# -*- encoding: ascii -*-", "US-ASCII"));
test("emacs coding", () => assertMagicEncoding("# -*- coding: ascii -*-", "US-ASCII"));
test("emacs eNcOdInG", () => assertMagicEncoding("# -*- eNcOdInG: ascii -*-", "US-ASCII"));
test("emacs CoDiNg", () => assertMagicEncoding("# -*- CoDiNg: ascii -*-", "US-ASCII"));
test("emacs whitespace", () => assertMagicEncoding(`# -*- ${WS} encoding ${WS} : ${WS} ascii ${WS} -*-`, "US-ASCII"));
test("emacs multiple", () => assertMagicEncoding("# -*- foo: bar; encoding: ascii -*-", "US-ASCII"));
test("coding whitespace", () => assertMagicEncoding("# coding \t \r  \v   :     \t \v    \r   ascii-8bit", "ASCII-8BIT"));
test("vim", () =>
  assertMagicEncoding("# vim: filetype=ruby, fileencoding=windows-31j, tabsize=3, shiftwidth=3", "Windows-31J"));

// Magic comments aren't part of fixtures.test.js's envelope-diff (that only
// covers {ast, errors, warnings}) - compare them here directly instead,
// normalized minimally (both sides already use {key, value} plain strings).
const FIXTURES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "fixtures", "potch");

function collectFixtures(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFixtures(full, base));
    else if (entry.endsWith(".txt")) out.push(relative(base, full).split("\\").join("/"));
  }
  return out;
}

let refParse = null;

test("magic comments match @ruby/prism across the fixture corpus", async () => {
  refParse = refParse ?? (await loadPrism());

  for (const relPath of collectFixtures(FIXTURES_DIR)) {
    const source = readFileSync(join(FIXTURES_DIR, relPath), "utf8");

    const uni = parseWithMetadata(source).magic_comments.map(({ key, value }) => ({ key, value }));
    const refResult = refParse(source);
    const ref = refResult.magicComments.map((m) => ({
      key: sliceSource(source, m.startLocation),
      value: sliceSource(source, m.endLocation),
    }));

    assert.deepStrictEqual(uni, ref, `magic comments mismatch in ${relPath}`);
  }
});

function sliceSource(source, location) {
  return Buffer.from(source, "utf8")
    .slice(location.startOffset, location.startOffset + location.length)
    .toString("utf8");
}

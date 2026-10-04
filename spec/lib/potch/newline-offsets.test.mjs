// Ruby-free port of test/prism/newline_offsets_test.rb — see UNI.md.
//
// For every fixture, the expected newline-byte-offset list is computed
// independently here (scanning the raw UTF-8 bytes for 0x0A, mirroring the
// Ruby test's own `source.b.scan("\n")`), then compared against
// target_js_uni's own `offsets` envelope field. No reference parser needed
// - this is purely a self-consistency check of target_js_uni's own
// newline-list bookkeeping against the raw bytes it was given.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { uniEnvelope } from "./support/uni-envelope.mjs";

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

function expectedNewlineOffsets(source) {
  const bytes = Buffer.from(source, "utf8");
  const offsets = ["0"];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) offsets.push(String(i + 1));
  }
  return offsets;
}

for (const relPath of collectFixtures(FIXTURES_DIR)) {
  test(`newline offsets: ${relPath}`, () => {
    const source = readFileSync(join(FIXTURES_DIR, relPath), "utf8");
    const { offsets } = uniEnvelope(source);
    assert.deepStrictEqual(offsets.map(String), expectedNewlineOffsets(source));
  });
}

// Ruby-free port of test/prism/bom_test.rb — see UNI.md.
//
// The Ruby test compares `Ripper.lex` against `Prism.lex_compat` on
// BOM-prefixed source - both Ripper and the Ripper-translation layer are
// Ruby-only, no JS port. Reinterpreted: verify directly that target_js_uni
// strips the BOM (every location shifts by exactly one UTF-16 code unit
// relative to the same source without a BOM) and locks the encoding to
// UTF-8, instead of comparing against a second tokenizer.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/potch/index.mjs";

const BOM = "﻿";

const SOURCES = [
  "foo",
  "$+",
  "@foo",
  "@@foo",
  "$foo",
  "$1",
  "%i[]",
  "%r[]",
  "%s[]",
  "%q{}",
  "%w[]",
  "%x[]",
  "%I[]",
  "%W[]",
  "%Q{}",
  '""',
  "''",
];

for (const source of SOURCES) {
  test(`BOM: ${JSON.stringify(source)}`, () => {
    const bare = parseWithMetadata(source);
    const bommed = parseWithMetadata(BOM + source);

    assert.equal(bommed.encoding, "UTF-8");
    assert.equal(bare.errors.length, 0, `expected ${JSON.stringify(source)} to parse without errors`);
    assert.equal(bommed.errors.length, 0, `expected BOM-prefixed ${JSON.stringify(source)} to parse without errors`);

    // Every offset in the BOM-prefixed parse is exactly one code unit (the
    // BOM itself) past the same offset without it.
    assert.deepStrictEqual(shiftLocations(bommed.ast, -1), bare.ast);
  });
}

function shiftLocations(value, delta) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => shiftLocations(v, delta));
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if ((key === "location" || key.endsWith("_loc")) && child !== null) {
      out[key] = { start: child.start + delta, end: child.end + delta };
    } else {
      out[key] = shiftLocations(child, delta);
    }
  }
  return out;
}

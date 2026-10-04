// Ruby-free port of test/prism/snippets_test.rb — see UNI.md.
//
// Splits each fixture into snippets on blank-line boundaries and parses
// each one in isolation - specifically to catch the parser reading bytes
// past the end of its input, which a whole-file parse (fixtures.test.js)
// wouldn't necessarily surface. The dump/load round-trip half of the Ruby
// test is dropped: target_js_uni has no binary serialization (see its own
// package.json description, "no serialization").

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseSuccess } from "./support/uni-envelope.mjs";

const FIXTURES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "fixtures", "potch");
const SYNTAX_VERSIONS = ["3.3", "3.4", "4.0", "4.1"];

const EXCEPT = new Set([
  "encoding_binary.txt",
  "newline_terminated.txt",
  "seattlerb/begin_rescue_else_ensure_no_bodies.txt",
  "seattlerb/case_in.txt",
  "seattlerb/parse_line_defn_no_parens.txt",
  "seattlerb/pct_nl.txt",
  "seattlerb/str_heredoc_interp.txt",
  "spanning_heredoc_newlines.txt",
  "unparser/corpus/semantic/dstr.txt",
  "whitequark/dedenting_heredoc.txt",
  "whitequark/multiple_pattern_matches.txt",
]);

function versionsFor(relPath) {
  const parts = relPath.split("/");
  if (parts.length === 1) return SYNTAX_VERSIONS;
  const [start, stop] = parts[0].split("-");
  const startIdx = SYNTAX_VERSIONS.indexOf(start);
  if (startIdx === -1) return SYNTAX_VERSIONS;
  if (stop) return SYNTAX_VERSIONS.slice(startIdx, SYNTAX_VERSIONS.indexOf(stop) + 1);
  return SYNTAX_VERSIONS.slice(startIdx);
}

function collectFixtures(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFixtures(full, base));
    else if (entry.endsWith(".txt")) out.push(relative(base, full).split("\\").join("/"));
  }
  return out;
}

for (const relPath of collectFixtures(FIXTURES_DIR)) {
  if (EXCEPT.has(relPath)) continue;

  for (const version of versionsFor(relPath)) {
    test(`snippets: ${relPath} (${version})`, () => {
      const text = readFileSync(join(FIXTURES_DIR, relPath), "utf8");
      const snippets = text.split(/(?<=\S)\n\n(?=\S)/).map((s) => s.replace(/\s+$/, ""));

      for (const snippet of snippets) {
        assert.equal(
          parseSuccess(snippet, { version }),
          true,
          `expected snippet to parse successfully: ${JSON.stringify(snippet.slice(0, 80))}`,
        );
      }
    });
  }
}

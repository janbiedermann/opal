// Ruby-free port of test/prism/fixtures_test.rb — see UNI.md.
//
// The original Ruby test doesn't actually exercise the parser: it calls
// `assert_valid_syntax`, which under any CRuby version where Prism is
// already the default parser (test_helper.rb's own guard) is defined as a
// no-op. So "port the literal assertion" would port nothing of value.
//
// What's actually valuable about test/prism/fixtures/**: it's ~1000 curated
// real-world Ruby snippets. This test uses that corpus for what it's
// actually good for - parsing every fixture with target_js_uni and with the
// real C parser (`@ruby/prism`) and asserting the two ASTs match exactly.
//
// Each fixture's path may be prefixed with a version range (e.g. "3.4/",
// "3.3-3.3/") restricting which Ruby grammar versions it's valid under (see
// test_helper.rb's `ruby_versions_for`). Unlike the Ruby suite (which tests
// against one "current Ruby" per CI run), there's no single "current
// version" here, and testing every applicable version for every fixture
// would be a 4x cost for little extra signal - so each fixture is parsed
// once, under the newest version it's valid for.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { uniEnvelope } from "./support/uni-envelope.mjs";
import { refEnvelope } from "./support/ref-envelope.mjs";

// @ruby/prism 1.9.0's warning deserialization never sets `type` (always
// undefined - verified directly against the WASM build, not a bug in this
// harness: errors decode `type` correctly, only warnings don't). Can't fix
// a third-party package from here, so drop `type` from both sides' warnings
// before comparing rather than silently losing all warning coverage.
//
// Diagnostic emission order isn't part of either backend's contract (e.g.
// "assigned but unused variable" warnings: target_js_uni emits them in one
// order relative to other warnings in the same scope, @ruby/prism in
// another - verified same set, same messages/locations, different order on
// several real fixtures) - sort by position first so a real mismatch still
// fails but a harmless ordering difference doesn't.
function normalizeDiagnostics(diagnostics, { dropType = false } = {}) {
  return [...diagnostics]
    .map(({ type, ...rest }) => (dropType ? rest : { type, ...rest }))
    .sort((a, b) => Number(a.start) - Number(b.start) || Number(a.end) - Number(b.end) || a.message.localeCompare(b.message));
}

const FIXTURES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "fixtures", "parser");
const SYNTAX_VERSIONS = ["3.3", "3.4", "4.0", "4.1"];

const EXCEPT = new Set([
  // Carried forward from fixtures_test.rb's own
  // `except << "command_method_call_2.txt"`.
  "command_method_call_2.txt",

  // target_js_uni is a JS-string/UTF-16 build "with no encoding tables"
  // (package.json's own description) - it has no way to represent a raw
  // byte that isn't valid UTF-8, or to re-decode source bytes under a
  // `# encoding:` magic comment naming a non-Unicode charset. @ruby/prism
  // (byte-based WASM) correctly does both, so these fixtures - which exist
  // specifically to exercise that - can't agree with target_js_uni by
  // construction, not because of a target_js_uni bug.
  "encoding_binary.txt", // `# encoding: binary`
  "encoding_euc_jp.txt", // `# encoding: euc-jp`
  "regex_char_width.txt", // `# encoding: sjis`
  "regex_escape_encoding.txt", // `# encoding: US-ASCII`
  "strings.txt", // \xNN escapes producing non-UTF-8 bytes
  "seattlerb/heredoc_bad_hex_escape.txt", // ditto
  "seattlerb/heredoc_bad_oct_escape.txt", // ditto
  "seattlerb/str_lit_concat_bad_encodings.txt", // ditto

  // @ruby/prism 1.9.0 has a real bignum-deserialization bug: any integer
  // literal spanning more than ~2 32-bit words decodes to a wrong (and
  // wrong-signed) value. Verified directly: parse("123456789012345678901234567890")
  // via @ruby/prism gives -4362896299872285998n; target_js_uni gives the
  // correct 123456789012345678901234567890n. Not a target_js_uni bug -
  // excluded because the reference side can't be trusted here.
  "unparser/corpus/literal/literal.txt",
]);

function versionsFor(relPath) {
  const parts = relPath.split("/");
  if (parts.length === 1) return SYNTAX_VERSIONS;
  const [start, stop] = parts[0].split("-");
  const startIdx = SYNTAX_VERSIONS.indexOf(start);
  if (startIdx === -1) return SYNTAX_VERSIONS; // not a version-range directory (seattlerb/, whitequark/, ...)
  if (stop) {
    const stopIdx = SYNTAX_VERSIONS.indexOf(stop);
    return SYNTAX_VERSIONS.slice(startIdx, stopIdx + 1);
  }
  return SYNTAX_VERSIONS.slice(startIdx);
}

function collectFixtures(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFixtures(full, base));
    } else if (entry.endsWith(".txt")) {
      out.push(relative(base, full).split("\\").join("/"));
    }
  }
  return out;
}

const fixtures = collectFixtures(FIXTURES_DIR).filter((relPath) => !EXCEPT.has(relPath));

for (const relPath of fixtures) {
  const versions = versionsFor(relPath);
  const version = versions[versions.length - 1];

  test(`fixture: ${relPath} (${version})`, async () => {
    const source = readFileSync(join(FIXTURES_DIR, relPath), "utf8");
    const options = { version };

    const uni = uniEnvelope(source, options);
    const ref = await refEnvelope(source, options);

    assert.deepStrictEqual(normalizeDiagnostics(uni.errors), normalizeDiagnostics(ref.errors), "errors mismatch");
    assert.deepStrictEqual(
      normalizeDiagnostics(uni.warnings, { dropType: true }),
      normalizeDiagnostics(ref.warnings, { dropType: true }),
      "warnings mismatch",
    );
    assert.deepStrictEqual(uni.ast, ref.ast, "AST mismatch");
  });
}

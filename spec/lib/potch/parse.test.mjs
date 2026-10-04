// Ruby-free port of test/prism/api/parse_test.rb — see UNI.md.
//
// Unlike fixtures.test.js, this doesn't need a reference parser: the Ruby
// test exercises Prism.parse's *option-handling API* (filepath/line/version/
// scopes/partial_script), not AST-shape conformance against a second
// backend. So this calls target_js_uni's own parseWithMetadata() directly
// and asserts the documented option contract.
//
// Dropped (no JS analog, not testing target_js_uni's parser at all):
//   - test_parse_file/test_parse_tempfile/test_parse_nonascii/
//     test_parse_directory: exercise Ruby's File/Tempfile/ENOENT/EISDIR
//     handling. target_js_uni's library takes a source string, not a path -
//     there's no parse_file() to test.
//   - test_parse_result: covered implicitly (every other test here already
//     calls parseWithMetadata and inspects its envelope).
//   - test_version_current: "current Ruby version" isn't a meaningful
//     concept for a standalone JS parser.
//   - the ArgumentError-for-invalid-version-string half of test_version:
//     that validation lives in lib/potch.rb's VERSION_PATTERN (the Ruby
//     *bridge*), not in the parser. What target_js_uni's own code actually
//     does for an invalid version string is pm_options_version_set()
//     returning false (src/options.js) - tested directly below instead.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope, parseSuccess } from "./support/uni-envelope.mjs";
import { buildOptions, lineForOffset, findNode } from "./support/build-options.mjs";

test("parse empty string", () => {
  const { ast } = uniEnvelope("");
  assert.deepStrictEqual(ast.statements.body, []);
});

test("filepath option sets SourceFileNode#filepath", () => {
  const { ast } = uniEnvelope("def foo; __FILE__; end", { filepath: "filepath.rb" });
  const sourceFileNode = findNode(ast, "SourceFileNode");
  assert.ok(sourceFileNode, "expected a SourceFileNode in the tree");
  assert.equal(sourceFileNode.filepath, "filepath.rb");
});

function assertLineOptionShiftsStartLine(line) {
  const source = "def foo\n __FILE__\nend";
  const { ast, offsets } = uniEnvelope(source, { line });

  assert.equal(lineForOffset(offsets, line, ast.location.start), line);

  const sourceFileNode = findNode(ast, "SourceFileNode");
  assert.ok(sourceFileNode, "expected a SourceFileNode in the tree");
  // __FILE__ is on the source's second line, so it's one past the base line.
  assert.equal(lineForOffset(offsets, line, sourceFileNode.location.start), line + 1);
}

test("line option shifts start_line (positive)", () => {
  assertLineOptionShiftsStartLine(4);
});

test("line option shifts start_line (negative)", () => {
  assertLineOptionShiftsStartLine(-2);
});

test("line option shifts the first token's line in lex mode", async () => {
  const { lexWithMetadata, envelopeOffsetsToBytes } = await import("../../../lib/opal/potch/index.mjs");
  const line = 4;
  const source = "def foo\n __FILE__\nend";
  const envelope = lexWithMetadata(source, buildOptions({ line }));
  envelopeOffsetsToBytes(envelope, source);
  assert.equal(lineForOffset(envelope.offsets, line, envelope.tokens[0].start), line);
});

test("partial_script allows break/next/redo/yield outside a loop/method", () => {
  for (const keyword of ["break", "next", "redo", "yield"]) {
    assert.equal(parseSuccess(keyword), false, `${keyword} should fail without partial_script`);
    assert.equal(parseSuccess(keyword, { partial_script: true }), true, `${keyword} should succeed with partial_script`);
  }
});

test("version option accepts every supported version string", () => {
  const versions = [
    "3.3", "3.3.0", "3.3.1", "3.3.9", "3.3.10",
    "3.4", "3.4.0", "3.4.9", "3.4.10",
    "3.5", "3.5.0",
    "4.0", "4.0.0",
    "4.1", "4.1.0",
    "latest",
  ];
  for (const version of versions) {
    assert.equal(parseSuccess("1 + 1", { version }), true, `version ${version} should parse successfully`);
  }
});

test("version option rejects malformed or unsupported version strings", () => {
  for (const version of ["latest2", "3.3.a", "3.2.0", "3.6.0"]) {
    const options = buildOptions({ version });
    assert.equal(options.__versionOk, false, `pm_options_version_set should reject ${version}`);
  }
});

test("scopes option resolves locals instead of a method call", () => {
  const plain = uniEnvelope("foo").ast.statements.body[0];
  assert.equal(plain.type, "CallNode");

  const scoped = uniEnvelope("foo", { scopes: [{ locals: ["foo"] }] }).ast.statements.body[0];
  assert.equal(scoped.type, "LocalVariableReadNode");
});

test("scopes option's forwarding enables ...-forwarding tokens", () => {
  const cases = [
    ["foo(*)", "*"],
    ["foo(**)", "**"],
    ["foo(&)", "&"],
    ["foo(...)", "..."],
  ];
  for (const [source, token] of cases) {
    assert.equal(parseSuccess(source), false, `${source} should fail without a forwarding scope`);
    assert.equal(
      parseSuccess(source, { scopes: [{ forwarding: [token] }] }),
      true,
      `${source} should succeed with forwarding: ["${token}"]`,
    );
  }
});

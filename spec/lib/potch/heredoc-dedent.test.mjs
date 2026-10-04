// Ruby-free port of test/prism/heredoc_dedent_test.rb — see UNI.md.
//
// Hardcoded expected values (like the Ruby original). The Ruby test
// double-checks each hardcoded `expected` against a real `eval(source)` -
// skipped here (no Ruby to eval against), trusting the hardcoded values
// as-is since they're the same ones already verified that way upstream.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/potch/index.mjs";

function heredocResult(source) {
  const node = parseWithMetadata(source).ast.statements.body[0];
  if (node.type === "StringNode") return node.unescaped;
  return node.parts.map((part) => (part.type === "StringNode" ? part.unescaped : "1")).join("");
}

function assertHeredocDedent(expected, source) {
  assert.equal(heredocResult(source), expected);
}

const CASES = [
  ["content dedented interpolation content", "  a\n1\n  a\n", "<<~EOF\n  a\n#{1}\n  a\nEOF\n"],
  ["content", "a\n", "<<~EOF\n  a\nEOF\n"],
  ["tabs dedent spaces", "\ta\nb\n\t\tc\n", "<<~EOF\n\ta\n  b\n\t\tc\nEOF\n"],
  ["interpolation then content", "1 a\n", "<<~EOF\n  #{1} a\nEOF\n"],
  ["content then interpolation", "a 1\n", "<<~EOF\n  a #{1}\nEOF\n"],
  ["content dedented interpolation", " a\n1\n", "<<~EOF\n  a\n #{1}\nEOF\n"],
  ["content interpolation", "a\n1\n", "<<~EOF\n  a\n  #{1}\nEOF\n"],
  ["content content", "a\nb\n", "<<~EOF\n  a\n  b\nEOF\n"],
  ["content indented content", "a\n  b\n", "<<~EOF\n  a\n    b\nEOF\n"],
  ["content dedented content", "\ta\nb\n", "<<~EOF\n\t\t\ta\n\t\tb\nEOF\n"],
  ["single quote", "a #{1}\n", "<<~'EOF'\na #{1}\nEOF\n"],
  ["mixed indentation", "a\n b\n", "<<~EOF\n\ta\n\t b\nEOF\n"],
  ["indented content content", " a\nb\n", "<<~EOF\n\t a\n\tb\nEOF\n"],
  ["indent size", "a\n  b\n", "<<~EOF\n\ta\n          b\nEOF\n"],
  ["blank lines", "a\n\nb\n", "<<~EOF\n  a\n\n  b\nEOF\n"],
  ["many blank lines", "a\n\n\n\n\nb\n", "<<~EOF\n  a\n\n\n\n\n  b\nEOF\n"],
];

for (const [name, expected, source] of CASES) {
  test(`heredoc dedent: ${name}`, () => assertHeredocDedent(expected, source));
}

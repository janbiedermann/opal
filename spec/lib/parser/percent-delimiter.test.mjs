// Ruby-free port of test/prism/percent_delimiter_string_test.rb — see
// UNI.md. Hardcoded expected values (like the Ruby original), not a
// backend diff: these pin down a specific normalization behavior
// (CR/LF-sequence delimiters), not general AST conformance.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";
import { findNode } from "./support/build-options.mjs";

function assertParse(nodeType, prefix, literalBody, expected) {
  const source = prefix + literalBody;
  const { ast } = uniEnvelope(source);
  const node = findNode(ast, nodeType);
  assert.ok(node, `expected a ${nodeType} in: ${JSON.stringify(source)}`);
  assert.equal(node.unescaped, expected);
}

const CASES = [
  ["newline terminator with lf crlf", "\n123456\r\n", "123456"],
  ["newline terminator with lf crlf with extra cr", "\n123456\r\r\n", "123456\r"],
  ["newline terminator with crlf pair", "\r\n123456\r\n", "123456"],
  ["newline terminator with crlf crlf with extra cr", "\r\n123456\r\r\n", "123456\r"],
  ["newline terminator with cr cr", "\r123456\r;\n", "123456"],
  ["newline terminator with crlf lf", "\r\n123456\n;\n", "123456"],
  ["cr crlf", "\r1\r\n \r", "1\n "],
  ["lf crlf", "\n1\r\n \n", "1"],
  ["lf lf", "\n1\n \n", "1"],
];

for (const [name, literalBody, expected] of CASES) {
  test(`percent delimiter string: ${name}`, () => {
    assertParse("StringNode", "%", literalBody, expected);
  });

  test(`percent delimiter regexp: ${name}`, () => {
    assertParse("RegularExpressionNode", "%r", literalBody, expected);
  });
}

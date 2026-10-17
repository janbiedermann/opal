// Ruby-free port of test/prism/result/numeric_value_test.rb — see UNI.md.
//
// The Ruby test compares IntegerNode/FloatNode/RationalNode/ImaginaryNode's
// `value` directly against a real Ruby Integer/Float/Rational/Complex
// literal. JS has none of those numeric types, so this compares structure
// instead: IntegerNode.value as a string, FloatNode.value as a number,
// RationalNode as {numerator, denominator}, ImaginaryNode as its wrapped
// `numeric` node (recursively, since `42.1ri` is a Complex wrapping a
// Rational).

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/parser/index.mjs";

function numeric(source) {
  return parseWithMetadata(source).ast.statements.body[0];
}

function assertInteger(source, value) {
  const node = numeric(source);
  assert.equal(node.type, "IntegerNode");
  assert.equal(node.value, value);
}

function assertFloat(source, value) {
  const node = numeric(source);
  assert.equal(node.type, "FloatNode");
  assert.equal(node.value, value);
}

function assertRational(source, numerator, denominator) {
  const node = numeric(source);
  assert.equal(node.type, "RationalNode");
  assert.equal(node.numerator, numerator);
  assert.equal(node.denominator, denominator);
}

function assertImaginaryInteger(source, value) {
  const node = numeric(source);
  assert.equal(node.type, "ImaginaryNode");
  assert.equal(node.numeric.type, "IntegerNode");
  assert.equal(node.numeric.value, value);
}

function assertImaginaryFloat(source, value) {
  const node = numeric(source);
  assert.equal(node.type, "ImaginaryNode");
  assert.equal(node.numeric.type, "FloatNode");
  assert.equal(node.numeric.value, value);
}

function assertImaginaryRational(source, numerator, denominator) {
  const node = numeric(source);
  assert.equal(node.type, "ImaginaryNode");
  assert.equal(node.numeric.type, "RationalNode");
  assert.equal(node.numeric.numerator, numerator);
  assert.equal(node.numeric.denominator, denominator);
}

test("numeric value", () => {
  assertInteger("123", 123);
  assertInteger("1_23", 123);
  assertFloat("3.14", 3.14);
  assertFloat("3.1_4", 3.14);

  assertImaginaryInteger("42i", 42);
  assertImaginaryInteger("4_2i", 42);
  assertImaginaryRational("42.1ri", 421, 10);
  assertImaginaryRational("42.1_0ri", 421, 10);
  assertImaginaryFloat("3.14i", 3.14);
  assertImaginaryFloat("3.1_4i", 3.14);

  assertRational("42r", 42, 1);
  assertRational("4_2r", 42, 1);
  assertRational("0.5r", 1, 2);
  assertRational("0.5_0r", 1, 2);

  assertImaginaryRational("42ri", 42, 1);
  assertImaginaryRational("4_2ri", 42, 1);
  assertImaginaryRational("0.5ri", 1, 2);
  assertImaginaryRational("0.5_0ri", 1, 2);

  assertRational("0xFFr", 255, 1);
  assertRational("0xF_Fr", 255, 1);
  assertImaginaryRational("0xFFri", 255, 1);
  assertImaginaryRational("0xF_Fri", 255, 1);
});

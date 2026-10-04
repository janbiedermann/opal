// Ruby-free port of test/prism/api/command_line_test.rb — see UNI.md.
// Tests target_js_uni's own `command_line`/`main_script` option handling
// directly - no reference parser needed.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

test("command_line p wraps the program in an implicit print", () => {
  const { statements } = uniEnvelope("1", { command_line: "p" }).ast;
  assert.equal(statements.body.length, 2);
  assert.equal(statements.body[1].type, "CallNode");
  assert.equal(statements.body[1].name, "print");
});

test("command_line n wraps the program in an implicit while-gets", () => {
  const { statements } = uniEnvelope("1", { command_line: "n" }).ast;
  assert.equal(statements.body.length, 1);
  const node = statements.body[0];
  assert.equal(node.type, "WhileNode");
  assert.equal(node.predicate.type, "CallNode");
  assert.equal(node.predicate.name, "gets");

  const args = node.predicate.arguments.arguments;
  assert.equal(args.length, 1);
  assert.equal(args[0].name, "$/");
});

test("command_line a also splits each line into $F", () => {
  const { statements } = uniEnvelope("1", { command_line: "na" }).ast;
  const statement = statements.body[0].statements.body[0];
  assert.equal(statement.type, "GlobalVariableWriteNode");
  assert.equal(statement.name, "$F");
});

test("command_line l also chomps each line", () => {
  const { statements } = uniEnvelope("1", { command_line: "nl" }).ast;
  const predicate = statements.body[0].predicate;
  const argumentsNode = predicate.arguments;
  assert.ok(argumentsNode.flags?.includes("contains_keywords"));

  const args = argumentsNode.arguments;
  assert.equal(args.length, 2);
  assert.equal(args[0].name, "$/");
  assert.equal(args[1].elements[0].key.unescaped, "chomp");
});

test("command_line e silences the ambiguous-range warning", () => {
  assert.equal(uniEnvelope("1 if 2..3").warnings.length, 2);
  assert.equal(uniEnvelope("1 if 2..3", { command_line: "e" }).warnings.length, 0);
});

test("main_script skips a leading non-ruby shebang up to the next ruby one", () => {
  const source = "#!/bin/bash\nexit 1\n\n#!/usr/bin/env ruby\n1\n";
  const { ast, errors } = uniEnvelope(source, { main_script: true });
  assert.equal(errors.length, 0);
  const body = ast.statements.body;
  assert.equal(body[body.length - 1].type, "IntegerNode");
});

test("command_line x does the same without main_script", () => {
  const source = "exit 1\n\n#!/usr/bin/env ruby\n1\n";
  const { ast, errors } = uniEnvelope(source, { command_line: "x" });
  assert.equal(errors.length, 0);
  assert.equal(ast.statements.body[ast.statements.body.length - 1].type, "IntegerNode");
});

test("main_script reports a load error when no ruby shebang follows", () => {
  const { errors } = uniEnvelope("#!/bin/bash\nexit 1\n", { main_script: true });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].level, "load");
});

test("command_line x reports a load error when no ruby shebang follows", () => {
  const { errors } = uniEnvelope("exit 1\n", { command_line: "x" });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].level, "load");
});

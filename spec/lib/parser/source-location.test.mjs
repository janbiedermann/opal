// Ruby-free port of test/prism/result/source_location_test.rb — see
// UNI.md. One assertion per real node type (matching the Ruby file's own
// per-type test methods), checking its exact start/end byte offset within
// a short snippet. No reference parser needed - these pin down exact
// offsets target_js_uni itself computes.
//
// Dropped: test_all_tested, a meta-test that checks source_location_test.rb
// itself covers every `Prism.constants.grep(/.Node$/)` - a Ruby-constant-
// introspection check about the *Ruby test file's own coverage*, not about
// target_js_uni.

import { test } from "node:test";
import assert from "node:assert/strict";

import { rawEnvelope } from "./support/uni-envelope.mjs";
import { columnForOffset } from "./support/build-options.mjs";

function assertLocation(type, source, expected = null, accessor = null, options = null) {
  const [start, end] = expected ?? [0, source.length];
  const envelope = rawEnvelope(source, options);
  assert.equal(envelope.errors.length, 0, `expected success for ${JSON.stringify(source)}`);

  const body = envelope.ast.statements.body;
  let node = body[body.length - 1];
  if (accessor) node = accessor(node);

  if (start === 0) {
    assert.equal(columnForOffset(envelope.offsets, node.location.start), 0);
  }
  if (end === source.length) {
    assert.equal(columnForOffset(envelope.offsets, node.location.end), source.split("\n").pop().length);
  }

  assert.equal(node.type, type);
  assert.equal(node.location.start, start, `start offset of ${type} in ${JSON.stringify(source)}`);
  assert.equal(node.location.end, end, `end offset of ${type} in ${JSON.stringify(source)}`);
}

test("AliasGlobalVariableNode", () => assertLocation("AliasGlobalVariableNode", "alias $foo $bar"));
test("AliasMethodNode", () => assertLocation("AliasMethodNode", "alias foo bar"));
test("AlternationPatternNode", () =>
  assertLocation("AlternationPatternNode", "foo => 0 | 1", [7, 12], (n) => n.pattern));
test("AndNode", () => {
  assertLocation("AndNode", "foo and bar");
  assertLocation("AndNode", "foo && bar");
});
test("ArgumentsNode", () => assertLocation("ArgumentsNode", "foo(bar, baz, qux)", [4, 17], (n) => n.arguments));
test("ArrayNode", () => {
  assertLocation("ArrayNode", "[foo, bar, baz]");
  assertLocation("ArrayNode", "%i[foo bar baz]");
  assertLocation("ArrayNode", "%I[foo bar baz]");
  assertLocation("ArrayNode", "%w[foo bar baz]");
  assertLocation("ArrayNode", "%W[foo bar baz]");
});
test("ArrayPatternNode", () => {
  assertLocation("ArrayPatternNode", "foo => bar, baz", [7, 15], (n) => n.pattern);
  assertLocation("ArrayPatternNode", "foo => [bar, baz]", [7, 17], (n) => n.pattern);
  assertLocation("ArrayPatternNode", "foo => *bar", [7, 11], (n) => n.pattern);
  assertLocation("ArrayPatternNode", "foo => []", [7, 9], (n) => n.pattern);
  assertLocation("ArrayPatternNode", "foo => Foo[]", [7, 12], (n) => n.pattern);
  assertLocation("ArrayPatternNode", "foo => Foo[bar]", [7, 15], (n) => n.pattern);
});
test("AssocNode", () => {
  assertLocation("AssocNode", "{ '': 1 }", [2, 7], (n) => n.elements[0]);
  assertLocation("AssocNode", "{ foo: :bar }", [2, 11], (n) => n.elements[0]);
  assertLocation("AssocNode", "{ :foo => :bar }", [2, 14], (n) => n.elements[0]);
  assertLocation("AssocNode", "foo(bar: :baz)", [4, 13], (n) => n.arguments.arguments[0].elements[0]);
});
test("AssocSplatNode", () => {
  assertLocation("AssocSplatNode", "{ **foo }", [2, 7], (n) => n.elements[0]);
  assertLocation("AssocSplatNode", "foo(**bar)", [4, 9], (n) => n.arguments.arguments[0].elements[0]);
});
test("BackReferenceReadNode", () => assertLocation("BackReferenceReadNode", "$+"));
test("BeginNode", () => {
  assertLocation("BeginNode", "begin foo end");
  assertLocation("BeginNode", "begin foo rescue bar end");
  assertLocation("BeginNode", "begin foo; rescue bar\nelse baz end");
  assertLocation("BeginNode", "begin foo; rescue bar\nelse baz\nensure qux end");
  assertLocation("BeginNode", "class Foo\nrescue then end", [0, 25], (n) => n.body);
  assertLocation("BeginNode", "module Foo\nrescue then end", [0, 26], (n) => n.body);
});
test("BlockArgumentNode", () => assertLocation("BlockArgumentNode", "foo(&bar)", [4, 8], (n) => n.block));
test("BlockLocalVariableNode", () =>
  assertLocation("BlockLocalVariableNode", "foo { |;bar| }", [8, 11], (n) => n.block.parameters.locals[0]));
test("BlockNode", () => {
  assertLocation("BlockNode", "foo {}", [4, 6], (n) => n.block);
  assertLocation("BlockNode", "foo do end", [4, 10], (n) => n.block);
});
test("BlockParameterNode", () =>
  assertLocation("BlockParameterNode", "def foo(&bar) end", [8, 12], (n) => n.parameters.block));
test("BlockParametersNode", () => {
  assertLocation("BlockParametersNode", "foo { || }", [6, 8], (n) => n.block.parameters);
  assertLocation("BlockParametersNode", "foo { |bar| baz }", [6, 11], (n) => n.block.parameters);
  assertLocation("BlockParametersNode", "foo { |bar; baz| baz }", [6, 16], (n) => n.block.parameters);
  assertLocation("BlockParametersNode", "-> () {}", [3, 5], (n) => n.parameters);
  assertLocation("BlockParametersNode", "-> (bar) { baz }", [3, 8], (n) => n.parameters);
  assertLocation("BlockParametersNode", "-> (bar; baz) { baz }", [3, 13], (n) => n.parameters);
});
test("BreakNode", () => {
  assertLocation("BreakNode", "tap { break }", [6, 11], (n) => n.block.body.body[0]);
  assertLocation("BreakNode", "tap { break foo }", [6, 15], (n) => n.block.body.body[0]);
  assertLocation("BreakNode", "tap { break foo, bar }", [6, 20], (n) => n.block.body.body[0]);
  assertLocation("BreakNode", "tap { break(foo) }", [6, 16], (n) => n.block.body.body[0]);
});
test("CallNode", () => {
  for (const source of [
    "foo", "foo?", "foo!",
    "foo()", "foo?()", "foo!()",
    "foo(bar)", "foo?(bar)", "foo!(bar)",
    "!foo", "~foo", "+foo", "-foo",
    "not foo", "not(foo)", "not()",
    "foo + bar", "foo -\n  bar",
    "Foo()", "Foo(bar)",
    "Foo::Bar()", "Foo::Bar(baz)",
    "Foo::bar", "Foo::bar()", "Foo::bar(baz)",
    "Foo.bar", "Foo.bar()", "Foo.bar(baz)",
    "foo::bar", "foo::bar()", "foo::bar(baz)",
    "foo.bar", "foo.bar()", "foo.bar(baz)",
    "foo&.bar", "foo&.bar()", "foo&.bar(baz)",
    "foo[]", "foo[bar]", "foo[bar, baz]",
    "foo[] = 1", "foo[bar] = 1", "foo[bar, baz] = 1",
    "foo.()", "foo.(bar)",
    "foo&.()", "foo&.(bar)",
    "foo::()", "foo::(bar)", "foo::(bar, baz)",
    "foo bar baz", "foo bar('baz')",
  ]) {
    assertLocation("CallNode", source);
  }
});
test("CallAndWriteNode", () => assertLocation("CallAndWriteNode", "foo.foo &&= bar"));
test("CallOperatorWriteNode", () => assertLocation("CallOperatorWriteNode", "foo.foo += bar"));
test("CallOrWriteNode", () => assertLocation("CallOrWriteNode", "foo.foo ||= bar"));
test("CallTargetNode", () => assertLocation("CallTargetNode", "foo.bar, = baz", [0, 7], (n) => n.lefts[0]));
test("CapturePatternNode", () =>
  assertLocation("CapturePatternNode", "case foo; in bar => baz; end", [13, 23], (n) => n.conditions[0].pattern));
test("CaseNode", () => {
  assertLocation("CaseNode", "case foo; when bar; end");
  assertLocation("CaseNode", "case foo; when bar; else; end");
  assertLocation("CaseNode", "case foo; when bar; when baz; end");
  assertLocation("CaseNode", "case foo; when bar; when baz; else; end");
});
test("CaseMatchNode", () => {
  assertLocation("CaseMatchNode", "case foo; in bar; end");
  assertLocation("CaseMatchNode", "case foo; in bar; else; end");
  assertLocation("CaseMatchNode", "case foo; in bar; in baz; end");
  assertLocation("CaseMatchNode", "case foo; in bar; in baz; else; end");
});
test("ClassNode", () => {
  assertLocation("ClassNode", "class Foo end");
  assertLocation("ClassNode", "class Foo < Bar; end");
});
test("ClassVariableAndWriteNode", () => assertLocation("ClassVariableAndWriteNode", "@@foo &&= bar"));
test("ClassVariableOperatorWriteNode", () => assertLocation("ClassVariableOperatorWriteNode", "@@foo += bar"));
test("ClassVariableOrWriteNode", () => assertLocation("ClassVariableOrWriteNode", "@@foo ||= bar"));
test("ClassVariableReadNode", () => assertLocation("ClassVariableReadNode", "@@foo"));
test("ClassVariableTargetNode", () =>
  assertLocation("ClassVariableTargetNode", "@@foo, @@bar = baz", [0, 5], (n) => n.lefts[0]));
test("ClassVariableWriteNode", () => assertLocation("ClassVariableWriteNode", "@@foo = bar"));
test("ConstantPathAndWriteNode", () => assertLocation("ConstantPathAndWriteNode", "Parent::Child &&= bar"));
test("ConstantPathNode", () => {
  assertLocation("ConstantPathNode", "Foo::Bar");
  assertLocation("ConstantPathNode", "::Foo");
  assertLocation("ConstantPathNode", "::Foo::Bar");
});
test("ConstantPathOperatorWriteNode", () => assertLocation("ConstantPathOperatorWriteNode", "Parent::Child += bar"));
test("ConstantPathOrWriteNode", () => assertLocation("ConstantPathOrWriteNode", "Parent::Child ||= bar"));
test("ConstantPathTargetNode", () =>
  assertLocation("ConstantPathTargetNode", "::Foo, ::Bar = baz", [0, 5], (n) => n.lefts[0]));
test("ConstantPathWriteNode", () => {
  assertLocation("ConstantPathWriteNode", "Foo::Bar = baz");
  assertLocation("ConstantPathWriteNode", "::Foo = bar");
  assertLocation("ConstantPathWriteNode", "::Foo::Bar = baz");
});
test("ConstantAndWriteNode", () => assertLocation("ConstantAndWriteNode", "Foo &&= bar"));
test("ConstantOperatorWriteNode", () => assertLocation("ConstantOperatorWriteNode", "Foo += bar"));
test("ConstantOrWriteNode", () => assertLocation("ConstantOrWriteNode", "Foo ||= bar"));
test("ConstantReadNode", () => assertLocation("ConstantReadNode", "Foo"));
test("ConstantTargetNode", () => assertLocation("ConstantTargetNode", "Foo, Bar = baz", [0, 3], (n) => n.lefts[0]));
test("ConstantWriteNode", () => assertLocation("ConstantWriteNode", "Foo = bar"));
test("DefNode", () => {
  assertLocation("DefNode", "def foo; bar; end");
  assertLocation("DefNode", "def foo = bar");
  assertLocation("DefNode", "def foo.bar; baz; end");
  assertLocation("DefNode", "def foo.bar = baz");
});
test("DefinedNode", () => {
  assertLocation("DefinedNode", "defined? foo");
  assertLocation("DefinedNode", "defined?(foo)");
});
test("ElseNode", () => {
  assertLocation("ElseNode", "if foo; bar; else; baz; end", [13, 27], (n) => n.subsequent);
  assertLocation("ElseNode", "foo ? bar : baz", [10, 15], (n) => n.subsequent);
});
test("EmbeddedStatementsNode", () =>
  assertLocation("EmbeddedStatementsNode", '"foo #{bar} baz"', [5, 11], (n) => n.parts[1]));
test("EmbeddedVariableNode", () =>
  assertLocation("EmbeddedVariableNode", '"foo #@@bar baz"', [5, 11], (n) => n.parts[1]));
test("EnsureNode", () =>
  assertLocation("EnsureNode", "begin; foo; ensure; bar; end", [12, 28], (n) => n.ensure_clause));
test("FalseNode", () => assertLocation("FalseNode", "false"));
test("FindPatternNode", () =>
  assertLocation("FindPatternNode", "case foo; in *, bar, *; end", [13, 22], (n) => n.conditions[0].pattern));
test("FlipFlopNode", () => assertLocation("FlipFlopNode", "if foo..bar; end", [3, 11], (n) => n.predicate));
test("FloatNode", () => {
  assertLocation("FloatNode", "0.0");
  assertLocation("FloatNode", "1.0");
  assertLocation("FloatNode", "1.0e10");
  assertLocation("FloatNode", "1.0e-10");
});
test("ForNode", () => {
  assertLocation("ForNode", "for foo in bar; end");
  assertLocation("ForNode", "for foo, bar in baz do end");
});
test("ForwardingArgumentsNode", () =>
  assertLocation("ForwardingArgumentsNode", "def foo(...); bar(...); end", [18, 21], (n) =>
    n.body.body[0].arguments.arguments[0],
  ));
test("ForwardingParameterNode", () =>
  assertLocation("ForwardingParameterNode", "def foo(...); end", [8, 11], (n) => n.parameters.keyword_rest));
test("ForwardingSuperNode", () => {
  assertLocation("ForwardingSuperNode", "super");
  assertLocation("ForwardingSuperNode", "super {}");
});
test("GlobalVariableAndWriteNode", () => assertLocation("GlobalVariableAndWriteNode", "$foo &&= bar"));
test("GlobalVariableOperatorWriteNode", () => assertLocation("GlobalVariableOperatorWriteNode", "$foo += bar"));
test("GlobalVariableOrWriteNode", () => assertLocation("GlobalVariableOrWriteNode", "$foo ||= bar"));
test("GlobalVariableReadNode", () => assertLocation("GlobalVariableReadNode", "$foo"));
test("GlobalVariableTargetNode", () =>
  assertLocation("GlobalVariableTargetNode", "$foo, $bar = baz", [0, 4], (n) => n.lefts[0]));
test("GlobalVariableWriteNode", () => assertLocation("GlobalVariableWriteNode", "$foo = bar"));
test("HashNode", () => {
  assertLocation("HashNode", "{ foo: 2 }");
  assertLocation("HashNode", "{ \nfoo: 2, \nbar: 3 \n}");
});
test("HashPatternNode", () =>
  assertLocation("HashPatternNode", "case foo; in bar: baz; end", [13, 21], (n) => n.conditions[0].pattern));
test("IfNode", () => assertLocation("IfNode", "if type in 1;elsif type in B;end"));
test("ImaginaryNode", () => {
  assertLocation("ImaginaryNode", "1i");
  assertLocation("ImaginaryNode", "1ri");
});
test("ImplicitNode", () => {
  assertLocation("ImplicitNode", "{ foo: }", [2, 6], (n) => n.elements[0].value);
  assertLocation("ImplicitNode", "{ Foo: }", [2, 6], (n) => n.elements[0].value);
  assertLocation("ImplicitNode", "foo = 1; { foo: }", [11, 15], (n) => n.elements[0].value);
});
test("ImplicitRestNode", () => {
  assertLocation("ImplicitRestNode", "foo, = bar", [3, 4], (n) => n.rest);
  assertLocation("ImplicitRestNode", "for foo, in bar do end", [7, 8], (n) => n.index.rest);
  assertLocation("ImplicitRestNode", "foo { |bar,| }", [10, 11], (n) => n.block.parameters.parameters.rest);
  assertLocation("ImplicitRestNode", "foo in [bar,]", [11, 12], (n) => n.pattern.rest);
});
test("InNode", () =>
  assertLocation("InNode", "case foo; in bar; end", [10, 16], (n) => n.conditions[0]));
test("IndexAndWriteNode", () => assertLocation("IndexAndWriteNode", "foo[foo] &&= bar"));
test("IndexOperatorWriteNode", () => assertLocation("IndexOperatorWriteNode", "foo[foo] += bar"));
test("IndexOrWriteNode", () => assertLocation("IndexOrWriteNode", "foo[foo] ||= bar"));
test("IndexTargetNode", () => assertLocation("IndexTargetNode", "foo[bar], = qux", [0, 8], (n) => n.lefts[0]));
test("InstanceVariableAndWriteNode", () => assertLocation("InstanceVariableAndWriteNode", "@foo &&= bar"));
test("InstanceVariableOperatorWriteNode", () => assertLocation("InstanceVariableOperatorWriteNode", "@foo += bar"));
test("InstanceVariableOrWriteNode", () => assertLocation("InstanceVariableOrWriteNode", "@foo ||= bar"));
test("InstanceVariableReadNode", () => assertLocation("InstanceVariableReadNode", "@foo"));
test("InstanceVariableTargetNode", () =>
  assertLocation("InstanceVariableTargetNode", "@foo, @bar = baz", [0, 4], (n) => n.lefts[0]));
test("InstanceVariableWriteNode", () => assertLocation("InstanceVariableWriteNode", "@foo = bar"));
test("IntegerNode", () => {
  for (const source of ["0", "1", "1_000", "0x1", "0x1_000", "0b1", "0b1_000", "0o1", "0o1_000"]) {
    assertLocation("IntegerNode", source);
  }
});
test("InterpolatedMatchLastLineNode", () =>
  assertLocation("InterpolatedMatchLastLineNode", "if /foo #{bar}/ then end", [3, 15], (n) => n.predicate));
test("InterpolatedRegularExpressionNode", () => {
  assertLocation("InterpolatedRegularExpressionNode", "/#{foo}/");
  assertLocation("InterpolatedRegularExpressionNode", "/#{foo}/io");
});
test("InterpolatedStringNode", () => {
  assertLocation("InterpolatedStringNode", '"foo #@bar baz"');
  assertLocation("InterpolatedStringNode", "<<~A\nhello #{1} world\nA", [0, 4]);
  assertLocation("InterpolatedStringNode", '"foo" "bar"');
});
test("InterpolatedSymbolNode", () => assertLocation("InterpolatedSymbolNode", ':"#{foo}bar"'));
test("InterpolatedXStringNode", () => assertLocation("InterpolatedXStringNode", "`foo #{bar} baz`"));
test("ItLocalVariableReadNode", () => {
  assertLocation("ItLocalVariableReadNode", "-> { it }", [5, 7], (n) => n.body.body[0]);
  assertLocation("ItLocalVariableReadNode", "foo { it }", [6, 8], (n) => n.block.body.body[0]);
  assertLocation("CallNode", "-> { it }", [5, 7], (n) => n.body.body[0], { version: "3.3.0" });
  assertLocation("ItLocalVariableReadNode", "-> { it }", [5, 7], (n) => n.body.body[0], { version: "3.4.0" });
});
test("ItParametersNode", () => assertLocation("ItParametersNode", "-> { it }", null, (n) => n.parameters));
test("KeywordHashNode", () =>
  assertLocation("KeywordHashNode", "foo(a, b: 1)", [7, 11], (n) => n.arguments.arguments[1]));
test("KeywordRestParameterNode", () => {
  assertLocation("KeywordRestParameterNode", "def foo(**); end", [8, 10], (n) => n.parameters.keyword_rest);
  assertLocation("KeywordRestParameterNode", "def foo(**bar); end", [8, 13], (n) => n.parameters.keyword_rest);
});
test("LambdaNode", () => {
  assertLocation("LambdaNode", "-> { foo }");
  assertLocation("LambdaNode", "-> do foo end");
});
test("LocalVariableAndWriteNode", () => {
  assertLocation("LocalVariableAndWriteNode", "foo &&= bar");
  assertLocation("LocalVariableAndWriteNode", "foo = 1; foo &&= bar", [9, 20]);
});
test("LocalVariableOperatorWriteNode", () => {
  assertLocation("LocalVariableOperatorWriteNode", "foo += bar");
  assertLocation("LocalVariableOperatorWriteNode", "foo = 1; foo += bar", [9, 19]);
});
test("LocalVariableOrWriteNode", () => {
  assertLocation("LocalVariableOrWriteNode", "foo ||= bar");
  assertLocation("LocalVariableOrWriteNode", "foo = 1; foo ||= bar", [9, 20]);
});
test("LocalVariableReadNode", () => assertLocation("LocalVariableReadNode", "foo = 1; foo", [9, 12]));
test("LocalVariableTargetNode", () =>
  assertLocation("LocalVariableTargetNode", "foo, bar = baz", [0, 3], (n) => n.lefts[0]));
test("LocalVariableWriteNode", () => assertLocation("LocalVariableWriteNode", "foo = bar"));
test("MatchLastLineNode", () =>
  assertLocation("MatchLastLineNode", "if /foo/ then end", [3, 8], (n) => n.predicate));
test("MatchPredicateNode", () => assertLocation("MatchPredicateNode", "foo in bar"));
test("MatchRequiredNode", () => assertLocation("MatchRequiredNode", "foo => bar"));
test("MatchWriteNode", () => assertLocation("MatchWriteNode", "/(?<foo>)/ =~ foo"));
test("ModuleNode", () => assertLocation("ModuleNode", "module Foo end"));
test("MultiTargetNode", () => {
  assertLocation("MultiTargetNode", "for foo, bar in baz do end", [4, 12], (n) => n.index);
  assertLocation("MultiTargetNode", "foo, (bar, baz) = qux", [5, 15], (n) => n.lefts[n.lefts.length - 1]);
  assertLocation("MultiTargetNode", "def foo((bar)); end", [8, 13], (n) => n.parameters.requireds[0]);
});
test("MultiWriteNode", () => {
  assertLocation("MultiWriteNode", "foo, bar = baz");
  assertLocation("MultiWriteNode", "(foo, bar) = baz");
  assertLocation("MultiWriteNode", "((foo, bar)) = baz");
});
test("NextNode", () => {
  assertLocation("NextNode", "tap { next }", [6, 10], (n) => n.block.body.body[0]);
  assertLocation("NextNode", "tap { next foo }", [6, 14], (n) => n.block.body.body[0]);
  assertLocation("NextNode", "tap { next foo, bar }", [6, 19], (n) => n.block.body.body[0]);
  assertLocation("NextNode", "tap { next(foo) }", [6, 15], (n) => n.block.body.body[0]);
});
test("NilNode", () => assertLocation("NilNode", "nil"));
test("NoKeywordsParameterNode", () =>
  assertLocation("NoKeywordsParameterNode", "def foo(**nil); end", [8, 13], (n) => n.parameters.keyword_rest));
test("NumberedParametersNode", () => {
  assertLocation("NumberedParametersNode", "-> { _1 }", null, (n) => n.parameters);
  assertLocation("NumberedParametersNode", "foo { _1 }", [4, 10], (n) => n.block.parameters);
});
test("NumberedReferenceReadNode", () => assertLocation("NumberedReferenceReadNode", "$1"));
test("OptionalKeywordParameterNode", () =>
  assertLocation("OptionalKeywordParameterNode", "def foo(bar: nil); end", [8, 16], (n) => n.parameters.keywords[0]));
test("OptionalParameterNode", () =>
  assertLocation("OptionalParameterNode", "def foo(bar = nil); end", [8, 17], (n) => n.parameters.optionals[0]));
test("OrNode", () => {
  assertLocation("OrNode", "foo || bar");
  assertLocation("OrNode", "foo or bar");
});
test("ParametersNode", () =>
  assertLocation("ParametersNode", "def foo(bar, baz); end", [8, 16], (n) => n.parameters));
test("ParenthesesNode", () => {
  assertLocation("ParenthesesNode", "()");
  assertLocation("ParenthesesNode", "(foo)");
  assertLocation("ParenthesesNode", "foo (bar), baz", [4, 9], (n) => n.arguments.arguments[0]);
  assertLocation("ParenthesesNode", "def (foo).bar; end", [4, 9], (n) => n.receiver);
});
test("PinnedExpressionNode", () =>
  assertLocation("PinnedExpressionNode", "foo in ^(bar)", [7, 13], (n) => n.pattern));
test("PinnedVariableNode", () => {
  assertLocation("PinnedVariableNode", "bar = 1; foo in ^bar", [16, 20], (n) => n.pattern);
  assertLocation("PinnedVariableNode", "proc { 1 in ^it }.call(1)", [12, 15], (n) =>
    n.receiver.block.body.body[0].pattern,
  );
});
test("PostExecutionNode", () => {
  assertLocation("PostExecutionNode", "END {}");
  assertLocation("PostExecutionNode", "END { foo }");
});
test("PreExecutionNode", () => {
  assertLocation("PreExecutionNode", "BEGIN {}");
  assertLocation("PreExecutionNode", "BEGIN { foo }");
});
test("RangeNode", () => {
  assertLocation("RangeNode", "1..2");
  assertLocation("RangeNode", "1...2");
  assertLocation("RangeNode", "..2");
  assertLocation("RangeNode", "...2");
  assertLocation("RangeNode", "1..");
  assertLocation("RangeNode", "1...");
});
test("RationalNode", () => {
  assertLocation("RationalNode", "1r");
  assertLocation("RationalNode", "1.0r");
});
test("RedoNode", () => assertLocation("RedoNode", "tap { redo }", [6, 10], (n) => n.block.body.body[0]));
test("RegularExpressionNode", () => {
  assertLocation("RegularExpressionNode", "/foo/");
  assertLocation("RegularExpressionNode", "/foo/io");
});
test("RequiredKeywordParameterNode", () =>
  assertLocation("RequiredKeywordParameterNode", "def foo(bar:); end", [8, 12], (n) => n.parameters.keywords[0]));
test("RequiredParameterNode", () =>
  assertLocation("RequiredParameterNode", "def foo(bar); end", [8, 11], (n) => n.parameters.requireds[0]));
test("RescueNode", () => {
  const code = "begin\n  body\nrescue TypeError\nrescue ArgumentError\nend\n";
  assertLocation("RescueNode", code, [13, 50], (n) => n.rescue_clause);
  assertLocation("RescueNode", code, [30, 50], (n) => n.rescue_clause.subsequent);
});
test("RescueModifierNode", () => assertLocation("RescueModifierNode", "foo rescue bar"));
test("RestParameterNode", () =>
  assertLocation("RestParameterNode", "def foo(*bar); end", [8, 12], (n) => n.parameters.rest));
test("RetryNode", () =>
  assertLocation("RetryNode", "begin; rescue; retry; end", [15, 20], (n) => n.rescue_clause.statements.body[0]));
test("ReturnNode", () => {
  assertLocation("ReturnNode", "return");
  assertLocation("ReturnNode", "return foo");
  assertLocation("ReturnNode", "return foo, bar");
  assertLocation("ReturnNode", "return(foo)");
});
test("SelfNode", () => assertLocation("SelfNode", "self"));
test("ShareableConstantNode", () =>
  assertLocation(
    "ShareableConstantNode",
    "# shareable_constant_value: literal\nC = { foo: 1 }\n",
    [36, 50],
  ));
test("SingletonClassNode", () => assertLocation("SingletonClassNode", "class << self; end"));
test("SourceEncodingNode", () => assertLocation("SourceEncodingNode", "__ENCODING__"));
test("SourceFileNode", () => assertLocation("SourceFileNode", "__FILE__"));
test("SourceLineNode", () => assertLocation("SourceLineNode", "__LINE__"));
test("SplatNode", () => assertLocation("SplatNode", "*foo = bar", [0, 4], (n) => n.rest));
test("StatementsNode", () => {
  assertLocation("StatementsNode", "foo { 1 }", [6, 7], (n) => n.block.body);
  assertLocation("StatementsNode", "(1)", [1, 2], (n) => n.body);
  assertLocation("StatementsNode", "def foo; 1; end", [9, 10], (n) => n.body);
  assertLocation("StatementsNode", "def foo = 1", [10, 11], (n) => n.body);
  assertLocation("StatementsNode", "def foo; 1\n2; end", [9, 12], (n) => n.body);
  assertLocation("StatementsNode", "if foo; bar; end", [8, 11], (n) => n.statements);
  assertLocation("StatementsNode", "foo if bar", [0, 3], (n) => n.statements);
  assertLocation("StatementsNode", "if foo; foo; elsif bar; bar; end", [24, 27], (n) => n.subsequent.statements);
  assertLocation("StatementsNode", "if foo; foo; else; bar; end", [19, 22], (n) => n.subsequent.statements);
  assertLocation("StatementsNode", "unless foo; bar; end", [12, 15], (n) => n.statements);
  assertLocation("StatementsNode", "foo unless bar", [0, 3], (n) => n.statements);
  assertLocation("StatementsNode", "case; when foo; bar; end", [16, 19], (n) => n.conditions[0].statements);
  assertLocation("StatementsNode", "while foo; bar; end", [11, 14], (n) => n.statements);
  assertLocation("StatementsNode", "foo while bar", [0, 3], (n) => n.statements);
  assertLocation("StatementsNode", "until foo; bar; end", [11, 14], (n) => n.statements);
  assertLocation("StatementsNode", "foo until bar", [0, 3], (n) => n.statements);
  assertLocation("StatementsNode", "for foo in bar; baz; end", [16, 19], (n) => n.statements);
  assertLocation("StatementsNode", "begin; foo; end", [7, 10], (n) => n.statements);
  assertLocation("StatementsNode", "begin; rescue; foo; end", [15, 18], (n) => n.rescue_clause.statements);
  assertLocation("StatementsNode", "begin; ensure; foo; end", [15, 18], (n) => n.ensure_clause.statements);
  assertLocation("StatementsNode", "begin; rescue; else; foo; end", [21, 24], (n) => n.else_clause.statements);
  assertLocation("StatementsNode", "class Foo; foo; end", [11, 14], (n) => n.body);
  assertLocation("StatementsNode", "module Foo; foo; end", [12, 15], (n) => n.body);
  assertLocation("StatementsNode", "class << self; foo; end", [15, 18], (n) => n.body);
  assertLocation("StatementsNode", "-> { foo }", [5, 8], (n) => n.body);
  assertLocation("StatementsNode", "BEGIN { foo }", [8, 11], (n) => n.statements);
  assertLocation("StatementsNode", "END { foo }", [6, 9], (n) => n.statements);
  assertLocation("StatementsNode", '"#{foo}"', [3, 6], (n) => n.parts[0].statements);
});
test("StringNode", () => {
  assertLocation("StringNode", '"foo"');
  assertLocation("StringNode", "%q[foo]");
});
test("SuperNode", () => {
  assertLocation("SuperNode", "super foo");
  assertLocation("SuperNode", "super foo, bar");
  assertLocation("SuperNode", "super()");
  assertLocation("SuperNode", "super(foo)");
  assertLocation("SuperNode", "super(foo, bar)");
  assertLocation("SuperNode", "super() {}");
});
test("SymbolNode", () => assertLocation("SymbolNode", ":foo"));
test("TrueNode", () => assertLocation("TrueNode", "true"));
test("UndefNode", () => {
  assertLocation("UndefNode", "undef foo");
  assertLocation("UndefNode", "undef foo, bar");
});
test("UnlessNode", () => {
  assertLocation("UnlessNode", "foo unless bar");
  assertLocation("UnlessNode", "unless bar; foo; end");
});
test("UntilNode", () => {
  assertLocation("UntilNode", "foo = bar until baz");
  assertLocation("UntilNode", "until bar;baz;end");
});
test("WhenNode", () =>
  assertLocation("WhenNode", "case foo; when bar; end", [10, 18], (n) => n.conditions[0]));
test("WhileNode", () => {
  assertLocation("WhileNode", "foo = bar while foo != baz");
  assertLocation("WhileNode", "while a;bar;baz;end");
});
test("XStringNode", () => {
  assertLocation("XStringNode", "`foo`");
  assertLocation("XStringNode", "%x[foo]");
});
test("YieldNode", () => {
  assertLocation("YieldNode", "def test; yield; end", [10, 15], (n) => n.body.body[0]);
  assertLocation("YieldNode", "def test; yield foo; end", [10, 19], (n) => n.body.body[0]);
  assertLocation("YieldNode", "def test; yield foo, bar; end", [10, 24], (n) => n.body.body[0]);
  assertLocation("YieldNode", "def test; yield(foo); end", [10, 20], (n) => n.body.body[0]);
});

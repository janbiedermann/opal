// Ruby-free port of test/prism/result/warnings_test.rb — see UNI.md.
// Checks target_js_uni's own warning messages directly - no reference
// parser needed. Dropped the Ruby original's `compare: true` half (cross-
// checking against `RubyVM::AbstractSyntaxTree.parse`'s stderr output) -
// no Ruby to compare against; target_js_uni's own message is the part that
// actually exercises it.

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";

function assertWarning(source, ...args) {
  let options = {};
  if (args.length > 0 && typeof args[args.length - 1] === "object") options = args.pop();
  const messages = args;

  const { warnings } = uniEnvelope(source, options);
  assert.equal(
    warnings.length,
    messages.length,
    `Expected ${messages.length} warning(s) in ${JSON.stringify(source)}, got ${JSON.stringify(warnings.map((w) => w.message))}`,
  );
  warnings.forEach((warning, i) => assert.ok(warning.message.includes(messages[i])));
}

function refuteWarning(source, options = {}) {
  assert.deepStrictEqual(uniEnvelope(source, options).warnings, []);
}

test("ambiguous uminus", () => assertWarning("a -b", "ambiguous first argument"));
test("ambiguous uplus", () => assertWarning("a +b", "ambiguous first argument"));
test("ambiguous ustar", () => assertWarning("a *b", "argument prefix"));
test("ambiguous regexp", () => assertWarning("a /b/", "wrap regexp in parentheses"));
test("ambiguous ampersand", () => {
  assertWarning("a &b", "argument prefix");
  assertWarning("a &:+", "argument prefix");
  refuteWarning("a &:b");
  refuteWarning("a &:'b'");
  refuteWarning('a &:"b"');
});

test("binary operator", () => {
  const cases = [
    ["**", "argument prefix"],
    ["*", "argument prefix"],
    ["<<", "here document"],
    ["&", "argument prefix"],
    ["+", "unary operator"],
    ["-", "unary operator"],
    ["/", "regexp literal"],
    ["%", "string literal"],
  ];
  for (const [operator, warning] of cases) {
    assertWarning(`puts 1 ${operator}0`, warning);
    assertWarning(`puts :a ${operator}0`, warning);
    assertWarning(`m = 1; puts m ${operator}0`, warning);
  }
});

test("equal in conditional", () => assertWarning("if a = 1; end; a = a", "should be =="));

test("dot dot dot eol", () => {
  assertWarning("_ = foo...", "... at EOL");
  assertWarning("def foo(...) = bar ...", "... at EOL");
  assertWarning("_ = foo... #", "... at EOL");
  assertWarning("_ = foo... \t\v\f\n", "... at EOL");
  refuteWarning("p foo...bar");
  refuteWarning("p foo...      bar");
});

test("END in method", () => assertWarning("def foo; END {}; end", "END in method"));

test("duplicated hash key", () => {
  assertWarning("{ a: 1, a: 2 }", "duplicated and overwritten");
  assertWarning("{ a: 1, **{ a: 2 } }", "duplicated and overwritten");
});

test("duplicated when clause", () => assertWarning("case 1; when 1, 1; end", "when' clause"));

test("float out of range", () => assertWarning("_ = 1.0e100000", "out of range"));

test("indentation mismatch", () => {
  assertWarning("if true\n  end", "mismatched indentations at 'end' with 'if'");
  assertWarning("if true\n  elsif true\nend", "mismatched indentations at 'elsif' with 'if'");
  assertWarning(
    "if true\n  else\nend",
    "mismatched indentations at 'else' with 'if'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning("unless true\n  end", "mismatched indentations at 'end' with 'unless'");
  assertWarning(
    "unless true\n  else\nend",
    "mismatched indentations at 'else' with 'unless'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning("while true\n  end", "mismatched indentations at 'end' with 'while'");
  assertWarning("until true\n  end", "mismatched indentations at 'end' with 'until'");
  assertWarning("begin\n  end", "mismatched indentations at 'end' with 'begin'");
  assertWarning("begin\n  rescue\nend", "mismatched indentations at 'rescue' with 'begin'");
  assertWarning("begin\n  ensure\nend", "mismatched indentations at 'ensure' with 'begin'");
  assertWarning(
    "begin\nrescue\n  else\nend",
    "mismatched indentations at 'else' with 'begin'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning(
    "begin\n  rescue\n    ensure\n      end",
    "mismatched indentations at 'rescue' with 'begin'",
    "mismatched indentations at 'ensure' with 'begin'",
    "mismatched indentations at 'end' with 'begin'",
  );
  assertWarning("def foo\n  end", "mismatched indentations at 'end' with 'def'");
  assertWarning("def foo\n  rescue\nend", "mismatched indentations at 'rescue' with 'def'");
  assertWarning("def foo\n  ensure\nend", "mismatched indentations at 'ensure' with 'def'");
  assertWarning(
    "def foo\nrescue\n  else\nend",
    "mismatched indentations at 'else' with 'def'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning(
    "def foo\n  rescue\n    ensure\n      end",
    "mismatched indentations at 'rescue' with 'def'",
    "mismatched indentations at 'ensure' with 'def'",
    "mismatched indentations at 'end' with 'def'",
  );
  assertWarning("class Foo\n  end", "mismatched indentations at 'end' with 'class'");
  assertWarning("class Foo\n  rescue\nend", "mismatched indentations at 'rescue' with 'class'");
  assertWarning("class Foo\n  ensure\nend", "mismatched indentations at 'ensure' with 'class'");
  assertWarning(
    "class Foo\nrescue\n  else\nend",
    "mismatched indentations at 'else' with 'class'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning(
    "class Foo\n  rescue\n    ensure\n      end",
    "mismatched indentations at 'rescue' with 'class'",
    "mismatched indentations at 'ensure' with 'class'",
    "mismatched indentations at 'end' with 'class'",
  );
  assertWarning("module Foo\n  end", "mismatched indentations at 'end' with 'module'");
  assertWarning("module Foo\n  rescue\nend", "mismatched indentations at 'rescue' with 'module'");
  assertWarning("module Foo\n  ensure\nend", "mismatched indentations at 'ensure' with 'module'");
  assertWarning(
    "module Foo\nrescue\n  else\nend",
    "mismatched indentations at 'else' with 'module'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning(
    "module Foo\n  rescue\n    ensure\n      end",
    "mismatched indentations at 'rescue' with 'module'",
    "mismatched indentations at 'ensure' with 'module'",
    "mismatched indentations at 'end' with 'module'",
  );
  assertWarning("class << foo\n  end", "mismatched indentations at 'end' with 'class'");
  assertWarning("class << foo\n  rescue\nend", "mismatched indentations at 'rescue' with 'class'");
  assertWarning("class << foo\n  ensure\nend", "mismatched indentations at 'ensure' with 'class'");
  assertWarning(
    "class << foo\nrescue\n  else\nend",
    "mismatched indentations at 'else' with 'class'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning(
    "class << foo\n  rescue\n    ensure\n      end",
    "mismatched indentations at 'rescue' with 'class'",
    "mismatched indentations at 'ensure' with 'class'",
    "mismatched indentations at 'end' with 'class'",
  );
  assertWarning("case 1; when 2\n  end", "mismatched indentations at 'end' with 'case'");
  assertWarning("case 1; in 2\n  end", "mismatched indentations at 'end' with 'case'");
  assertWarning("  case 1\nwhen 2\n  end", "mismatched indentations at 'when' with 'case'");
  refuteWarning("case 1\n  when 2\n    when 3\nend"); // case/when allows more indentation
  assertWarning("-> {\n  }", "mismatched indentations at '}' with '->'");
  assertWarning("-> do\n  end", "mismatched indentations at 'end' with '->'");
  assertWarning("-> do\n  rescue\nend", "mismatched indentations at 'rescue' with '->'");
  assertWarning("-> do\n  ensure\nend", "mismatched indentations at 'ensure' with '->'");
  assertWarning(
    "-> do\nrescue\n  else\nend",
    "mismatched indentations at 'else' with '->'",
    "mismatched indentations at 'end' with 'else'",
  );
  assertWarning(
    "-> do\n  rescue\n    ensure\n      end",
    "mismatched indentations at 'rescue' with '->'",
    "mismatched indentations at 'ensure' with '->'",
    "mismatched indentations at 'end' with '->'",
  );
  assertWarning("foo do\nrescue\n  else\nend", "mismatched indentations at 'end' with 'else'");

  refuteWarning("class Foo; end"); // same line
  refuteWarning("; class Foo\nend"); // non whitespace on opening line
  refuteWarning("\tclass Foo\n        end"); // tab stop matches space
  refuteWarning("    \tclass Foo\n        end"); // tab stop matches space
});

test("integer in flip flop", () => assertWarning("1 if 2..foo", "integer"));

test("literal in conditionals", () => {
  const sources = [
    "if (a = 2); a; end",
    "if ($a = 2); end",
    "if (@a = 2); end",
    "if a; elsif b = 2; b end",
    "unless (a = 2); a; end",
    "unless ($a = 2); end",
    "unless (@a = 2); end",
    "while (a = 2); a; end",
    "while ($a = 2); end",
    "while (@a = 2); end",
    "until (a = 2); a; end",
    "until ($a = 2); end",
    "until (@a = 2); end",
    "foo if (a, b = 2); [a, b]",
    "foo if a = 2 and a",
    "(@foo = 1) ? a : b",
    "!(a = 2) and a",
    "not a = 2 and a",
    "if (@@a = 2); end",
    "unless (@@a = 2); end",
    "while (@@a = 2); end",
    "until (@@a = 2); end",
  ];
  for (const source of sources) assertWarning(source, "= literal' in conditional, should be ==");
});

test("keyword eol", () => {
  assertWarning("if\ntrue; end", "end of line");
  assertWarning("if true\nelsif\nfalse; end", "end of line");
});

test("numbered reference", () =>
  assertWarning("_ = _ = $999999999999999999999", "too big for a number variable, always nil"));

test("shareable constant value", () => {
  assertWarning("foo # shareable_constant_value: none", "ignored");
  assertWarning("\v  # shareable_constant_value: none", "ignored");
  refuteWarning("# shareable_constant_value: none");
  refuteWarning("    # shareable_constant_value: none");
  refuteWarning("\t\t# shareable_constant_value: none");
});

test("string in predicate", () => {
  assertWarning("if 'foo'; end", "string");
  assertWarning('if "#{foo}"; end', "string");
  assertWarning("if __FILE__; end", "string");
});

test("symbol in predicate", () => {
  assertWarning("if :foo; end", "symbol");
  assertWarning('if :"#{foo}"; end', "symbol");
});

test("literal in predicate", () => {
  assertWarning("if __LINE__; end", "literal");
  assertWarning("if __ENCODING__; end", "literal");
  assertWarning("if 1; end", "literal");
  assertWarning("if 1.0; end", "literal");
  assertWarning("if 1r; end", "literal");
  assertWarning("if 1i; end", "literal");
});

test("regexp in predicate", () => {
  assertWarning("if /foo/; end", "regex");
  assertWarning("if /foo#{bar}/; end", "regex");
});

test("unused local variables", () => {
  assertWarning("foo = 1", "unused");

  refuteWarning("foo = 1", { command_line: "e" });
  refuteWarning("foo = 1", { scopes: [[]] });

  assertWarning("def foo; bar = 1; end", "unused");
  assertWarning("def foo; bar, = 1; end", "unused");

  refuteWarning("def foo; bar &&= 1; end");
  refuteWarning("def foo; bar ||= 1; end");
  refuteWarning("def foo; bar += 1; end");

  refuteWarning("def foo; bar = bar; end");
  refuteWarning("def foo; bar = bar = 1; end");
  refuteWarning("def foo; bar = (bar = 1); end");
  refuteWarning("def foo; bar = begin; bar = 1; end; end");
  refuteWarning("def foo; bar = (qux; bar = 1); end");
  refuteWarning("def foo; bar, = bar = 1; end");
  refuteWarning("def foo; bar, = 1, bar = 1; end");

  refuteWarning("def foo(bar); end");
  refuteWarning("def foo(bar = 1); end");
  refuteWarning("def foo((bar)); end");
  refuteWarning("def foo(*bar); end");
  refuteWarning("def foo(*, bar); end");
  refuteWarning("def foo(*, (bar)); end");
  refuteWarning("def foo(bar:); end");
  refuteWarning("def foo(**bar); end");
  refuteWarning("def foo(&bar); end");
  refuteWarning("->(bar) {}");
  refuteWarning("->(; bar) {}");

  refuteWarning("def foo; bar = 1; tap { bar }; end");
  refuteWarning("def foo; bar = 1; tap { baz = bar; baz }; end");

  refuteWarning("def foo; bar = 1; end", { line: -2 });
});

// C prism's pm_locals_order walks its open-addressing locals table, so it
// emits "assigned but unused variable" in hash-slot order while rebuilding
// the node's `locals` array in insertion order. target_js_uni's locals are
// a plain insertion-ordered map, so it agrees on the `locals` array and on
// the *set* of warnings, but not necessarily their order once a scope has
// enough locals - sort both before comparing, same as the Ruby original.
test("unused local variables order", () => {
  const source = "def foo\n  a1 = 1\n  a2 = 2\n  a3 = 3\n  a4 = 4\n  a5 = 5\n  a6 = 6\n  a7 = 7\n  nil\nend\n";

  const { ast, warnings } = uniEnvelope(source);
  assert.deepStrictEqual(
    ast.statements.body[0].locals,
    [1, 2, 3, 4, 5, 6, 7].map((n) => `a${n}`),
  );
  assert.equal(warnings.length, 7);
  assert.deepStrictEqual(
    warnings.map((w) => w.message).sort(),
    [1, 2, 3, 4, 5, 6, 7].map((n) => `assigned but unused variable - a${n}`),
  );
});

test("void statements", () => {
  assertWarning("foo = 1; foo", "a variable in void");
  assertWarning("@foo", "a variable in void");
  assertWarning("@@foo", "a variable in void");
  assertWarning("$foo", "a variable in void");
  assertWarning("$+", "a variable in void");
  assertWarning("$1", "a variable in void");

  assertWarning("self", "self in void");
  assertWarning("nil", "nil in void");
  assertWarning("true", "true in void");
  assertWarning("false", "false in void");

  assertWarning("1", "literal in void");
  assertWarning("1.0", "literal in void");
  assertWarning("1r", "literal in void");
  assertWarning("1i", "literal in void");
  assertWarning(":foo", "literal in void");
  assertWarning('"foo"', "literal in void");
  assertWarning('"foo#{1}"', "literal in void");
  assertWarning("/foo/", "literal in void");
  assertWarning("/foo#{1}/", "literal in void");

  assertWarning("Foo", "constant in void");
  assertWarning("::Foo", ":: in void");
  assertWarning("Foo::Bar", ":: in void");

  assertWarning("1..2", ".. in void");
  assertWarning("1..", ".. in void");
  assertWarning("..2", ".. in void");
  assertWarning("1...2", "... in void");
  assertWarning("1...;", "... in void");
  assertWarning("...2", "... in void");

  assertWarning("defined?(foo)", "defined? in void");

  assertWarning("1 + 1", "+ in void");
  assertWarning("1 - 1", "- in void");
  assertWarning("1 * 1", "* in void");
  assertWarning("1 / 1", "/ in void");
  assertWarning("1 % 1", "% in void");
  assertWarning("1 | 1", "| in void");
  assertWarning("1 ^ 1", "^ in void");
  assertWarning("1 & 1", "& in void");
  assertWarning("1 > 1", "> in void");
  assertWarning("1 < 1", "< in void");

  assertWarning("1 ** 1", "** in void");
  assertWarning("1 <= 1", "<= in void");
  assertWarning("1 >= 1", ">= in void");
  assertWarning("1 != 1", "!= in void");
  assertWarning("1 == 1", "== in void");
  assertWarning("1 <=> 1", "<=> in void");

  assertWarning("+foo", "+@ in void");
  assertWarning("-foo", "-@ in void");

  assertWarning("def foo; @bar; @baz; end", "variable in void");
  refuteWarning("def foo; @bar; end");
  refuteWarning("@foo", { scopes: [[]] });
});

test("unreachable statement", () => {
  assertWarning("begin; rescue; retry; foo; end", "statement not reached");
  assertWarning("return; foo", "statement not reached");
  assertWarning("tap { break; foo }", "statement not reached");
  assertWarning("tap { break 1; foo }", "statement not reached");
  assertWarning("tap { next; foo }", "statement not reached");
  assertWarning("tap { next 1; foo }", "statement not reached");
  assertWarning("tap { redo; foo }", "statement not reached");
});

test("shebang ending with carriage return", () => {
  const msg = "shebang line ending with \\r may cause problems";

  assertWarning("#!ruby\r\np(123)\n", msg, { main_script: true });
  assertWarning("#!ruby \r\np(123)\n", msg, { main_script: true });
  assertWarning("#!ruby -Eutf-8\r\np(123)\n", msg, { main_script: true });

  // Used with the `-x` option, to ignore the script up until the first
  // shebang that mentioned "ruby".
  assertWarning(
    "#!/usr/bin/env bash\n# Some initial shell script or other content\n# that Ruby should ignore\n" +
      'echo "This is shell script part"\nexit 0\n\n#! /usr/bin/env ruby -Eutf-8\r\n# Ruby script starts here\n' +
      'puts "Hello from Ruby!"\n',
    msg,
    { main_script: true },
  );

  refuteWarning("#ruby not_a_shebang\r\n", { main_script: true });

  // CRuby doesn't emit the warning if a malformed file only has `\r` and
  // not `\n`. https://bugs.ruby-lang.org/issues/20700.
  refuteWarning("#!ruby\r", { main_script: true });
});

test("warnings verbosity", () => {
  let warning = uniEnvelope("def foo; END { }; end").warnings[0];
  assert.equal(warning.message, "END in method; use at_exit");
  assert.equal(warning.level, "default");

  warning = uniEnvelope("foo /regexp/").warnings[0];
  assert.equal(warning.message, "ambiguous `/`; wrap regexp in parentheses or add a space after `/` operator");
  assert.equal(warning.level, "verbose");
});

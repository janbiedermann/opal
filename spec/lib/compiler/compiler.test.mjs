// Port of spec/lib/compiler_spec.rb to the JS compiler.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { basename, join, dirname } from "node:path";
import { Compiler, OpalSyntaxError } from "../../../lib/opal/compiler/index.mjs";

const HERE = fileURLToPath(import.meta.url);

function compiled(code, options = {}) {
  const warnings = [];
  const out = new Compiler(code, { warning: (w) => warnings.push(w), ...options }).compile();
  compiled.warnings = warnings;
  return out;
}

function compilerFor(code, options = {}) {
  const compiler = new Compiler(code, { warning() {}, ...options });
  compiler.compile();
  return compiler;
}

function includes(code, ...parts) {
  const out = compiled(code, includes.options);
  for (const part of parts) assert.ok(out.includes(part), `expected ${JSON.stringify(part)} in:\n${out}`);
}

function excludes(code, part) {
  const out = compiled(code, includes.options);
  assert.ok(!out.includes(part), `expected no ${JSON.stringify(part)} in:\n${out}`);
}

describe("regexp", () => {
  test("should escape regexp", () => {
    includes("%r{^/{4,}$}", "/^\\/{4,}$/");
    includes('/\\\\"/', '/\\\\"/');
  });
});

test("requiring calls #require", () => includes("require 'pippo'", 'self.$require("pippo")'));

describe("requirable", () => {
  test("executes the file", () => {
    includes("true", "(function(Opal) {");
    assert.ok(compiled("true").startsWith("Opal.queue(function(Opal) {"));
    assert.ok(compiled("true").endsWith("});\n"));
  });

  test('puts the compiled into "Opal.modules"', () => {
    const options = { requirable: true, file: "pippo" };
    assert.ok(compiled("true", options).includes('Opal.modules["pippo"] = function(Opal) {'));
    assert.ok(compiled("true", options).endsWith("};\n"));
  });
});

test("should compile simple ruby values", () => {
  includes("3.142", "return 3.142");
  includes("123e1", "return 1230");
  includes("123E+10", "return 1230000000000");
  includes("false", "return false");
  includes("true", "return true");
  includes("0;nil", "return nil"); // NB: Empty nil return is compiled-out
});

test("should compile ruby strings", () => {
  includes('"hello world"', 'return "hello world"');
  includes('"hello #{100}"', '"hello "', "100");
});

test("should compile ruby strings with escapes", () => {
  includes('"hello \\e"', "\\u001b");
  includes('"hello \\e#{nil}"', "\\u001b");
});

test("should compile ruby ranges", () => {
  includes("1..1", "$range(1, 1, false)");
  includes("1...1", "$range(1, 1, true)");
  includes("..1", "$range(nil, 1, false)");
  includes("...1", "$range(nil, 1, true)");
  includes("1..", "$range(1, nil, false)");
  includes("1...", "$range(1, nil, true)");
  // Following return Opal.range.$new instead of $range. Some also miss a space.
  includes("nil..1", "(nil, 1, false)");
  includes("nil...1", "(nil,1, true)");
  includes('"a"..nil', '("a", nil, false)');
  includes('"a"...nil', '("a",nil, true)');
  includes("..nil", "(nil, nil, false)");
  includes("...nil", "(nil,nil, true)");
});

test("should compile method calls", () => {
  includes("self.inspect", "$inspect()");
  includes("self.map { |a| a + 10 }", "'map'");
});

test("adds method missing stubs", () => includes("self.puts 'hello'", "Opal.add_stubs('puts')"));
test("adds method missing stubs with operators", () => includes("class Foo; end; Foo.new > 5", "Opal.add_stubs('>,new')"));

test("should compile constant lookups", () => {
  includes("Object", "Object");
  includes("Array", "Array");
});

test("should compile undef calls", () => {
  includes("undef a", "$udef(self, '$' + \"a\")");
  assert.match(compiled("undef a,b"), /\$udef\(self, '\$' \+ "a"\);.*\$udef\(self, '\$' \+ "b"\);/s);
});

describe("method names", () => {
  test("generates a named function for method", () => includes("def test_method; []; end", "function $$test_method()"));
  test("when function name is reserved generates a valid named function", () => includes("def Array; []; end", "function $$Array()"));
  test("when function name is not valid generates a name in a safe way", () => includes("def test_method?; []; end", "function $test_method$ques$1()"));
});

test("debugger special method generates debugger keyword in javascript", () => {
  includes("debugger", "debugger");
  excludes("debugger", "$debugger");
});

describe("extracting __END__ content", () => {
  const cases = [
    ["code", null],
    ["code\n__END_", null],
    ["code\n__END__", ""],
    ["code\n\n\n__END__", ""],
    ["code\n__END__data", null],
    ["code\n__END__\ndata", "data"],
    ["code\n__END__\nline1\nline2", "line1\nline2"],
    ["code\n__END__\nline1\nline2\n", "line1\nline2\n"],
    ["code\n __END__\ndata", null],
    ['"multiline string\n__END__\nwith data separator"\n__END__\ndata', "data"],
  ];
  for (const [source, expected] of cases) {
    test(`extracts ${JSON.stringify(expected)} from ${JSON.stringify(source)}`, () => {
      const compiler = new Compiler(source);
      compiler.parse();
      assert.equal(compiler.eofContent, expected);
    });
  }
});

describe("DATA special variable", () => {
  test("is not a special case unless __END__ part present in source", () => {
    includes("DATA", "DATA");
    includes("DATA\nMALFORMED__END__", "DATA");
    excludes("DATA\n__END__", "DATA");
  });
  test("DATA gets compiled as a reference to special $__END__ variable", () => includes("a = DATA\n__END__", "a = $__END__"));
  test("causes the compiler to create a reference to special __END__ variable", () => includes("DATA\n__END__\nFord Perfect", "$__END__ = "));
  test("does not create a reference to __END__ variable unless __END__ content present", () => excludes("DATA", "$__END__ = "));
});

describe("pre-processing require-ish methods", () => {
  test("#require parses and resolves its argument", () => {
    assert.deepEqual(compilerFor(`require "${HERE}"`).requires, [HERE]);
  });
  test("#autoload parses and resolves the second argument in top scope", () => {
    assert.deepEqual(compilerFor(`autoload :Whatever, "${HERE}"`).requires, [HERE]);
  });
  test("#autoload parses and resolves the second argument", () => {
    assert.deepEqual(compilerFor(`class Foo; autoload :Whatever, "${HERE}"; end`).requires, [HERE]);
  });
  test("#require_relative parses and resolves its argument", () => {
    assert.deepEqual(compilerFor(`require_relative "./${basename(HERE)}"`, { file: HERE }).requires, [HERE]);
  });
  test("#require_tree parses and resolves its argument", () => {
    const file = join(dirname(HERE), "..", "fixtures", "require_tree_test.rb");
    assert.deepEqual(compilerFor(readFileSync(file, "utf8")).requiredTrees, ["../fixtures/required_tree_test"]);
  });
});

describe("truthy check", () => {
  test("excludes nil check for primitives with operators", () => {
    includes("foo = 42 if 2 > 3", "if ($rb_gt(2, 3))");
    includes("foo = 42 if 2.5 > 3.5", "if ($rb_gt(2.5, 3.5))");
    includes("foo = 42 if true > false", "if ($rb_gt(true, false))");
  });
  test("adds nil check for strings, lvars, constants and self with operators", () => {
    includes('foo = 42 if "test" > "bar"', 'if ($truthy($rb_gt("test", "bar")))');
    includes("bar = 4\nfoo = 42 if bar > 5", "if ($truthy($rb_gt(bar, 5)))");
    includes("foo = 42 if Test > 4", "if ($truthy($rb_gt($$('Test'), 4))) ");
    includes("foo = 42 if self > 4", "if ($truthy($rb_gt(self, 4))) ");
  });
  test("converts each == call inside if to an $eqeq wrapper", () => {
    includes("foo = 42 if 2 == 3", "if ($eqeq(2, 3))");
    includes("foo = 42 if 2.5 == 3.5", "if ($eqeq(2.5, 3.5))");
    includes("foo = 42 if true == false", "if ($eqeq(true, false))");
    includes('foo = 42 if "test" == "bar"', 'if ($eqeq("test", "bar"))');
    includes("bar = 4\nfoo = 42 if bar == 5", "if ($eqeq(bar, 5))");
    includes("foo = 42 if Test == 4", "if ($eqeq($$('Test'), 4))");
  });
  test("doesn't convert == calls to $eqeq wrappers outside of an if", () => excludes("bar == 5", "$eqeq(bar, 5)"));
  test("converts each === call inside if to an $eqeqeq wrapper", () => {
    includes("foo = 42 if 2 === 3", "if ($eqeqeq(2, 3))");
    includes('foo = 42 if "test" === "bar"', 'if ($eqeqeq("test", "bar"))');
    includes("bar = 4\nfoo = 42 if bar === 5", "if ($eqeqeq(bar, 5))");
    includes("foo = 42 if Test === 4", "if ($eqeqeq($$('Test'), 4))");
  });
  test("adds nil check without operators", () => {
    includes("foo = 42 if 2", "if ($truthy(2))");
    includes("foo = 42 if 2.5", "if ($truthy(2.5))");
    includes("foo = 42 if true", "if ($truthy(true))");
    includes("foo = 42 if true.something", "if ($truthy(true.$something()))");
    includes('foo = 42 if "test"', 'if ($truthy("test"))');
    includes("bar = 4\nfoo = 42 if bar", "if ($truthy(bar))");
    includes("foo = 42 if Test", "if ($truthy($$('Test')))");
  });
  test("parentheses with operators", () => {
    includes('foo = 42 if ("test" > "bar")', 'if ($truthy($rb_gt("test", "bar"))');
    includes("bar = 4\nfoo = 42 if (bar > 5)", "if ($truthy($rb_gt(bar, 5))");
    includes("foo = 42 if (2 == 3)", "if ($eqeq(2, 3))");
    includes('foo = 42 if ("test" == "bar")', 'if ($eqeq("test", "bar")');
    includes("foo = 42 if (Test == 4)", "if ($eqeq($$('Test'), 4))");
  });
  test("parentheses without operators", () => {
    includes("foo = 42 if (2)", "if ($truthy(2)");
    includes("foo = 42 if (true.something)", "if ($truthy(true.$something())");
    includes('foo = 42 if ("test")', 'if ($truthy("test")');
    includes("bar = 4\nfoo = 42 if (bar)", "if ($truthy(bar)");
    includes("foo = 42 if (Test)", "if ($truthy($$('Test'))");
  });
  test("drops $truthy for backtick JS that is statically a boolean", () => {
    const js = { backtick_javascript: true };
    const unwrapped = (code, part) => {
      const out = compiled(code, js);
      assert.ok(out.includes(part), `expected ${JSON.stringify(part)} in:\n${out}`);
      assert.ok(!out.includes("$truthy"), `unexpected $truthy in:\n${out}`);
    };
    unwrapped("foo = 42 if `a === b`", "if ((a === b))");
    unwrapped("foo = 42 if `a == null`", "if ((a == null))");
    unwrapped("foo = 42 if `!a`", "if ((!a))");
    unwrapped("foo = 42 if `a.test(b)`", "if ((a.test(b)))");
    unwrapped("foo = 42 if `a === b || c === d`", "if ((a === b || c === d))");
    unwrapped("foo = 42 if `typeof a !== 'undefined' && !b`", "if ((typeof a !== 'undefined' && !b))");
    unwrapped("foo = 42 if `a instanceof Foo`", "if ((a instanceof Foo))");
    unwrapped("def foo\n  unless `a === b || c === d`\n    1\n  end\n  2\nend", "if (!(a === b || c === d)) {");
  });
  test("keeps $truthy for backtick JS of unknown truthiness", () => {
    const js = { backtick_javascript: true };
    const kept = (code, part) => {
      const out = compiled(code, js);
      assert.ok(out.includes(part), `expected ${JSON.stringify(part)} in:\n${out}`);
    };
    kept("foo = 42 if `a && b`", "if ($truthy(a && b))");
    kept("foo = 42 if `a || b === c`", "if ($truthy(a || b === c))");
    kept("foo = 42 if `a === b && c`", "if ($truthy(a === b && c))");
    kept("foo = 42 if `a < 0 ? -a : a`", "if ($truthy(a < 0 ? -a : a))");
    kept("foo = 42 if `foo.bar`", "if ($truthy(foo.bar))");
  });
});

test("Regexp flags skips the unsupported ones", () => includes("/foobar/nix", "/foobar/i"));

describe("x-strings", () => {
  const js = { backtick_javascript: true };
  const inc = (code, part) => {
    const out = compiled(code, js);
    assert.ok(out.includes(part), `expected ${JSON.stringify(part)} in:\n${out}`);
  };

  test("compiles the escapes directly as appearing in x-strings", () => {
    inc('`"hello\\nworld"`', '"hello\\nworld"');
    inc('%x{"hello\\nworld"}', '"hello\\nworld"');
  });

  test("respects JS returns not doubling the trailing semicolon", () => {
    inc("def foo\n  `return bar(baz)`\nend", "  return bar(baz);\n");
    inc("def foo\n  %x{return bar(baz)}\nend", "  return bar(baz);\n");
    inc("def foo\n  %x{return bar(baz);}\nend", "  return bar(baz);\n");
    inc("def foo\n  %x{\n    return bar(baz)\n  }\nend", "  return bar(baz);\n");
    inc("def foo\n  %x{\n    return bar(baz);\n  }\nend", "  return bar(baz);\n");
    inc("def foo\n  789\n  `#{123 + bar} * 456;`\nend", "  return $rb_plus(123, self.$bar()) * 456;\n");
    inc("def foo\n  789\n  `#$bar * 456`\nend", "  return $gvars.bar * 456;\n");
    inc("def foo\n  789\n  `#@bar * 456`\nend", "  return self.bar * 456;\n");
    inc("def foo\n  789\n  `456 * #@bar`\nend", "  return 456 * self.bar;\n");
    inc('if `compare === nil`\n  raise ArgumentError, "comparison of #{a.class} with #{b.class} failed"\nend', "  if ((compare === nil)) {\n");
    inc("def <<(count)\n  count = Opal.coerce_to! count, Integer, :to_int\n  `#{count} > 0 ? self << #{count} : self >> -#{count}`\nend",
      "  return count > 0 ? self << count : self >> -count;\n");
    for (const body of [
      "`return executeIOAction(function(){return __fs__.existsSync(#{path})})`",
      "`executeIOAction(function(){return __fs__.existsSync(#{path})})`",
      "`return executeIOAction(function(){return __fs__.existsSync(#{path})});`",
      "`executeIOAction(function(){return __fs__.existsSync(#{path})});`",
    ]) {
      inc(`def self.exist? path\n  path = path.path if path.respond_to? :path\n  ${body}\nend`,
        "  return executeIOAction(function(){return __fs__.existsSync(path)});\n");
    }
  });

  const warningsFor = (code) => {
    compiled(code, { ...js, eval: true });
    return compiled.warnings.length;
  };

  test("warns if a semicolon is used in a single line", () => {
    for (const code of ["a = `1;`", "a = `1;`; return", "a = ` 1; `", "a = %x{\n 1; \n}", "def foo; ` 1;  `; end"]) {
      assert.equal(warningsFor(code), 1, code);
    }
  });

  test("does not warn for statements", () => {
    assert.equal(warningsFor("`foo;`; return"), 0);
    assert.equal(warningsFor("`foo;`; 123"), 0);
  });

  test("does not warn for multiline x-strings", () => {
    assert.equal(warningsFor("a = `1;\n2;`"), 0);
    assert.equal(warningsFor("a = `1;\n2;3; `"), 0);
    assert.equal(warningsFor("def foo;` 1;\n  `;end"), 1);
  });

  test("when empty", () => {
    inc("%x{\n}", "return nil\n");
    inc("%x{}", "return nil\n");
    inc("`\n\n`", "return nil\n");
    inc("``", "return nil\n");
  });
});

describe("magic comments", () => {
  const magic = (...lines) => compilerFor(lines.join("\n")).magicComments;

  test("extracts them in a hash", () => {
    assert.deepEqual(magic(""), {});
    assert.deepEqual(magic("", "#     foo:true", "", "", "", "#bar : false", "#baz  :qux", "#biz  :boz", "baz"),
      { foo: true, bar: false, baz: "qux", biz: "boz" });
    assert.deepEqual(magic("#baz  :qux", "#biz  :boz", "", "baz"), { baz: "qux", biz: "boz" });
    assert.deepEqual(magic("#-*- baz  :qux-*-", "#   -*-biz  :boz   -*-   "), { baz: "qux", biz: "boz" });
  });

  test("accepts complex values", () => {
    assert.deepEqual(magic("#baz:  qux,naz!", "#biz : boz?  ,bux,   []=", "#buz  :<<,+,!@"),
      { baz: "qux,naz!", biz: "boz?  ,bux,   []=", buz: "<<,+,!@" });
  });
});

describe("magic encoding comment", () => {
  const file = (encoding, string) => `# encoding: ${encoding}\n"${string}"\n`;

  test("utf-8 comment with a valid sequence", () => {
    const out = compiled(file("utf-8", "λ"));
    assert.ok(out.includes('"λ"'));
    assert.ok(!out.includes("$force_encoding"));
  });

  // (A raw invalid byte in a UTF-8 source can't occur in a JS string, so the
  // Ruby spec's EncodingError case has no equivalent; the escaped form is
  // compiled as a binary string.)
  test("utf-8 comment with an escaped invalid byte", () => includes(file("utf-8", "\\xFF"), '$str("\\xFF","BINARY")'));

  test("ascii-8bit comment with a valid sequence", () => includes(file("ascii-8bit", "\\xFF"), '$str("\\xFF","ASCII-8BIT")'));
  test("ascii-8bit comment with a unicode sequence", () => includes(file("ascii-8bit", "λ"), '$str("\\xCE\\xBB","ASCII-8BIT")'));
});

describe("a compilation error", () => {
  test("at compile time carries the file, line and source line", () => {
    let error = null;
    try {
      compiled("require self", { file: "compiler_spec.rb/foobar.js.rb", dynamic_require_severity: "error" });
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof OpalSyntaxError);
    assert.equal(error.file, "compiler_spec.rb/foobar.js.rb");
    assert.equal(error.location, "compiler_spec.rb/foobar.js.rb:1:in `require self'");
  });

  test("at parse time carries the file, line and source line", () => {
    let error = null;
    try {
      compiled("def foo", { file: "compiler_spec.rb/foobar.js.rb" });
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof OpalSyntaxError);
    assert.equal(error.location, "compiler_spec.rb/foobar.js.rb:1:in `def foo'");
  });
});

describe("[regressions]", () => {
  test("accepts empty rescue within while loop", () => {
    compiled("while foo\n  begin\n  rescue\n  end\nend");
  });
  test("accepts a comment as the sole body of a for loop", () => {
    compiled("for foo in bar\n  #\nend");
  });
});

// spec/lib/dependency_resolver_spec.rb
describe("require resolution", () => {
  const compile = (source, options = {}) => {
    const warnings = [];
    const compiler = new Compiler(source, { warning: (w) => warnings.push(w), ...options });
    compiler.compile();
    return { requires: compiler.requires, warnings };
  };

  test("resolves strings and require_relative", () => {
    assert.deepEqual(compile('require "foo"; require_relative "bar"', { file: "x/y.rb" }).requires, ["foo", "x/bar"]);
  });

  test("raises for a dynamic require with severity error", () => {
    assert.throws(() => compile("require self", { dynamic_require_severity: "error" }), /Cannot handle dynamic require/);
  });

  test("warns for a dynamic require with severity warning", () => {
    assert.deepEqual(compile("require self", { dynamic_require_severity: "warning" }).warnings, ["warning: Cannot handle dynamic require -- (file):1"]);
  });

  test("ignores a dynamic require with severity ignore (the default)", () => {
    assert.deepEqual(compile("require self"), { requires: [], warnings: [] });
  });
});

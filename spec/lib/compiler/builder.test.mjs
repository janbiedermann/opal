// The JS builder (lib/opal/compiler/builder). Ported from
// spec/lib/builder_spec.rb, builder_processors_spec.rb, path_reader_spec.rb,
// project_spec.rb, builder/post_processor_spec.rb and
// builder/post_processor/dce_spec.rb.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, statSync, readFileSync, cpSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { Builder, MissingRequire } from "../../../lib/opal/compiler/builder/builder.mjs";
import { NullCache } from "../../../lib/opal/compiler/builder/cache.mjs";
import { JsProcessor, RubyProcessor } from "../../../lib/opal/compiler/builder/processors.mjs";
import { PathReader } from "../../../lib/opal/compiler/builder/path_reader.mjs";
import { UnknownOpalfileDirective, evaluateOpalfile } from "../../../lib/opal/compiler/builder/project.mjs";
import { link, LinkError } from "../../../lib/opal/compiler/builder/esm_linker.mjs";
import { Fragment } from "../../../lib/opal/compiler/fragment.mjs";
import { defaultPaths, OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";
import { VERSION } from "../../../lib/opal/compiler/version.mjs";

const SPEC_LIB = resolve(OPAL_ROOT, "spec", "lib");
const FIXTURES = join(SPEC_LIB, "fixtures");
const VERSION_MAJOR_MINOR = VERSION.split(".").slice(0, 2).join(".");

const newBuilder = (options = {}) => new Builder({ cache: new NullCache(), ...options });
const builderWithPaths = (options = {}) => {
  const builder = newBuilder(options);
  builder.appendPaths(SPEC_LIB);
  return builder;
};

function filesIn(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? [path, ...filesIn(path)] : [path];
  });
}

describe("Builder", () => {
  test("compiles opal", () => {
    assert.match(newBuilder().build("opal").toString(), /\(Opal\);/);
  });

  test("respects require_tree calls", () => {
    assert.ok(builderWithPaths().build("fixtures/require_tree_test").toString().includes('Opal.modules["fixtures/required_tree_test/required_file1"]'));
  });

  test("compiles stubs as empty files", () => {
    const builder = newBuilder({ stubs: ["foo"] });
    builder.buildStr('require "foo"', "bar.rb");
    const foo = builder.processed.find((p) => p.filename.endsWith("foo.rb") || p.filename === "foo");
    assert.equal(foo.originalSource, "\n");
    assert.ok(builder.toString().includes('Opal.modules["foo"] = Opal.return_val(Opal.nil)'));
  });

  test("requires a native .js file with or without the extension", () => {
    for (const path of ["fixtures/required_file", "fixtures/required_file.js"]) {
      const builder = builderWithPaths();
      builder.buildStr(`require "${path}"`, "foo");
      assert.ok(builder.toString().includes("console.log('required file');"), path);
    }
  });

  test("passes the compiler options", () => {
    const withoutCheck = newBuilder({ compilerOptions: { arity_check: false } });
    withoutCheck.buildStr("def foo; end", "foo");
    assert.ok(!withoutCheck.toString().includes("$$parameters: []"));
    const withCheck = newBuilder({ compilerOptions: { arity_check: true } });
    withCheck.buildStr("def foo; end", "foo");
    assert.ok(withCheck.toString().includes("$$parameters: []"));
  });

  describe("missingRequireSeverity", () => {
    test("defaults to error", () => {
      assert.equal(newBuilder().missingRequireSeverity, "error");
      assert.throws(() => newBuilder().buildStr("require 'non-existen-file'", "foo.rb"), MissingRequire);
    });

    test("warns with warning", () => {
      const warnings = [];
      const builder = newBuilder({ missingRequireSeverity: "warning", warn: (m) => warnings.push(m) });
      builder.buildStr("require 'non-existen-file'", "foo.rb");
      assert.ok(warnings.length >= 1);
      assert.ok(warnings[0].startsWith(`Warning: can't find file: "non-existen-file"`));
    });

    test("does nothing with ignore", () => {
      const warnings = [];
      const builder = newBuilder({ missingRequireSeverity: "ignore", warn: (m) => warnings.push(m) });
      builder.buildStr("require 'non-existen-file'", "foo.rb");
      assert.deepEqual(warnings, []);
    });

    test("names the requiring file", () => {
      assert.throws(() => newBuilder().buildStr("require 'non-existen-file'", "foo.rb"), /A file required by "foo\.rb" wasn't found/);
    });
  });

  test("uses relative paths and front slashes as module names", () => {
    assert.ok(newBuilder().build("stringio", { requirable: true }).toString().includes('Opal.modules["stringio"]'));
    assert.ok(newBuilder().build("opal/platform", { requirable: true }).toString().includes('Opal.modules["opal/platform"]'));
  });

  test("preserves the output order", () => {
    // spec/lib/fixtures/build_order, with file5 as a plain .rb file
    // (the .rb.erb processor isn't part of the JS builder)
    const dir = mkdtempSync(join(tmpdir(), "opal-build-order-"));
    try {
      cpSync(join(FIXTURES, "build_order.rb"), join(dir, "fixtures", "build_order.rb"));
      cpSync(join(FIXTURES, "build_order"), join(dir, "fixtures", "build_order"), { recursive: true });
      const erb = join(dir, "fixtures", "build_order", "file5.rb.erb");
      const source = readFileSync(erb, "utf8").replace('<%= __dir__.inspect[1..-2] %>', join(dir, "fixtures", "build_order"));
      writeFileSync(join(dir, "fixtures", "build_order", "file5.rb"), source);
      rmSync(erb);
      const builder = newBuilder();
      builder.appendPaths(dir);
      const order = [...builder.build("fixtures/build_order").toString().matchAll(/(FILE_[0-9]+)/g)].map((m) => m[1]);
      assert.deepEqual([...new Set(order)], ["FILE_1", "FILE_2", "FILE_3", "FILE_4", "FILE_51", "FILE_5", "FILE_61", "FILE_62", "FILE_63", "FILE_64", "FILE_6", "FILE_7"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const esm of [true, false]) {
    describe(`directory mode${esm ? " with ESM" : ""}`, () => {
      const ext = esm ? "mjs" : "js";
      const ver = VERSION_MAJOR_MINOR;

      test("builds a correct directory structure", () => {
        const dir = mkdtempSync(join(tmpdir(), "opal-test-"));
        try {
          const builder = newBuilder({ compilerOptions: { directory: true, esm } });
          builder.build("console");
          builder.compileToDirectory(join(dir, "UniqueString"));
          const files = filesIn(join(dir, "UniqueString")).map((f) => relative(join(dir, "UniqueString"), f));
          const expected = [`index.${ext}`, "opal", `opal/${ver}`, `opal/${ver}/console.${ext}`, `opal/${ver}/console.map`,
            `opal/${ver}/native.${ext}`, `opal/${ver}/native.map`, "opal/src", "opal/src/console.rb", "opal/src/native.rb"];
          if (esm) expected.push("index.html");
          assert.deepEqual(files.sort(), expected.sort());
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });

      test("builds a single file if requested", () => {
        const builder = newBuilder({ compilerOptions: { directory: true, esm } });
        builder.build("console");
        const file = builder.compileToDirectory(null, { singleFile: "opal/src/console.rb" });
        assert.equal(file, readFileSync(join(OPAL_ROOT, "stdlib", "console.rb"), "utf8"));
      });
    });
  }

  test("builds the same output with the file cache", () => {
    const cacheDir = mkdtempSync(join(tmpdir(), "opal-cache-test-"));
    const previous = process.env.OPAL_CACHE_DIR;
    process.env.OPAL_CACHE_DIR = cacheDir;
    try {
      const build = () => new Builder().buildStr("puts [1, 2].sum", "-e").toString();
      const fresh = build();
      assert.ok(readdirSync(cacheDir).length > 0);
      assert.equal(build(), fresh);
      assert.equal(fresh, newBuilder().buildStr("puts [1, 2].sum", "-e").toString());
    } finally {
      if (previous === undefined) delete process.env.OPAL_CACHE_DIR;
      else process.env.OPAL_CACHE_DIR = previous;
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  test("appends an embedded source map", () => {
    const code = newBuilder().buildStr("puts 1", "-e").compiledSource();
    const m = /\/\/# sourceMappingURL=data:application\/json;base64,(\S+)$/.exec(code);
    assert.ok(m);
    const map = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
    assert.equal(map.version, 3);
    assert.deepEqual(map.sections[0].offset, { line: 0, column: 0 });
  });
});

describe("processors", () => {
  test("JsProcessor maps to one fragment per line", () => {
    const processor = new JsProcessor("line1\n line2\n  line3", "file.js");
    const map = processor.sourceMap;
    assert.deepEqual(map.fragments.map((f) => f.code), ["line1\n", " line2\n", "  line3\n", 'Opal.loaded(["file.js"]);']);
  });

  test("JsProcessor adds loading code at the end of the source", () => {
    const processor = new JsProcessor("line1\n line2\n  line3", "file.js");
    assert.equal(processor.source, 'line1\n line2\n  line3\nOpal.loaded(["file.js"]);');
  });

  test("RubyProcessor compiles ruby to js", () => {
    assert.ok(new RubyProcessor("puts 5", "-e").toString().includes("$puts(5)"));
  });

  test("RubyProcessor respects :requirable (default false)", () => {
    assert.ok(new RubyProcessor("puts 5", "-e", null, { requirable: true }).toString().includes("Opal.modules["));
    assert.ok(!new RubyProcessor("puts 5", "-e").toString().includes("Opal.modules["));
  });

  test("RubyProcessor fills requiredTrees", () => {
    assert.deepEqual(new RubyProcessor('require_tree "./pippo"', "-e").requiredTrees, ["./pippo"]);
  });

  test("an .mjs module is linked and its exports go to Opal.esm", () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-esm-test-"));
    try {
      writeFileSync(join(dir, "dep.mjs"), "export const answer = 42;\nexport function double(x) { return x * 2; }\n");
      writeFileSync(join(dir, "main.mjs"), 'import { answer, double as twice } from "./dep.mjs";\nexport const result = twice(answer);\nexport { answer };\n');
      const processor = new JsProcessor(readFileSync(join(dir, "main.mjs"), "utf8"), "lib/main.mjs", join(dir, "main.mjs"));
      const Opal = { loaded() {} };
      new Function("Opal", processor.source)(Opal);
      assert.deepEqual({ ...Opal.esm["lib/main"] }, { result: 84, answer: 42 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("ESM linker", () => {
  test("links the compiler into a working script", () => {
    const ns = (0, eval)(link(join(OPAL_ROOT, "lib", "opal", "compiler", "index.mjs")));
    assert.equal(ns.VERSION, VERSION);
    assert.ok(ns.compile("puts 1").includes("$puts(1)"));
  });

  test("rejects import cycles and package imports", () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-esm-test-"));
    try {
      writeFileSync(join(dir, "a.mjs"), 'import { b } from "./b.mjs";\nexport const a = 1;\n');
      writeFileSync(join(dir, "b.mjs"), 'import { a } from "./a.mjs";\nexport const b = 2;\n');
      assert.throws(() => link(join(dir, "a.mjs")), (e) => e instanceof LinkError && /import cycle: a\.mjs -> b\.mjs -> a\.mjs/.test(e.message));
      writeFileSync(join(dir, "c.mjs"), 'import x from "some-package";\nexport default x;\n');
      assert.throws(() => link(join(dir, "c.mjs")), /can't link the package import "some-package"/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("supports namespace, default, star and node: imports", () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-esm-test-"));
    try {
      writeFileSync(join(dir, "dep.mjs"), "export const x = 1;\nexport default function f() { return 2; }\n");
      writeFileSync(join(dir, "star.mjs"), 'export * from "./dep.mjs";\nexport const y = 3;\n');
      writeFileSync(join(dir, "main.mjs"), [
        'import * as ns from "./star.mjs";',
        'import f, { x } from "./dep.mjs";',
        'import { join } from "node:path";',
        "export const out = [ns.x, ns.y, f(), x, join(\"a\", \"b\"), typeof import.meta.url];",
      ].join("\n"));
      assert.deepEqual((0, eval)(link(join(dir, "main.mjs"))).out, [1, 3, 2, 1, "a/b", "string"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("PathReader", () => {
  const reader = () => new PathReader(defaultPaths());

  test("includes Opal's paths", () => {
    const paths = reader().paths;
    for (const path of defaultPaths()) assert.ok(paths.includes(path));
  });

  test("reads files from the load paths, nil if missing", () => {
    const r = new PathReader([FIXTURES]);
    assert.equal(r.read("opal_file"), readFileSync(join(FIXTURES, "opal_file.rb"), "utf8"));
    assert.equal(r.read("unexpected-path!"), null);
  });

  test("works with absolute and relative paths", () => {
    const r = reader();
    assert.notEqual(r.read(join(SPEC_LIB, "spec_helper.rb")), null);
    const cwd = process.cwd();
    try {
      process.chdir(OPAL_ROOT);
      assert.notEqual(r.read("./spec/lib/spec_helper.rb"), null);
      assert.notEqual(r.read(`../${OPAL_ROOT.split("/").pop()}/spec/lib/spec_helper.rb`), null);
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("projects", () => {
  const projectBuilder = () => {
    const builder = newBuilder({ warn: () => {} });
    builder.appendPaths(join(FIXTURES, "project"));
    return builder;
  };

  test("adds a load path from an Opalfile when a file of the project is built", () => {
    const b = projectBuilder();
    b.build("p1/test");
    b.build("require_from_p3");
    assert.ok(b.toString().includes("require_from_p3_working"));
  });

  test("adds a load path from an Opalfile when a path is appended", () => {
    const b = projectBuilder();
    b.appendPaths(join(FIXTURES, "project", "p1"));
    b.build("require_from_p3");
    assert.ok(b.toString().includes("require_from_p3_working"));
  });

  test("adds an absolute load path (__dir__ + ...) from an Opalfile", () => {
    const b = projectBuilder();
    b.appendPaths(join(FIXTURES, "project", "p5"));
    b.build("require_from_p3");
    assert.ok(b.toString().includes("require_from_p3_working"));
  });

  test("warns about gem dependencies (no gems in Node.js)", () => {
    const warnings = [];
    const b = newBuilder({ warn: (m) => warnings.push(m) });
    b.appendPaths(join(FIXTURES, "project", "p2"));
    assert.ok(warnings.some((w) => w.includes("add_gem_dependency rake")));
  });

  test("raises when an Opalfile contains an unknown directive", () => {
    assert.throws(() => projectBuilder().appendPaths(join(FIXTURES, "project", "p4")), UnknownOpalfileDirective);
  });

  test("doesn't break when adding a non-existent load path", () => {
    projectBuilder().appendPaths(join(FIXTURES, "project", "non_existent"));
  });

  test("evaluates RUBY_ENGINE conditions as Opal", () => {
    const paths = [];
    evaluateOpalfile("if RUBY_ENGINE == 'opal'\n  add_load_path 'a'\nelse\n  add_load_path 'b'\nend\nunless RUBY_ENGINE == 'opal'\n  add_gem_dependency 'x'\nend\n",
      "/root", { appendPaths: (...p) => paths.push(...p) }, () => assert.fail("no warning expected"));
    assert.deepEqual(paths, ["/root/a"]);
  });
});

describe("post-processors", () => {
  const SOURCE = "module Sample\n  VALUE = 1\n\n  def self.alpha\n    VALUE\n  end\n\n  def self.beta\n    VALUE + 1\n  end\nend\n";

  test("get the processed files and the builder", () => {
    const calls = [];
    const builder = newBuilder({ compilerOptions: { cache_fragments: true }, postProcessors: [(processed, b) => { calls.push([processed, b]); return processed; }] });
    builder.buildStr(SOURCE, "(sample)").toString();
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1], builder);
    assert.ok(calls[0][0].every((p) => p instanceof RubyProcessor || p instanceof JsProcessor));
  });

  test("can replace everything, in the result and the source map", () => {
    const builder = newBuilder({ postProcessors: [() => [new JsProcessor("Replaced!", "replaced.js")]] });
    builder.buildStr(SOURCE, "(sample)");
    assert.ok(builder.toString().startsWith("Replaced!"));
    assert.ok(JSON.stringify(builder.sourceMap.map()).includes("Replaced!"));
  });

  test("can replace fragments", () => {
    const builder = newBuilder({
      compilerOptions: { cache_fragments: true },
      postProcessors: [(processed) => {
        for (const file of processed) {
          if (!file.compiler) continue;
          file.replaceFragments(file.compiler.fragments.filter((f) => f instanceof Fragment).map((f) => new Fragment("Badger", f.scope, f.node)));
        }
        return processed;
      }],
    });
    builder.buildStr(SOURCE, "(sample)");
    assert.ok(builder.toString().split("Badger").length - 1 > 5);
  });
});

describe("DCE", () => {
  const build = (code, dce) => newBuilder({ dce }).buildStr(code, "input.rb").toString();

  test("strips methods that are never referenced", () => {
    const output = build("class Foo\n  def used; 1; end\n  def unused; 2; end\nend\n\nFoo.new.used\n", ["method"]);
    assert.ok(output.includes("$def(self, '$used'"));
    assert.ok(!output.includes("$def(self, '$unused'"));
    assert.ok(output.includes("Removed by DCE: unused"));
  });

  test("strips unused constant definitions with const DCE", () => {
    const output = build("module M\n  VALUE = 123\nend\n", ["const"]);
    assert.ok(output.includes("Removed by DCE: M"));
    assert.ok(!output.includes("VALUE"));
  });

  test("keeps constants without const DCE", () => {
    const output = build("module M\n  VALUE = 123\nend\n", ["method"]);
    assert.ok(output.includes("VALUE"));
    assert.ok(!output.includes("Removed by DCE"));
  });

  test("removes unused attr_* readers and writers", () => {
    const output = build("class Foo\n  attr_accessor :bar\nend\n", ["method"]);
    assert.ok(output.includes("Removed by DCE: [:bar, :bar=]"));
    assert.ok(!output.includes("$def(self, '$bar'"));
  });

  test("keeps aliased methods when the alias is used", () => {
    const output = build("class Foo\n  def bar; 1; end\n  alias_method :baz, :bar\n  baz\nend\n", ["method"]);
    assert.ok(output.includes("$def(self, '$bar'"));
    assert.ok(output.includes("alias_method"));
    assert.ok(!output.includes("Removed by DCE: bar"));
  });
});

describe("source maps", () => {
  test("data URI comments work without Buffer (browsers)", async () => {
    const { base64Utf8 } = await import("../../../lib/opal/compiler/source_map/vlq.mjs");
    const text = "puts 'こんにちは' # ✓".repeat(5000);
    const expected = Buffer.from(text, "utf8").toString("base64");
    const saved = globalThis.Buffer;
    try {
      delete globalThis.Buffer;
      assert.equal(base64Utf8(text), expected);
    } finally {
      globalThis.Buffer = saved;
    }
  });
});

// The JS CLI (lib/opal/compiler/cli). Ported from spec/lib/cli_spec.rb,
// cli_runners_spec.rb, cli_runners/server_spec.rb, simple_server_spec.rb
// and repl_spec.rb.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { CLI } from "../../../lib/opal/compiler/cli/cli.mjs";
import { parseOptions, InvalidOption, helpText } from "../../../lib/opal/compiler/cli/options.mjs";
import { RUNNERS } from "../../../lib/opal/compiler/cli/runners/index.mjs";
import { SimpleServer } from "../../../lib/opal/compiler/cli/runners/server.mjs";
import { shellwords } from "../../../lib/opal/compiler/cli/runners/system.mjs";
import { isIncomplete } from "../../../lib/opal/compiler/cli/repl.mjs";
import { Builder } from "../../../lib/opal/compiler/builder/builder.mjs";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";
import { VERSION } from "../../../lib/opal/compiler/version.mjs";

const FIXTURES = resolve(OPAL_ROOT, "spec", "lib", "fixtures");
const FILE = join(FIXTURES, "opal_file.rb");
const EXE = join(OPAL_ROOT, "exe", "opal");
const VERSION_MAJOR_MINOR = VERSION.split(".").slice(0, 2).join(".");

// A writable stream collecting its output.
function sink() {
  const chunks = [];
  return { write: (s) => { chunks.push(String(s)); return true; }, get text() { return chunks.join(""); } };
}

async function outputOf(options) {
  const stdout = sink();
  const stderr = sink();
  const cli = new CLI({ no_cache: true, ...options, stdout, stderr });
  const status = await cli.run();
  return { output: stdout.text, errors: stderr.text, status, cli };
}

const compile = (options) => outputOf({ runner: "compiler", skip_opal_require: true, no_exit: true, ...options });

describe("CLI", () => {
  test("runs a file", async () => {
    const run = spawnSync(process.execPath, [EXE, "--no-source-map", FILE], { encoding: "utf8" });
    assert.equal(run.stdout, "hi from opal!\n");
    assert.equal(run.status, 0);
  });

  test("raises with lib_only and a file or evals", () => {
    assert.throws(() => new CLI({ argv: [FILE], lib_only: true }), /library only/);
    assert.throws(() => new CLI({ evals: ['puts "hello"'], lib_only: true }), /library only/);
  });

  test("uses stdin without evals and paths", () => {
    const cli = new CLI({ stdin: "puts 1" });
    assert.equal(cli.filename, "-");
    assert.deepEqual(cli.argv, []);
    assert.equal(cli.source, "puts 1");
  });

  test("compiles only the libraries with lib_only", async () => {
    const { output } = await outputOf({ lib_only: true, runner: "compiler", no_exit: true });
    assert.ok(output.length > 1000);
    assert.throws(() => new CLI({ lib_only: true, runner: "compiler", skip_opal_require: true, no_exit: true }), /no libraries to compile/);
  });

  test("compiles one or many evals, in order", async () => {
    assert.ok((await compile({ evals: ['puts "hello"'] })).output.includes('.$puts("hello")'));
    const { output } = await compile({ evals: ['puts "hello"', 'puts "ciao"'] });
    assert.ok(output.indexOf('.$puts("hello")') < output.indexOf('.$puts("ciao")'));
  });

  test("considers a file path arg part of ARGV with evals", () => {
    const cli = new CLI({ evals: ['puts "hello"'], argv: [FILE] });
    assert.deepEqual(cli.argv, [FILE]);
    assert.equal(cli.source, 'puts "hello"');
    assert.equal(cli.filename, "-e");
  });

  test("appends a Kernel#exit unless no_exit", async () => {
    assert.ok((await compile({ evals: [""], no_exit: false })).output.includes(".$exit()"));
    assert.ok(!(await compile({ evals: [""], no_exit: true })).output.includes(".$exit();"));
  });

  test("requires files by absolute path or relative to a load path", async () => {
    assert.ok((await compile({ requires: [FILE], evals: [""] })).output.includes('.$puts("hi from opal!")'));
    assert.ok((await compile({ load_paths: [FIXTURES], requires: ["opal_file.rb"], evals: [""] })).output.includes('.$puts("hi from opal!")'));
  });

  test("stubs files as empty modules", async () => {
    const { output } = await compile({ stubs: ["an_unparsable_lib"], evals: ['require "an_unparsable_lib"'] });
    assert.ok(output.includes('Opal.modules["an_unparsable_lib"] = Opal.return_val(Opal.nil)'));
    assert.ok(output.includes('.$require("an_unparsable_lib")'));
  });

  test("ignores gems with a warning", async () => {
    const { errors } = await compile({ gems: ["ast"], evals: [""] });
    assert.ok(errors.includes("--gem ast"));
  });

  test("outputs the compiled javascript with the compiler runner, and a map file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-map-"));
    try {
      const mapFile = join(dir, "file.map");
      const { output } = await outputOf({ runner: "compiler", evals: ["puts 2342"], skip_opal_require: true, runner_options: { map_file: mapFile } });
      assert.ok(output.includes(".$puts(2342)"));
      assert.ok(!output.includes("2342\n"));
      assert.ok(readFileSync(mapFile, "utf8").includes('"version":3'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("writes the output to a file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-out-"));
    try {
      const out = join(dir, "out.js");
      await compile({ evals: ["puts 1"], output: out });
      assert.ok(readFileSync(out, "utf8").includes(".$puts(1)"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("builds a directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-dir-"));
    try {
      await outputOf({ runner: "compiler", evals: ["puts 1"], directory: true, output: dir, skip_opal_require: true });
      assert.ok(existsSync(join(dir, "index.js")));
      assert.ok(existsSync(join(dir, "opal", VERSION_MAJOR_MINOR, "-e.js")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("prints the syntax tree with sexp", async () => {
    const { output } = await outputOf({ evals: ["puts 4"], sexp: true });
    assert.ok(output.startsWith("(program"));
    assert.ok(output.includes("(call"));
    assert.ok(output.includes('name: "puts"'));
    assert.ok(output.includes("value: 4"));
  });

  test("sets $$comments with parse_comments", async () => {
    const { output } = await compile({ parse_comments: true, evals: ["        # multiline\n        # comment\n        def m\n        end\n"] });
    assert.ok(output.includes('$$comments: ["# multiline", "# comment"]'));
  });

  test("sets $$source_location with enable_source_location", async () => {
    const { output } = await compile({ enable_source_location: true, argv: [join(FIXTURES, "source_location_test.rb")] });
    assert.ok(output.includes("source_location_test.rb', 6]"));
  });

  test("generates a source map visualization link with debug_source_map", async () => {
    const { output } = await outputOf({ debug_source_map: true, evals: ["puts 123"] });
    assert.ok(output.startsWith("https://sokra.github.io/source-map-visualization/#base64,"));
  });

  test("applies DCE and enables fragment caching", async () => {
    const cli = new CLI({ dce: ["const"], runner: "compiler", evals: ["puts :hi"], no_exit: true, skip_opal_require: true });
    const builder = cli.createBuilder();
    assert.deepEqual(builder.dce, ["const"]);
    assert.equal(builder.compilerOptions.cache_fragments, true);
    assert.ok((await compile({ dce: ["const"], evals: ["module M; X = 1; end"] })).output.includes("Removed by DCE: M"));
  });

  test("runs a plugin before compiling", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-plugin-"));
    try {
      const plugin = join(dir, "plugin.mjs");
      (await import("node:fs")).writeFileSync(plugin, "export default (cli) => { cli.compilerOptions.arity_check = true; };\n");
      assert.ok((await compile({ plugins: [plugin], evals: ["def foo; end"] })).output.includes("$$parameters: []"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects unknown options", () => {
    assert.throws(() => new CLI({ evals: [""], bogus: 1 }), /unknown options: bogus/);
  });
});

describe("exe/opal", () => {
  const run = (args, input) => spawnSync(process.execPath, [EXE, ...args], { encoding: "utf8", input, env: { ...process.env, OPAL_CACHE_DISABLE: "1" } });

  test("runs the provided source through pipes", () => {
    assert.equal(run(["--no-source-map", "-ropal/platform", "-e", "puts gets.reverse"], "foo\n").stdout.trim(), "oof");
  });

  test("compiles the provided source from stdin", () => {
    assert.ok(run(["--no-source-map", "-c", "-E", "-O"], "puts 123\n").stdout.includes("self.$puts(123)"));
  });

  test("passes the program arguments", () => {
    assert.equal(run(["--no-source-map", "-rnodejs", "-e", "p ARGV", "--", "a", "-b"]).stdout, '["a", "-b"]\n');
  });

  test("returns the program's exit status", () => {
    assert.equal(run(["-rnodejs", "-e", "exit 3"]).status, 3);
  });

  test("exits with 64 for invalid options", () => {
    const result = run(["--bogus"]);
    assert.equal(result.status, 64);
    assert.match(result.stderr, /invalid option: --bogus/);
  });

  test("prints the version", () => {
    assert.equal(run(["--version"]).stdout, `Opal v${VERSION}\n`);
  });
});

describe("options", () => {
  const parse = (args) => {
    const out = [];
    return { ...parseOptions(args, { out: (s) => out.push(s), err: () => {}, exit: (s) => { throw s; } }), out };
  };

  test("parses clustered short flags and attached arguments", () => {
    const { options, argv } = parse(["-cOE", "-Ilib", "-I", "spec", "-rjson", "file.rb", "arg"]);
    assert.equal(options.runner, "compiler");
    assert.equal(options.skip_opal_require, true);
    assert.equal(options.no_exit, true);
    assert.deepEqual(options.load_paths, ["lib", "spec"]);
    assert.deepEqual(options.requires, ["json"]);
    assert.deepEqual(argv, ["file.rb", "arg"]);
  });

  test("parses long options with = or a separate argument, and abbreviations", () => {
    const { options } = parse(["--output=x.js", "--runner", "node", "--no-source", "--missing-require", "warning"]);
    assert.equal(options.output, "x.js");
    assert.equal(options.runner, "node");
    assert.equal(options.runner_options.no_source_map, true);
    assert.equal(options.missing_require_severity, "warning");
  });

  test("parses --dce with the default and a list", () => {
    assert.deepEqual(parse(["--dce"]).options.dce, ["method"]);
    assert.deepEqual(parse(["--dce", "method,const"]).options.dce, ["method", "const"]);
    assert.deepEqual(parse(["--dce=const"]).options.dce, ["const"]);
  });

  test("stops at --", () => {
    assert.deepEqual(parse(["-e", "1", "--", "-c"]).argv, ["-c"]);
  });

  test("rejects invalid options and values", () => {
    assert.throws(() => parse(["-x"]), InvalidOption);
    assert.throws(() => parse(["--runner", "nope"]), InvalidOption);
    assert.throws(() => parse(["-e"]), InvalidOption);
  });

  test("-v prints the version and turns on verbose mode", () => {
    const { options, out } = parse(["-v"]);
    assert.equal(options.verbose, true);
    assert.deepEqual(out, [`Opal v${VERSION}\n`]);
    assert.equal(parse(["--verbose"]).out.length, 0);
  });

  test("the help lists the options", () => {
    const help = helpText();
    assert.ok(help.startsWith("Usage: opal [options] -- [programfile]"));
    for (const flag of ["--eval SOURCE", "--runner RUNNER", "--dce [OPTIONS]", "--plugin MODULE", "--sexp"]) assert.ok(help.includes(flag), flag);
  });
});

describe("runners", () => {
  test("node is an alias of nodejs", () => {
    assert.equal(RUNNERS.node, RUNNERS.nodejs);
  });

  test("shellwords splits like a shell", () => {
    assert.deepEqual(shellwords(`--a "b c" 'd e' f\\ g`), ["--a", "b c", "d e", "f g"]);
    assert.deepEqual(shellwords(undefined), []);
  });
});

describe("SimpleServer", () => {
  for (const [directory, esm] of [[false, false], [true, true]]) {
    describe(directory ? "in directory, ESM mode" : "in non-directory, non-ESM mode", () => {
      const ext = esm ? "mjs" : "js";
      const sub = (name) => (directory ? `/opal/${VERSION_MAJOR_MINOR}/${name}.mjs` : "");
      const builderFor = (setup) => () => {
        const builder = new Builder({ compilerOptions: { directory, esm } });
        setup(builder);
        return builder;
      };
      const server = (opts = {}) => new SimpleServer({ main: "console", builder: builderFor((b) => b.build("console")), ...opts });

      test("serves opal assets", () => {
        const [status, , body] = server().call(`/assets/console.${ext}${sub("console")}`);
        assert.equal(status, 200);
        assert.ok(body.includes('self["native"].trace()'));
      });

      test("serves the index for all non opal paths", () => {
        for (const path of ["/", "/foo", "/foo/bar/baz"]) {
          const [, headers, body] = server().call(path);
          assert.ok(body.includes("<html>"));
          assert.ok(body.includes(`src="/assets/console.${ext}${directory ? "/index.mjs" : ""}"`));
          assert.equal(body.includes('type="module"'), esm);
          assert.equal(headers["content-type"], "text/html");
        }
      });

      test("serves the source map", () => {
        const app = server();
        const [, , body] = app.call(`/assets/console.${ext}${sub("console")}`);
        if (directory) {
          assert.ok(body.includes("\n//# sourceMappingURL=./console.map"));
          const [, , map] = app.call(`/assets/console.mjs/opal/${VERSION_MAJOR_MINOR}/console.map`);
          assert.ok(map.includes("../../opal/src"));
          assert.ok(map.includes("console.rb"));
        } else {
          assert.ok(body.includes("\n//# sourceMappingURL=data:application/json;base64,"));
        }
      });

      test("takes a prefix option", () => {
        for (const prefix of ["foo", "/foo"]) {
          const [, , body] = server({ prefix }).call(`/foo/console.${ext}${sub("console")}`);
          assert.ok(body.includes('self["native"].trace()'));
        }
      });

      test("supports a custom builder (instance or function)", () => {
        const setup = (b) => { b.build("console"); b.buildStr("1312312313", "(test)"); };
        const instance = new Builder({ compilerOptions: { directory, esm } });
        setup(instance);
        for (const builder of [instance, builderFor(setup)]) {
          const app = new SimpleServer({ main: "console", builder });
          assert.ok(app.call(`/assets/console.${ext}${sub("console")}`)[2].includes('self["native"].trace()'));
          assert.ok(app.call(`/assets/console.${ext}${sub("(test)")}`)[2].includes("1312312313"));
        }
      });
    });
  }

  test("builds the requested path by default", () => {
    const app = new SimpleServer({ main: "opal_file" });
    app.appendPath(FIXTURES);
    assert.ok(app.call("/assets/opal_file.js")[2].includes('.$puts("hi from opal!")'));
  });
});

describe("REPL", () => {
  test("recognizes incomplete input", () => {
    for (const code of ["def foo", '"abc', "[1,", "foo(", "class A", "1 +", "{a: ", "foo do |x|", "if x", "%w(a", "<<~E\nabc"]) {
      assert.ok(isIncomplete(code), code);
    }
    for (const code of ["1)", "end", "puts 1", "def foo; end"]) assert.ok(!isIncomplete(code), code);
  });

  test("evaluates user inputs", () => {
    const input = ["puts 5", "a = 1", "a += 1", "a + 3", '"#{a} + 3"', "def m", "  :x", "end"].join("\n") + "\n";
    const result = spawnSync(process.execPath, [join(OPAL_ROOT, "exe", "opal-repl")], { input, encoding: "utf8", env: { ...process.env, HOME: tmpdir() } });
    const output = result.stdout.replace(new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g"), "");
    for (const expected of ["5\n=> nil", "=> 1", "=> 2", "=> 5", '=> "2 + 3"', '=> "m"']) assert.ok(output.includes(expected), expected);
    assert.equal(result.status, 0);
  });
});

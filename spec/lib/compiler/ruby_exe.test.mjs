// The `ruby` command (exe/ruby.rb, built by tasks/ruby.mjs): build the
// bundle once, then run scripts through it the way CRuby's ruby would.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const RUBY = join(OPAL_ROOT, "exe", "ruby");
const DIR = mkdtempSync(join(tmpdir(), "opal-ruby-exe-"));
// keep the runs out of the developer's own ~/.cache/opal-ruby
const CACHE = join(DIR, "cache");

// Writes SCRIPT in the temporary directory, returns its path.
function script(name, source) {
  writeFileSync(join(DIR, name), source);
  return join(DIR, name);
}

function ruby(...args) {
  return rubyEnv({}, ...args);
}

function rubyEnv(env, ...args) {
  const run = spawnSync(process.execPath, [RUBY, ...args], {
    encoding: "utf8", cwd: DIR, env: { ...process.env, OPAL_CACHE_DIR: CACHE, ...env },
  });
  return { out: run.stdout, err: run.stderr, status: run.status };
}

function cacheEntries() {
  const dir = join(CACHE, "opal-ruby");
  return existsSync(dir) ? readdirSync(dir) : [];
}

describe("the ruby command", () => {
  before(() => {
    const build = spawnSync(process.execPath, [join(OPAL_ROOT, "tasks", "ruby.mjs")], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stderr);
  });
  after(() => rmSync(DIR, { recursive: true, force: true }));

  test("-e runs a one-line script", () => {
    const r = ruby("-e", "puts 1 + 1");
    assert.equal(r.out, "2\n");
    assert.equal(r.status, 0);
  });

  test("several -e are joined, and the remaining arguments are the script's ARGV", () => {
    const r = ruby("-e", "x = 40", "-e", "puts x + ARGV[0].to_i", "2");
    assert.equal(r.out, "42\n");
  });

  test("runs a script file, with ARGV and __FILE__ set", () => {
    const file = script("argv_file.rb", 'puts "#{File.basename(__FILE__)} #{ARGV.inspect}"');
    const r = ruby(file, "a", "b");
    assert.equal(r.out, "argv_file.rb [\"a\", \"b\"]\n");
  });

  test("--version prints the engine version", () => {
    const r = ruby("--version");
    assert.match(r.out, /^opal \d+\.\d+\.\d+.*\[/);
    assert.equal(r.status, 0);
  });

  test("-c reports valid syntax", () => {
    const file = script("good.rb", "def foo\n  1\nend\n");
    const r = ruby("-c", file);
    assert.equal(r.out, "Syntax OK\n");
    assert.equal(r.status, 0);
  });

  test("-c reports broken syntax and fails", () => {
    const file = script("bad.rb", "def foo\n");
    const r = ruby("-c", file);
    assert.equal(r.status, 1);
    assert.match(r.err, /bad\.rb: /);
  });

  test("-r requires a library before the script", () => {
    const r = ruby("-r", "json", "-e", 'puts JSON.generate({ "a" => 1 })');
    assert.equal(r.out, '{"a":1}\n');
  });

  test("a script can require stdlib libraries at runtime", () => {
    const file = script("use_json.rb", "require 'json'\nputs JSON.dump([1, 2, 3])\n");
    const r = ruby(file);
    assert.equal(r.out, "[1,2,3]\n");
  });

  test("-I adds a directory to the load path", () => {
    writeFileSync(join(DIR, "helper.rb"), "THE_ANSWER = 42\n");
    const file = script("use_helper.rb", "require 'helper'\nputs THE_ANSWER\n");
    const r = ruby("-I", DIR, file);
    assert.equal(r.out, "42\n");
  });

  test("require_relative resolves against the script", () => {
    writeFileSync(join(DIR, "helper2.rb"), "HELPER2 = 'ok'\n");
    const file = script("use_relative.rb", "require_relative 'helper2'\nputs HELPER2\n");
    const r = ruby(file);
    assert.equal(r.out, "ok\n");
  });

  test("the script's exit status propagates", () => {
    assert.equal(ruby("-e", "exit 3").status, 3);
    assert.equal(ruby("-e", 'raise "boom"').status, 1);
  });

  test("a missing script file fails like CRuby", () => {
    const r = ruby("no_such_file.rb");
    assert.equal(r.status, 1);
    assert.match(r.err, /ruby: .*No such file/);
  });

  test("-p and -n loop over ARGF", () => {
    const data = script("data.txt", "aa\nbb\n");
    const p = ruby("-p", "-e", '$_ = $_.gsub("a", "x")', data);
    assert.equal(p.out, "xx\nbb\n");
    const n = ruby("-n", "-e", "puts $_.chomp.upcase", data);
    assert.equal(n.out, "AA\nBB\n");
  });

  test("reads the script from stdin when given -", () => {
    const run = spawnSync(process.execPath, [RUBY, "-"], { encoding: "utf8", input: "puts :stdin\n", env: { ...process.env, OPAL_CACHE_DIR: CACHE } });
    assert.equal(run.stdout, "stdin\n");
    assert.equal(run.status, 0);
  });

  test("unknown options fail like CRuby", () => {
    const r = ruby("--bogus");
    assert.equal(r.status, 1);
    assert.match(r.err, /ruby: invalid option --bogus/);
  });

  test("-w, -W0 and -v set the warning level", () => {
    assert.equal(ruby("-w", "-e", "puts $VERBOSE.inspect").out, "true\n");
    assert.equal(ruby("-W0", "-e", "puts $VERBOSE.inspect").out, "nil\n");
    assert.equal(ruby("-e", "puts $VERBOSE.inspect").out, "false\n");
    assert.match(ruby("-v", "-e", "nil").out, /^opal \d/);
  });

  describe("the compile cache", () => {
    test("caches the compiled script and its requires", () => {
      writeFileSync(join(DIR, "cached_lib.rb"), "CACHED = 'first'\n");
      const file = script("use_cached.rb", "require 'cached_lib'\nputs CACHED\n");
      assert.equal(ruby(file).out, "first\n");
      const entries = cacheEntries();
      assert.ok(entries.length >= 2, "the script and the required library are cached");
      // the second run reuses the entries: same output, nothing rewritten
      assert.equal(ruby(file).out, "first\n");
      assert.deepEqual(cacheEntries().sort(), entries.sort());
    });

    test("entries are keyed by content: an edited file recompiles", () => {
      writeFileSync(join(DIR, "cached_lib.rb"), "CACHED = 'second'\n");
      const file = script("use_cached.rb", "require 'cached_lib'\nputs CACHED\n");
      assert.equal(ruby(file).out, "second\n");
    });

    test("OPAL_CACHE_DISABLE skips reading and writing entries", () => {
      const file = script("nocache.rb", "require 'cached_lib'\nputs CACHED\n");
      const before = cacheEntries().length;
      const r = rubyEnv({ OPAL_CACHE_DISABLE: "1" }, file);
      assert.equal(r.out, "second\n");
      assert.equal(cacheEntries().length, before);
    });
  });
});

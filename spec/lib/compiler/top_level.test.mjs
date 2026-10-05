// A top-level return, BEGIN { } and END { }, run with exe/opal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

// Writes the files to a temporary directory and runs the first one.
function run(files, args = []) {
  const dir = mkdtempSync(join(tmpdir(), "opal-top-level-"));
  try {
    for (const [name, source] of Object.entries(files)) writeFileSync(join(dir, name), source);
    const result = spawnSync(process.execPath, [join(OPAL_ROOT, "exe", "opal"), "--no-source-map", "-I", dir, ...args, join(dir, Object.keys(files)[0])], { encoding: "utf8", env: { ...process.env, OPAL_CACHE_DISABLE: "1" } });
    assert.equal(result.stderr.replace(/^warning: .*\n/gm, ""), "");
    return result.stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a top-level return ends the file", () => {
  assert.equal(run({
    "main.rb": 'require "lib"\nputs "main"\nx = 0\nwhile true\n  x += 1\n  begin\n    return if x == 3\n  ensure\n    puts "ensure #{x}"\n  end\nend\nputs "unreachable"\n',
    "lib.rb": 'puts "lib"\nreturn if true\nputs "lib after return"\n',
  }), "lib\nmain\nensure 1\nensure 2\nensure 3\n");
});

test("a top-level return inside an expression ends the file", () => {
  assert.equal(run({ "main.rb": 'puts "a"\ny = begin\n  return if true\n  1\nrescue\n  2\nend\nputs "b"\n' }), "a\n");
});

test("BEGIN runs first, in FIFO order, in the top-level scope", () => {
  assert.equal(run({ "main.rb": 'puts "main #{defined?(a).inspect}"\nBEGIN { a = 1; puts "begin1" }\nBEGIN { puts "begin2" }\np a\n' }), "begin1\nbegin2\nmain nil\n1\n");
});

test("END registers its block once, run at exit like at_exit", () => {
  assert.equal(run({
    "main.rb": 'x = 1\n3.times { |i| END { puts "end #{i} #{x}" } }\nEND { puts "end2" }\nat_exit { puts "at_exit" }\ndef m; END { puts "in m" }; end\nm; m\nx = 2\nputs "main"\n',
  }, ["-rnodejs"]), "main\nin m\nat_exit\nend2\nend 0 2\n");
});

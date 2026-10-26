// The `drill` runner command (lib/opal/drill, exe/drill built by
// tasks/drill.mjs): the run-mode cases the opal CLI used to own, drill's
// cross-exe option rejections, and its registry.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { helpText } from "../../../lib/opal/compiler/cli/options.mjs";
import { DRILL_OPTIONS } from "../../../lib/opal/drill/options.mjs";
import { DRILL_RUNNERS } from "../../../lib/opal/drill/index.mjs";
import { shellwords } from "../../../lib/opal/drill/runners/system.mjs";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";
import { VERSION } from "../../../lib/opal/compiler/version.mjs";

const FIXTURES = join(OPAL_ROOT, "spec", "lib", "fixtures");
const FILE = join(FIXTURES, "opal_file.rb");

// exe/drill is a build output: rebuild it for this run (the gems/lsp specs
// do the same). Each spec file builds its own copy through a tmp/ OUT: node
// --test runs files in parallel processes, and two rebuilds truncating one
// tracked exe would be the phantom-failure trap. (OUT joins ROOT, so it is
// repo-relative - tmp/ is the gitignored scratch.)
const DRILL_OUT = `tmp/opal-drill-spec-${process.pid}`;
function buildDrill() {
  const build = spawnSync(process.execPath, [join(OPAL_ROOT, "tasks", "drill.mjs")], { encoding: "utf8", env: { ...process.env, OUT: DRILL_OUT } });
  assert.equal(build.status, 0, build.stderr);
  return join(OPAL_ROOT, DRILL_OUT);
}

describe("exe/drill", () => {
  const EXE = buildDrill();

  const run = (args, input) => spawnSync(process.execPath, [EXE, ...args], { encoding: "utf8", input, env: { ...process.env } });

  test("runs a file", () => {
    const spawned = run(["--no-source-map", FILE]);
    assert.equal(spawned.stdout, "hi from opal!\n");
    assert.equal(spawned.status, 0);
  });

  test("the node runner runs the program with the NODE_EXE executable", () => {
    const dir = mkdtempSync(join(tmpdir(), "drill-node-exe-"));
    try {
      const wrapper = join(dir, "marked-node");
      writeFileSync(wrapper, `#!/bin/sh\necho a marked node\nexec ${process.execPath} "$@"\n`);
      chmodSync(wrapper, 0o755);
      const marked = spawnSync(process.execPath, [EXE, "--no-source-map", "-Rnode", FILE], { encoding: "utf8", env: { ...process.env, NODE_EXE: wrapper } });
      assert.equal(marked.stdout, "a marked node\nhi from opal!\n", marked.stderr);
      assert.equal(marked.status, 0);
      // (a missing one is reported instead of running the program with node)
      const missing = spawnSync(process.execPath, [EXE, "--no-source-map", "-Rnode", FILE], { encoding: "utf8", env: { ...process.env, NODE_EXE: join(dir, "no-such-node") } });
      assert.match(missing.stderr, /no-such-node \(from NODE_EXE\) not found/);
      assert.notEqual(missing.status, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runs the provided source through pipes", () => {
    assert.equal(run(["--no-source-map", "-ropal/platform", "-e", "puts gets.reverse"], "foo\n").stdout.trim(), "oof");
  });

  test("passes the program arguments", () => {
    assert.equal(run(["--no-source-map", "-e", "p ARGV", "--", "a", "-b"]).stdout, '["a", "-b"]\n');
  });

  test("returns the program's exit status", () => {
    assert.equal(run(["-e", "exit 3"]).status, 3);
  });

  test("prints the version", () => {
    assert.equal(run(["--version"]).stdout, `Opal v${VERSION}\n`);
  });

  test("the help is drill's own, run options and all", () => {
    const spawned = run(["-h"]);
    assert.equal(spawned.status, 0);
    assert.ok(spawned.stdout.startsWith("Usage: drill "), spawned.stdout);
    assert.ok(spawned.stdout.includes("--runner RUNNER"));
    assert.ok(spawned.stdout.includes("--eval SOURCE"));
  });

  test("compile options are answered with the pointer to exe/opal", () => {
    for (const args of [["-c", FILE], ["-o", "out.js", FILE], ["--sexp", "-e", "x"]]) {
      const spawned = run(args);
      assert.equal(spawned.status, 64, args.join(" "));
      assert.match(spawned.stderr, /drill: .*(use exe\/opal to compile|exe\/opal)/, args.join(" "));
    }
  });

  test("a file compiles to nothing on its own: drill runs it", () => {
    // (the exe/opal case that got its compile pointer: drill answers the
    // same invocation by running the file)
    assert.equal(run(["--no-source-map", FILE]).stdout, "hi from opal!\n");
  });
});

describe("drill runners", () => {
  test("node is an alias of nodejs", () => {
    assert.equal(DRILL_RUNNERS.node, DRILL_RUNNERS.nodejs);
  });

  test("the compile runner is not a drill runner", () => {
    // (opal's; -Rcompiler and -c can't reach it through drill)
    assert.equal(DRILL_RUNNERS.compiler, undefined);
  });

  test("shellwords splits like a shell", () => {
    assert.deepEqual(shellwords(`--a "b c" 'd e' f\\ g`), ["--a", "b c", "d e", "f g"]);
    assert.deepEqual(shellwords(undefined), []);
  });

  test("the help table is drill's", () => {
    const help = helpText(DRILL_OPTIONS);
    assert.ok(help.startsWith("Usage: drill "));
    for (const flag of ["--runner RUNNER", "--server-port PORT", "--eval SOURCE", "--gem GEM_NAME"]) assert.ok(help.includes(flag), flag);
    for (const gone of ["--compile", "--output FILE", "--minify", "--sexp", "--compile-to-exe"]) assert.ok(!help.includes(gone), gone);
  });
});

// The `irb` command (lib/opal/exe/irb.rb, built by tasks/irb.mjs): an IRB
// session from the vendored ruby/irb port, driven over a pipe the way
// CRuby's irb is driven on non-interactive input.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const IRB = join(OPAL_ROOT, "exe", "irb");
const DIR = mkdtempSync(join(tmpdir(), "opal-irb-cli-"));

// Runs INPUT through exe/irb. HOME points at the empty temporary directory,
// so no developer ~/.irbrc joins the session, and the GEM_* trio keeps
// resolution off the system gems and the network (the same isolation the
// gems suite uses; see spec/lib/gems/cli.test.mjs).
function irb(input, { args = [], env = {} } = {}) {
  const run = spawnSync(process.execPath, [IRB, ...args], {
    encoding: "utf8", cwd: DIR, input,
    env: {
      ...process.env, HOME: DIR,
      GEM_HOME: join(DIR, "gems"), GEM_PATH: join(DIR, "gems"), GEM_SOURCES: "",
      OPAL_CACHE_DIR: join(DIR, "cache"),
      ...env,
    },
  });
  return { out: run.stdout, err: run.stderr, all: run.stdout + run.stderr, status: run.status };
}

describe("the irb command", () => {
  before(() => {
    const build = spawnSync(process.execPath, [join(OPAL_ROOT, "tasks", "irb.mjs")], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stderr);
  });
  after(() => rmSync(DIR, { recursive: true, force: true }));

  test("evaluates input and echoes results, exiting 0 at EOF", () => {
    const r = irb("puts 1 + 1\n2 + 2\n");
    assert.match(r.out, /^2$/m);
    assert.match(r.out, /^4$/m);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.all, /Error/);
  });

  test("local variables persist across statements (the TOPLEVEL_BINDING eval bridge)", () => {
    const r = irb("x = 40\nx + 1\nx += 2\nx\n");
    assert.match(r.out, /^41$/m);
    assert.match(r.out, /^42$/m);
  });

  test("a method defined at the prompt is callable in a later statement", () => {
    const r = irb("def twice(n)\n  n * 2\nend\ntwice(21)\n");
    assert.match(r.out, /^42$/m);
  });

  test("exit ends the session with status 0 and skips the rest of the input", () => {
    const r = irb("puts 'one'\nexit\nputs 'never'\n");
    assert.match(r.out, /^one$/m);
    assert.doesNotMatch(r.all, /never/);
    assert.equal(r.status, 0);
  });

  test("exit! force-exits the same way", () => {
    const r = irb("puts 'one'\nexit!\nputs 'never'\n");
    assert.match(r.out, /^one$/m);
    assert.doesNotMatch(r.all, /never/);
  });

  test("requires answer from the bundle, and a missing library stays a LoadError the session survives", () => {
    const r = irb("require 'json'\nJSON.parse('{\"a\":1}')\nrequire 'no_such_lib_xyz'\nputs 'after'\n");
    assert.match(r.out, /"a"=>1/);
    assert.match(r.all, /cannot load such file -- no_such_lib_xyz/);
    assert.match(r.out, /^after$/m);
  });

  test("-r requires a library before the session starts", () => {
    const r = irb("JSON.parse('[1]')\n", { args: ["-r", "json"] });
    assert.match(r.out, /^\[1\]$/m);
  });

  test("-I puts a directory on the load path for runtime requires", () => {
    mkdirSync(join(DIR, "lib"), { recursive: true });
    writeFileSync(join(DIR, "lib", "irb_cli_helper.rb"), 'IRB_CLI_HELPER = "on the path"\n');
    const r = irb("require 'irb_cli_helper'\nIRB_CLI_HELPER\n", { args: ["-I", join(DIR, "lib")] });
    assert.match(r.out, /"on the path"/);
  });

  test("IRBRC loads an rc file before the session, and its conf changes apply", () => {
    const rc = join(DIR, "irbrc");
    writeFileSync(rc, '$stdout.puts "from the rc"\nIRB.conf[:PROMPT_MODE] = :SIMPLE\n');
    const r = irb("1 + 1\n", { env: { IRBRC: rc } });
    assert.match(r.out, /from the rc/);
    assert.match(r.out, />> /); // the SIMPLE prompt the rc asked for
    assert.match(r.out, /^=> 2$/m); // and its return format
  });

  test("--version prints the IRB version and exits 0", () => {
    const r = irb("", { args: ["--version"] });
    assert.match(r.out, /irb 1\.18/);
    assert.equal(r.status, 0);
  });

  test("a runtime error is reported and the session continues", () => {
    const r = irb("nil.no_such_method\nputs 'still here'\n");
    assert.match(r.all, /no_such_method/);
    assert.match(r.out, /^still here$/m);
  });
});

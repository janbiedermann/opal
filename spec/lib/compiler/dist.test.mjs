// The corelib build of tasks/dist.mjs runs in plain Node.js. Ported from
// spec/lib/rake_dist_spec.rb.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

describe("tasks/dist.mjs", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "opal-dist-spec-"));
    const built = spawnSync(process.execPath, [resolve(OPAL_ROOT, "tasks", "dist.mjs")], {
      cwd: OPAL_ROOT,
      env: { ...process.env, DIR: dir, FILES: "opal,opal/mini,opal/full,opal-replutils", FORMATS: "js" },
      encoding: "utf8",
    });
    assert.equal(built.status, 0, built.stderr);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  const runWithNode = (code, { requires = ["opal"], precode = "" } = {}) => {
    const script = `${requires.map((r) => `require(${JSON.stringify(join(dir, r))});`).join("")};${precode};console.log(${code});`;
    const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };

  test("provides a working Opal environment", () => {
    assert.equal(runWithNode("typeof Opal"), "object");
  });

  test("provides a working Opal mini environment", () => {
    assert.equal(runWithNode("typeof Opal", { requires: ["opal/mini"] }), "object");
  });

  test("provides a working Opal full environment", () => {
    assert.equal(runWithNode("typeof Opal.PatternMatching", { requires: ["opal", "opal/full"], precode: 'Opal.require("corelib/pattern_matching")' }), "function");
  });

  test("doesn't load requirable files by default, but allows requiring them", () => {
    assert.equal(runWithNode("typeof Opal.REPLUtils", { requires: ["opal", "opal-replutils"] }), "undefined");
    assert.equal(runWithNode("typeof Opal.REPLUtils", { requires: ["opal", "opal-replutils"], precode: 'Opal.require("opal-replutils")' }), "function");
  });
});

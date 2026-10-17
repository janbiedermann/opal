// The sandbox handling of the Chrome runner (lib/opal/compiler/cli/runners/
// browsers.mjs) - no browser needed.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chromeSandboxArgs } from "../../../lib/opal/compiler/cli/runners/browsers.mjs";

describe("chromeSandboxArgs", () => {
  test("leaves the args alone when not root", () => {
    const { args, warned } = chromeSandboxArgs(["--headless"], false);
    assert.deepEqual(args, ["--headless"]);
    assert.equal(warned, false);
  });

  test("adds --no-sandbox and warns when root without it", () => {
    const { args, warned } = chromeSandboxArgs(["--headless"], true);
    assert.deepEqual(args, ["--headless", "--no-sandbox"]);
    assert.equal(warned, true);
  });

  test("keeps a --no-sandbox given by CHROME_OPTS and does not warn", () => {
    const { args, warned } = chromeSandboxArgs(["--headless", "--no-sandbox"], true);
    assert.deepEqual(args, ["--headless", "--no-sandbox"]);
    assert.equal(warned, false);
  });

  test("does not mutate the given args", () => {
    const given = ["--headless"];
    chromeSandboxArgs(given, true);
    assert.deepEqual(given, ["--headless"]);
  });
});

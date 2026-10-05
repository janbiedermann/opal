#!/usr/bin/env node
// Lints Opal's JavaScript with ESLint, with Node.js only (the JS part of
// `bin/rake lint`; RuboCop still needs Ruby):
//   * potch (and that lib/opal/potch/potch.mjs matches its parts)
//   * the JS compiler, builder, CLI and the Node.js tasks
//   * corelib and stdlib as built by tasks/dist.mjs (in tmp/lint); errors
//     there are mapped back to the Ruby sources by
//     tasks/linting-parse-eslint-results.js
import { rmSync } from "node:fs";
import { glob } from "./testing/glob.mjs";
import { ROOT, run } from "./testing/common.mjs";

const ESLINT = `${ROOT}/node_modules/eslint/bin/eslint.js`;
const eslint = (...args) => run(process.execPath, [ESLINT, ...args]);

async function main() {
  process.chdir(ROOT);
  const steps = [
    ["potch:assemble --check", () => run(process.execPath, ["tasks/potch/assemble.mjs", "--check"])],
    ["potch", () => eslint("lib/opal/potch", "spec/lib/potch", "tasks/potch", "benchmark/potch", "exe/potch")],
    ["compiler", () => eslint("lib/opal/compiler", "spec/lib/compiler", "tasks/compiler", "tasks/dist.mjs", "tasks/test.mjs", "tasks/lint.mjs", "tasks/testing")],
    ["corelib and stdlib", async () => {
      rmSync("tmp/lint", { recursive: true, force: true });
      const built = await run(process.execPath, ["tasks/dist.mjs"], { env: { ...process.env, DIR: "tmp/lint", FORMATS: "js,map" } });
      if (built !== 0) return built;
      const status = await eslint(...glob("tmp/lint/*.js"), "--format", "json", "--output-file", "tmp/lint/result.json");
      if (status === 0) return 0;
      await run(process.execPath, ["tasks/linting-parse-eslint-results.js"]);
      return status;
    }],
  ];
  let failed = 0;
  for (const [name, step] of steps) {
    console.log(`\n=== ${name}`);
    if ((await step()) !== 0) {
      console.log(`FAIL ${name}`);
      failed++;
    }
  }
  return failed ? 1 : 0;
}

main().then((status) => { process.exitCode = status; });

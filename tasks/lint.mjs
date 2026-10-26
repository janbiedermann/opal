#!/usr/bin/env node
// Lints Opal's JavaScript with ESLint (Ruby code style: see HACKING.md):
//   * the parser (and that lib/opal/parser/parser.mjs matches its parts)
//   * the JS compiler, builder, CLI and the Node.js tasks
//   * corelib and stdlib built as bundles (in tmp/lint); errors
//     there are mapped back to the Ruby sources by
//     tasks/linting-parse-eslint-results.js
import { readdirSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Builder } from "../lib/opal/compiler/builder/builder.mjs";
import { glob } from "./testing/glob.mjs";
import { ROOT, run } from "./testing/common.mjs";

const ESLINT = `${ROOT}/node_modules/eslint/bin/eslint.js`;
const eslint = (...args) => run(process.execPath, [ESLINT, ...args]);

const rubyFiles = (dir) => readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".rb")).map((f) => basename(f, ".rb"));

// Build every corelib/stdlib library to tmp/lint as a development bundle
// with an embedded source map (the form tasks/dist.mjs used to emit):
// ESLint then reads these, and missing requires fail the build.
function buildLintBundles() {
  // The gem port (bundler.rb, rubygems.rb and their trees) stays out of
  // the JS lint like before the move to stdlib/: its compiled bundles trip
  // rules tuned for corelib's JS shape, and its style gate is rubocop.
  const files = [...rubyFiles("opal"), ...rubyFiles("stdlib"), ...rubyFiles("opal/opal").map((f) => `opal/${f}`)]
    .filter((lib) => lib !== "bundler" && lib !== "rubygems").sort();
  mkdirSync("tmp/lint", { recursive: true });
  for (const lib of files) {
    // Set requirable to true, unless building opal. This allows opal to be auto-loaded.
    const requirable = !["opal", "opal/mini", "opal/base"].includes(lib);
    const builder = new Builder({
      compilerOptions: { arity_check: false, dynamic_require_severity: "warning" },
      missingRequireSeverity: "error",
      esmPrune: true,
    });
    builder.build(lib, { requirable });
    const out = join("tmp/lint", `${lib}.js`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${builder.toString()};${builder.sourceMap.toDataUriComment()}`);
  }
}

async function main() {
  process.chdir(ROOT);
  const steps = [
    ["parser:assemble --check", () => run(process.execPath, ["tasks/parser/assemble.mjs", "--check"])],
    ["parser", () => eslint("lib/opal/parser", "spec/lib/parser", "tasks/parser", "benchmark/parser", "exe/potch")],
    ["compiler", () => eslint("lib/opal/compiler", "lib/opal/drill", "lib/opal/language-server", "spec/lib/compiler", "lib/opal/gems", "spec/lib/gems", "tasks/compiler", "tasks/language-server", ...glob("tasks/*.mjs"), "tasks/testing")],
    ["corelib and stdlib", async () => {
      rmSync("tmp/lint", { recursive: true, force: true });
      try {
        buildLintBundles();
      } catch (err) {
        console.error(err);
        return 1;
      }
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

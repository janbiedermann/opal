#!/usr/bin/env node
// Runs Opal's test suites with Node.js only (no Ruby needed).
//
//   node tasks/test.mjs                  # every Node.js suite
//   node tasks/test.mjs mspec_ruby       # one or more suites
//   node tasks/test.mjs -R chrome mspec  # browser runners for the Opal suites
//   node tasks/test.mjs spec/opal/core/kernel spec/ruby/core/array/flatten_spec.rb test/opal/test_base64.rb
//
// Suites: potch, compiler, mspec_opal, mspec_ruby, minitest_cruby,
// minitest_node; "mspec" and "minitest" name both of theirs. Files and
// directories run their specs/tests (like bin/test). The suites read the
// environment variables of the rake tasks (PATTERN, FILES, RANDOM_SEED, ...).
import { relative, resolve } from "node:path";
import { existsSync, statSync } from "node:fs";
import { glob } from "./testing/glob.mjs";
import { ROOT, run } from "./testing/common.mjs";
import { mspec } from "./testing/mspec.mjs";
import { minitestCruby, minitestNode } from "./testing/minitest.mjs";

const nodeTest = (pattern) => run(process.execPath, ["--test", ...glob(pattern)]);

const SUITES = {
  potch: () => nodeTest("spec/lib/potch/*.test.mjs"),
  compiler: () => nodeTest("spec/lib/compiler/**/*.test.mjs"),
  mspec_opal: (platform) => mspec("opal", platform),
  mspec_ruby: (platform) => mspec("ruby", platform),
  minitest_cruby: (platform) => minitestCruby(platform),
  minitest_node: () => minitestNode(),
};
const GROUPS = { mspec: ["mspec_opal", "mspec_ruby"], minitest: ["minitest_cruby", "minitest_node"] };
const ALL = ["potch", "compiler", "mspec_opal", "mspec_ruby", "minitest_cruby", "minitest_node"];

function usage(status) {
  console.log("usage: node tasks/test.mjs [-R platform] [suite | file | directory]...");
  console.log(`suites: ${ALL.join(", ")}, mspec, minitest`);
  process.exit(status);
}

async function main(args) {
  process.chdir(ROOT);
  let platform = "nodejs";
  const suites = [];
  const files = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") usage(0);
    else if (a === "-R" || a === "--runner") platform = args[++i];
    else if (a.startsWith("-R")) platform = a.slice(2);
    else if (SUITES[a]) suites.push(a);
    else if (GROUPS[a]) suites.push(...GROUPS[a]);
    else if (existsSync(resolve(a))) files.push(relative(ROOT, resolve(a)));
    else {
      console.error(`unknown suite or file: ${a}`);
      usage(64);
    }
  }

  const results = [];
  const record = async (name, fn) => {
    console.log(`\n=== ${name}${platform !== "nodejs" ? ` (${platform})` : ""}`);
    const started = Date.now();
    const status = await fn();
    results.push([name, status, Date.now() - started]);
  };

  if (files.length) {
    // like bin/test: specs and tests found in the given files/directories
    const expanded = files.flatMap((f) => (statSync(f).isDirectory() ? glob(`${f}/**/{*_spec.rb,test_*.rb}`) : [f]));
    const specs = expanded.filter((f) => f.endsWith("_spec.rb"));
    const tests = expanded.filter((f) => !f.endsWith("_spec.rb"));
    const opalspecs = specs.filter((f) => f.startsWith("spec/opal"));
    const rubyspecs = specs.filter((f) => !f.startsWith("spec/opal"));
    const pattern = (list) => `{${list.join(",")}}`;
    if (opalspecs.length) await record("mspec_opal", () => mspec("opal", platform, { ...process.env, PATTERN: pattern(opalspecs) }));
    if (rubyspecs.length) await record("mspec_ruby", () => mspec("ruby", platform, { ...process.env, PATTERN: pattern(rubyspecs) }));
    if (tests.length) {
      const env = { ...process.env, FILES: pattern(tests) };
      await record("minitest_cruby", () => minitestCruby(platform, env));
    }
  }
  if (!files.length && !suites.length) suites.push(...(platform === "nodejs" ? ALL : ["mspec_opal", "mspec_ruby", "minitest_cruby"]));
  for (const name of suites) await record(name, () => SUITES[name](platform));

  console.log("\n=== summary");
  for (const [name, status, ms] of results) console.log(`${status === 0 ? "ok  " : "FAIL"} ${name.padEnd(16)} ${(ms / 1000).toFixed(1)}s`);
  return results.some(([, status]) => status !== 0) ? 1 : 0;
}

main(process.argv.slice(2)).then((status) => { process.exitCode = status; });

#!/usr/bin/env node
// Measures the per-call cost of every method of String (opal/corelib/string.rb)
// on strings of different lengths and encodings, then prints one table per
// encoding, sorted by method name. The benchmark itself is the Ruby program
// benchmark/string-performance.rb, run with the Opal CLI.
//
//   node tasks/string-performance.mjs
//   node tasks/string-performance.mjs --methods=index,gsub   # only some methods
//   node tasks/string-performance.mjs --lengths=1,125        # only some lengths
//
// The baseline of the current results is in STRING.md.
import { execSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./testing/common.mjs";

const BENCH = join(ROOT, "benchmark", "string-performance.rb");
const option = (name) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg && arg.slice(name.length + 3);
};

const runner = process.env.RUNNER || "nodejs";
execSync(`node bin/opal --no-cache -R${runner} ${BENCH}`, {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    LENGTHS: option("lengths") || process.env.LENGTHS || "",
    METHODS: option("methods") || process.env.METHODS || "",
  },
});

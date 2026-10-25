#!/usr/bin/env node
// tasks/build-parser.mjs - run the three parser generation tasks in order:
// tasks/parser/assemble.mjs (assembles lib/opal/parser/parser.mjs from
// lib/opal/parser/parts/), then gen_convert.mjs (lib/opal/parser/
// convert.mjs) and gen_field_order.mjs (lib/opal/parser/field_order.mjs) -
// the latter two regenerate from Prism 1.9's config.yml, which ships with
// the prism *gem* (the @ruby/prism npm package lacks it). Arguments pass
// through to all three (--check verifies without writing; assemble ignores
// --config):
//
//   node tasks/build-parser.mjs --config=<path to prism/config.yml>
//   node tasks/build-parser.mjs --check --config=<path to prism/config.yml>
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (!args.some((a) => a === "--config" || a.startsWith("--config="))) {
  console.error("usage: node tasks/build-parser.mjs --config=<path to prism/config.yml> [--check]");
  console.error("(prism 1.9's config.yml ships with the prism gem: gems/prism-1.9.0/config.yml)");
  process.exit(2);
}
for (const task of ["assemble.mjs", "gen_convert.mjs", "gen_field_order.mjs"]) {
  console.log(`== tasks/parser/${task}`);
  const r = spawnSync(process.execPath, [join(root, "tasks", "parser", task), ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

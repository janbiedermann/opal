#!/usr/bin/env node
// tasks/build-parser.mjs - run the three parser generation tasks in order:
// tasks/parser/assemble.mjs (assembles lib/opal/parser/parser.mjs from
// lib/opal/parser/parts/), then gen_convert.mjs (lib/opal/parser/
// convert.mjs) and gen_field_order.mjs (lib/opal/parser/field_order.mjs) -
// the latter two regenerate from Prism's config.yml, defaulting to the
// vendored lib/opal/parser/prism-1.9.0.config.yml. Arguments pass through
// to all three (--check verifies without writing; --config=<path> points
// the generators at another Prism version; assemble ignores both):
//
//   node tasks/build-parser.mjs
//   node tasks/build-parser.mjs --check
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
for (const task of ["assemble.mjs", "gen_convert.mjs", "gen_field_order.mjs"]) {
  console.log(`== tasks/parser/${task}`);
  const r = spawnSync(process.execPath, [join(root, "tasks", "parser", task), ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

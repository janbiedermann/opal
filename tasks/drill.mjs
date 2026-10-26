#!/usr/bin/env node
// Builds the `drill` command (lib/opal/exe/drill.rb) into exe/drill (or OUT):
// a standalone Node.js program that builds and runs Opal programs on the
// runners (the test matrix's tool). See tasks/drill/bundle.mjs for the
// bundle's contents.
import { writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { buildDrillBundle } from "./drill/bundle.mjs";

const out = join(ROOT, process.env.OUT || "exe/drill");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `#!/usr/bin/env node\n${await buildDrillBundle()}`);
chmodSync(out, 0o755);
console.log(`built ${out}`);

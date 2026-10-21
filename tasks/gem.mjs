#!/usr/bin/env node
// Builds the `gem` command (lib/opal/exe/gem.rb) into exe/gem (or OUT): a
// standalone minified Node.js program that runs the gem commands against a gem
// repository. See tasks/gem/bundle.mjs for the bundle's contents.
import { writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { buildGemBundle } from "./gem/bundle.mjs";

const out = join(ROOT, process.env.OUT || "exe/gem");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `#!/usr/bin/env node\n${await buildGemBundle()}`);
chmodSync(out, 0o755);
console.log(`built ${out}`);

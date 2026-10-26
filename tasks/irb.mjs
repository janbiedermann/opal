#!/usr/bin/env node
// Builds the `irb` command (lib/opal/exe/irb.rb) into exe/irb (or OUT):
// a standalone Node.js program that runs an IRB session (the vendored
// ruby/irb port) with the whole stdlib compiled in. See
// tasks/irb/bundle.mjs for the bundle's contents.
import { writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { buildIrbBundle } from "./irb/bundle.mjs";

const out = join(ROOT, process.env.OUT || "exe/irb");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `#!/usr/bin/env node\n${await buildIrbBundle()}`);
chmodSync(out, 0o755);
console.log(`built ${out}`);

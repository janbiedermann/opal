#!/usr/bin/env node
// Builds the `ruby` command (lib/opal/exe/ruby.rb) into exe/ruby (or OUT):
// a standalone minified Node.js program that compiles and runs Ruby
// scripts at runtime. See tasks/ruby/bundle.mjs for the bundle's contents.
import { writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { buildRubyBundle } from "./ruby/bundle.mjs";

const out = join(ROOT, process.env.OUT || "exe/ruby");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `#!/usr/bin/env node\n${await buildRubyBundle()}`);
chmodSync(out, 0o755);
console.log(`built ${out}`);

#!/usr/bin/env node
// Builds the `bundle` command (lib/opal/exe/bundler.rb) into exe/bundler (or
// OUT): a standalone minified Node.js program that locks and installs the
// gems of a Gemfile. See tasks/bundler/bundle.mjs for the bundle's contents.
import { writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { buildBundlerBundle } from "./bundler/bundle.mjs";

const out = join(ROOT, process.env.OUT || "exe/bundler");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `#!/usr/bin/env node\n${await buildBundlerBundle()}`);
chmodSync(out, 0o755);
console.log(`built ${out}`);

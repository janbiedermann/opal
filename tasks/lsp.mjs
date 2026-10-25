#!/usr/bin/env node
// Builds the `opal-language-server` command (lib/opal/language/server/)
// into exe/lsp (or OUT): a standalone minified Node.js program speaking LSP over
// stdio. See tasks/lsp/bundle.mjs for the bundle's contents.
import { writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { buildLspBundle } from "./lsp/bundle.mjs";

const out = join(ROOT, process.env.OUT || "exe/lsp");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `#!/usr/bin/env node\n${await buildLspBundle()}`);
chmodSync(out, 0o755);
console.log(`built ${out}`);

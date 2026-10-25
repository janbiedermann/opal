#!/usr/bin/env node
// Installs Opal's development dependencies - the git submodules (ruby/spec,
// mspec, the CRuby tests) and the npm packages - then builds the executables.
// Needs git and Node.js; the .exe steps need nvm's Node 26 (exit 69 without).
import { spawnSync } from "node:child_process";
import { ROOT } from "./testing/common.mjs";

for (const cmd of ["git submodule update --init", "npm install", "npm run build"]) {
  console.log(`+ ${cmd}`);
  const result = spawnSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

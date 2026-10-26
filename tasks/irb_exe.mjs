#!/usr/bin/env node
// Builds exe/irb.exe (or OUT): the `irb` command as a Node.js single
// executable application, the way `opal --compile-to-exe node` does. The
// executable embeds a copy of the Node.js that made it, and the re-run under
// the SEA-capable Node.js is the shared half of tasks/sea_exe.mjs.
import { buildSeaExecutable } from "./sea_exe.mjs";
import { buildIrbBundle } from "./irb/bundle.mjs";

process.exitCode = await buildSeaExecutable({
  bundle: buildIrbBundle,
  task: new URL(import.meta.url).pathname,
  envFlag: "OPAL_IRB_EXE_NODE",
  out: "exe/irb.exe",
});

#!/usr/bin/env node
// Builds exe/drill.exe (or OUT): the `drill` command as a Node.js single
// executable application, the way `opal --compile-to-exe node` does. The
// executable embeds a copy of the Node.js that made it, and the re-run under
// the SEA-capable Node.js is the shared half of tasks/sea_exe.mjs. Note that
// drill's node runner still spawns a node from the host (NODE_EXE/PATH): the
// embed is drill's own runtime, not the program's substrate.
import { buildSeaExecutable } from "./sea_exe.mjs";
import { buildDrillBundle } from "./drill/bundle.mjs";

process.exitCode = await buildSeaExecutable({
  bundle: buildDrillBundle,
  task: new URL(import.meta.url).pathname,
  envFlag: "OPAL_DRILL_EXE_NODE",
  out: "exe/drill.exe",
});

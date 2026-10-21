#!/usr/bin/env node
// Builds exe/gem.exe (or OUT): the `gem` command as a Node.js single
// executable application. The bundle is the one tasks/gem/bundle.mjs answers,
// and the re-run under a Node.js that has the SEA fuse is in tasks/sea_exe.mjs.
import { buildSeaExecutable } from "./sea_exe.mjs";
import { buildGemBundle } from "./gem/bundle.mjs";

process.exitCode = await buildSeaExecutable({
  bundle: buildGemBundle,
  task: new URL(import.meta.url).pathname,
  envFlag: "OPAL_GEM_EXE_NODE",
  out: "exe/gem.exe",
});

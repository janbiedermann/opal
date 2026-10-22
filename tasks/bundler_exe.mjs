#!/usr/bin/env node
// Builds exe/bundler.exe (or OUT): the `bundle` command as a Node.js single
// executable application. The bundle is the one tasks/bundler/bundle.mjs
// answers, and the re-run under a Node.js that has the SEA fuse is in
// tasks/sea_exe.mjs.
import { buildSeaExecutable } from "./sea_exe.mjs";
import { buildBundlerBundle } from "./bundler/bundle.mjs";

process.exitCode = await buildSeaExecutable({
  bundle: buildBundlerBundle,
  task: new URL(import.meta.url).pathname,
  envFlag: "OPAL_BUNDLER_EXE_NODE",
  out: "exe/bundler.exe",
});

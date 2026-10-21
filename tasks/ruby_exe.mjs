#!/usr/bin/env node
// Builds exe/ruby.exe (or OUT): the `ruby` command as a Node.js single
// executable application, the way `opal --compile-to-exe node` does. The
// executable embeds a copy of the Node.js that made it, and the re-run under
// the SEA-capable Node.js is the shared half of tasks/sea_exe.mjs.
import { buildSeaExecutable } from "./sea_exe.mjs";
import { buildRubyBundle } from "./ruby/bundle.mjs";

process.exitCode = await buildSeaExecutable({
  bundle: buildRubyBundle,
  task: new URL(import.meta.url).pathname,
  envFlag: "OPAL_RUBY_EXE_NODE",
  out: "exe/ruby.exe",
});

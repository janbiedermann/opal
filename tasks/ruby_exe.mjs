#!/usr/bin/env node
// Builds exe/ruby.exe (or OUT): the `ruby` command as a Node.js single
// executable application, the way `opal --compile-to-exe node` does. The
// executable embeds a copy of the Node.js that made it, and many Linux
// distributions build Node.js without the SEA fuse, so this task re-runs
// itself under the nvm Node.js 26 (an official build that has it).
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { compileExe, seaUnsupported } from "../lib/opal/compiler/cli/exe_compiler.mjs";
import { buildRubyBundle } from "./ruby/bundle.mjs";

// The nvm Node.js 26: `nvm which 26` through nvm.sh, else its versions
// directory (nvm is a shell function, not a program).
function findNvmNode26() {
  const nvmDir = process.env.NVM_DIR || join(process.env.HOME, ".nvm");
  const which = spawnSync("bash", ["-c", `source '${join(nvmDir, "nvm.sh")}' >/dev/null 2>&1 && nvm which 26`], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  const dir = join(nvmDir, "versions", "node");
  if (!existsSync(dir)) return null;
  const v26 = readdirSync(dir).filter((v) => /^v26\./.test(v)).sort().reverse();
  for (const v of v26) {
    const node = join(dir, v, "bin", "node");
    if (existsSync(node)) return node;
  }
  return null;
}

if (process.env.OPAL_RUBY_EXE_NODE) {
  // (under the SEA-capable Node.js: its own binary is the one embedded in
  // the executable, so the fuse check can't fail here)
  const unsupported = seaUnsupported();
  if (unsupported) {
    process.stderr.write(unsupported + "\n");
    process.exitCode = 69; // EX_UNAVAILABLE, as the CLI does
  } else {
    const out = join(ROOT, process.env.OUT || "exe/ruby.exe");
    writeFileSync(out, await buildRubyBundle());
    process.exitCode = compileExe("node", out, (s) => process.stdout.write(s));
  }
} else {
  const node = findNvmNode26();
  if (!node) {
    process.stderr.write("opal: no nvm Node.js 26 found; install one with `nvm install 26`\n");
    process.exitCode = 69;
  } else {
    const run = spawnSync(node, [new URL(import.meta.url).pathname], { stdio: "inherit", env: { ...process.env, OPAL_RUBY_EXE_NODE: node } });
    process.exitCode = run.status === null ? 1 : run.status;
  }
}

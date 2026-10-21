#!/usr/bin/env node
// The half the single-file executable tasks share (tasks/ruby_exe.mjs and
// tasks/gem_exe.mjs): Node's --build-sea needs a Node.js built with the SEA
// fuse, and many distributions build Node.js without one, so the task re-runs
// itself under the nvm Node.js 26 (an official build that has the fuse), whose
// own binary is the one the executable then embeds.
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./testing/common.mjs";
import { compileExe, seaUnsupported } from "../lib/opal/compiler/cli/exe_compiler.mjs";

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

// Answers the exit status. BUNDLE answers the program's JavaScript; TASK is
// the module to re-run under the other Node.js, ENV_FLAG the variable telling
// it that it already runs under the SEA-capable one, and OUT the path of the
// executable, relative to the repository (OUT of its own environment wins).
export async function buildSeaExecutable({ bundle, task, envFlag, out: defaultOut }) {
  const out = join(ROOT, process.env.OUT || defaultOut);

  if (process.env[envFlag]) {
    // (under the SEA-capable Node.js: its own binary is the one embedded in
    // the executable, so the fuse check can't fail here)
    const unsupported = seaUnsupported();
    if (unsupported) {
      process.stderr.write(unsupported + "\n");
      return 69; // EX_UNAVAILABLE, as the CLI does
    }
    writeFileSync(out, await bundle());
    return compileExe("node", out, (s) => process.stdout.write(s));
  }

  const node = findNvmNode26();
  if (!node) {
    process.stderr.write("opal: no nvm Node.js 26 found; install one with `nvm install 26`\n");
    return 69;
  }
  const run = spawnSync(node, [task], { stdio: "inherit", env: { ...process.env, [envFlag]: node } });
  return run.status === null ? 1 : run.status;
}

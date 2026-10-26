// Helpers shared by the test drivers (tasks/testing/*.mjs).
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { rubyInspect } from "../../lib/opal/compiler/helpers.mjs";

export const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const DRILL_EXE = resolve(ROOT, "exe", "drill");

// exe/drill is a build output: rebuild it once per driver process so the
// matrix drills with this checkout's toolchain (the compile cache makes the
// rebuild ~seconds, and the program sources read from the live tree anyway).
let drillBuilt = false;
export function ensureDrill() {
  if (drillBuilt) return;
  drillBuilt = true;
  const build = spawnSync(process.execPath, [join(ROOT, "tasks", "drill.mjs")], { stdio: "inherit", cwd: ROOT });
  if (build.status !== 0) throw new Error("building exe/drill failed");
}

// exe/ruby likewise: mspec's ruby_exe helper spawns it for its probes
// (stdlib/rbconfig.rb names it as RUBY_EXE).
let rubyBuilt = false;
export function ensureRubyExe() {
  if (rubyBuilt) return;
  rubyBuilt = true;
  const build = spawnSync(process.execPath, [join(ROOT, "tasks", "ruby.mjs")], { stdio: "inherit", cwd: ROOT });
  if (build.status !== 0) throw new Error("building exe/ruby failed");
}

// RANDOM_SEED from the environment, or a new one (printed for reruns).
export function randomSeed(env) {
  const seed = env.RANDOM_SEED ? env.RANDOM_SEED : String(Math.floor(Math.random() * 100000));
  console.log(`export RANDOM_SEED=${seed} # to re-use the same randomization`);
  return seed;
}

// Ruby code setting ENV to the given environment.
export function envData(env) {
  return Object.entries(env)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `ENV[${rubyInspect(k)}] = ${rubyInspect(String(v))}`)
    .join("\n");
}

// Like RbConfig::CONFIG['host_os'] (OPAL_PLATFORM_NAME).
export function hostOs() {
  return { win32: "mingw32" }[process.platform] || process.platform;
}

// Runs a command (inheriting stdio); resolves to its exit status.
export function run(cmd, args, { env = process.env, echo = true, cwd = ROOT } = {}) {
  if (echo) console.log([cmd, ...args].join(" "));
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env, cwd });
    child.on("error", reject);
    child.on("exit", (code, signal) => resolvePromise(code === null ? (signal ? 128 + 1 : 1) : code));
  });
}

// Runs a program drill-style (the exe used to be exe/opal, which now only
// compiles): drill builds the bundle and hands it to -R's runner.
export function runOpal(args, options) {
  ensureDrill();
  ensureRubyExe(); // mspec specs spawn probes through it (the ruby_exe helper)
  return run(process.execPath, [DRILL_EXE, ...args], options);
}

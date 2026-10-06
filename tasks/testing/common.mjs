// Helpers shared by the test drivers (tasks/testing/*.mjs).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { rubyInspect } from "../../lib/opal/compiler/helpers.mjs";

export const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const OPAL_EXE = resolve(ROOT, "exe", "opal");

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

export function runOpal(args, options) {
  return run(process.execPath, [OPAL_EXE, ...args], options);
}

// Runners for other JS engines: Deno, Bun, QuickJS, GJS and macOS
// JavaScript for Automation (lib/opal/cli_runners/{deno,bun,quickjs,gjs,
// applescript}.rb).
import { spawnSync } from "node:child_process";
import { systemRunner, shellwords, RunnerError } from "./system.mjs";

export function deno(data) {
  const opts = shellwords(process.env.DENO_OPTS);
  return systemRunner(data, (path) => ["deno", "run", "--allow-read", "--allow-write", ...opts, path, ...(data.argv || [])],
    { missing: "Please install Deno to be able to run Opal scripts." });
}

export function bun(data) {
  const opts = shellwords(process.env.BUN_OPTS);
  return systemRunner(data, (path) => ["bun", "run", ...opts, path, ...(data.argv || [])],
    { missing: "Please install Bun to be able to run Opal scripts." });
}

export function quickjs(data) {
  const exe = process.env.QJS_PATH || "qjs";
  const opts = shellwords(process.env.QJS_OPTS);
  return systemRunner(data, (path) => [exe, "--std", ...opts, path, ...(data.argv || [])],
    { missing: "Please install QuickJS to be able to run Opal scripts." });
}

export function gjs(data) {
  const exe = process.env.GJS_PATH || "gjs";
  const builder = data.builder();
  const opts = shellwords(process.env.GJS_OPTS);
  if (builder.isEsm) opts.unshift("-m");
  return systemRunner({ ...data, builder: () => builder }, (path) => [exe, ...opts, path, ...(data.argv || [])],
    { missing: "Please install Gjs to be able to run Opal scripts." });
}

export function applescript(data) {
  if (spawnSync("sh", ["-c", "which osalang > /dev/null"]).status !== 0) {
    throw new RunnerError("JavaScript Automation is only supported by OS X Yosemite and above.");
  }
  // OSAScript will output the last thing
  return systemRunner(data, (path) => ["osascript", "-l", "JavaScript", path, ...(data.argv || [])],
    { missing: "AppleScript is only available on Mac OS X.", prepare: (code) => code + "\n'';\n" });
}

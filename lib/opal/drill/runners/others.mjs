// Runners for other JS engines: GJS and macOS JavaScript for Automation
// (lib/opal/cli_runners/{gjs,applescript}.rb).
import { spawnSync } from "node:child_process";
import { systemRunner, shellwords, RunnerError } from "./system.mjs";

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

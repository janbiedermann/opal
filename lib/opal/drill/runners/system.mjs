// Runs the built program with an external command (node, deno, ...).
// Port of the former Ruby lib/opal/cli_runners/system_runner.rb.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, openSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class RunnerError extends Error {}

// command(path) returns [executable, ...args]; options.env is merged into
// the environment, options.debug keeps the file in the current directory.
export function systemRunner(data, command, { missing, prepare } = {}) {
  const options = data.options || {};
  const builder = data.builder();
  const env = { ...process.env, ...(options.env || {}) };
  const debug = options.debug || false;
  const ext = builder.outputExtension;

  let path;
  let tempdir = null;
  if (options.directory) {
    tempdir = mkdtempSync(join(tmpdir(), "opal-system-runner-"));
    builder.compileToDirectory(tempdir, { withSourceMap: !options.no_source_map });
    path = join(tempdir, `index.${ext}`);
  } else {
    let code = builder.compiledSource({ withSourceMap: !options.no_source_map });
    if (prepare) code = prepare(code);
    if (debug) {
      path = `opal-system-runner.${ext}`;
    } else {
      tempdir = mkdtempSync(join(tmpdir(), "opal-system-runner-"));
      path = join(tempdir, `opal-system-runner.${ext}`);
    }
    writeFileSync(path, code);
  }

  try {
    const [exe, ...args] = command(path);
    const output = data.output;
    let stdout = "inherit";
    let fd = null;
    if (typeof output === "string") stdout = fd = openSync(output, "w");
    else if (output && output !== process.stdout) stdout = "pipe";
    const result = spawnSync(exe, args, { env, stdio: ["inherit", stdout, "inherit"], maxBuffer: 1 << 30 });
    if (fd !== null) closeSync(fd);
    if (result.error) {
      if (result.error.code === "ENOENT") throw new RunnerError(missing || `${exe} not found`);
      throw result.error;
    }
    if (stdout === "pipe") output.write(result.stdout);
    if (result.status === null) return 128 + (signalNumber(result.signal) || 1);
    return result.status;
  } finally {
    if (tempdir && !debug) rmSync(tempdir, { recursive: true, force: true });
  }
}

function signalNumber(signal) {
  return { SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGKILL: 9, SIGSEGV: 11, SIGPIPE: 13, SIGTERM: 15 }[signal];
}

// Shell-like word splitting for the *_OPTS environment variables.
export function shellwords(str) {
  const words = [];
  const re = /"((?:\\.|[^"\\])*)"|'([^']*)'|((?:\\.|[^\s"'\\])+)|(\s+)/g;
  let word = null;
  for (const m of (str || "").matchAll(re)) {
    if (m[4] !== undefined) {
      if (word !== null) words.push(word);
      word = null;
      continue;
    }
    const part = m[1] !== undefined ? m[1].replace(/\\(.)/g, "$1") : m[2] !== undefined ? m[2] : m[3].replace(/\\(.)/g, "$1");
    word = (word || "") + part;
  }
  if (word !== null) words.push(word);
  return words;
}

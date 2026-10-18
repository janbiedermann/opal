// Builds a standalone executable from a compiled program (--compile-to-exe).
// Port of the former Ruby lib/opal/exe_compiler.rb.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, chmodSync, copyFileSync, rmSync, openSync, readSync, closeSync } from "node:fs";
import { tmpdir, platform } from "node:os";
import { join, basename } from "node:path";
import { EXE_RUNTIMES } from "./runners/index.mjs";
import { bundleNpmPackages } from "./npm_bundler.mjs";

const isWindows = platform() === "win32";
const isMacos = platform() === "darwin";

function system(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: "inherit", ...opts }).status === 0;
}

const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

// Whether the Node.js binary at `path` can be made into a single executable
// application: null if it can, else why not. It needs Node.js 20 or later
// and the application fuse (a sentinel string postject flips), which the
// official builds have and some Linux distributions' builds (a small
// launcher with a shared libnode) don't.
export function seaUnsupported(path = process.execPath, version = process.versions.node) {
  const why = (reason) => `opal: --compile-to-exe node needs a Node.js that supports single executable applications, but ${path} (v${version}) ${reason}. ` +
    "Run opal with an official Node.js build (https://nodejs.org/en/download), for example: /path/to/node exe/opal --compile-to-exe node ...";
  if (parseInt(version, 10) < 20) return why("is older than Node.js 20");
  let fd;
  try {
    fd = openSync(path, "r");
    const sentinel = Buffer.from(SEA_FUSE);
    const chunk = Buffer.alloc(1 << 20);
    let carry = Buffer.alloc(0);
    for (let position = 0; ;) {
      const read = readSync(fd, chunk, 0, chunk.length, position);
      if (read === 0) break;
      const data = Buffer.concat([carry, chunk.subarray(0, read)]);
      if (data.includes(sentinel)) return null;
      carry = data.subarray(Math.max(0, data.length - sentinel.length + 1));
      position += read;
    }
  } catch (e) {
    return why(`can't be read (${e.message})`);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  return why("has no single executable application fuse (some Linux distributions build Node.js without it)");
}

// The configuration of a Node.js single executable application: with a
// startup snapshot (see snapshotEntry), else with the V8 code cache of
// the program; no "experimental feature" warning on every start. With
// --build-sea (Node.js 26+) `output` names the executable, not a blob.
export function seaConfig(main, { snapshot = false, output = "sea-prep.blob" } = {}) {
  const config = { main, output, disableExperimentalSEAWarning: true };
  if (snapshot) config.useSnapshot = true;
  else config.useCodeCache = true;
  return config;
}

// Whether this Node.js builds the whole executable in one step. Node.js 26
// added --build-sea, which reads the config, copies the running binary and
// injects the blob itself: no separate --experimental-sea-config run, no
// postject (so no npx and its download), and no codesign/signtool around it.
export function seaBuildSupported(version = process.versions.node) {
  return parseInt(version, 10) >= 26;
}

// The cut of a compiled program for a startup snapshot: after Node.js's
// platform (nodejs) is loaded. Its modules and the corelib's are booted
// when the executable is built; the libraries required after it and the
// program run at start (they could read the process's state when they
// load).
const SNAPSHOT_CUT = 'Opal.queue(()=>{ Opal.load_normalized("nodejs") });\n';

// Synchronous HTTP GETs (open-uri) in an executable with a startup
// snapshot: a worker thread can't load Node's net module in a process
// started from a snapshot (Node aborts: shutdown_wrap_template_.IsEmpty()),
// so Opal.sync_http_get runs the executable again as a helper
// (OPAL_EXE_HTTP_GET: the URL), which makes the request and writes the
// result as JSON instead of running the program.
const HTTP_GET_HELPER = `if (process.env.OPAL_EXE_HTTP_GET !== undefined) {
  var url = new URL(process.env.OPAL_EXE_HTTP_GET);
  var done = function(result) { process.stdout.write(JSON.stringify(result)); };
  var message = function(error) { return error.message || error.code || String(error); };
  require(url.protocol === "https:" ? "https" : "http").get(url, function(res) {
    var chunks = [];
    res.on("data", function(chunk) { chunks.push(chunk); });
    res.on("end", function() { done({ status: res.statusCode, statusText: res.statusMessage, headers: res.headers, body: Buffer.concat(chunks).toString("base64") }); });
    res.on("error", function(error) { done({ error: message(error) }); });
  }).on("error", function(error) { done({ error: message(error) }); });
  return;
}
Opal.sync_http_get = function(uri) {
  var env = Object.assign({}, process.env, { OPAL_EXE_HTTP_GET: uri });
  var run = require("child_process").spawnSync(process.execPath, process.execArgv, { env: env, maxBuffer: 1 << 30 });
  if (run.error || run.status !== 0) return { error: run.error ? run.error.message : String(run.stderr) };
  var result = JSON.parse(run.stdout.toString("utf8"));
  if (result.body !== undefined) result.body = Buffer.from(result.body, "base64");
  return result;
};`;

// The main script of an executable with a startup snapshot (made of the
// compiled program `source`), or null if the program has no place to cut.
// At start it runs Opal.process_start_hooks (ARGV), then the rest.
export function snapshotEntry(source) {
  const cut = source.indexOf(SNAPSHOT_CUT);
  if (cut === -1) return null;
  const boot = source.slice(0, cut + SNAPSHOT_CUT.length);
  const rest = source.slice(cut + SNAPSHOT_CUT.length).replace(/\n\/\/# sourceMappingURL=\S*\s*$/, "\n");
  return [
    boot,
    // (corelib's Error.stackTraceLimit is skipped during the snapshot build,
    // see corelib/error.rb; the main function sets it, so --stack-trace-limit
    // is not kept over by the snapshot itself)
    "delete Error.stackTraceLimit;",
    'require("v8").startupSnapshot.setDeserializeMainFunction(function() {',
    "Error.stackTraceLimit = 100;",
    HTTP_GET_HELPER,
    "(Opal.process_start_hooks || []).forEach(function(hook) { hook(); });",
    rest,
    "});",
    "",
  ].join("\n");
}

// srcPath: the compiled program (removed afterwards); returns an exit status.
export function compileExe(type, srcPath, out = (s) => process.stdout.write(s)) {
  if (!EXE_RUNTIMES.includes(type)) throw new Error(`Cannot compile exe: unsupported runtime type '${type}'`);
  let outPath = srcPath;
  out(`Creating ${outPath}:\n`);
  const dir = mkdtempSync(join(tmpdir(), "opal-compile-exe-"));
  let res;
  try {
    const src = join(dir, `${basename(outPath)}.js`);
    writeFileSync(src, readFileSync(srcPath));
    unlinkSync(srcPath);
    const winExe = () => { if (isWindows && !outPath.toLowerCase().endsWith(".exe")) outPath += ".exe"; };
    switch (type) {
      case "node": {
        // (each step must succeed; the blob is made by the Node.js that is
        // copied into the executable, as they must match)
        const run = (cmd, args) => system(cmd, args, { cwd: dir });
        const node = join(dir, "node_copy.exe");
        // (a startup snapshot of the booted corelib and platform, when the
        // program has them; the npm packages it requires bundled in)
        const program = readFileSync(src, "utf8");
        const entry = snapshotEntry(program);
        const npm = bundleNpmPackages(program);
        for (const name of npm.missing) out(`opal: warning: the npm package ${name}, which the program requires, wasn't found; the executable can't load it\n`);
        writeFileSync(src, npm.prelude + npm.wrap(entry || program));
        if (seaBuildSupported()) {
          // one step, and the config's output is the executable itself
          winExe();
          const exe = basename(outPath);
          writeFileSync(join(dir, "sea-config.json"), JSON.stringify(seaConfig(src, { snapshot: !!entry, output: exe })));
          res = run(process.execPath, ["--build-sea=sea-config.json"]);
          if (res) copyFileSync(join(dir, exe), outPath);
          break;
        }
        writeFileSync(join(dir, "sea-config.json"), JSON.stringify(seaConfig(src, { snapshot: !!entry })));
        res = run(process.execPath, ["--experimental-sea-config", "sea-config.json"]);
        if (res) {
          copyFileSync(process.execPath, node);
          chmodSync(node, 0o775);
          if (isMacos) res = run("codesign", ["--remove-signature", "node_copy.exe"]);
          else if (isWindows) res = run("signtool", ["remove", "/s", "node_copy.exe"]);
        }
        if (res) {
          const postject = ["postject", "node_copy.exe", "NODE_SEA_BLOB", "sea-prep.blob", "--sentinel-fuse", "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"];
          if (isMacos) postject.push("--macho-segment-name", "NODE_SEA");
          res = run("npx", ["--yes", ...postject]);
          if (!res) out(`${seaUnsupported() || `opal: postject couldn't inject the application into a copy of ${process.execPath}`}\n`);
        }
        if (res) {
          if (isMacos) res = run("codesign", ["--sign", "-", "node_copy.exe"]);
          else if (isWindows) res = run("signtool", ["sign", "/fd", "SHA256", "node_copy.exe"]);
        }
        if (res) {
          winExe();
          copyFileSync(node, outPath);
        }
        break;
      }
      case "osascript":
        if (!outPath.endsWith(".app")) outPath += ".app";
        res = system("osacompile", ["-l", "JavaScript", "-o", outPath, "-s", src]);
        break;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  out(res ? "Done.\n" : "Failed.\n");
  return res ? 0 : 1;
}

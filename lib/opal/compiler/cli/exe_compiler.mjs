// Builds a standalone executable from a compiled program (--compile-to-exe).
// Port of the former Ruby lib/opal/exe_compiler.rb.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, chmodSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir, platform } from "node:os";
import { join, basename } from "node:path";
import { EXE_RUNTIMES } from "./runners/index.mjs";

const isWindows = platform() === "win32";
const isMacos = platform() === "darwin";

function system(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: "inherit", ...opts }).status === 0;
}

// The configuration of a Node.js single executable application.
export function seaConfig(main) {
  return { main, output: "sea-prep.blob", useCodeCache: true, disableExperimentalSEAWarning: true };
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
      case "bun":
        res = system("bun", ["build", src, "--compile", "--outfile", outPath]);
        break;
      case "deno":
        res = system("deno", ["compile", "--allow-env", "--allow-read", "--allow-sys", "--allow-write", "--output", outPath, src]);
        break;
      case "node": {
        // (each step must succeed; the blob is made by the Node.js that is
        // copied into the executable, as they must match)
        const run = (cmd, args) => system(cmd, args, { cwd: dir });
        const node = join(dir, "node_copy.exe");
        writeFileSync(join(dir, "sea-config.json"), JSON.stringify(seaConfig(src)));
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
          if (!res) out(`(${process.execPath} can't be made into an executable: a Node.js build with the single executable application fuse is needed, such as the official ones)\n`);
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
      case "quickjs":
        winExe();
        res = system("qjsc", ["-o", outPath, src]);
        break;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  out(res ? "Done.\n" : "Failed.\n");
  return res ? 0 : 1;
}

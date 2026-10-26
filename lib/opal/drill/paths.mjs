// Where a running drill finds Opal's tree. exe/drill and exe/drill.exe are
// bundles: their linked graph bakes no checkout path (import.meta.url inside
// a bundle names the machine that built it - AGENTS), so the runners and the
// builder ask this module instead: the checkout *next to the running exe*
// (found by walking up from argv[1]/execPath looking for a directory with
// both opal/ and stdlib/), else OPAL_ROOT (the import-based root: correct
// when drill's modules are imported from the tree itself - dev runs and
// specs), else nothing - and a standalone exe/drill.exe falls back to the
// source tree the bundle embeds, unpacked to a cache directory.
import { existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { OPAL_ROOT } from "../compiler/paths.mjs";

function looksLikeTree(dir) {
  try {
    return statSync(join(dir, "opal")).isDirectory() && statSync(join(dir, "stdlib")).isDirectory();
  } catch {
    return false;
  }
}

let home; // undefined: not asked yet; null: no tree next to the exe
export function drillHome() {
  if (home !== undefined) return home;
  // execPath first: in a single-file executable it is the exe (argv[1] is the
  // first program argument, and a user argument that happens to sit in some
  // other checkout must not pick that tree). A node-launched bundle walks up
  // from node's own directory, finds nothing, and answers from argv[1].
  for (const start of [process.execPath, process.argv[1]]) {
    if (!start) continue;
    let dir = start;
    for (let up = 0; up < 4; up++) {
      dir = dirname(dir);
      if (looksLikeTree(dir)) {
        home = dir;
        return home;
      }
    }
  }
  home = looksLikeTree(OPAL_ROOT) ? OPAL_ROOT : null;
  return home;
}

// The Builder's load paths for a program drill builds: the tree next to the
// exe (so harness runs and probes compile the *working tree*, edits and all,
// without rebuilding drill), else the unpacked copy of the sources the
// bundle embeds. null leaves the Builder's own defaults (the tree the tool
// was imported from).
export function builderPaths() {
  const tree = drillHome();
  if (tree) return [join(tree, "opal"), join(tree, "stdlib"), join(tree, "lib")];
  return unpackedSources();
}

// The Builder's file-cache key override: bundles stamp OPAL_COMPILER_KEY (a
// content digest of the compiler and parser, the one tasks/ruby/bundle.mjs
// stamps too); outside a bundle the FileCache digests those files' mtimes
// itself.
export function compilerKey() {
  return globalThis.OPAL_COMPILER_KEY || null;
}

// Relocatable mode: the bundle embeds Opal's Ruby sources as gzip'd JSON
// (see tasks/drill/bundle.mjs); with no tree beside it, drill unpacks them
// once into the cache directory and builds from there. Sources, not compiled
// JS: the Builder then sees the same .rb/.mjs files it sees in a checkout -
// the autoloads, ERB templates and require trees keep their build-time
// handling. The unpacked copy lives under a key of its own, so a rebuilt
// drill writes a fresh directory; it is as fresh as the build that embedded
// it (the contract exe/ruby's baked stdlib already lives by).
let unpacked;
export function unpackedSources() {
  if (unpacked !== undefined) return unpacked;
  const packed = globalThis.OPAL_DRILL_SOURCES;
  if (!packed) {
    unpacked = null;
    return unpacked;
  }
  const sources = JSON.parse(gunzipSync(Buffer.from(packed, "base64")).toString("utf8"));
  const key = globalThis.OPAL_DRILL_SOURCES_KEY || "unknown";
  const cacheDir = process.env.OPAL_CACHE_DIR || join(homedir(), ".cache");
  const dir = join(cacheDir, "opal-drill", `sources-${key}`);
  const marker = join(dir, ".complete");
  if (!existsSync(marker)) {
    for (const [name, source] of Object.entries(sources)) {
      const out = join(dir, name);
      mkdirSync(dirname(out), { recursive: true });
      const tmp = `${out}.${process.pid}.tmp`;
      writeFileSync(tmp, source);
      renameSync(tmp, out);
    }
    writeFileSync(marker, "");
  }
  unpacked = [join(dir, "opal"), join(dir, "stdlib")];
  return unpacked;
}

// The index bake driver (LSP.md §5; port of ../indexer/driver.rb): run at
// exe BUILD time by tasks/language-server/update_baked_index.mjs, never at
// server start. It walks the Ruby sources of the checkout (corelib, opal
// entrypoints, stdlib) with the same DeclarationListener that indexes live
// documents, and writes two committed generated modules:
//   baked_index.mjs      - the finished record graph as literals + per-file
//                          content digests (for staleness re-indexing);
//   corelib_sources.mjs  - path -> source, dumped to ~/.cache/opal-lsp
//                          only when someone navigates into corelib with no
//                          checkout beside the exe.
import fs from "node:fs";
import { ParseResult } from "../parse_result.mjs";
import { DeclarationListener } from "./declaration_listener.mjs";

// The files that make Opal's Ruby (LSP.md §5) - not the specs, not
// the toolchain's own .rb ports.
const ROOTS = [
  "opal/corelib/**/*.rb",
  "opal/opal/*.rb",
  "stdlib/**/*.rb",
  "stdlib/opal/**/*.rb",
];

export function runBake({ home, outDir }) {
  const payload = { modules: {}, constants: {}, constant_references: {}, digests: {} };
  const sources = {};
  const files = collectFiles(home);

  for (const rel of files) {
    const source = fs.readFileSync(home + "/" + rel, "utf8");
    const listener = new DeclarationListener(rel, new ParseResult(source)).index();
    mergeMap(payload.modules, listener.modules);
    mergeMap(payload.constants, listener.constants);
    mergeMap(payload.constant_references, listener.constantReferences);
    payload.digests[rel] = digest(source);
    sources[rel] = source;
  }

  writeModule(fs, `${outDir}/baked_index.mjs`, payload);
  writeModule(fs, `${outDir}/corelib_sources.mjs`, sources);
  return { fileCount: files.length, modules: Object.keys(payload.modules).length, constants: Object.keys(payload.constants).length };
}

// A dependency-free walk (no globbing): "dir/**/*.rb" recurses, "dir/*.rb" is one level.
function collectFiles(home) {
  const out = new Set();
  for (const pattern of ROOTS) {
    const ext = ".rb";
    if (pattern.includes("**")) {
      const dir = pattern.split("/**")[0]; // "opal/corelib"
      walkRecursive(home + "/" + dir, home, dir, ext, out);
    } else {
      const dir = pattern.slice(0, pattern.lastIndexOf("/")); // "opal/opal"
      for (const [name, isDir] of readDir(home + "/" + dir)) {
        if (isDir || !name.endsWith(ext)) continue;
        out.add(`${dir}/${name}`);
      }
    }
  }
  return [...out].sort();
}

function walkRecursive(dir, home, keepPrefix, ext, out) {
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const [name, isDir] of readDir(current)) {
      const full = current + "/" + name;
      if (isDir) {
        stack.push(full);
      } else {
        const rel = full.slice(home.length + 1);
        if (name.endsWith(ext) && rel.startsWith(keepPrefix)) out.add(rel);
      }
    }
  }
}

// [[name, is_directory], ...]; a missing directory reads empty.
function readDir(dir) {
  let list;
  try {
    list = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return list.map((entry) => [entry.name, entry.isDirectory()]);
}

function mergeMap(into, from) {
  for (const [name, records] of Object.entries(from)) {
    (into[name] ??= []).push(...records);
  }
}

// FNV-1a over UTF-16 units plus the length: cheap on both sides
// (the staleness check recomputes it on the live file at boot)
// and enough for "did this file change since the bake". Keep in sync
// with js/indexer/global_state.mjs's digest (the boot side re-check).
export function digest(source) {
  const s = String(source);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16) + "-" + s.length;
}

function writeModule(fsModule, path, data) {
  fsModule.writeFileSync(path, `export default ${JSON.stringify(data)};\n`);
}

#!/usr/bin/env node
// Regenerates the committed baked index modules (LSP.md §5):
//   lib/opal/language/baked_index.mjs     - the corelib/stdlib record graph
//   lib/opal/language/corelib_sources.mjs - path -> source
//
// Like tasks/compiler/update_fixtures.mjs: bake, diff, commit. It runs the
// JS bake driver (lib/opal/language/server/indexer/bake.mjs - the same
// DeclarationListener the live server uses) over this checkout, and the
// driver writes the two modules. Run it after changing corelib/stdlib
// sources or the indexer.
//
// It also writes the three §10.6 benchmark variants (record representation:
// POJO literals vs Map pair-arrays vs Map .set() chain) into tmp/lsp_bake
// for bench_index.mjs - those are throwaway, not committed.
import { writeFileSync, mkdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../testing/common.mjs";
import { runBake } from "../../lib/opal/language/server/indexer/bake.mjs";

const BAKE_DIR = join(ROOT, "tmp", "lsp_bake");

// The three §10.6 variants of one payload, as loadable ESM modules.
function emitVariants(payload) {
  const json = JSON.stringify(payload);

  // POJO: exactly what ships.
  writeFileSync(join(BAKE_DIR, "bench_pojo.mjs"), `export default ${json};\n`);

  // Map built from nested pair-array literals: the conversion happens at
  // boot as the new Map() calls evaluate.
  const pairs = (value) => {
    if (Array.isArray(value)) return `[${value.map(pairs).join(",")}]`;
    if (value && typeof value === "object") {
      const body = Object.entries(value).map(([k, v]) => `[${JSON.stringify(k)},${pairs(v)}]`).join(",");
      return `new Map([${body}])`;
    }
    return JSON.stringify(value);
  };
  writeFileSync(join(BAKE_DIR, "bench_pairs.mjs"), `export default ${pairs(payload)};\n`);

  // Map built by a .set() chain: flat, verbose, but every structure is
  // constructed by the same one-liner shape. Children are declared first:
  // `var m0 = new Map(); m0.set(k, m1); var m1 = ...` would set undefined
  // (var hoisting), and arrays stay arrays (records are indexed by order).
  const parts = [];
  let counter = 0;
  const chain = (value) => {
    if (Array.isArray(value)) {
      const ids = value.map((v) => chain(v));
      const id = `m${counter++}`;
      parts.push(`var ${id} = [${ids.join(", ")}];`);
      return id;
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value).map(([k, v]) => [k, chain(v)]);
      const id = `m${counter++}`;
      parts.push(`var ${id} = new Map();`);
      for (const [k, child] of entries) parts.push(`${id}.set(${JSON.stringify(k)}, ${child});`);
      return id;
    }
    return JSON.stringify(value);
  };
  const root = chain(payload);
  writeFileSync(join(BAKE_DIR, "bench_chain.mjs"), `${parts.join("\n")}\nexport default ${root};\n`);
}

function main() {
  mkdirSync(BAKE_DIR, { recursive: true });

  const outDir = process.env.BAKED_OUT_DIR || join(ROOT, "lib", "opal", "language");
  const stats = runBake({ home: ROOT, outDir });
  process.stdout.write(`baked ${stats.fileCount} files: ${stats.modules} modules, ${stats.constants} constants\n`);

  // The benchmark variants: reuse the freshly baked payload.
  const payload = JSON.parse(readPayload(outDir));
  emitVariants(payload);

  for (const file of ["baked_index.mjs", "corelib_sources.mjs"]) {
    const size = statSync(join(outDir, file)).size;
    process.stdout.write(`${file}: ${(size / 1024).toFixed(0)} KiB\n`);
  }
  process.stdout.write("bench variants in tmp/lsp_bake - run: node tasks/language-server/bench_index.mjs\n");
}

function readPayload(outDir) {
  // the baked module is one `export default {...};` literal - read it
  // back without importing the fresh copy through the module cache
  return readFileSync(join(outDir, "baked_index.mjs"), "utf8")
    .replace(/^export default /, "").replace(/;\s*$/, "");
}

main();

#!/usr/bin/env node
// Regenerates the committed baked index modules (LSP.md §5):
//   lib/opal/language-server/baked_index.mjs     - the corelib/stdlib record graph
//   lib/opal/language-server/corelib_sources.mjs - path -> source
//
// Like tasks/compiler/update_fixtures.mjs: build, diff, commit. It compiles
// a small driver bundle (opal/full + json + the language-server tree +
// indexer/driver.rb), runs it on Node with OPAL_HOME pointing at this
// checkout, and the driver writes the two modules. Run it after changing
// corelib/stdlib sources or the indexer.
//
// It also writes the three §10.6 benchmark variants (record representation:
// POJO literals vs Map pair-arrays vs Map .set() chain) into tmp/lsp_bake
// for bench_index.mjs - those are throwaway, not committed.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { ROOT } from "../testing/common.mjs";
import { treeRequireNames } from "../ruby/bundle.mjs";

const BAKE_DIR = join(ROOT, "tmp", "lsp_bake");

async function buildBakeBundle() {
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  builder.build("opal", { requirable: true, load: true });
  builder.build("opal/full", { requirable: true, load: true });
  builder.build("json", { requirable: true, load: true });
  // The server tree only for prism/parser.rb + the indexer (ParseResult and
  // DeclarationListener); not the transport/server.
  for (const name of treeRequireNames("lib/opal/language-server", "opal/language-server/")) builder.buildRequire(name);
  builder.build("opal/language-server/indexer/driver", { requirable: true, load: true });
  builder.buildStr("::Opal::LanguageServer::Indexer::Driver.run", "(bake)");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });
  return `${builder}`;
}

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

async function main() {
  mkdirSync(BAKE_DIR, { recursive: true });

  const bake = join(BAKE_DIR, "bake.js");
  writeFileSync(bake, await buildBakeBundle());

  const outDir = process.env.BAKED_OUT_DIR || join(ROOT, "lib", "opal", "language-server");
  const run = spawnSync(process.execPath, [bake], {
    stdio: "inherit",
    env: { ...process.env, OPAL_HOME: ROOT, BAKED_OUT_DIR: outDir },
  });
  if (run.status !== 0) process.exit(run.status ?? 1);

  // The benchmark variants: reuse the freshly baked payload.
  const payload = (await import(`file://${join(outDir, "baked_index.mjs")}`)).default;
  emitVariants(payload);

  for (const file of ["baked_index.mjs", "corelib_sources.mjs"]) {
    const size = (await import(`node:fs`)).statSync(join(outDir, file)).size;
    console.log(`${file}: ${(size / 1024).toFixed(0)} KiB`);
  }
  console.log("bench variants in tmp/lsp_bake - run: node tasks/language-server/bench_index.mjs");
}

main();

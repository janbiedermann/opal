#!/usr/bin/env node
// LSP.md §10.6: the record-representation decision for the baked index,
// measured on the real payload. Three boot-time shapes of the same data
// (update_baked_index.mjs emits all three into tmp/lsp_bake):
//   bench_pojo.mjs   - nested object literals (what ships)
//   bench_pairs.mjs  - new Map([[k, v], ...]) nested pair-array literals
//   bench_chain.mjs  - a generated m.set(...) chain
// Measured: module boot (parse + build + module-eval) in fresh processes,
// then the hot paths the features actually run (resolve_method's property
// chase, and a workspaceSymbol sweep over every module's method names).
// Run the bake first, then: node tasks/language-server/bench_index.mjs
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { ROOT } from "../testing/common.mjs";

const BAKE_DIR = join(ROOT, "tmp", "lsp_bake");

if (!existsSync(join(BAKE_DIR, "bench_pojo.mjs"))) {
  console.error("run node tasks/language-server/update_baked_index.mjs first (it emits the variants)");
  process.exit(1);
}

const VARIANTS = ["pojo", "pairs", "chain"];

function bootVariant(name) {
  // fresh process: import cost = parse + module-eval + Map build
  const script = `
    const t0 = performance.now();
    const m = (await import(${JSON.stringify(pathToFileURL(join(BAKE_DIR, "bench_" + name + ".mjs")).href)})).default;
    const boot = performance.now() - t0;
    console.log(JSON.stringify({ boot, rssMB: (process.memoryUsage().rss / 1048576).toFixed(0) }));
  `;
  let minBoot = Infinity, rss = 0;
  for (let i = 0; i < 5; i++) {
    const out = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }));
    if (out.boot < minBoot) { minBoot = out.boot; rss = out.rssMB; }
  }
  return { boot: minBoot, rss };
}

async function hotVariant(name) {
  console.log(`hot ${name}`);
  const mod = (await import(pathToFileURL(join(BAKE_DIR, `bench_${name}.mjs`)).href + `?v=${name}`)).default;
  const isMap = mod instanceof Map;
  const get = isMap ? (o, k) => o.get(k) : (o, k) => o[k];
  // mirror Index#resolve_method on a fixed chain: String's reopen records,
  // their methods bucket, the gsub defs - first hit wins
  const chase = () => {
    const mods = isMap ? mod.get("modules") : mod.modules;
    const list = mods.get ? mods.get("String") : mods["String"];
    for (const rec of list) {
      const methods = get(rec, "methods");
      const bucket = methods ? get(methods, "gsub") : null;
      if (bucket) return bucket[0];
    }
    return null;
  };
  if (!chase()) throw new Error(`${name}: gsub not found`);

  let t = performance.now();
  for (let i = 0; i < 200000; i++) chase();
  const resolveNs = ((performance.now() - t) * 1e6) / 200000;

  // workspaceSymbol-style sweep: every module name, every method name key
  const sweep = () => {
    let count = 0;
    const mods = isMap ? mod.get("modules") : mod.modules;
    const names = isMap ? mods.keys() : Object.keys(mods);
    for (const modName of names) {
      const records = mods.get ? mods.get(modName) : mods[modName];
      for (const record of records) {
        const methods = get(record, "methods");
        const keys = isMap ? methods.keys() : Object.keys(methods);
        for (const m of keys) count++;
      }
    }
    return count;
  };
  const total = sweep();
  t = performance.now();
  for (let i = 0; i < 300; i++) sweep();
  const sweepMs = (performance.now() - t) / 300;

  return { resolveNs, sweepMs, methodKeys: total };
}

const rows = [];
for (const name of VARIANTS) {
  const boot = bootVariant(name);
  const hot = await hotVariant(name);
  rows.push({ name, ...boot, ...hot });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("variant", 8), pad("boot ms", 10), pad("RSS MB", 8), pad("resolve ns", 12), pad("sweep ms", 10));
for (const r of rows) console.log(pad(r.name, 8), pad(r.boot.toFixed(1), 10), pad(r.rss, 8), pad(r.resolveNs.toFixed(1), 12), pad(r.sweepMs.toFixed(1), 10));
console.log(`(${rows[0].methodKeys} method-name keys swept)`);

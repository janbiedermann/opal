// parser parse only (parseWithMetadata, UTF-16 offsets as the JS compiler will use), warm, in-process.
import { readFileSync, readdirSync } from "node:fs";
import { parseWithMetadata } from "../../lib/opal/parser/index.mjs";
const dir = process.argv[2];
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
console.log("| file | bytes | parser parse_ms |\n|---|---:|---:|");
for (const f of readdirSync(dir).filter((f) => f.endsWith(".rb")).sort()) {
  const src = readFileSync(`${dir}/${f}`, "utf8");
  const big = src.length > 300000, mid = src.length > 30000;
  const warm = big ? 5 : 20, runs = big ? 5 : (mid ? 11 : 21);
  const ts = [];
  for (let i = 0; i < warm + runs; i++) {
    const s = performance.now(); parseWithMetadata(src); const e = performance.now();
    if (i >= warm) ts.push(e - s);
  }
  console.log(`| ${f.replace(/^\d+_/, "")} | ${Buffer.byteLength(src)} | ${med(ts).toFixed(2)} |`);
}

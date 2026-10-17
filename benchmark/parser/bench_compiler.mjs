// The JS compiler (lib/opal/compiler) on the BASELINE.md corpus, warm,
// in-process, with the same run counts as the baseline scripts:
//   node benchmark/parser/bench_compiler.mjs tmp/bench_corpus
// parse = the parser, transform = the AST passes, codegen = the rest.
import { readFileSync, readdirSync } from "node:fs";
import { Compiler } from "../../lib/opal/compiler/index.mjs";
import { parseWithMetadata } from "../../lib/opal/parser/index.mjs";
import { transform } from "../../lib/opal/compiler/transforms/index.mjs";

const dir = process.argv[2];
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];

console.log("| file | bytes | parse_ms | transform_ms | codegen_ms | total_ms | out_bytes |");
console.log("|---|---:|---:|---:|---:|---:|---:|");
for (const f of readdirSync(dir).filter((f) => f.endsWith(".rb")).sort()) {
  const src = readFileSync(`${dir}/${f}`, "utf8");
  const name = f.replace(/^\d+_/, "");
  const big = src.length > 300000, mid = src.length > 30000;
  const warm = big ? 1 : 3, runs = big ? 3 : (mid ? 5 : 11);
  const p = [], t = [], tot = [];
  let out = "";
  try {
    for (let i = 0; i < warm + runs; i++) {
      let s = performance.now();
      parseWithMetadata(src, null);
      const pm = performance.now() - s;

      // the passes, on a fresh parse (they change the tree)
      // (parsed before the timer starts)
      const c = new Compiler(src, { file: name, warning() {} });
      c.parse();
      const top = { type: "OpalTop", location: null, body: parseWithMetadata(src, null).ast.statements, kind: "main" };
      s = performance.now();
      transform(c, top);
      const tm = performance.now() - s;

      s = performance.now();
      out = new Compiler(src, { file: name, warning() {} }).compile();
      const total = performance.now() - s;
      if (i < warm) continue;
      p.push(pm); t.push(tm); tot.push(total);
    }
    const pm = med(p), tm = med(t), total = med(tot);
    console.log(`| ${name} | ${Buffer.byteLength(src)} | ${pm.toFixed(2)} | ${tm.toFixed(2)} | ${(total - pm - tm).toFixed(2)} | ${total.toFixed(2)} | ${Buffer.byteLength(out)} |`);
  } catch (e) {
    console.log(`| ${name} | ${Buffer.byteLength(src)} | ERROR: ${e.message.slice(0, 90)} |`);
  }
}

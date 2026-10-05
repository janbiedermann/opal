#!/usr/bin/env node
// benchmark/potch/run.mjs — reproduces docs/potch_performance.md's baseline comparison
// (target_js_uni vs. a C-parser reference) entirely from inside
// target_js_uni, with no dependency on the outer repo or a Ruby install:
//
//   - "uni" backend   = lib/opal/potch/cli.mjs (what exe/potch runs).
//   - "ref" backend   = benchmark/potch/ref_cmd.mjs, backed by the published
//                       `@ruby/prism` WASM build (the same C parser
//                       target_wasm/cmd.js uses locally, consumed here as an
//                       npm dependency instead of a sibling directory).
//
// Two measurements, matching the report's own methodology:
//
//   - Cold:  one fresh `node` process per run (as potch actually invokes
//            these backends) - median of `--runs` runs. Reports each
//            backend's own --time ("parse_ms") and this script's
//            wall-clock around the whole process ("total_ms": startup +
//            parse + stdout write).
//   - Warm:  `--warmup-runs` in-process iterations after the process/WASM
//            instance is already up, discarded, then `--runs` more,
//            measured (median of those) - isolates the actual per-call
//            cost of producing a JS-consumable AST from one-time
//            process/instance startup. `--warmup-runs` defaults to 20:
//            V8 needs roughly that many calls through a function before
//            it finishes tiering it up to optimized code, so fewer than
//            that still measures JIT warmup cost, not steady-state cost.
//
// Usage: node benchmark/potch/run.mjs [--runs=N] [--warmup-runs=N]

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import * as synth from "./synth.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const UNI_CMD = join(ROOT, "..", "..", "lib", "opal", "potch", "cli.mjs");
const REF_CMD = join(ROOT, "ref_cmd.mjs");

function corpusFile(name) {
  return readFileSync(join(ROOT, "corpus", name), "utf8");
}

function buildCorpus() {
  const s5 = corpusFile("s5_639kb.rb");
  return [
    { name: "s0_201b.rb", content: corpusFile("s0_201b.rb") },
    // depth=100 (206 bytes): the @ruby/prism WASM build traps ("memory
    // access out of bounds") on much deeper recursive-descent nesting than
    // this - it has a fixed WASM call-stack budget, unlike a native build.
    { name: "synth_deep_nest.rb", content: synth.deepNest(100) },
    { name: "s1_324b.rb", content: corpusFile("s1_324b.rb") },
    { name: "synth_method_chain.rb", content: synth.methodChain(1000) },
    { name: "synth_binop_chain.rb", content: synth.binopChain(1000) },
    { name: "s2_pack.rb", content: corpusFile("s2_pack.rb") },
    { name: "s3_34kb.rb", content: corpusFile("s3_34kb.rb") },
    { name: "s4_114kb.rb", content: corpusFile("s4_114kb.rb") },
    { name: "synth_big_array.rb", content: synth.bigArray(50000) },
    { name: "synth_many_locals.rb", content: synth.manyLocals(20000) },
    { name: "synth_many_methods.rb", content: synth.manyMethods(10000) },
    { name: "s5_639kb.rb", content: s5 },
    { name: "synth_many_strings.rb", content: synth.manyStrings(20000) },
    { name: "s6_mega_2.5mb.rb", content: synth.mega(s5, 4) },
  ];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function parseTimingMs(stderrText) {
  const match = /\[timing\] parse: ([\d.]+) ms/.exec(stderrText);
  return match ? Number(match[1]) : NaN;
}

// One cold run: fresh `node <cmd>` process, source piped via stdin, stdout
// discarded (matches the report's own `... --time < sample.rb >/dev/null`).
function coldRun(cmdPath, source) {
  const started = performance.now();
  const { stderr, status } = spawnSync(process.execPath, [cmdPath, "--stdin", "--time"], {
    input: source,
    stdio: ["pipe", "ignore", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
  const totalMs = performance.now() - started;
  if (status !== 0 && status !== 1) {
    throw new Error(`${cmdPath} exited ${status}: ${stderr.toString().slice(0, 300)}`);
  }
  return { parseMs: parseTimingMs(stderr.toString()), totalMs };
}

function coldMedian(cmdPath, source, runs) {
  const parseMs = [];
  const totalMs = [];
  for (let i = 0; i < runs; i++) {
    const r = coldRun(cmdPath, source);
    parseMs.push(r.parseMs);
    totalMs.push(r.totalMs);
  }
  return { parseMs: median(parseMs), totalMs: median(totalMs) };
}

async function warmMedian(fn, source, runs, warmupRuns) {
  const samples = [];
  for (let i = 0; i < warmupRuns + runs; i++) {
    const started = performance.now();
    await fn(source);
    samples.push(performance.now() - started);
  }
  return median(samples.slice(warmupRuns));
}

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(2) : "?";
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const m = /^--([\w-]+)=(.+)$/.exec(a);
      return m ? [m[1], Number(m[2])] : [a.replace(/^--/, ""), true];
    }),
  );
  const runs = args["runs"] ?? 3;
  const warmupRuns = args["warmup-runs"] ?? 20;

  const corpus = buildCorpus();

  // Set up warm, in-process backends once (pay WASM-instantiate / module
  // load cost outside the measured loop, same as the report's methodology).
  const { parseWithMetadata, envelopeOffsetsToBytes } = await import("../../lib/opal/potch/index.mjs");
  const { loadPrism } = await import("@ruby/prism");
  const refParse = await loadPrism();

  const uniWarmParse = (source) => {
    const envelope = parseWithMetadata(source);
    envelopeOffsetsToBytes(envelope, source);
  };
  const refWarmParse = (source) => {
    refParse(source);
  };

  console.log(`\n## Cold (fresh process per run, median of ${runs})\n`);
  console.log("| file | bytes | ref parse_ms | potch parse_ms | ratio | ref total_ms | potch total_ms | total ratio |");
  console.log("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const { name, content } of corpus) {
    try {
      const ref = coldMedian(REF_CMD, content, runs);
      const uni = coldMedian(UNI_CMD, content, runs);
      console.log(
        `| ${name} | ${content.length} | ${fmt(ref.parseMs)} | ${fmt(uni.parseMs)} | ${fmt(uni.parseMs / ref.parseMs)}× | ` +
          `${fmt(ref.totalMs)} | ${fmt(uni.totalMs)} | ${fmt(uni.totalMs / ref.totalMs)}× |`,
      );
    } catch (err) {
      console.log(`| ${name} | ${content.length} | ERROR: ${err.message.slice(0, 80)} |`);
    }
  }

  console.log(`\n## Warm (in-process, ${warmupRuns} warmup runs discarded, median of ${runs})\n`);
  console.log("| file | bytes | ref ms | potch ms | ratio |");
  console.log("|---|---:|---:|---:|---:|");
  for (const { name, content } of corpus) {
    try {
      const refMs = await warmMedian(refWarmParse, content, runs, warmupRuns);
      const uniMs = await warmMedian(uniWarmParse, content, runs, warmupRuns);
      console.log(`| ${name} | ${content.length} | ${fmt(refMs)} | ${fmt(uniMs)} | ${fmt(uniMs / refMs)}× |`);
    } catch (err) {
      console.log(`| ${name} | ${content.length} | ERROR: ${err.message.slice(0, 80)} |`);
    }
  }
}

main();

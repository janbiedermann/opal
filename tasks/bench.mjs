#!/usr/bin/env node
// Benchmarks Opal (formerly done with the benchmark-driver gem).
//
//   node tasks/bench.mjs run [-R runner]... [--ruby] [files...]
//   node tasks/bench.mjs report [result files...]
//   node tasks/bench.mjs ips [files...]   (needs BENCHMARK_IPS_LIB, below)
//   node tasks/bench.mjs clear
//
// `run` times the benchmarks (default: the list in benchmark/benchmarks) on
// the given runners (default nodejs; --ruby also runs them with the `ruby`
// on PATH) and writes the results to tmp/bench/<n>_<label>.txt. A
// benchmark is a Ruby script (timed as a whole) or a benchmark-driver YAML
// file (prelude, benchmark, loop_count). `report` compares result files,
// the first one being the base.
//
// `ips` runs benchmark-ips/bm_*.rb (or FILE / the given files) with the
// benchmark-ips library, which isn't part of Opal: set BENCHMARK_IPS_LIB to
// the lib directory of a benchmark-ips checkout or gem.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { basename, extname, join, relative } from "node:path";
import { glob } from "./testing/glob.mjs";
import { ROOT, OPAL_EXE } from "./testing/common.mjs";
import { VERSION } from "../lib/opal/compiler/version.mjs";

const require = createRequire(import.meta.url);
const BENCH_DIR = join(ROOT, "tmp", "bench");
const RUNNER_REQUIRES = {
  nodejs: ["-rnodejs/file"],
  bun: ["-rnodejs/file"],
  deno: ["-rdeno/file"],
  chrome: ["-rheadless_browser/base", "-rheadless_browser/file"],
  firefox: ["-rheadless_browser/base", "-rheadless_browser/file"],
};

// [{ name, prelude, script, loopCount }] of a benchmark file
function benchmarksIn(file) {
  const source = readFileSync(join(ROOT, file), "utf8");
  if (extname(file) !== ".yml") return [{ name: basename(file, ".rb"), prelude: "", script: source, loopCount: 1 }];
  const yaml = require(join(ROOT, "stdlib", "nodejs", "js-yaml-3-6-1.js"));
  const spec = yaml.safeLoad(source);
  const loopCount = spec.loop_count || 1;
  let entries = spec.benchmark;
  if (typeof entries === "string") entries = { [basename(file, ".yml")]: entries };
  if (Array.isArray(entries)) entries = Object.fromEntries(entries.map((e) => (typeof e === "string" ? [e, e] : [e.name, e.script])));
  return Object.entries(entries).map(([name, script]) => ({ name, prelude: spec.prelude || "", script: String(script), loopCount }));
}

// A Ruby program timing the benchmarks; prints "BENCH <name> <seconds> <loops>".
function program(benchmarks) {
  return benchmarks.map((b, i) => `
def __bench_${i}
${b.prelude}
__t = Process.clock_gettime(Process::CLOCK_MONOTONIC)
${b.loopCount === 1 ? b.script : `${b.loopCount}.times do\n${b.script}\nend`}
puts "BENCH #{${JSON.stringify(b.name)}} #{Process.clock_gettime(Process::CLOCK_MONOTONIC) - __t} ${b.loopCount}"
end
__bench_${i}
`).join("\n");
}

function runBenchmarks(file, engine) {
  const benchmarks = benchmarksIn(file);
  mkdirSync(BENCH_DIR, { recursive: true });
  const script = join(BENCH_DIR, "script.rb");
  writeFileSync(script, program(benchmarks));
  const cmd = engine === "ruby"
    ? ["ruby", [script]]
    : [process.execPath, [OPAL_EXE, `-R${engine}`, ...(RUNNER_REQUIRES[engine] || []), "--no-source-map", "--dynamic-require", "ignore", "--missing-require", "ignore", script]];
  const result = spawnSync(cmd[0], cmd[1], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
  const out = (result.stdout || "") + (result.stderr || "");
  const results = [...out.matchAll(/^BENCH (.+) (\S+) (\d+)$/gm)].map((m) => ({ name: m[1], seconds: parseFloat(m[2]), loops: parseInt(m[3], 10) }));
  if (results.length < benchmarks.length) process.stderr.write(`ERROR in ${file} (${engine}):\n${out.split("\n").slice(-10).join("\n")}\n`);
  return results;
}

function nextReport(label) {
  mkdirSync(BENCH_DIR, { recursive: true });
  const index = Math.max(0, ...readdirSync(BENCH_DIR).map((f) => parseInt(f, 10)).filter((n) => !Number.isNaN(n))) + 1;
  return join(BENCH_DIR, `${index}_${label.replaceAll(".", "-")}.txt`);
}

function run(args) {
  const engines = [];
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-R") engines.push(args[++i]);
    else if (args[i].startsWith("-R")) engines.push(args[i].slice(2));
    else if (args[i] === "--ruby") engines.push("ruby");
    else files.push(...(args[i].includes("*") ? glob(args[i]) : [args[i]]));
  }
  if (engines.length === 0) engines.push("nodejs");
  const list = files.length ? files : readFileSync(join(ROOT, "benchmark", "benchmarks"), "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (const engine of engines) {
    const label = engine === "ruby" ? `ruby-${spawnSync("ruby", ["-e", "print RUBY_VERSION"], { encoding: "utf8" }).stdout}` : `opal-${engine}-${VERSION}`;
    const report = nextReport(label);
    const lines = [];
    for (const file of list) {
      if (!existsSync(join(ROOT, file))) {
        process.stderr.write(`Error: ${file} does not exist!\n`);
        continue;
      }
      process.stderr.write(`Benchmarking ${file} on ${engine}...\n`);
      for (const r of runBenchmarks(file, engine)) {
        const line = `${r.name} ${(r.loops / r.seconds).toFixed(3)} i/s - ${r.loops} times in ${r.seconds.toFixed(6)}s`;
        console.log(line);
        lines.push(line);
      }
    }
    writeFileSync(report, lines.join("\n") + "\n");
    process.stderr.write(`Results written to ${relative(ROOT, report)}\n`);
  }
}

function report(args) {
  // tmp/bench/*.txt from `run`, tmp/bench/SpecN from MSpec's BM mode
  const files = args.length ? args.map((f) => (existsSync(f) ? f : join(BENCH_DIR, f))) : readdirSync(BENCH_DIR).filter((f) => f.endsWith(".txt") || /^Spec\d+$/.test(f)).map((f) => join(BENCH_DIR, f));
  const reports = files.map((file) => {
    const results = new Map();
    for (const line of readFileSync(file, "utf8").split("\n")) {
      // "<name> <n> i/s ..." from `run`, "<name> <seconds>" from MSpec
      const m = /^(\S+)\s+([\d.]+)( i\/s)?/.exec(line);
      if (m) results.set(m[1], { value: parseFloat(m[2]), unit: m[3] ? "i/s" : "s" });
    }
    return { name: basename(file, ".txt"), results };
  });
  if (reports.length === 0) return console.log("no results in tmp/bench");
  const [base] = reports;
  const names = [...new Set(reports.flatMap((r) => [...r.results.keys()]))];
  console.log(`Base: ${base.name}`);
  const rows = [["Benchmark", ...reports.map((r) => r.name)]];
  for (const name of names) {
    rows.push([name, ...reports.map((r) => {
      const result = r.results.get(name);
      if (result === undefined) return "";
      const baseResult = base.results.get(name);
      const change = baseResult ? ((result.value / baseResult.value) - 1) * 100 : 0;
      const delta = r !== base && baseResult && baseResult.unit === result.unit ? `${`${change >= 0 ? "+" : ""}${change.toFixed(2)}`.padStart(8)}% ` : "";
      return `${delta}${result.value.toFixed(3)} ${result.unit}`;
    })]);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  for (const row of rows) console.log(row.map((cell, i) => (i === 0 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]))).join("  "));
}

function ips(args) {
  const lib = process.env.BENCHMARK_IPS_LIB;
  if (!lib) throw new Error("set BENCHMARK_IPS_LIB to the lib directory of benchmark-ips (https://github.com/evanphx/benchmark-ips)");
  const files = args.length ? args : glob(process.env.FILE || "benchmark-ips/bm_*.rb");
  if (files.length === 0) throw new Error("no files provided");
  console.log(`=== Files: ${files.join(", ")}`);
  for (const file of files) {
    const result = spawnSync(process.execPath, [OPAL_EXE, "--dynamic-require", "ignore", "--missing-require", "ignore", "-ropal/platform", `-I${lib}`, "-rbenchmark/ips", "-A", file], { cwd: ROOT, stdio: "inherit" });
    if (result.status !== 0) return result.status;
  }
  return 0;
}

const [command, ...args] = process.argv.slice(2);
const commands = { run, report, ips, clear: () => rmSync(BENCH_DIR, { recursive: true, force: true }) };
if (!commands[command]) {
  console.log("usage: node tasks/bench.mjs run [-R runner]... [--ruby] [files...] | report [files...] | ips [files...] | clear");
  process.exitCode = command ? 64 : 0;
} else {
  const status = commands[command](args);
  if (typeof status === "number") process.exitCode = status;
}

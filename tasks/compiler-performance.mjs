#!/usr/bin/env node
// Tracks compiler speed (run by CI or manually): compiles the parser's benchmark
// corpus with the current checkout and with a previous ref (GIT_BASE_REF or
// master, like tasks/codesize.mjs) and compares the time of the compiler.
//
//   node tasks/compiler-performance.mjs
//   node tasks/compiler-performance.mjs --current
//   GIT_BASE_REF=branch node tasks/compiler-performance.mjs
//
// The corpus is the one of benchmark/parser/gen_corpus.mjs (the BASELINE.md
// samples plus the synthetic stress files); it is generated once and shared
// by both measurements. benchmark/parser/bench_compiler.mjs runs in-process and
// reports the median of its warm runs per file, split into parse (the parser),
// transform (the AST passes) and codegen.
//
// The previous ref is not checked out: its own lib/ and opal/ are unpacked
// with `git archive` into tmp/compiler_performance/previous/ and the current
// bench_compiler.mjs is copied next to them, so its relative imports resolve
// to the ref's compiler. Refs from before the Node.js toolchain have no
// lib/opal/compiler and cannot be measured.
//
// Times more than 5% slower are reported as failures (informative) and their
// lines are marked FAIL. Only the total time over all the files fails the
// run; the per-file and per-stage lines are marked "slower" for information.
import { execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./testing/common.mjs";

const PERF = join(ROOT, "tmp", "compiler_performance");
const CORPUS = join(PERF, "corpus");
const BENCH = join(ROOT, "benchmark", "parser", "bench_compiler.mjs");
const GEN_CORPUS = join(ROOT, "benchmark", "parser", "gen_corpus.mjs");

const THRESHOLD = 5;
const STAGES = ["parse", "transform", "codegen", "total"];

const failures = [];
const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true });
const ms = (n) => `${n.toFixed(2).padStart(8)} ms`;

// The shared corpus, written by the current gen_corpus.mjs.
function setupCorpus() {
  mkdirSync(CORPUS, { recursive: true });
  sh(`node ${GEN_CORPUS} ${CORPUS}`);
}

// Runs bench_compiler.mjs on the corpus and reads back its markdown table.
function measure(label, bench) {
  console.log(`\n* Compiling the corpus with ${label}...`);
  const result = spawnSync(process.execPath, [bench, CORPUS], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`bench_compiler.mjs failed for ${label}:\n${result.stderr}`);

  const files = {};
  for (const line of result.stdout.split("\n")) {
    if (!line.startsWith("| ") || line.startsWith("| file") || line.startsWith("|---")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 7) throw new Error(`unexpected bench_compiler.mjs line for ${label}: ${line}`);
    const [name, bytes, ...times] = cells;
    files[name] = { bytes: Number(bytes), stages: Object.fromEntries(STAGES.map((s, i) => [s, Number(times[i])])) };
    for (const stage of STAGES) {
      if (!Number.isFinite(files[name].stages[stage])) throw new Error(`bench_compiler.mjs failed on ${name} for ${label}`);
    }
  }
  return files;
}

// The previous ref's compiler, unpacked under the benchmark script.
function previousBench(ref) {
  const dir = join(PERF, "previous");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "benchmark", "parser"), { recursive: true });
  sh(`git archive ${ref} lib opal | tar -x -C ${dir}`);
  const bench = join(dir, "benchmark", "parser", "bench_compiler.mjs");
  copyFileSync(BENCH, bench);
  // Refs from before the rename keep the parser in lib/opal/potch, where the
  // current bench script's imports don't find it: point them at the old
  // directory instead.
  if (!existsSync(join(dir, "lib", "opal", "parser")) && existsSync(join(dir, "lib", "opal", "potch"))) {
    writeFileSync(bench, readFileSync(bench, "utf8").replaceAll("lib/opal/parser/", "lib/opal/potch/"));
  }
  return bench;
}

function hasCompiler(ref) {
  return spawnSync("git", ["cat-file", "-e", `${ref}:lib/opal/compiler/index.mjs`], { cwd: ROOT }).status === 0;
}

// CI fetches the base ref as origin/<ref>, locally it is usually a branch.
function resolveRef(ref) {
  for (const candidate of [ref, `origin/${ref}`]) {
    if (spawnSync("git", ["rev-parse", "--verify", "-q", candidate], { cwd: ROOT }).status === 0) return candidate;
  }
  return null;
}

class Time {
  constructor(time) {
    this.time = time;
  }

  // Per-file lines are informative; only the totals of a stage over all the
  // files fail the run, as the small files are too noisy to be a threshold.
  compareTo(previous, name, strict) {
    const change = (100 * (this.time - previous.time)) / previous.time;
    const failed = change > THRESHOLD;
    console.log(`${name.padStart(26)}: ${ms(previous.time)} -> ${ms(this.time)} (change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%)${failed ? (strict ? "  FAIL" : "  slower") : ""}`);
    if (failed && strict) failures.push(`${name} took more than ${THRESHOLD}% longer`);
  }
}

const sum = (files, stage) => Object.values(files).reduce((a, f) => a + f.stages[stage], 0);

function compare(current, previous) {
  console.log("\n=== Summary ===");
  for (const name of Object.keys(current)) {
    if (!previous[name]) continue;
    for (const stage of STAGES) {
      new Time(current[name].stages[stage]).compareTo(new Time(previous[name].stages[stage]), `${name} ${stage}`, false);
    }
    console.log("");
  }
  for (const stage of STAGES) {
    new Time(sum(current, stage)).compareTo(new Time(sum(previous, stage)), `all files ${stage}`, stage === "total");
  }
}

function report(files) {
  console.log("\n=== Summary ===");
  for (const name of Object.keys(files)) {
    const f = files[name];
    console.log(`${name.padStart(26)}: ${String(f.bytes).padStart(9)} B, parse ${ms(f.stages.parse)}, transform ${ms(f.stages.transform)}, codegen ${ms(f.stages.codegen)}, total ${ms(f.stages.total)}`);
  }
  for (const stage of STAGES) console.log(`${"all files " + stage}`.padStart(26) + `: ${ms(sum(files, stage))}`);
}

function failReport() {
  if (!failures.length) return 0;
  console.log("--- Failures ---");
  for (const f of failures) console.log(` - ${f}`);
  console.log("\nThis run failed - some timing checks did not pass. Don't worry, this is");
  console.log("informative, not fatal. It may be worth to rerun the task, rebase the branch,");
  console.log("or consult those results with a pull request reviewer.");
  return 1;
}

async function compareWithRef() {
  const thisRef = execSync("git describe --tags --always", { cwd: ROOT, encoding: "utf8" }).trim();
  const requested = process.env.GIT_BASE_REF || "master";
  const ref = resolveRef(requested);

  if (!ref) {
    console.log(`The ref ${requested} is not available in this checkout (fetch the history,`);
    console.log("for example with fetch-depth 0).");
    return 1;
  }
  if (!hasCompiler(ref)) {
    console.log(`The ref ${ref} has no lib/opal/compiler (it predates the Node.js toolchain),`);
    console.log("so its compiler cannot be measured. Set GIT_BASE_REF to a newer ref.");
    return 1;
  }

  setupCorpus();
  const current = measure("current", BENCH);
  const previous = measure(`previous (${ref})`, previousBench(ref));

  console.log(`\nCompiler speed between (previous) ${ref} and (current) ${thisRef}:`);
  compare(current, previous);
  return failReport();
}

async function currentOnly() {
  setupCorpus();
  report(measure("current", BENCH));
  return 0;
}

process.exitCode = await (process.argv.includes("--current") ? currentOnly() : compareWithRef());

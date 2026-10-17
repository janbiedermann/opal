#!/usr/bin/env node
// ref_cmd.mjs — a minimal cmd.js-shaped CLI around the real C parser, for
// benchmarking target_js_uni against a reference backend without reaching
// outside this directory (no ../target_wasm, no ../javascript).
//
// Backed by the published `@ruby/prism` npm package: the same WASM build of
// the C library that target_wasm/cmd.js uses locally (same javascript/
// source, same prism.wasm, just consumed as a registry dependency instead of
// a sibling directory). Benchmark-only — unlike target_wasm/cmd.js this does
// not support --lex/--serialize/--json-in; it exists to produce comparable
// parse_ms/total_ms numbers, not to be a general-purpose backend.
//
// Usage: node ref_cmd.mjs [-e <code> | --stdin] [--time] [--warmup[=N]]

import { loadPrism } from "@ruby/prism";
import { readFileSync } from "node:fs";

function usage() {
  process.stderr.write("usage: node ref_cmd.mjs [-e <code> | --stdin] [--time] [--warmup[=N]]\n");
  process.exit(2);
}

function parseArgs(argv) {
  let code = null;
  let useStdin = false;
  let time = false;
  let warmup = 0;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-e" || arg === "--eval") {
      if (++i >= argv.length) usage();
      code = argv[i];
    } else if (arg.startsWith("--eval=")) code = arg.slice(7);
    else if (arg === "--stdin") useStdin = true;
    else if (arg === "--time") time = true;
    else if (arg === "--warmup") warmup = 5;
    else if (arg.startsWith("--warmup=")) warmup = Number(arg.slice(9)) || 1;
    else usage();
  }
  return { code, useStdin, time, warmup };
}

// Trimmed from target_wasm/cmd.js's astJSON: walks the real node tree into a
// plain JSON-stringifiable object, just to pay a comparable "serialize the
// result" cost in total_ms — this benchmark doesn't need the result's
// content, only its shape of work.
function astJSON(value, seen = new Set()) {
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => astJSON(item, seen));

  const out = {};
  const name = value.constructor?.name;
  if (name && name.endsWith("Node")) out.type = name;
  for (const [key, child] of Object.entries(value)) {
    out[key] = astJSON(child, seen);
  }
  return out;
}

const { code, useStdin, time: wantTime, warmup: wantWarmup } = parseArgs(process.argv.slice(2));
const source = useStdin || code === null ? readFileSync(0, "utf8") : code;

const parse = await loadPrism();

if (wantWarmup > 0) {
  const warmupStarted = performance.now();
  for (let i = 0; i < wantWarmup; i++) parse(source);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  process.stderr.write(`[timing] warmup: ${(performance.now() - warmupStarted).toFixed(3)} ms\n`);
}

const started = performance.now();
const result = parse(source);
const parseMs = performance.now() - started;

process.stdout.write(JSON.stringify(astJSON(result.value), null, "\t") + "\n");
if (wantTime) process.stderr.write(`[timing] parse: ${parseMs.toFixed(3)} ms\n`);
process.exitCode = result.errors.length > 0 ? 1 : 0;

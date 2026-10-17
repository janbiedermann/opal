// lib/opal/parser/cli.mjs (run as exe/potch) — parse Ruby source, emit a JSON envelope.
//
// Usage:
//   exe/potch [-e <code> | --stdin] [--json-in] [--lex] [--time] [--warmup[=N]]
//
// Input:
//   --json-in    input is JSON: { source, filepath?, line?, lex? }
//                without this flag input is raw Ruby source text
//   --stdin      read input from stdin instead of -e
//   --lex        lex only (tokens instead of AST)
//
// Timing:
//   --time       report the parse phase on stderr as "[timing] parse: N ms"
//   --warmup     parse the source N times (default 20), then sleep 1s (so V8 can
//                finish compiling), before the parse that --time measures
//
// Output (stdout), always a JSON envelope:
// {
//   ast:            AST tree (POJO) or null,
//   comments:       [{type: "inline"|"line"|"embdoc", start, end}],
//   magic_comments: [{key, value}],
//   errors:         [{type: "<snake_case error name>", message, level, start, end}],
//   warnings:       [{type: "<snake_case warning name>", message, level, start, end}],
//   data_loc:       {start,end} | null,
//   tokens:         [{type:"PM_TOKEN_...", value, start, end}]  (lex mode only)
// }

import { parseWithMetadata, lexWithMetadata, getLastParseMs, envelopeOffsetsToBytes } from "./index.mjs";
import {
  pm_options_line_set,
  pm_options_filepath_set,
  pm_options_encoding_set,
  pm_options_frozen_string_literal_set,
  pm_options_version_set,
  pm_options_partial_script_set,
  pm_options_main_script_set,
  pm_options_command_line_set,
  pm_options_scopes_init,
  pm_options_scope_init,
  pm_options_scope_forwarding_set,
  PM_OPTIONS_SCOPE_FORWARDING_POSITIONALS,
  PM_OPTIONS_SCOPE_FORWARDING_KEYWORDS,
  PM_OPTIONS_SCOPE_FORWARDING_BLOCK,
  PM_OPTIONS_SCOPE_FORWARDING_ALL,
} from "./options.mjs";
import { readFileSync } from "node:fs";

const FORWARDING_FLAGS = {
  "*": PM_OPTIONS_SCOPE_FORWARDING_POSITIONALS,
  "**": PM_OPTIONS_SCOPE_FORWARDING_KEYWORDS,
  "&": PM_OPTIONS_SCOPE_FORWARDING_BLOCK,
  "...": PM_OPTIONS_SCOPE_FORWARDING_ALL,
};

function usage() {
  process.stderr.write(
    "usage: exe/potch [-e <code> | --stdin] [--json-in] [--lex] [--time] [--warmup[=N]]\n"
  );
  process.exit(2);
}

function parseArgs(argv) {
  let code = null;
  let jsonIn = false;
  let lex = false;
  let time = false;
  let warmup = 0;
  let useStdin = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-e" || arg === "--eval") {
      if (i + 1 >= argv.length) usage();
      code = argv[++i];
    } else if (arg === "--json-in") {
      jsonIn = true;
    } else if (arg === "--json-out") {
      // JSON is already the default output format; accepted for parity.
    } else if (arg === "--stdin") {
      useStdin = true;
    } else if (arg === "--lex") {
      lex = true;
    } else if (arg === "--time") {
      time = true;
    } else if (arg === "--warmup") {
      warmup = 20;
    } else if (arg.startsWith("--warmup=")) {
      warmup = Number(arg.slice("--warmup=".length)) || 1;
    } else if (arg.startsWith("--eval=")) {
      code = arg.slice("--eval=".length);
    } else {
      usage();
    }
  }
  return { code, jsonIn, lex, time, warmup, useStdin };
}

const { code: codeArg, jsonIn, lex: lexCli, time: timeCli, warmup: warmupCli, useStdin } =
  parseArgs(process.argv.slice(2));

let wantTime = timeCli;
let wantWarmup = warmupCli;

let input;
if (useStdin || codeArg === null) {
  input = readFileSync(0, "utf-8");
} else {
  input = codeArg;
}

let source_text = input;
let options = null; // { filepath?, line? }
let wantLex = lexCli;

if (jsonIn) {
  const parsedInput = JSON.parse(input);
  source_text = parsedInput.source ?? "";
  // Pass every recognized option field straight through.
  options = {};
  for (const key of ["filepath", "line", "encoding", "frozen_string_literal",
                     "version", "partial_script", "main_script", "command_line", "scopes"]) {
    if (parsedInput[key] !== undefined) options[key] = parsedInput[key];
  }
  if (parsedInput.lex === true) wantLex = true;
  if (parsedInput.time === true) wantTime = true;
  if (parsedInput.warmup === true) wantWarmup = 20;
  if (typeof parsedInput.warmup === "number") wantWarmup = parsedInput.warmup;
}

function buildOptions(optsIn) {
  if (optsIn === null) return null;
  const options = {};
  if (optsIn.filepath != null) pm_options_filepath_set(options, optsIn.filepath);
  if (optsIn.line != null) pm_options_line_set(options, optsIn.line);
  if (optsIn.encoding != null) pm_options_encoding_set(options, optsIn.encoding);
  if (optsIn.frozen_string_literal != null) {
    pm_options_frozen_string_literal_set(options, optsIn.frozen_string_literal);
  }
  if (optsIn.version != null) pm_options_version_set(options, optsIn.version, optsIn.version.length);
  if (optsIn.partial_script != null) pm_options_partial_script_set(options, optsIn.partial_script);
  if (optsIn.main_script != null) pm_options_main_script_set(options, optsIn.main_script);
  if (optsIn.command_line != null) pm_options_command_line_set(options, optsIn.command_line);
  if (Array.isArray(optsIn.scopes)) {
    pm_options_scopes_init(options, optsIn.scopes.length);
    optsIn.scopes.forEach((scopeSpec, index) => {
      const scope = options.scopes[index];
      const locals = Array.isArray(scopeSpec?.locals) ? scopeSpec.locals : [];
      pm_options_scope_init(scope, locals.length);
      locals.forEach((name, li) => {
        scope.locals[li] = name; // plain string (uni build reads strings)
      });
      for (const fwd of scopeSpec.forwarding ?? []) {
        const flag = FORWARDING_FLAGS[fwd];
        if (flag !== undefined) pm_options_scope_forwarding_set(scope, flag);
      }
    });
  }
  return options;
}

const builtOptions = buildOptions(options);

let warmupMs = null;

if (wantWarmup > 0) {
  // Warm the code paths that --time would otherwise be paying V8's lazy
  // compile cost for, then give the JIT a second to finish tiering up.
  const warmupStarted = performance.now();
  for (let i = 0; i < wantWarmup; i++) {
    if (wantLex) lexWithMetadata(source_text, builtOptions);
    else parseWithMetadata(source_text, builtOptions);
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  warmupMs = performance.now() - warmupStarted;
}

const envelope = wantLex
  ? lexWithMetadata(source_text, builtOptions)
  : parseWithMetadata(source_text, builtOptions);

// Every other backend of the port reports UTF-8 byte offsets; this build's own
// parse()/parseWithMetadata() report UTF-16 code-unit offsets (the point
// of the "uni" build for real JS consumers). Convert only here, in this
// wire-format envelope - not in the API those functions return.
//
// envelopeOffsetsToBytes() also pre-renders BigInt and FloatNode#value
// fields into "@@...@@" sentinel strings (see its doc comment in
// index.mjs) in that same tree walk, so the plain JSON.stringify below
// needs no replacer function - just one regex pass to strip the quotes back
// off those sentinels into raw JSON number literals. The float and integer
// patterns are mutually exclusive ("@@F:" can never match "@@-?\d+@@"), so a
// single alternation scans the payload once instead of twice.
const byteEnvelope = envelopeOffsetsToBytes(envelope, source_text);

process.stdout.write(
  JSON.stringify(byteEnvelope, null, "\t")
    .replace(/"@@F:([^"]*)@@"|"@@(-?\d+)@@"/g, (_match, float, integer) => float !== undefined ? float : integer) + "\n"
);

if (wantTime) {
  const ms = getLastParseMs();
  process.stderr.write(`[timing] parse: ${ms === null ? "?" : ms.toFixed(3)} ms\n`);
}

// Reported separately so a benchmark harness can subtract the warmup phase
// from its own wall-clock measurement instead of counting it as parse cost.
if (warmupMs !== null) {
  process.stderr.write(`[timing] warmup: ${warmupMs.toFixed(3)} ms\n`);
}

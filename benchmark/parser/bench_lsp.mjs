// LSP ingest latency vs the raw parser, on the same corpus files.
//
// The parser benchmark (bench_parser.mjs) times parseWithMetadata warm and
// in-process. This times what exe/lsp costs for the same files at the two
// moments a user feels: opening a file (didOpen -> publishDiagnostics) and
// typing a keystroke (didChange -> publishDiagnostics: push_edits, parse,
// parse+API gates, live re-index, publish), plus a feature request
// (documentSymbol) answered from the parse the gate just left warm.
//
// Methodology mirrors bench_parser.mjs: warm iterations, median of samples,
// fewer samples for big files. One shared server, files opened one at a
// time; the keystroke inserts two spaces on an early line, then deletes
// them, so edits are net-zero and stay valid Ruby.
//
// Usage: node benchmark/parser/bench_lsp.mjs [lsp-exe] [corpus-dir]
import { readFileSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseWithMetadata } from "../../lib/opal/parser/index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LSP = process.argv[2] || join(ROOT, "exe", "lsp");
const CORPUS = process.argv[3] || join(ROOT, "benchmark", "parser", "corpus");

const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];

const proc = spawn(LSP, ["--stdio"]);
proc.stderr.on("data", (d) => console.error(`[lsp stderr] ${d.toString().trim()}`));
let serverExited = null;
proc.on("exit", (code, signal) => {
  serverExited = `server exited (${code ?? signal})`;
  for (const rej of pending.values()) rej({ error: { message: serverExited } });
  pending.clear();
});
let buf = Buffer.alloc(0);
const pending = new Map();
const publishes = []; // {uri, at} - resolved by ingest waits
proc.stdout.on("data", (d) => {
  buf = Buffer.concat([buf, d]);
  for (;;) {
    const h = buf.indexOf("\r\n\r\n");
    if (h < 0) return;
    const len = +/Content-Length: (\d+)/.exec(buf.subarray(0, h))[1];
    if (buf.length < h + 4 + len) return;
    const msg = JSON.parse(buf.subarray(h + 4, h + 4 + len).toString());
    buf = buf.subarray(h + 4 + len);
    if (msg.method === "textDocument/publishDiagnostics") {
      publishes.push({ uri: msg.params.uri, at: performance.now() });
    } else if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});
let id = 0;
function send(m) {
  const b = Buffer.from(JSON.stringify(m));
  proc.stdin.write(`Content-Length: ${b.length}\r\n\r\n${b}`);
}
function request(method, params) {
  const mid = ++id;
  const p = new Promise((res) => pending.set(mid, res));
  send({ jsonrpc: "2.0", id: mid, method, params });
  return p;
}
// Await the publishDiagnostics this send is guaranteed to produce (the
// server is single-threaded and answers FIFO: the publish for this change
// is the next one for this uri).
function sendAwaitPublish(m, uri) {
  const at = () => {
    for (let i = publishes.length - 1; i >= 0; i--) {
      if (publishes[i].uri === uri) {
        const t = publishes[i].at;
        publishes.length = 0;
        return t;
      }
    }
    return null;
  };
  const started = performance.now();
  send(m);
  return new Promise((res, rej) => {
    const poll = () => {
      const t = at();
      if (t !== null) res(t - started);
      else if (serverExited) rej(new Error(serverExited));
      else setImmediate(poll);
    };
    poll();
  });
}

async function main() {
  // rootUri null on purpose: a real workspace root would put the whole
  // checkout index into the initialize path and dominate every number.
  // This benchmark isolates per-document costs.
  await request("initialize", {
    capabilities: {},
    processId: process.pid,
    rootUri: null,
  });
  send({ jsonrpc: "2.0", method: "initialized", params: {} });

  const files = readdirSync(CORPUS).filter((f) => f.endsWith(".rb")).sort();
  console.log(
    "| file | bytes | parse_ms | open_ms | keystroke_ms | keystroke/parse | symbols_ms |",
  );
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  const totals = { bytes: 0, parse: 0, open: 0, keystroke: 0, symbols: 0 };

  for (const f of files) {
    console.error(`[bench] ${f}`);
    const src = readFileSync(join(CORPUS, f), "utf8");
    const uri = "file://" + join(CORPUS, f);
    const bytes = Buffer.byteLength(src);
    const big = src.length > 300000, mid = src.length > 30000;

    // Baseline: identical to bench_parser.mjs.
    const warm = big ? 5 : 20, runs = big ? 5 : (mid ? 11 : 21);
    const ts = [];
    for (let i = 0; i < warm + runs; i++) {
      const s = performance.now();
      parseWithMetadata(src);
      const e = performance.now();
      if (i >= warm) ts.push(e - s);
    }
    const parseMs = med(ts);

    // Open: didClose + didOpen cycles (the open path re-runs everything).
    const openRuns = big ? 3 : 7;
    const opens = [];
    for (let i = 0; i < openRuns; i++) {
      send({ jsonrpc: "2.0", method: "textDocument/didClose", params: { textDocument: { uri } } });
      opens.push(await sendAwaitPublish({
        jsonrpc: "2.0", method: "textDocument/didOpen",
        params: { textDocument: { uri, languageId: "ruby", version: 1, text: src } },
      }, uri));
    }

    // Keystroke: a two-space indent insert then its deletion, alternating
    // so the buffer is net-unchanged and stays parseable.
    let version = 2;
    const editRuns = big ? 4 : 10;
    const edits = [];
    for (let i = 0; i < editRuns; i++) {
      const insert = i % 2 === 0;
      edits.push(await sendAwaitPublish({
        jsonrpc: "2.0", method: "textDocument/didChange",
        params: {
          textDocument: { uri, version: version++ },
          contentChanges: [insert
            ? { range: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } }, text: "  " }
            : { range: { start: { line: 4, character: 0 }, end: { line: 4, character: 2 } }, text: "" }],
        },
      }, uri));
    }

    // Feature on the parse the gate left warm.
    const symRuns = big ? 3 : 7;
    const syms = [];
    let rootCount = 0;
    for (let i = 0; i < symRuns; i++) {
      const s = performance.now();
      const a = await request("textDocument/documentSymbol", { textDocument: { uri } });
      syms.push(performance.now() - s);
      rootCount = (a.result || []).length;
    }

    const openMs = med(opens), keyMs = med(edits), symMs = med(syms);
    console.log(
      `| ${f.replace(/^\d+_/, "")} | ${bytes} | ${parseMs.toFixed(2)} | ${openMs.toFixed(2)} | ` +
      `${keyMs.toFixed(2)} | ${(keyMs / parseMs).toFixed(1)}x (${rootCount} roots) | ${symMs.toFixed(2)} |`,
    );
    totals.bytes += bytes; totals.parse += parseMs; totals.open += openMs;
    totals.keystroke += keyMs; totals.symbols += symMs;
  }

  console.log(
    `| **total** | ${totals.bytes} | ${totals.parse.toFixed(1)} | ${totals.open.toFixed(1)} | ` +
    `${totals.keystroke.toFixed(1)} | ${(totals.keystroke / totals.parse).toFixed(1)}x | ${totals.symbols.toFixed(1)} |`,
  );
  proc.kill();
}

main();

// The `opal-language-server` command (lib/opal/exe/lsp.rb, built by
// tasks/lsp.mjs): drive exe/lsp over stdio the way an LSP client does.
// The spawn stays asynchronous (AGENTS.md lesson): spawnSync would block
// the event loop that pipes the frames to the server.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const LSP = join(OPAL_ROOT, "exe", "lsp");

// The version the server must answer comes from the single source (LSP.md §0).
const OPAL_VERSION = /OPAL_VERSION = "([^"]+)"/.exec(
  readFileSync(join(OPAL_ROOT, "opal", "corelib", "version.mjs"), "utf8"))[1];

function frame(object) {
  const json = JSON.stringify(object);
  return `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`;
}

// Spawns exe/lsp and parses its framed stdout into messages; next()
// answers the next message in order.
const servers = [];
function startServer() {
  const child = spawn(process.execPath, [LSP], { stdio: ["pipe", "pipe", "pipe"] });
  servers.push(child);
  const queue = [];
  const waiters = [];
  let buffer = Buffer.alloc(0);
  let exited = null;
  const exitPromise = new Promise((resolve) => { exited = resolve; });
  child.on("close", (code) => exited(code));

  child.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    let sep;
    while ((sep = buffer.indexOf("\r\n\r\n")) >= 0) {
      const headers = buffer.subarray(0, sep).toString("latin1");
      const match = /content-length:\s*(\d+)/i.exec(headers);
      assert.ok(match, `framing: header block without Content-Length: ${headers}`);
      const length = Number(match[1]);
      if (buffer.length < sep + 4 + length) break;
      const message = JSON.parse(buffer.subarray(sep + 4, sep + 4 + length).toString("utf8"));
      buffer = buffer.subarray(sep + 4 + length);
      if (waiters.length) waiters.shift()(message); else queue.push(message);
    }
  });
  child.stderr.resume();
  child.stdin.on("error", () => {}); // EPIPE once the server has exited

  return {
    send: (object) => child.stdin.write(frame(object)),
    endStdin: () => child.stdin.end(),
    next: (timeout = 20000) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no answer from the server")), timeout);
      const deliver = (message) => { clearTimeout(timer); resolve(message); };
      if (queue.length) deliver(queue.shift()); else waiters.push(deliver);
      exitPromise.then((code) => reject(new Error(`server exited (${code}) before answering`)));
    }),
    exitCode: () => exitPromise,
    kill: () => child.kill(),
  };
}

const INITIALIZE = {
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: {
    processId: process.pid,
    clientInfo: { name: "lsp_cli.test" },
    workspaceFolders: null,
    capabilities: {},
  },
};

// initialize -> initialized, the handshake every client starts with.
async function handshake() {
  const client = startServer();
  client.send(INITIALIZE);
  const answer = await client.next();
  assert.equal(answer.id, 1);
  client.send({ jsonrpc: "2.0", method: "initialized" });
  return client;
}

describe("the opal-language-server command", () => {
  before(() => {
    const build = spawnSync(process.execPath, [join(OPAL_ROOT, "tasks", "lsp.mjs")], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stderr);
  });

  test("--version answers the single-source version", () => {
    const run = spawnSync(process.execPath, [LSP, "--version"], { encoding: "utf8" });
    assert.equal(run.status, 0);
    assert.match(run.stdout, new RegExp(`opal-language-server ${OPAL_VERSION} \\(Opal ${OPAL_VERSION}\\)`));
  });

  test("initialize answers the capabilities and serverInfo", async () => {
    const client = startServer();
    client.send(INITIALIZE);
    const answer = await client.next();
    assert.equal(answer.jsonrpc, "2.0");
    assert.equal(answer.id, 1);
    assert.equal(answer.result.serverInfo.name, "opal-language-server");
    assert.equal(answer.result.serverInfo.version, OPAL_VERSION);
    // LSP 3.18 negotiation: JS strings are UTF-16, and the parser reports
    // UTF-16 offsets, so utf-16 is the only encoding offered.
    assert.equal(answer.result.capabilities.positionEncoding, "utf-16");
    assert.equal(answer.result.capabilities.textDocumentSync.openClose, true);
    assert.equal(answer.result.capabilities.textDocumentSync.change, 2); // Incremental
    // P2 features are advertised
    assert.equal(answer.result.capabilities.documentSymbolProvider, true);
    assert.equal(answer.result.capabilities.foldingRangeProvider, true);
    assert.equal(answer.result.capabilities.selectionRangeProvider, true);
    client.send({ jsonrpc: "2.0", method: "initialized" });
    client.send({ jsonrpc: "2.0", method: "exit" });
    assert.equal(await client.exitCode(), 1); // exit without shutdown: status 1 per spec
  });

  test("unknown requests answer MethodNotFound, unknown notifications are ignored", async () => {
    const client = await handshake();
    client.send({ jsonrpc: "2.0", method: "textDocument/didOpen", params: {} }); // notification: no answer
    client.send({ jsonrpc: "2.0", id: 7, method: "bogus/request", params: {} });
    const answer = await client.next();
    assert.equal(answer.id, 7);
    assert.equal(answer.error.code, -32601);
    assert.match(answer.error.message, /bogus\/request/);
    // shutdown is the next message the server answers: didOpen produced none.
    client.send({ jsonrpc: "2.0", id: 8, method: "shutdown" });
    const shutdown = await client.next();
    assert.equal(shutdown.id, 8);
    assert.equal(shutdown.result, null);
    client.send({ jsonrpc: "2.0", method: "exit" });
    assert.equal(await client.exitCode(), 0);
  });

  test("stdin closing ends the loop (a client that just hangs up)", async () => {
    const client = await handshake();
    client.endStdin();
    assert.equal(await client.exitCode(), 0); // Opal exits 0 when the process ends normally
  });

  // ---- P1: document sync + the parse gate ----

  function openDoc(client, uri, text, languageId = "ruby") {
    client.send({ jsonrpc: "2.0", method: "textDocument/didOpen",
      params: { textDocument: { uri, languageId, version: 1, text } } });
    return client.next();
  }

  function changeDoc(client, uri, version, changes) {
    client.send({ jsonrpc: "2.0", method: "textDocument/didChange",
      params: { textDocument: { uri, version }, contentChanges: changes } });
    return client.next();
  }

  test("didOpen publishes the parse gate with exact positions", async () => {
    const client = await handshake();
    const published = await openDoc(client, "file:///t_open.rb", "def foo(\nputs 1\n");
    assert.equal(published.method, "textDocument/publishDiagnostics");
    assert.equal(published.params.uri, "file:///t_open.rb");
    const error = published.params.diagnostics.find((d) => d.severity === 1);
    assert.ok(error, "an error-severity diagnostic");
    assert.equal(error.source, "opal");
    assert.equal(error.code, "def_params_term_paren");
    // the missing ')' is reported at the newline after it (0-based)
    assert.deepEqual([error.range.start.line, error.range.start.character], [1, 5]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("an incremental edit that closes the paren clears the diagnostics", async () => {
    const client = await handshake();
    await openDoc(client, "file:///t_fix.rb", "puts (1");
    const published = await changeDoc(client, "file:///t_fix.rb", 2, [
      { range: { start: { line: 0, character: 7 }, end: { line: 0, character: 7 } }, text: ")" },
    ]);
    assert.deepEqual(published.params.diagnostics, []);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("edits and positions count UTF-16 units around a surrogate pair", async () => {
    const client = await handshake();
    // line 0 is 'print "𠀀"': the U+20000 pair occupies UTF-16 units 7..8
    // and the line is 10 units long (counting code points would say 9) -
    // the AGENTS.md lesson that character offsets answer in characters and
    // lie past a surrogate pair, pinned on the document splice.
    await openDoc(client, "file:///t_utf16.rb", 'print "𠀀"');
    // insert '(' at the end of line 0: character 10, one unit past the pair
    let published = await changeDoc(client, "file:///t_utf16.rb", 2, [
      { range: { start: { line: 0, character: 10 }, end: { line: 0, character: 10 } }, text: "(" },
    ]);
    assert.ok(published.params.diagnostics.length > 0, "the inserted '(' opens an unterminated expression");
    const unterminated = published.params.diagnostics.find((d) => d.range.start.line === 0);
    assert.ok(unterminated, "the error lands on line 0, after the astral character");
    // replace the pair itself (units 7..9) with an X, then drop the '(':
    // after the pair collapses to one unit the '(' sits at 9, not 10
    published = await changeDoc(client, "file:///t_utf16.rb", 3, [
      { range: { start: { line: 0, character: 7 }, end: { line: 0, character: 9 } }, text: "X" },
    ]);
    assert.ok(published.params.diagnostics.length > 0, "still only the '(' dangling");
    published = await changeDoc(client, "file:///t_utf16.rb", 4, [
      { range: { start: { line: 0, character: 9 }, end: { line: 0, character: 10 } }, text: "" },
    ]);
    // 'print "X"' parses clean with no warnings: any off-by-two UTF-16 math
    // in the splices above would have left broken syntax here.
    assert.deepEqual(published.params.diagnostics, []);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("a non-ruby document answers no diagnostics", async () => {
    const client = await handshake();
    client.send({ jsonrpc: "2.0", method: "textDocument/didOpen",
      params: { textDocument: { uri: "file:///t.txt", languageId: "plaintext", version: 1, text: "def foo(" } } });
    client.send({ jsonrpc: "2.0", id: 9, method: "shutdown" });
    const answer = await client.next();
    assert.equal(answer.id, 9); // shutdown is the next thing answered: no publish came
    client.send({ jsonrpc: "2.0", method: "exit" });
    assert.equal(await client.exitCode(), 0);
  });

  test("--check parse-gates a tree and exits 1 listing the errors", () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-lsp-check-"));
    try {
      writeFileSync(join(dir, "bad.rb"), "def foo(\nputs 1\n");
      writeFileSync(join(dir, "good.rb"), "puts 1\n");
      const run = spawnSync(process.execPath, [LSP, "--check", dir], { encoding: "utf8" });
      assert.equal(run.status, 1);
      assert.match(run.stdout, /bad\.rb:2:6: error: .*def_params_term_paren/);
      assert.match(run.stdout, /bad\.rb:1:1: error: .*def_term/);
      assert.doesNotMatch(run.stdout, /good\.rb/);
      assert.match(run.stdout, /2 files, 3 errors/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // ---- P2: AST features ----

  const TREE_SRC = [
    "# header one",
    "# header two",
    'require "json"',
    'require "set"',
    "",
    "CONST = 42",
    "class Foo < Bar",
    "  def baz(x)",
    "    x",
    "  end",
    "end",
    "",
  ].join("\n");

  async function openTree(client) {
    await openDoc(client, "file:///tree.rb", TREE_SRC);
  }

  function request(client, id, method, params) {
    client.send({ jsonrpc: "2.0", id, method, params });
    return client.next();
  }

  test("documentSymbol nests the declarations under their class", async () => {
    const client = await handshake();
    await openTree(client);
    const answer = await request(client, 20, "textDocument/documentSymbol", { textDocument: { uri: "file:///tree.rb" } });

    const names = answer.result.map((s) => [s.name, s.kind]);
    assert.deepEqual(names, [["CONST", 14], ["Foo", 5]]); // Constant, Class

    const foo = answer.result.find((s) => s.name === "Foo");
    // the class body's def nests under the class, its range is the whole
    // class node while the selection range is just the name
    assert.deepEqual(foo.range.start, { line: 6, character: 0 });
    assert.deepEqual(foo.selectionRange.start, { line: 6, character: 6 });
    assert.deepEqual(foo.children.map((s) => [s.name, s.kind]), [["baz", 6]]); // Method
    const baz = foo.children[0];
    assert.deepEqual(baz.selectionRange.start, { line: 7, character: 6 }); // "def baz"
    assert.equal(baz.range.end.line, 9); // the def's `end`

    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("foldingRange folds comments, imports and the keyword blocks", async () => {
    const client = await handshake();
    await openTree(client);
    const answer = await request(client, 21, "textDocument/foldingRange", { textDocument: { uri: "file:///tree.rb" } });
    assert.deepEqual(answer.result, [
      { startLine: 0, endLine: 1, kind: "comment" }, // the two adjacent # lines
      { startLine: 2, endLine: 3, kind: "imports" }, // the require run
      { startLine: 6, endLine: 10, kind: "region" }, // class ... end
      { startLine: 7, endLine: 9, kind: "region" }, // def ... end
    ]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("selectionRange answers the enclosing chain from the cursor out", async () => {
    const client = await handshake();
    await openTree(client);
    // cursor on the `x` body reference, line 8 "    x"
    const answer = await request(client, 22, "textDocument/selectionRange", {
      textDocument: { uri: "file:///tree.rb" },
      positions: [{ line: 8, character: 4 }],
    });

    const chain = [];
    for (let range = answer.result[0]; range; range = range.parent) {
      chain.push([range.range.start.line, range.range.start.character, range.range.end.line, range.range.end.character]);
    }
    // innermost: the x reference itself... then the def body, the def, the class
    assert.deepEqual(chain[0], [8, 4, 8, 5]); // x
    const [defLine] = chain[chain.length - 2]; // class node
    assert.deepEqual(chain[chain.length - 1], [2, 0, 10, 3]); // top statements (== program, deduped)
    assert.ok(chain.some(([, , line]) => line === 9)); // the def's end line appears on the way out
    assert.ok(defLine === 6);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  after(() => {
    // Every test closes its own server through "exit"; this catches any
    // child left alive by a failed assertion so the suite can't hang.
    for (const child of servers) if (child.exitCode === null) child.kill();
  });
});

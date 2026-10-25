// The `opal-language-server` command (lib/opal/language/server/, built
// into exe/lsp by tasks/lsp.mjs): drive it over stdio the way an LSP
// client does.
// The spawn stays asynchronous (AGENTS.md lesson): spawnSync would block
// the event loop that pipes the frames to the server.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

// The parity scoreboard of LSP.md §13: LSP_EXE points the suite at another
// server entry (the JS port's dev tree) while the bundle-shape case stays
// pinned to the committed exe/lsp below.
const LSP_BUNDLE = join(OPAL_ROOT, "exe", "lsp");
const LSP = process.env.LSP_EXE ? resolve(OPAL_ROOT, process.env.LSP_EXE) : LSP_BUNDLE;

// The version the server must answer comes from the single source (LSP.md §0).
const OPAL_VERSION = /OPAL_VERSION = "([^"]+)"/.exec(
  readFileSync(join(OPAL_ROOT, "opal", "corelib", "version.mjs"), "utf8"))[1];

function frame(object) {
  const json = JSON.stringify(object);
  return `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`;
}

// Spawns exe/lsp and parses its framed stdout into messages; next()
// answers the next message in order. opts.env augments the child's
// environment (P3 tests give it another HOME for the corelib dump).
const servers = [];
function startServer(opts = {}) {
  const child = spawn(process.execPath, [LSP], {
    stdio: ["pipe", "pipe", "pipe"],
    env: opts.env ? { ...process.env, ...opts.env } : process.env,
  });
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
// opts.initializationOptions and opts.env go through to the child (P3).
async function handshake(opts = {}) {
  const client = startServer(opts);
  client.send({
    ...INITIALIZE,
    params: {
      ...INITIALIZE.params,
      ...(opts.initializationOptions ? { initializationOptions: opts.initializationOptions } : {}),
    },
  });
  const answer = await client.next();
  assert.equal(answer.id, 1);
  client.send({ jsonrpc: "2.0", method: "initialized" });
  return client;
}

describe("the opal-language-server command", () => {
  before(() => {
    if (process.env.LSP_EXE) return; // the substitute is run as-is (LSP.md §13)
    const build = spawnSync(process.execPath, [join(OPAL_ROOT, "tasks", "lsp.mjs")], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stderr);
  });

  test("--version answers the single-source version", () => {
    const run = spawnSync(process.execPath, [LSP, "--version"], { encoding: "utf8" });
    assert.equal(run.status, 0);
    assert.match(run.stdout, new RegExp(`opal-language-server ${OPAL_VERSION} \\(Opal ${OPAL_VERSION}\\)`));
  });

  test("the bundle bakes no checkout path (relocatable exe)", () => {
    const bundle = readFileSync(LSP_BUNDLE, "utf8");
    assert.ok(!bundle.includes(OPAL_ROOT), "exe/lsp must not name the checkout it was built in");
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
    // P3 navigation features are advertised
    assert.equal(answer.result.capabilities.definitionProvider, true);
    assert.equal(answer.result.capabilities.referencesProvider, true);
    assert.deepEqual(answer.result.capabilities.renameProvider, { prepareProvider: true });
    assert.equal(answer.result.capabilities.workspaceSymbolProvider, true);
    // P4 features are advertised
    assert.equal(answer.result.capabilities.hoverProvider, true);
    assert.deepEqual(answer.result.capabilities.signatureHelpProvider.triggerCharacters, ["(", ","]);
    assert.equal(answer.result.capabilities.typeHierarchyProvider, true);
    assert.equal(answer.result.capabilities.completionProvider.resolveProvider, true);
    assert.ok(answer.result.capabilities.completionProvider.triggerCharacters.includes("."));
    // P5 gates: the compile gate needs save, the fixes advertise quickfixes
    assert.deepEqual(answer.result.capabilities.textDocumentSync.save, { includeText: false });
    assert.deepEqual(answer.result.capabilities.codeActionProvider, { codeActionKinds: ["quickfix", "refactor.extract"] });
    assert.deepEqual(answer.result.capabilities.diagnosticProvider, { interFileDependencies: false, workspaceDiagnostics: false });
    assert.equal(answer.result.capabilities.documentFormattingProvider, undefined); // none configured
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

  test("documentSymbol keeps a recovered half-typed def inside its range", async () => {
    const client = await handshake();
    // The mid-typing state: `def ` with the name not typed yet. Prism error
    // recovery gives a DefNode with an empty name and a synthetic name loc
    // *past* the truncated node location; VS Code drops the whole response
    // unless every selectionRange is contained in its range.
    await openDoc(client, "file:///half.rb", "class Foo\n  def one\n  end\n\n  def ");
    const answer = await request(client, 30, "textDocument/documentSymbol", { textDocument: { uri: "file:///half.rb" } });

    const within = (r, sel) =>
      (sel.start.line > r.start.line || (sel.start.line === r.start.line && sel.start.character >= r.start.character)) &&
      (sel.end.line < r.end.line || (sel.end.line === r.end.line && sel.end.character <= r.end.character));
    const check = (symbols) => symbols.forEach((s) => {
      assert.ok(within(s.range, s.selectionRange), `${s.name || "<empty>"}: selectionRange outside range`);
      check(s.children || []);
    });
    check(answer.result);

    const foo = answer.result.find((s) => s.name === "Foo");
    assert.ok(foo.children.some((s) => s.name === "one"));
    const half = foo.children.find((s) => s.name === ""); // the half-typed def
    assert.ok(half, "the half-typed def should still appear as a symbol");
    assert.deepEqual(half.selectionRange.start, half.range.end); // clamped to the node end
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("documentSymbol answers a response bigger than the stdout pipe buffer", { timeout: 30000 }, async () => {
    // ~400KB of symbols, more than the 64KB the stdout pipe drains inline:
    // with process.stdout.write the tail sat in libuv's async queue that
    // the synchronous readSync loop never pumped, and the request hung
    // until the client happened to send another message (deadlock fixed
    // by fs.writeSync in Transport#write).
    const big = "module BigFile\n" +
      Array.from({ length: 2000 }, (_, i) => `  def m${i}; end`).join("\n") +
      "\nend\n";
    const client = await handshake();
    await openDoc(client, "file:///big.rb", big);
    const answer = await request(client, 40, "textDocument/documentSymbol", { textDocument: { uri: "file:///big.rb" } });
    assert.equal(answer.result.length, 1);
    assert.equal(answer.result[0].children.length, 2000);
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

  // ---- P2: the editor-coloring and typing features ----

  function decodeTokens(data) {
    const tokens = [];
    let line = 0;
    let character = 0;
    for (let i = 0; i < data.length; i += 5) {
      line += data[i];
      character = data[i] === 0 ? character + data[i + 1] : data[i + 1];
      tokens.push({ line, character, length: data[i + 2], type: data[i + 3], modifiers: data[i + 4] });
    }
    return tokens;
  }

  test("documentHighlight lights an ivar's read and write with the right kinds", async () => {
    const client = await handshake();
    await openDoc(client, "file:///hl.rb", "def run\n  @count = 1\n  puts @count\nend\n");
    // cursor inside @count on the read line (its `o`)
    const answer = await request(client, 23, "textDocument/documentHighlight", {
      textDocument: { uri: "file:///hl.rb" },
      position: { line: 2, character: 9 },
    });

    const listed = answer.result.map((h) => [
      h.range.start.line, h.range.start.character, h.range.end.character, h.kind,
    ]);
    // source order: the write (kind 3) then the read (kind 2)
    assert.deepEqual(listed, [[1, 2, 8, 3], [2, 7, 13, 2]]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("semanticTokens/full delta-encodes the class, def and calls", async () => {
    const client = await handshake();
    await openDoc(client, "file:///st.rb", "class Foo\n  def bar\n    baz\n  end\nend\n");
    const answer = await request(client, 24, "textDocument/semanticTokens/full", { textDocument: { uri: "file:///st.rb" } });

    const tokens = decodeTokens(answer.result.data);
    // legend indexes: namespace 0, class 1, method 2, function 3,
    // parameter 4, property 5, variable 6; modifier declaration = 1
    assert.deepEqual(
      tokens.filter((t) => t.type === 1 || (t.type === 2 && t.modifiers === 1)),
      [
        { line: 0, character: 6, length: 3, type: 1, modifiers: 0 }, // Foo (class)
        { line: 1, character: 6, length: 3, type: 2, modifiers: 1 }, // bar (def, declaration)
      ],
    );
    // bare call `baz` is a function token on line 2
    assert.ok(tokens.some((t) => t.line === 2 && t.type === 3 && t.character === 4 && t.length === 3));
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("initialize advertises the semantic tokens legend", async () => {
    const client = startServer();
    client.send(INITIALIZE);
    const answer = await client.next();
    assert.deepEqual(answer.result.capabilities.semanticTokensProvider.legend.tokenTypes, [
      "namespace", "class", "method", "function", "parameter", "property", "variable",
    ]);
    assert.equal(answer.result.capabilities.semanticTokensProvider.full, true);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("inlayHint annotates a bare rescue and the hash shorthand", async () => {
    const client = await handshake();
    await openDoc(client, "file:///ih.rb", "begin\n  risky\nrescue\n  safe\nend\n\nname = 1\nputs({name: })\n");
    const answer = await request(client, 25, "textDocument/inlayHint", {
      textDocument: { uri: "file:///ih.rb" },
      range: { start: { line: 0, character: 0 }, end: { line: 7, character: 0 } },
    });

    const hints = answer.result.map((h) => [h.label, h.position.line, h.position.character]);
    assert.deepEqual(hints, [
      ["#rescued_value", 2, 6], // right after the bare `rescue`
      ["name", 7, 11], // echoing the omitted value of `{name: }`
    ]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("onTypeFormatting completes `end` after an unfinished def on newline", async () => {
    const client = await handshake();
    await openDoc(client, "file:///ot.rb", "class Foo\n  def bar\n");
    const answer = await request(client, 26, "textDocument/onTypeFormatting", {
      textDocument: { uri: "file:///ot.rb" },
      position: { line: 2, character: 0 },
      ch: "\n",
    });

    assert.equal(answer.result.length, 1);
    assert.equal(answer.result[0].newText, "\n  end");
    assert.deepEqual(answer.result[0].range.start, { line: 2, character: 0 });
    assert.deepEqual(answer.result[0].range.end, { line: 2, character: 0 });
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("onTypeFormatting continues a comment on newline and indents after typed end", async () => {
    const client = await handshake();
    await openDoc(client, "file:///ot2.rb", "# hello\n");
    const comment = await request(client, 27, "textDocument/onTypeFormatting", {
      textDocument: { uri: "file:///ot2.rb" },
      position: { line: 1, character: 0 },
      ch: "\n",
    });
    assert.deepEqual(comment.result.map((e) => e.newText), ["# "]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  // ---- P2: the Opal-specific custom requests ----

  test("opalLsp/showSyntaxTree answers the Prism AST as JSON", async () => {
    const client = await handshake();
    await openTree(client);
    const answer = await request(client, 28, "opalLsp/showSyntaxTree", { textDocument: { uri: "file:///tree.rb" } });

    const ast = JSON.parse(answer.result.ast);
    assert.equal(ast.type, "ProgramNode");
    const classNames = ast.statements.body.filter((n) => n.type === "ClassNode").map((n) => n.name);
    assert.deepEqual(classNames, ["Foo"]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("opalLsp/compileToJs compiles, and answers the compiler error on bad source", async () => {
    const client = await handshake();
    await openTree(client);
    const ok = await request(client, 29, "opalLsp/compileToJs", { textDocument: { uri: "file:///tree.rb" } });
    assert.match(ok.result.code, /Foo/); // the compiled JS carries the class

    await openDoc(client, "file:///bad.rb", "def foo(\n");
    const bad = await request(client, 30, "opalLsp/compileToJs", { textDocument: { uri: "file:///bad.rb" } });
    assert.match(bad.result.error.message, /expected a `\)`/);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  // ---- P3: the index and its navigation features ----

  test("definition follows a constant to corelib in the checkout", async () => {
    const client = await handshake({ initializationOptions: { opalHome: OPAL_ROOT } });
    await openDoc(client, "file:///p3_const.rb", "String\n");
    const answer = await request(client, 31, "textDocument/definition", {
      textDocument: { uri: "file:///p3_const.rb" },
      position: { line: 0, character: 2 },
    });
    // String reopens across corelib and stdlib; the primary declaration is
    // the `class String` line, its *name* segment as the definition range.
    const primary = answer.result.find((l) => l.uri.endsWith("/opal/corelib/string.rb"));
    assert.ok(primary, "one definition lands in corelib/string.rb");
    assert.deepEqual([primary.range.start.line, primary.range.start.character], [39, 6]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("F12 on a literal receiver's method reaches the corelib definition", async () => {
    const client = await handshake({ initializationOptions: { opalHome: OPAL_ROOT } });
    await openDoc(client, "file:///p3_gsub.rb", '"a".gsub("b", "c")\n');
    const answer = await request(client, 32, "textDocument/definition", {
      textDocument: { uri: "file:///p3_gsub.rb" },
      position: { line: 0, character: 4 }, // inside the gsub message
    });
    // the LSP.md §2 heuristic: a String literal receiver resolves against
    // String and its ancestors, no type inference - the P3 exit criterion
    assert.equal(answer.result.length, 1);
    assert.ok(answer.result[0].uri.endsWith("/opal/corelib/string.rb"));
    assert.equal(answer.result[0].range.start.line, 1663); // def gsub
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("cross-document methods: definition, references and rename share one index", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p3_def.rb", "class Widget\n  def self.spin\n    1\n  end\nend\n");
    await openDoc(client, "file:///p3_call.rb", "Widget.spin\n");

    const def = await request(client, 33, "textDocument/definition", {
      textDocument: { uri: "file:///p3_call.rb" },
      position: { line: 0, character: 8 },
    });
    assert.equal(def.result.length, 1);
    assert.equal(def.result[0].uri, "file:///p3_def.rb");
    assert.deepEqual([def.result[0].range.start.line, def.result[0].range.start.character], [1, 11]);

    const refs = await request(client, 34, "textDocument/references", {
      textDocument: { uri: "file:///p3_call.rb" },
      position: { line: 0, character: 8 },
      context: { includeDeclaration: true },
    });
    // the call site (a live method-reference record) + the declaration
    const sites = refs.result.map((l) => `${l.uri}:${l.range.start.line}:${l.range.start.character}`).sort();
    assert.deepEqual(sites, ["file:///p3_call.rb:0:7", "file:///p3_def.rb:1:11"]);

    const prepared = await request(client, 35, "textDocument/prepareRename", {
      textDocument: { uri: "file:///p3_def.rb" },
      position: { line: 1, character: 12 },
    });
    assert.equal(prepared.result.placeholder, "spin");

    const renamed = await request(client, 36, "textDocument/rename", {
      textDocument: { uri: "file:///p3_def.rb" },
      position: { line: 1, character: 12 },
      newName: "twirl",
    });
    assert.deepEqual(Object.keys(renamed.result.changes).sort(), ["file:///p3_call.rb", "file:///p3_def.rb"]);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("workspace/symbol finds baked modules by substring", async () => {
    const client = await handshake();
    // "compa" (not "compat": the needle must really substring "Comparable",
    // whose fifth letter is an r) also hits Encoding::CompatibilityError and
    // Encoding.compatible? - the index is a name search, not an exact match
    const answer = await request(client, 37, "workspace/symbol", { query: "compa" });
    const hit = answer.result.find((s) => s.name === "Comparable");
    assert.ok(hit, "Comparable answers the substring");
    assert.equal(hit.kind, 2); // SymbolKind.Module
    assert.ok(hit.location.uri.endsWith("/opal/corelib/comparable.rb"));
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("prepareRename refuses a position with no renameable name", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p3_lit.rb", 'x = "text"\n');
    const answer = await request(client, 38, "textDocument/prepareRename", {
      textDocument: { uri: "file:///p3_lit.rb" },
      position: { line: 0, character: 5 }, // inside the string literal
    });
    assert.equal(answer.result, null);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("without opalHome, corelib navigation opens a dumped copy of the source", async () => {
    const home = mkdtempSync(join(tmpdir(), "opal-lsp-home-"));
    try {
      const client = await handshake({ env: { HOME: home } });
      await openDoc(client, "file:///p3_dump.rb", "String\n");
      const answer = await request(client, 39, "textDocument/definition", {
        textDocument: { uri: "file:///p3_dump.rb" },
        position: { line: 0, character: 2 },
      });
      const dumped = answer.result.find((l) => l.uri.includes("/.cache/opal-lsp/sources/"));
      assert.ok(dumped, "the definition points at the cache dump");
      const onDisk = join(home, ".cache/opal-lsp/sources/opal/corelib/string.rb");
      assert.ok(existsSync(onDisk), "the dumped file exists for the editor to open");
      // corelib declares it as `class ::String < `String`` (the JS bridge)
      assert.match(readFileSync(onDisk, "utf8"), /^class ::String/m);
      client.send({ jsonrpc: "2.0", method: "exit" });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  // ---- P4: hover, signature help, type hierarchy ----

  const P4_SRC = "# A spinning widget.\nclass Widget\n  def self.spin(n = 1)\n    n\n  end\n\n  # Turns and spins.\n  def rotate(deg)\n    n = deg\n  end\nend\nWidget.new.rotate(2)\nputs String\nclass MyErr < StandardError\nend\n";

  test("hover renders the declaration and the recorded doc comment", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p4_hover.rb", P4_SRC);

    const klass = await request(client, 40, "textDocument/hover", {
      textDocument: { uri: "file:///p4_hover.rb" },
      position: { line: 1, character: 8 }, // Widget in `class Widget`
    });
    assert.match(klass.result.contents.value, /class Widget/);
    assert.match(klass.result.contents.value, /# A spinning widget\./);

    const meth = await request(client, 41, "textDocument/hover", {
      textDocument: { uri: "file:///p4_hover.rb" },
      position: { line: 7, character: 8 }, // rotate in `def rotate`
    });
    assert.match(meth.result.contents.value, /### Widget#rotate/);
    assert.match(meth.result.contents.value, /def rotate\(deg\)/);
    assert.match(meth.result.contents.value, /Turns and spins/);

    // a call site types through the `Klass.new.m` heuristic
    const call = await request(client, 42, "textDocument/hover", {
      textDocument: { uri: "file:///p4_hover.rb" },
      position: { line: 11, character: 13 }, // rotate in Widget.new.rotate(2)
    });
    assert.match(call.result.contents.value, /### Widget#rotate/);

    // a baked corelib constant answers the declaration shape the index knows
    const string = await request(client, 43, "textDocument/hover", {
      textDocument: { uri: "file:///p4_hover.rb" },
      position: { line: 12, character: 7 }, // String in `puts String`
    });
    assert.match(string.result.contents.value, /class String/);
    assert.match(string.result.contents.value, /include Comparable/);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("signatureHelp answers the recorded parameters and the active one", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p4_sig.rb", '"a".gsub("b", "c")\n');
    const answer = await request(client, 44, "textDocument/signatureHelp", {
      textDocument: { uri: "file:///p4_sig.rb" },
      position: { line: 0, character: 15 }, // inside the second argument
    });
    assert.equal(answer.result.signatures.length, 1);
    assert.match(answer.result.signatures[0].label, /^gsub\(pattern, replacement/);
    assert.equal(answer.result.activeParameter, 1); // one top-level comma typed
    assert.ok(answer.result.signatures[0].parameters.length >= 2);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("type hierarchy walks supertypes and subtypes through the index", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p4_th.rb", P4_SRC);
    const prepared = await request(client, 45, "textDocument/prepareTypeHierarchy", {
      textDocument: { uri: "file:///p4_th.rb" },
      position: { line: 13, character: 8 }, // MyErr in `class MyErr < StandardError`
    });
    assert.equal(prepared.result.length, 1);
    assert.equal(prepared.result[0].name, "MyErr");
    assert.equal(prepared.result[0].kind, 5); // class

    const sups = await request(client, 46, "textDocument/typeHierarchy/supertypes", { item: prepared.result[0] });
    assert.deepEqual(sups.result.map((i) => i.name), ["StandardError"]);

    const item = { name: "Enumerable", kind: 2, data: "Enumerable" };
    const subs = await request(client, 47, "textDocument/typeHierarchy/subtypes", { item });
    assert.ok(subs.result.some((i) => i.name === "Array"), "Array includes Enumerable in corelib");
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("completion answers methods, constants, ivars, keywords and require names", async () => {
    const client = await handshake();
    // lines: 11 `Widget.s`, 12 `Comp`, 13 `Widget.new.rot`, 14 `x = @tur`,
    // 15 `re`, 16 `require "jso` (last: an unterminated string would
    // otherwise swallow the lines below it)
    await openDoc(client, "file:///p4_cmp.rb", P4_SRC.replace(
      "Widget.new.rotate(2)\nputs String\nclass MyErr < StandardError\nend\n",
      "Widget.s\nComp\nWidget.new.rot\nx = @turns = @tur\nre\nrequire \"jso\n",
    ));

    const labels = async (line, character) =>
      (await request(client, 50 + line + character, "textDocument/completion", {
        textDocument: { uri: "file:///p4_cmp.rb" },
        position: { line, character },
      })).result;

    assert.ok((await labels(11, 8)).some((i) => i.label === "spin"), "singleton method after .");
    assert.ok((await labels(13, 14)).some((i) => i.label === "rotate"), "Klass.new.m instance method");
    const konst = (await labels(12, 4)).find((i) => i.label === "Comparable");
    assert.equal(konst.kind, 9); // module
    assert.ok((await labels(14, 17)).some((i) => i.label === "@turns"), "ivar from this document");
    const req = (await labels(16, 13)).find((i) => i.label === "json");
    assert.equal(req.kind, 17, "require paths complete from the real stdlib");
    assert.ok((await labels(15, 2)).some((i) => i.label === "return"), "keywords complete bare words");

    const rotate = (await labels(13, 14)).find((i) => i.label === "rotate");
    const resolved = await request(client, 60, "completionItem/resolve", rotate);
    assert.match(resolved.result.detail, /Widget#rotate\(deg\)/);
    assert.match(resolved.result.documentation.value, /Turns and spins/);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  // ---- P5: the deeper Opal gates ----

  test("the API gate flags unsupported APIs on the open publish", async () => {
    const client = await handshake();
    const published = await openDoc(client, "file:///p5_api.rb",
      "Thread.new { 1 }\n\"a\".gsub!(\"b\", \"c\")\nrequire \"psych\"\nputs Fiber.current\nputs(x.is_a?(Symbol))\n");
    const byLine = Object.fromEntries(published.params.diagnostics.map((d) => [d.range.start.line, d.code]));
    assert.deepEqual(byLine, {
      0: "unsupported.thread",
      1: "unsupported.string-mutation",
      2: "unsupported.require",
      3: "unsupported.fiber",
      4: "unsupported.symbol-check",
    });
    assert.ok(published.params.diagnostics.every((d) => d.source === "opal" && d.severity === 2));
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("the compile gate runs on save and surfaces Opal-only warnings", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p5_o.rb", "x = /foo/o\n");
    client.send({ jsonrpc: "2.0", method: "textDocument/didSave",
      params: { textDocument: { uri: "file:///p5_o.rb" } } });
    const saved = await client.next();
    assert.equal(saved.method, "textDocument/publishDiagnostics");
    const dropped = saved.params.diagnostics.find((d) => d.code === "compile-warning");
    assert.match(dropped.message, /Skipping the 'o' Regexp flag/); // §2 gate 2's own example
    // the parse gate's warning is republished, not duplicated
    assert.equal(saved.params.diagnostics.filter((d) => d.code === "unused_local_variable").length, 1);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("saving a document that does not parse leaves the parse diagnostics alone", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p5_bad.rb", "def foo(\n");
    client.send({ jsonrpc: "2.0", method: "textDocument/didSave",
      params: { textDocument: { uri: "file:///p5_bad.rb" } } });
    // the compile gate skipped the unparseable document: no extra publish,
    // and the next request answers normally (the gate cannot crash the loop)
    const answer = await request(client, 70, "textDocument/documentSymbol", { textDocument: { uri: "file:///p5_bad.rb" } });
    assert.equal(answer.id, 70);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("code actions fix the string bang and the missing require", async () => {
    const client = await handshake();
    const published = await openDoc(client, "file:///p5b_fix.rb",
      "\"a\".gsub!(\"b\", \"c\")\nrequire \"psych\"\n");
    const diags = published.params.diagnostics;
    const answer = await request(client, 71, "textDocument/codeAction", {
      textDocument: { uri: "file:///p5b_fix.rb" },
      range: diags[0].range,
      context: { diagnostics: diags },
      only: ["quickfix"],
    });
    const fixes = answer.result;
    assert.equal(fixes.length, 2);
    assert.ok(fixes.every((a) => a.kind === "quickfix" && a.diagnostics.length === 1));

    const dropBang = fixes.find((a) => a.title.includes("gsub"));
    assert.match(dropBang.title, /Use String#gsub/);
    assert.deepEqual(dropBang.edit.changes["file:///p5b_fix.rb"],
      [{ range: { start: { line: 0, character: 8 }, end: { line: 0, character: 9 } }, newText: "" }]);

    const dropRequire = fixes.find((a) => a.title.includes("Remove this require"));
    const removed = dropRequire.edit.changes["file:///p5b_fix.rb"];
    assert.equal(removed[0].newText, "");
    assert.deepEqual(removed[0].range,
      { start: { line: 1, character: 0 }, end: { line: 1, character: 15 } });
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("a quickfix drops the /o flag and the warning stops on the next save", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p5b_o.rb", "x = /foo/o\nputs x\n");
    client.send({ jsonrpc: "2.0", method: "textDocument/didSave",
      params: { textDocument: { uri: "file:///p5b_o.rb" } } });
    const saved = await client.next();
    const warning = saved.params.diagnostics.find((d) => d.code === "compile-warning");
    // the warning spans its source line, so a caret inside the line pairs with it
    assert.deepEqual(warning.range, { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } });

    const answer = await request(client, 72, "textDocument/codeAction", {
      textDocument: { uri: "file:///p5b_o.rb" },
      range: { start: { line: 0, character: 6 }, end: { line: 0, character: 6 } },
      context: { diagnostics: [warning] },
    });
    const fix = answer.result[0];
    assert.match(fix.title, /Drop the \/o flag/);
    assert.deepEqual(fix.edit.changes["file:///p5b_o.rb"],
      [{ range: { start: { line: 0, character: 9 }, end: { line: 0, character: 10 } }, newText: "" }]);

    // apply the fix client-side: the warning is gone on the next save
    client.send({ jsonrpc: "2.0", method: "textDocument/didChange",
      params: { textDocument: { uri: "file:///p5b_o.rb", version: 2 },
        contentChanges: [{ text: "x = /foo/\nputs x\n" }] } });
    await client.next(); // the edit's publish
    client.send({ jsonrpc: "2.0", method: "textDocument/didSave",
      params: { textDocument: { uri: "file:///p5b_o.rb" } } });
    const resaved = await client.next();
    assert.equal(resaved.params.diagnostics.filter((d) => d.code === "compile-warning").length, 0);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  // ---- P6: pull diagnostics and file-watcher re-indexing ----

  test("textDocument/diagnostic answers all three gates on demand", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p6_pull.rb", "Thread.new { 1 }\nx = /a/o\nputs x\n");
    const answer = await request(client, 80, "textDocument/diagnostic", { textDocument: { uri: "file:///p6_pull.rb" } });
    assert.equal(answer.result.kind, "full");
    const codes = answer.result.items.map((d) => d.code);
    assert.ok(codes.includes("unsupported.thread")); // the API gate, no save needed
    assert.ok(codes.includes("compile-warning"));    // the compile gate runs at pull time
    assert.ok(answer.result.items.every((d) => d.source === "opal" && d.range != null));

    const closed = await request(client, 81, "textDocument/diagnostic", { textDocument: { uri: "file:///p6_never.rb" } });
    assert.deepEqual(closed.result, { kind: "full", items: [] });

    await openDoc(client, "file:///p6_pull_bad.rb", "def foo(\n");
    const bad = await request(client, 82, "textDocument/diagnostic", { textDocument: { uri: "file:///p6_pull_bad.rb" } });
    assert.ok(bad.result.items.length > 0);
    assert.ok(bad.result.items.every((d) => d.severity === 1)); // parse errors only, no compile pass
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("workspace/didChangeWatchedFiles keeps closed workspace files in the index", async () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-lsp-watch-"));
    try {
      const file = join(dir, "watched.rb");
      writeFileSync(file, "class WatchedGem\n  def spin; end\nend\n");
      const client = await handshake();
      client.send({ jsonrpc: "2.0", method: "workspace/didChangeWatchedFiles",
        params: { changes: [{ uri: "file://" + file, type: 1 }] } }); // Created
      const found = await request(client, 83, "workspace/symbol", { query: "WatchedGem" });
      assert.deepEqual(found.result.map((s) => s.name), ["WatchedGem"]);

      writeFileSync(file, "class RetweakedGem\nend\n");
      client.send({ jsonrpc: "2.0", method: "workspace/didChangeWatchedFiles",
        params: { changes: [{ uri: "file://" + file, type: 2 }] } }); // Changed
      const changed = await request(client, 84, "workspace/symbol", { query: "Gem" });
      const gems = changed.result.map((s) => s.name).filter((n) => /Gem/.test(n));
      assert.deepEqual(gems, ["RetweakedGem"]); // re-index replaced the records whole

      client.send({ jsonrpc: "2.0", method: "workspace/didChangeWatchedFiles",
        params: { changes: [{ uri: "file://" + file, type: 3 }] } }); // Deleted
      const gone = await request(client, 85, "workspace/symbol", { query: "Retweaked" });
      assert.deepEqual(gone.result, []);
      client.send({ jsonrpc: "2.0", method: "exit" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("§8 acceptance: Thread.new, msg << x and net/http gate with quickfixes", async () => {
    const client = await handshake();
    const published = await openDoc(client, "file:///p5c_accept.rb",
      "Thread.new { 1 }\nmsg = \"\"\nmsg << \"x\"\nrequire \"net/http\"\nbuf = []\nbuf << 1\n");
    const codes = published.params.diagnostics.map((d) => d.code).sort();
    assert.deepEqual(codes, ["unsupported.require", "unsupported.string-append", "unsupported.thread"]);
    // buf was assigned a single Array literal, so `buf << 1` stays ungated
    assert.deepEqual(published.params.diagnostics.map((d) => d.range.start.line).sort(), [0, 2, 3]);

    const answer = await request(client, 86, "textDocument/codeAction", {
      textDocument: { uri: "file:///p5c_accept.rb" },
      range: { start: { line: 0, character: 0 }, end: { line: 5, character: 0 } },
      context: { diagnostics: published.params.diagnostics },
    });
    const titles = answer.result.map((a) => a.title);
    assert.ok(titles.some((t) => t === "Remove this call - Opal does not have it")); // Thread.new
    assert.ok(titles.some((t) => t === "Use += - String is immutable in Opal"));     // msg << x
    assert.ok(titles.some((t) => t.startsWith("Remove this require")));             // net/http
    const append = answer.result.find((a) => a.title.includes("Use +="));
    assert.deepEqual(append.edit.changes["file:///p5c_accept.rb"],
      [{ range: { start: { line: 2, character: 4 }, end: { line: 2, character: 6 } }, newText: "+=" }]);

    // §8: the pull report answers the same set
    const pull = await request(client, 87, "textDocument/diagnostic", { textDocument: { uri: "file:///p5c_accept.rb" } });
    assert.deepEqual(pull.result.items.map((d) => d.code).sort(), codes);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  // ---- P7: formatter delegation ----

  test("formatting delegates to a configured formatter and stays silent without one", async () => {
    // unconfigured: the request answers null (the client keeps its buffer)
    const plain = await handshake();
    await openDoc(plain, "file:///p7_off.rb", "puts 1\n");
    const off = await request(plain, 88, "textDocument/formatting", { textDocument: { uri: "file:///p7_off.rb" }, options: {} });
    assert.equal(off.result, null);
    plain.send({ jsonrpc: "2.0", method: "exit" });

    // configured: advertised, and the command's stdout becomes a
    // whole-document edit
    const dir = mkdtempSync(join(tmpdir(), "opal-lsp-fmt-"));
    try {
      const fmt = join(dir, "fmt.mjs");
      writeFileSync(fmt, 'let d="";process.stdin.on("data",(c)=>d+=c);process.stdin.on("end",()=>process.stdout.write(d.replace(/PLACEHOLDER/g,"puts 1")));');
      const client = startServer();
      client.send({ ...INITIALIZE,
        params: { ...INITIALIZE.params, initializationOptions: { formatter: `${process.execPath} ${fmt}` } } });
      const init = await client.next();
      assert.equal(init.result.capabilities.documentFormattingProvider, true);
      client.send({ jsonrpc: "2.0", method: "initialized" });
      await openDoc(client, "file:///p7_fmt.rb", "PLACEHOLDER\n");
      const answer = await request(client, 89, "textDocument/formatting", {
        textDocument: { uri: "file:///p7_fmt.rb" },
        options: { tabSize: 2, insertSpaces: true },
      });
      assert.deepEqual(answer.result,
        [{ range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } }, newText: "puts 1\n" }]);
      client.send({ jsonrpc: "2.0", method: "exit" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("extract to local variable refactors a single-line selection", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p7b_extract.rb", "x = 1 + 2\n");
    const answer = await request(client, 90, "textDocument/codeAction", {
      textDocument: { uri: "file:///p7b_extract.rb" },
      range: { start: { line: 0, character: 4 }, end: { line: 0, character: 9 } },
      context: { diagnostics: [] },
    });
    assert.equal(answer.result.length, 1);
    const extract = answer.result[0];
    assert.equal(extract.kind, "refactor.extract");
    assert.equal(extract.title, "Extract to local variable");
    const [insert, replace] = extract.edit.changes["file:///p7b_extract.rb"];
    assert.deepEqual(insert,
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: "extracted = 1 + 2\n" });
    assert.deepEqual(replace,
      { range: { start: { line: 0, character: 4 }, end: { line: 0, character: 9 } }, newText: "extracted" });

    // multi-line selections and half-parsed ones get no action
    await openDoc(client, "file:///p7b_multi.rb", "y = 1 +\n  2\n");
    const multi = await request(client, 91, "textDocument/codeAction", {
      textDocument: { uri: "file:///p7b_multi.rb" },
      range: { start: { line: 0, character: 4 }, end: { line: 1, character: 5 } },
      context: { diagnostics: [] },
    });
    assert.deepEqual(multi.result, []);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("extract to method splices a new def below and parameterizes free locals", async () => {
    const client = await handshake();
    await openDoc(client, "file:///p7c_m.rb", "class Calc\n  def total(n)\n    puts n * 2\n  end\nend\n");
    const answer = await request(client, 92, "textDocument/codeAction", {
      textDocument: { uri: "file:///p7c_m.rb" },
      range: { start: { line: 2, character: 9 }, end: { line: 2, character: 14 } }, // "n * 2"
      context: { diagnostics: [] },
      only: ["refactor.extract.method"],
    });
    assert.equal(answer.result.length, 1);
    const extract = answer.result[0];
    assert.equal(extract.title, "Extract to method");
    const [insert, replace] = extract.edit.changes["file:///p7c_m.rb"];
    assert.deepEqual(insert.range, { start: { line: 3, character: 5 }, end: { line: 3, character: 5 } });
    assert.equal(insert.newText, "\n  def extracted(n)\n    n * 2\n  end");
    assert.deepEqual(replace,
      { range: { start: { line: 2, character: 9 }, end: { line: 2, character: 14 } }, newText: "extracted(n)" });

    // block-param uses refuse: their scope would not survive the move
    await openDoc(client, "file:///p7c_b.rb", "def run\n  [1].each { |i| puts i }\nend\n");
    const refused = await request(client, 93, "textDocument/codeAction", {
      textDocument: { uri: "file:///p7c_b.rb" },
      range: { start: { line: 1, character: 22 }, end: { line: 1, character: 23 } }, // "i"
      context: { diagnostics: [] },
      only: ["refactor.extract.method"],
    });
    assert.deepEqual(refused.result, []);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  test("the API gate stays quiet on the xstring push idiom and Thread.current", async () => {
    const client = await handshake();
    // both shapes appear in Opal's own source (corelib inspect stacks,
    // stdlib/pp.rb); the §8 corpus audit says they must not be flagged
    const published = await openDoc(client, "file:///p5d_quiet.rb",
      "stack = `[]`\nstack << 1\n`js` << 2\nseen = Thread.current[:tag]\nputs seen\n");
    assert.deepEqual(published.params.diagnostics, []);
    client.send({ jsonrpc: "2.0", method: "exit" });
  });

  after(() => {
    // Every test closes its own server through "exit"; this catches any
    // child left alive by a failed assertion so the suite can't hang.
    for (const child of servers) if (child.exitCode === null) child.kill();
  });
});

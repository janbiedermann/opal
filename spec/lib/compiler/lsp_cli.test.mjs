// The `opal-language-server` command (lib/opal/exe/lsp.rb, built by
// tasks/lsp.mjs): drive exe/lsp over stdio the way an LSP client does.
// The spawn stays asynchronous (AGENTS.md lesson): spawnSync would block
// the event loop that pipes the frames to the server.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
function startServer() {
  const child = spawn(process.execPath, [LSP], { stdio: ["pipe", "pipe", "pipe"] });
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

  after(() => {
    // Each test closes its own server through "exit" or stdin; nothing
    // else to clean up — exe/lsp is rebuilt by the compiler suite too.
  });
});

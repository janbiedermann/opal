// The HTTP transport the gem port fetches through (lib/opal/gems/http.cjs).
//
// The fixture server runs on a Worker of its own: the transport parks the main
// thread in Atomics.wait while it waits for an answer, so a server in the main
// thread could not answer.

import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { Worker } from "node:worker_threads";
import { close, fetch, fetchAll } from "../../../lib/opal/gems/http.cjs";

const SERVER_SOURCE = `
const { parentPort } = require("node:worker_threads");
const http = require("node:http");
const zlib = require("node:zlib");

const server = http.createServer((req, res) => {
  if (req.url === "/text") {
    res.writeHead(200, { "content-type": "text/plain", "x-custom": "yes", "set-cookie": ["a=1", "b=2"] });
    res.end("hello caf\\u00e9");
  } else if (req.url === "/bytes") {
    res.writeHead(200, { "content-type": "application/octet-stream" });
    res.end(Buffer.from([0x00, 0xff, 0x80, 0x41]));
  } else if (req.url === "/gz-file") {
    // what a server sends for versions.4.gz: the bytes of a gzip file, with no
    // Content-Encoding to mark them
    res.writeHead(200, { "content-type": "application/octet-stream" });
    res.end(zlib.gzipSync("gzipped body"));
  } else if (req.url === "/gzip-encoded") {
    res.writeHead(200, { "content-type": "text/plain", "content-encoding": "gzip" });
    res.end(zlib.gzipSync("gzipped body"));
  } else if (req.url === "/cond") {
    if (req.headers["if-modified-since"]) {
      res.writeHead(304);
      res.end();
    } else {
      res.writeHead(200, { "last-modified": "Wed, 01 Jan 2025 00:00:00 GMT" });
      res.end("fresh");
    }
  } else if (req.url === "/redirect") {
    res.writeHead(302, { location: "/text" });
    res.end();
  } else if (req.url === "/missing") {
    res.writeHead(404, { "x-error-message": "no such gem" });
    res.end("not here");
  } else if (req.url === "/slow") {
    setTimeout(() => { res.writeHead(200); res.end("late"); }, 3000);
  } else if (req.url === "/echo") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ method: req.method, headers: req.headers }));
  } else {
    res.writeHead(500);
    res.end("boom");
  }
});

server.listen(0, "127.0.0.1", () => parentPort.postMessage(server.address().port));
`;

async function withServer(body) {
  const server = new Worker(SERVER_SOURCE, { eval: true });
  const port = await new Promise((resolve, reject) => {
    server.once("message", resolve);
    server.once("error", reject);
  });
  try {
    await body(`http://127.0.0.1:${port}`);
  } finally {
    await server.terminate();
    close();
  }
}

test("fetch answers the status, the headers and the body", async () => {
  await withServer((base) => {
    const response = fetch({ url: `${base}/text` });
    assert.equal(response.status, 200);
    assert.equal(response.statusText, "OK");
    // the body is bytes, not characters: 0xc3 0xa9 is é, and the Ruby side
    // labels the string ASCII-8BIT rather than decoding it
    assert.equal(response.body, "hello caf\u00c3\u00a9");
    const headers = Object.fromEntries(response.headers);
    assert.equal(headers["content-type"], "text/plain");
    assert.equal(headers["x-custom"], "yes");
  });
});

test("a body of bytes comes back as one character per byte", async () => {
  await withServer((base) => {
    const response = fetch({ url: `${base}/bytes` });
    assert.deepEqual([...response.body].map((c) => c.charCodeAt(0)), [0x00, 0xff, 0x80, 0x41]);
  });
});

test("the headers of a repeated header are all there", async () => {
  await withServer((base) => {
    const cookies = fetch({ url: `${base}/text` }).headers.filter(([name]) => name === "set-cookie");
    assert.deepEqual(cookies, [["set-cookie", "a=1"], ["set-cookie", "b=2"]]);
  });
});

test("the method and the headers travel as they are given", async () => {
  await withServer((base) => {
    const response = fetch({ url: `${base}/echo`, method: "HEAD", headers: { "user-agent": "Opal gems" } });
    assert.equal(response.status, 200);
    assert.equal(response.body, "");

    const echoed = JSON.parse(fetch({ url: `${base}/echo`, headers: { "user-agent": "Opal gems" } }).body);
    assert.equal(echoed.method, "GET");
    assert.equal(echoed.headers["user-agent"], "Opal gems");
  });
});

test("a compressed file stays raw, a compressed transfer is decoded", async () => {
  await withServer((base) => {
    // A .gz file is served as its bytes with no content-encoding, and RubyGems
    // gunzips it itself (Gem::RemoteFetcher#fetch_path, the compact index's
    // versions.4.gz); a transfer marked Content-Encoding: gzip is decoded by
    // the client, as Net::HTTP does it.
    const file = fetch({ url: `${base}/gz-file`, headers: { "accept-encoding": "gzip" } });
    assert.deepEqual([...file.body.slice(0, 2)].map((c) => c.charCodeAt(0)), [0x1f, 0x8b]);

    const transfer = fetch({ url: `${base}/gzip-encoded`, headers: { "accept-encoding": "gzip" } });
    assert.equal(transfer.body, "gzipped body");
  });
});

test("a redirect is answered, not followed", async () => {
  await withServer((base) => {
    const response = fetch({ url: `${base}/redirect` });
    assert.equal(response.status, 302);
    assert.deepEqual(response.headers.find(([name]) => name === "location"), ["location", "/text"]);
  });
});

test("If-Modified-Since answers 304 with no body", async () => {
  await withServer((base) => {
    const fresh = fetch({ url: `${base}/cond` });
    assert.equal(fresh.status, 200);

    const cached = fetch({ url: `${base}/cond`, headers: { "if-modified-since": "Wed, 01 Jan 2025 00:00:00 GMT" } });
    assert.equal(cached.status, 304);
    assert.equal(cached.body, "");
  });
});

test("a failing status still carries its body and its headers", async () => {
  await withServer((base) => {
    const response = fetch({ url: `${base}/missing` });
    assert.equal(response.status, 404);
    assert.equal(response.body, "not here");
    assert.deepEqual(response.headers.find(([name]) => name === "x-error-message"), [
      "x-error-message", "no such gem",
    ]);
  });
});

test("several URLs answer in one round trip", async () => {
  await withServer((base) => {
    const responses = fetchAll([
      { url: `${base}/text` },
      { url: `${base}/missing` },
      { url: `${base}/bytes`, method: "HEAD" },
    ]);
    assert.deepEqual(responses.map((r) => r.status), [200, 404, 200]);
    assert.deepEqual(responses.map((r) => r.url), [`${base}/text`, `${base}/missing`, `${base}/bytes`]);
  });
});

test("a fetch that outlives its timeout answers an error", async () => {
  await withServer((base) => {
    const { error } = fetch({ url: `${base}/slow`, timeout: 200 });
    assert.match(error.message, /timed out/);
  });
});

test("a connection that cannot be made answers its cause", async () => {
  // A port nobody listens on: low ports are on undici's blocked list, where the
  // failure is "bad port" rather than the socket error a caller wants to see.
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));

  const { error } = fetch({ url: `http://127.0.0.1:${port}/nope`, timeout: 2000 });
  assert.equal(error.name, "TypeError");
  assert.equal(error.cause.code, "ECONNREFUSED");

  const unknown = fetch({ url: "http://no-such-host.invalid/x", timeout: 5000 });
  assert.equal(unknown.error.cause.code, "ENOTFOUND");
});

test("close stops the Worker and the next fetch starts a new one", async () => {
  await withServer((base) => {
    assert.equal(fetch({ url: `${base}/text` }).status, 200);
    close();
    assert.equal(fetch({ url: `${base}/text` }).status, 200);
  });
});

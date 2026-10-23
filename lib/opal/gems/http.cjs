// The HTTP transport the gem port fetches with (GEMS.md §6.3).
//
// Opal's Ruby side is synchronous and Node's HTTP clients are not, so the
// request runs on a Worker while the main thread parks on a SharedArrayBuffer
// with Atomics.wait and reads the answer back with receiveMessageOnPort (the
// pattern Node's own worker_threads documentation shows). One Worker stays
// alive for the process, so it keeps one connection pool warm across a
// resolve; stdlib/open-uri.rb pays for a Node process per request instead.
//
// Nothing in this file knows about Opal: Gem::HTTPTransport in
// lib/rubygems/vendored_net_http.rb is what puts it in front of the Ruby side.
// The body comes back as a JavaScript string of one character per byte, which
// is how Opal holds a binary String (what File.binread answers), so no
// decoding happens this side of the boundary.
//
// CommonJS, and its only require is a built-in: the compiled bundles embed
// this file's source and run it through `new Function` (tasks/*/bundle.mjs),
// because a single-file executable has no tree to read it from and its
// require() answers only built-in modules.

const { MessageChannel, Worker, receiveMessageOnPort } = require("node:worker_threads");

const DEFAULT_TIMEOUT = 30_000;

// The Worker is created from a string: a SEA (exe/ruby, and later exe/gem)
// cannot load a file from disk, and the MessagePort has to travel in
// transferList for the same reason.
const WORKER_SOURCE = `
const { parentPort } = require("node:worker_threads");

parentPort.on("message", async ({ port, done, requests }) => {
  const responses = [];
  for (const request of requests) responses.push(await answer(request));
  port.postMessage(responses);
  // wake the main thread, parked in Atomics.wait on this array
  Atomics.add(done, 0, 1);
  Atomics.notify(done, 0);
  port.close();
});

async function answer(request) {
  const { url, method = "GET", headers, body, timeout = ${DEFAULT_TIMEOUT} } = request;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timed out")), timeout);
  timer.unref();
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      // RubyGems follows redirects itself: it checks the Location header,
      // refuses a step down from https, and keeps the origin's credentials.
      redirect: "manual",
      signal: controller.signal,
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      url,
      status: response.status,
      statusText: response.statusText,
      headers: [...response.headers.entries()],
      body: bytes.toString("latin1"),
    };
  } catch (error) {
    const cause = error && error.cause;
    return {
      url,
      error: {
        name: (error && error.name) || "Error",
        message: (error && error.message) || String(error),
        // undici wraps the socket failure: a refused port and a name that did
        // not resolve both say only "fetch failed" until the cause is read.
        cause: cause && {
          name: cause.name,
          message: cause.message,
          code: cause.code || (cause.cause && cause.cause.code),
        },
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
`;

let worker;

function start() {
  if (!worker) {
    worker = new Worker(WORKER_SOURCE, { eval: true });
    // the process may exit while the Worker waits idle for the next request
    worker.unref();
    worker.on("error", () => {
      worker?.terminate();
      worker = undefined;
    });
  }
  return worker;
}

// Waits for every response, so several URLs travel with one Worker round trip
// - a compact index update asks for names, info and versions in a row.
function fetchAll(requests) {
  const active = start();
  const { port1, port2 } = new MessageChannel();
  port1.unref();
  port2.unref();
  const done = new Int32Array(new SharedArrayBuffer(4));
  active.postMessage({ port: port2, done, requests }, [port2]);

  const latest = requests.reduce((max, r) => Math.max(max, r.timeout ?? DEFAULT_TIMEOUT), 0);
  const deadline = Date.now() + latest + 5_000;

  try {
    for (;;) {
      const message = receiveMessageOnPort(port1);
      if (message) return message.message;
      const waiting = deadline - Date.now();
      if (waiting <= 0) throw new Error(`HTTP request timed out after ${latest} ms`);
      Atomics.wait(done, 0, 0, waiting);
    }
  } finally {
    port1.close();
  }
}

function fetch(request) {
  return fetchAll([request])[0];
}

// Gem::RemoteFetcher#close_all: there is no connection pool to tear down on
// this side of the boundary beyond the Worker itself.
function close() {
  worker?.terminate();
  worker = undefined;
}

module.exports = { fetch, fetchAll, close };

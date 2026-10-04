// The HTTP server the open-uri tests talk to (port 4567). Port of
// test/opal/http_server.rb (Sinatra).
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./common.mjs";

const CORS = { "Access-Control-Allow-Origin": "*" };

function routes() {
  const cat = readFileSync(join(ROOT, "test", "opal", "cat.png"));
  return {
    "/": [200, { "Content-Type": "text/html;charset=utf-8" }, "Ready!"],
    "/plain_text": [200, { "Content-Type": "text/plain" }, "plain text"],
    "/no_header": [200, { "Content-Type": "" }, "no header"],
    "/html": [200, { "Content-Type": "text/html; charset=utf-8" }, "<body>"],
    "/png": [200, { "Content-Type": "image/png" }, cat],
    "/404": [404, {}, ""],
    "/500": [500, {}, ""],
    "/last_modified": [200, { "Content-Type": "text/plain", "Last-Modified": "Wed, 21 Oct 2015 07:28:00 GMT" }, "Look Ma, I have a Last-Modified header"],
  };
}

// Starts the server; resolves to it once it listens.
export function startHttpServer(port = 4567) {
  const table = routes();
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    const [status, headers, body] = (req.method === "GET" || req.method === "HEAD") && table[path] ? table[path] : [404, {}, ""];
    const all = { ...headers, ...CORS };
    if (all["Content-Type"] === "") delete all["Content-Type"];
    res.writeHead(status, all);
    res.end(body);
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "localhost", () => resolve(server));
  });
}

// Runs fn while the server runs.
export async function withHttpServer(fn) {
  const server = await startHttpServer();
  try {
    return await fn();
  } finally {
    await new Promise((r) => server.close(r));
  }
}

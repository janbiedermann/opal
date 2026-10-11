// Shared pieces of the browser runner interfaces (cdp_interface.mjs,
// bidi_interface.mjs): the HTTP server that delivers the built app and
// receives commands from the page, the shared secret, and a synchronous
// stdin reader for prompt dialogs.
import fs from "node:fs";
import http from "node:http";

// Reads a line from stdin synchronously (for prompt() dialogs); null at EOF.
export function gets() {
  const buf = Buffer.alloc(1);
  const bytes = [];
  for (;;) {
    let n;
    try {
      n = fs.readSync(0, buf, 0, 1, null);
    } catch (e) {
      if (e.code === "EAGAIN") continue;
      if (e.code === "EOF") n = 0;
      else throw e;
    }
    if (n === 0) return bytes.length ? Buffer.from(bytes).toString("utf8") : null;
    bytes.push(buf[0]);
    if (buf[0] === 10) return Buffer.from(bytes).toString("utf8");
  }
}

export function randomString() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let str = "";
  for (let i = 0; i < 256; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

// Serves the files in `dir` and dispatches POST routes guarded by the
// shared secret. `routes` maps a path to a handler(obj, res).
export function createBrowserServer(dir, sharedSecret, routes) {
  function notFound(res) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("NOT FOUND");
  }

  function handlePost(req, res, fun) {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      let obj;
      try {
        obj = JSON.parse(data);
      } catch {
        return notFound(res);
      }
      if (obj.secret === sharedSecret) {
        fun.call(this, obj, res);
      } else {
        notFound(res);
      }
    });
  }

  return http.createServer((req, res) => {
    if (req.method === "GET") {
      const path = dir + "/" + req.url.slice(1);
      if (path.includes("..") || !fs.existsSync(path)) {
        notFound(res);
      } else {
        let content_type;
        if (path.endsWith(".html")) {
          content_type = "text/html";
        } else if (path.endsWith(".map")) {
          content_type = "application/json";
        } else {
          content_type = "application/javascript";
        }
        res.writeHead(200, { "Content-Type": content_type });
        res.end(fs.readFileSync(path));
      }
    } else if (req.method === "POST") {
      const route = routes[req.url];
      if (route) {
        handlePost(req, res, route);
      } else {
        notFound(res);
      }
    } else {
      notFound(res);
    }
  });
}

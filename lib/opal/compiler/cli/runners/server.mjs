// Serves the program on a web page (lib/opal/cli_runners/server.rb and
// lib/opal/simple_server.rb, on node:http).
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { resolve, join, extname, normalize } from "node:path";

const CONTENT_TYPES = { ".html": "text/html", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

// Serves /<prefix>/<main>.js (the built program) and an index page that
// loads it. builder: a function returning a fresh builder.
export class SimpleServer {
  constructor({ prefix = "assets", main = "application", builder }) {
    this.prefix = prefix.replace(/^\//, "");
    this.main = main;
    this.builderFn = builder;
    this.builders = new Map();
  }

  builder(path, uncache = false) {
    if (uncache || ![...this.builders.keys()].every((k) => k === path)) this.builders.clear();
    if (!this.builders.has(path)) {
      const builder = this.builderFn(path);
      this.esm = !!builder.compilerOptions.esm;
      this.directory = !!builder.compilerOptions.directory;
      this.builders.set(path, builder);
    }
    return this.builders.get(path);
  }

  get jsExt() {
    return this.esm ? "mjs" : "js";
  }

  javascriptIncludeTag(path) {
    this.builder(path, true);
    if (this.directory) path += `.${this.jsExt}/index`;
    const type = this.esm ? ' type="module"' : "";
    return `<script src="/${this.prefix}/${path}.${this.jsExt}"${type}></script>`;
  }

  // [status, headers, body]
  call(url) {
    const m = new RegExp(`^/${this.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(.*?)\\.m?js(/.*)?$`).exec(url);
    if (m) {
      const builder = this.builder(m[1]);
      const rest = (m[2] || "").replace(/^\//, "");
      const body = this.directory
        ? builder.compileToDirectory(null, { singleFile: rest })
        : builder.toString() + "\n" + builder.sourceMap.toDataUriComment();
      if (body === undefined) return [404, {}, `not found: ${rest}`];
      return [200, { "content-type": "application/javascript" }, body];
    }
    const html = `      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          ${this.javascriptIncludeTag(this.main)}
        </body>
      </html>
`;
    return [200, { "content-type": "text/html", "cache-control": "no-cache" }, html];
  }
}

export function server(data) {
  const options = data.options || {};
  if ((data.argv || []).length) throw new Error("Program arguments are not supported on the Server runner");
  const port = parseInt(options.port || process.env.OPAL_CLI_RUNNERS_SERVER_PORT || 3000, 10);
  let staticFolder = options.static_folder || process.env.OPAL_CLI_RUNNERS_SERVER_STATIC_FOLDER;
  if (staticFolder === true) staticFolder = "public";
  if (staticFolder) staticFolder = resolve(staticFolder);
  const out = (s) => (typeof data.output === "string" ? process.stdout : data.output || process.stdout).write(s);

  const app = new SimpleServer({ builder: () => data.builder(), main: "cli-runner" });
  const http = createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    try {
      if (staticFolder) {
        const path = normalize(join(staticFolder, url));
        if (path.startsWith(staticFolder) && statSafe(path)?.isFile()) {
          res.writeHead(200, { "content-type": CONTENT_TYPES[extname(path)] || "application/octet-stream" });
          return res.end(readFileSync(path));
        }
      }
      const [status, headers, body] = app.call(url);
      res.writeHead(status, headers);
      res.end(body);
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(e.stack || e));
    }
  });
  return new Promise((resolvePromise, reject) => {
    http.on("error", reject);
    http.listen(port, () => out(`* Opal server listening on http://localhost:${port}\n`));
    process.on("SIGINT", () => http.close(() => resolvePromise(null)));
  });
}

function statSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

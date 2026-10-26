// Drives Firefox over the WebDriver BiDi protocol: serves the files in
// the directory given as the last argument, loads index.html, relays the
// console output and exits with the program's exit code. Run by the
// Firefox runner (browsers.mjs). Chrome stays on cdp_interface.mjs.
//
// BiDi spec: https://w3c.github.io/webdriver-bidi/
// Firefox serves BiDi directly at ws://127.0.0.1:PORT/session when
// launched with --remote-debugging-port.
//
// Headless Firefox dismisses dialogs (prompt/alert/confirm) right away,
// so `browsingContext.handleUserPrompt` is unusable there; instead a
// preload script overrides window.prompt/alert/confirm with synchronous
// requests to our HTTP server (see the routes below). The page-side
// contract (window.OPAL_EXIT_CODE, the "opalheadlessbrowserexit" alert,
// the shared secret) is the one of stdlib/headless_browser.
import fs from "node:fs";
import { createBrowserServer, randomString, gets } from "./browser_server.mjs";

var dir = process.argv[process.argv.length - 1];
var port_offset; // port offset for http server, depending on number of contexts
var bidi;        // BiDi client

var options = {
  host: process.env.OPAL_BIDI_HOST || process.env.OPAL_CDP_HOST || 'localhost',
  port: parseInt(process.env.OPAL_BIDI_PORT || process.env.OPAL_CDP_PORT || '9333')
};

var timeout = parseInt(process.env.OPAL_BROWSER_TIMEOUT || '0');

// shared secret

var shared_secret = randomString(); // secret must be passed with POST requests

// support functions

function perror(error) { console.error(error); }

var exiting = false;

function shutdown(exit_code) {
  if (exiting) { return; }
  exiting = true;
  if (bidi) {
    bidi.close();
  }
  server.close();
  process.exit(exit_code);
}

// simple HTTP server to deliver page, scripts to, and trigger commands from browser

var server = createBrowserServer(dir, shared_secret, {
  "/File.write": function(obj, res) {
    // totally insecure on purpose
    fs.writeFileSync(obj.filename, obj.data);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  },
  "/prompt": function(obj, res) {
    var line = gets();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(line === null ? "" : line.replace(/\r?\n$/, ""));
  },
  "/log": function(obj, res) {
    process.stdout.write(obj.level + ': ' + obj.text + "\n");
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  },
  "/exit": function(obj, res) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    var code = typeof obj.code === "number" ? obj.code : 0;
    // the log events emitted before the exit alert may still be on their way
    setTimeout(function() { shutdown(code); }, 250);
  },
});

// BiDi client

export class BiDi {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    this.sessionId = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error("WebSocket error connecting to " + this.url));
      this.ws.onclose = (event) => {
        if (!exiting) {
          perror("BiDi connection closed: " + (event.reason || event.code));
          process.exit(1);
        }
      };
      this.ws.onmessage = (event) => this.onMessage(JSON.parse(event.data));
    });
  }

  onMessage(msg) {
    if (msg.type === "event") {
      var handler = this.handlers.get(msg.method);
      if (handler) { handler(msg.params); }
    } else if (this.pending.has(msg.id)) {
      var entry = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.type === "error") {
        entry.reject(new Error(msg.error + ": " + msg.message));
      } else {
        entry.resolve(msg.result || {});
      }
    }
  }

  call(method, params) {
    return new Promise((resolve, reject) => {
      var id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    this.handlers.set(method, handler);
  }

  async openSession() {
    var result = await this.call("session.new", { requiredCapabilities: {}, expectedCapabilities: {}, capabilities: {} });
    this.sessionId = result.sessionId;
    return result.capabilities || {};
  }

  session(params) {
    return { ...params, sessionId: this.sessionId };
  }

  close() {
    // best effort: browsers.mjs terminates the browser process anyway
    try {
      this.ws.send(JSON.stringify({ id: ++this.id, method: "session.end", params: { sessionId: this.sessionId } }));
      this.ws.close();
    } catch {
      // the socket may already be gone
    }
  }
}

// console output

export function formatArg(arg) {
  switch (arg.type) {
    case "string": return arg.value;
    case "number": case "boolean": case "bigint": return String(arg.value);
    case "null": return "null";
    case "undefined": return "undefined";
    default: return JSON.stringify(typeof arg.value === "undefined" ? arg : arg.value);
  }
}

function printStackTrace(stackTrace) {
  var frames = (stackTrace && stackTrace.callFrames) || [];
  for (var i = 0; i < frames.length; i++) {
    var fr = frames[i];
    perror(fr.url + ':' + fr.lineNumber + ':' + fr.columnNumber + ': in ' + (fr.functionName || "(unknown)"));
  }
}

// main

async function main() {
  bidi = new BiDi("ws://" + (options.host === "localhost" ? "127.0.0.1" : options.host) + ":" + options.port + "/session");
  await bidi.connect();

  var capabilities = await bidi.openSession();
  var version = parseInt((capabilities.browserVersion || "0").split(".")[0]);
  if (version < 112) {
    perror("Firefox " + (capabilities.browserVersion || "unknown") + " is too old: the Firefox runner needs Firefox >= 112 with WebDriver BiDi support");
    process.exit(1);
  }


  await bidi.call("session.subscribe", bidi.session({ events: ["log"] }));

  // preload script: shared secret and dialog overrides (headless Firefox
  // auto-dismisses dialogs, so we route them through our HTTP server).
  // Firefox up to at least 140 raises "Permission denied to access property
  // 'length'" for BiDi preload scripts, so the script goes into the page.
  var preload = "window.OPAL_CDP_SHARED_SECRET = " + JSON.stringify(shared_secret) + ";\n" +
    "var opal_post = function(path, body) {\n" +
    "  var http = new XMLHttpRequest();\n" +
    "  http.open('POST', path, false);\n" +
    "  http.setRequestHeader('Content-Type', 'application/json');\n" +
    "  http.send(JSON.stringify(Object.assign({secret: window.OPAL_CDP_SHARED_SECRET}, body)));\n" +
    "  return http.responseText;\n" +
    "};\n" +
    "window.prompt = function(message, defaultValue) {\n" +
    "  var answer = opal_post('/prompt', {message: message, defaultValue: defaultValue});\n" +
    "  return answer === '' ? null : answer;\n" +
    "};\n" +
    "window.alert = function(message) {\n" +
    "  if (message === 'opalheadlessbrowserexit') {\n" +
    "    opal_post('/exit', {code: window.OPAL_EXIT_CODE});\n" +
    "  } else {\n" +
    "    opal_post('/log', {level: 'alert', text: String(message)});\n" +
    "  }\n" +
    "};\n" +
    "window.confirm = function(message) {\n" +
    "  opal_post('/log', {level: 'confirm', text: String(message)});\n" +
    "  return false;\n" +
    "};";
  var html_file = dir + "/index.html";
  fs.writeFileSync(html_file, fs.readFileSync(html_file, "utf8").replace("<body>", "<script>" + preload + "</script>\n<body>"));

  // BiDi sessions start at 9333, keep the http server ports clear of the
  // browser ports and of other concurrent runs (same scheme as CDP)
  var tree = await bidi.call("browsingContext.getTree", bidi.session({}));
  port_offset = (tree.contexts ? tree.contexts.length : 0) + 51;

  server.listen({ port: port_offset + options.port, host: options.host });

  bidi.on("log.entryAdded", function(entry) {
    if (entry.type === "console") {
      var args = entry.args || [];
      for (var i = 0; i < args.length; i++) {
        process.stdout.write(formatArg(args[i]));
      }
      if (entry.level === "error" && entry.stackTrace) {
        process.stdout.write("\n");
        printStackTrace(entry.stackTrace);
      }
    } else if (entry.type === "javascript") {
      perror(entry.text);
      printStackTrace(entry.stackTrace);
      shutdown(1);
    } else {
      process.stdout.write(entry.level + ': ' + entry.text + "\n");
    }
  });

  var context = await bidi.call("browsingContext.create", bidi.session({ type: "tab", url: "about:blank" }));
  var context_id = context.context;

  if (timeout > 0) {
    setTimeout(function() {
      perror("Execution timed out after " + timeout + "s");
      shutdown(1);
    }, timeout * 1000);
  }

  try {
    await bidi.call("browsingContext.navigate", bidi.session({ url: "http://" + options.host + ":" + (port_offset + options.port) + "/index.html", wait: "complete", context: context_id }));
  } catch (e) {
    perror(String(e.message || e));
    return shutdown(1);
  }

  // page has been loaded, all code has been executed
  var result = await bidi.call("script.evaluate", bidi.session({ expression: "window.OPAL_EXIT_CODE", awaitPromise: false, target: { context: context_id } }));
  var value = result.result || {};
  if (value.type === "number") {
    return shutdown(value.value);
  } else if (value.type === "string" && value.value === "noexit") {
    // do nothing, the program has async events awaiting; it will call
    // the exit alert which reaches us through the /exit route
  } else {
    return shutdown(0);
  }
}

// Run only when invoked as the runner subprocess, not when imported (tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch(function(error) {
    perror(error);
    process.exit(1);
  });
}


# backtick_javascript: true

# (open-uri's definitions first: these replace its request and data)
require 'open-uri'

module OpenURI
  # A synchronous GET with Node's own modules: a worker thread makes the
  # request (http/https) while this thread waits for it (Atomics.wait), so
  # no npm package is needed, also in a single executable application. The
  # result has the parts of an XMLHttpRequest that open-uri uses.
  %x{
    var __worker_code__ = [
      "const { workerData } = require('worker_threads');",
      "const { uri, port, flag } = workerData;",
      // (an AggregateError of a dual-stack connect has no message)
      "const message = (error) => error.message || error.code || String(error);",
      "const done = (message) => { port.postMessage(message); const f = new Int32Array(flag); Atomics.store(f, 0, 1); Atomics.notify(f, 0); };",
      "try {",
      "  const url = new URL(uri);",
      "  const http = require(url.protocol === 'https:' ? 'https' : 'http');",
      "  http.get(url, (res) => {",
      "    const chunks = [];",
      "    res.on('data', (chunk) => chunks.push(chunk));",
      "    res.on('end', () => done({ status: res.statusCode, statusText: res.statusMessage, headers: res.headers, body: Buffer.concat(chunks) }));",
      "    res.on('error', (error) => done({ error: message(error) }));",
      "  }).on('error', (error) => done({ error: message(error) }));",
      "} catch (error) { done({ error: message(error) }); }",
    ].join("\n");

    function __sync_get__(uri) {
      var threads = require('worker_threads');
      var flag = new SharedArrayBuffer(4);
      var channel = new threads.MessageChannel();
      var worker = new threads.Worker(__worker_code__, { eval: true, workerData: { uri: uri, port: channel.port2, flag: flag }, transferList: [channel.port2] });
      Atomics.wait(new Int32Array(flag), 0, 0);
      var message = threads.receiveMessageOnPort(channel.port1).message;
      channel.port1.close();
      worker.terminate();
      return message;
    }
  }

  def self.request(uri)
    %x{
      var result = __sync_get__(uri);
      if (result.error !== undefined) {
        // (as unxhr had it: status 0, the error in statusText.errno)
        // (no responseText: open-uri takes a status 0 with one for a success)
        return { status: 0, statusText: { errno: result.error }, responseText: null, response: new ArrayBuffer(0), getResponseHeader: function() { return null; } };
      }
      var body = result.body;
      return {
        status: result.status,
        statusText: result.statusText,
        responseText: Buffer.from(body).toString('latin1'),
        response: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
        getResponseHeader: function(name) {
          var value = result.headers[name.toLowerCase()];
          return value == null ? null : (Array.isArray(value) ? value.join(', ') : value);
        }
      };
    }
  end

  def self.data(req)
    %x{
      var arrayBuffer = req.response;
      var byteArray = new Uint8Array(arrayBuffer);
      var result = []
      for (var i = 0; i < byteArray.byteLength; i++) {
        result.push(byteArray[i]);
      }
      return result;
    }
  end
end

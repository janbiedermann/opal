# backtick_javascript: true

# The HTTP server the specs of the code that reads a remote source run against.
#
# It lives on a Node Worker of its own: Gem::HTTPTransport parks the thread that
# asked for a fetch in Atomics.wait, and that thread is the event loop the specs
# run on, so a server on it could not answer the very request it is waiting for.
#
# The routes below are the ones the fetcher specs need. A spec that needs a body
# it builds itself - a compact index, a marshalled index, the bytes of a .gem -
# hands them to #start as a Hash of route => options and the server answers those
# too:
#
#   body:   the response body, as its bytes (one character per byte)
#   type:   the content type, text/plain by default
#   etag:   an ETag; a request whose If-None-Match matches it is answered 304
#   status: the status to answer, 200 by default
#
# The server runs once for the whole suite: a second #start answers the port of
# the one that is already running, and #stop closes it.

module GemsHTTPFixture
  SERVER_SOURCE = <<~'JS'
    const { workerData } = require("node:worker_threads");
    const http = require("node:http");
    const zlib = require("node:zlib");

    const server = http.createServer((req, res) => {
      const supplied = workerData.bodies[req.url];
      if (supplied !== undefined) {
        if (supplied.etag !== undefined && req.headers["if-none-match"] === supplied.etag) {
          res.writeHead(304);
          res.end();
          return;
        }
        const headers = { "content-type": supplied.type };
        if (supplied.etag !== undefined) headers.etag = supplied.etag;
        res.writeHead(supplied.status, headers);
        res.end(req.method === "HEAD" ? undefined : Buffer.from(supplied.body, "latin1"));
        return;
      }

      if (req.url === "/info/rake") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("rake,13.2.1\nrake,13.1.0\n");
      } else if (req.url === "/bytes") {
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end(Buffer.from([0x00, 0xff, 0xc3, 0xa9, 0x41]));
      } else if (req.url === "/versions.4.gz") {
        // a gzip file served as its bytes: fetch_path gunzips it by the URL
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end(zlib.gzipSync("the index"));
      } else if (req.url === "/redirect-once") {
        res.writeHead(302, { location: "/info/rake" });
        res.end();
      } else if (req.url === "/redirect-loop") {
        res.writeHead(302, { location: "/redirect-loop" });
        res.end();
      } else if (req.url === "/redirect-no-location") {
        res.writeHead(302);
        res.end();
      } else if (req.url === "/missing") {
        res.writeHead(404, { "x-error-message": "no such gem" });
        res.end("not here");
      } else if (req.url === "/cond") {
        if (req.headers["if-modified-since"]) {
          res.writeHead(304);
          res.end();
        } else {
          res.writeHead(200, { "last-modified": "Wed, 01 Jan 2025 00:00:00 GMT" });
          res.end("fresh");
        }
      } else if (req.url === "/auth") {
        const wanted = "Basic " + Buffer.from("usr:p/ss").toString("base64");
        if (req.headers.authorization === wanted) {
          res.writeHead(200);
          res.end("authorized");
        } else {
          res.writeHead(401, { "www-authenticate": "Basic" });
          res.end("denied");
        }
      } else if (req.url === "/echo") {
        const lines = [req.method];
        for (const [name, value] of Object.entries(req.headers)) lines.push(name + "=" + value);
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(lines.join("\n"));
      } else {
        res.writeHead(404, { "x-error-message": "no such route" });
        res.end("not here");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      workerData.port.postMessage(server.address().port);
      Atomics.add(workerData.ready, 0, 1);
      Atomics.notify(workerData.ready, 0);
    });
  JS

  class << self
    # One server serves the specs of this directory: a #start that only asks for
    # routes it already answers returns the port of the server that is running,
    # and a #start that brings a new route restarts it with everything gathered
    # so far - the files run one after another, so nothing is left holding a
    # port across a restart.
    def start(bodies = {})
      fresh = bodies.reject {|route, options| @bodies[route] == options }
      @bodies.update bodies
      return @port if @port && fresh.empty?
      restart
    end

    def stop
      @port = nil
      %x{
        if (Opal.__gems_fixture_worker !== undefined) {
          Opal.__gems_fixture_worker.terminate();
          Opal.__gems_fixture_worker = undefined;
        }
      }
      nil
    end

    private

    def restart
      stop
      %x{ var supplied = {}; }
      @bodies.each do |route, options|
        body = options[:body].to_s
        type = options.fetch(:type, "text/plain")
        status = options.fetch(:status, 200)
        if (etag = options[:etag])
          %x{ supplied[route] = { body: String(body), type: String(type), status: status, etag: String(etag) } }
        else
          %x{ supplied[route] = { body: String(body), type: String(type), status: status } }
        end
      end

      # The Worker has to be waited for the way the transport is: this thread is
      # the event loop, and it only reaches the answer by polling the port. The
      # port is read back with a single-expression x-string, because the boot
      # body below is a sequence of statements and cannot stand in an
      # assignment.
      %x{
        const { MessageChannel, Worker, receiveMessageOnPort } = require("node:worker_threads");
        const ready = new Int32Array(new SharedArrayBuffer(4));
        const { port1, port2 } = new MessageChannel();
        const worker = new Worker(String(#{SERVER_SOURCE}), {
          eval: true,
          workerData: { ready, port: port2, bodies: supplied },
          transferList: [port2],
        });
        worker.unref();
        port1.unref();
        Atomics.wait(ready, 0, 0, 10000);
        const message = receiveMessageOnPort(port1);
        if (!message) {
          worker.terminate();
          throw new Error("the fixture server did not answer");
        }
        Opal.__gems_fixture_worker = worker;
        Opal.__gems_fixture_port = message.message;
      }
      @port = `Opal.__gems_fixture_port`
    end
  end

  @bodies = {}
  @port = nil
end

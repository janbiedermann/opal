# `Net::HTTPServer` and `Rack::Handler::Up`

The network server stack ported from the up! project: a generic
evented server API (`Net::HTTPServer`) and a Rack 3 handler over it
(`Rack::Handler::Up`), pure node.js - the original's uWebSockets.js
backend is gone, leaving `http/https/http2` plus the `ws` npm package.
The stdlib itself needs no npm package beyond `ws`, and that only for
WebSocket support: a plain HTTP server works without it, and the
backend finds it in the process cwd's `node_modules` as a fallback.

## Layout

```
stdlib/
  net/http_server.rb                 # entry: require 'net/http_server'
  net/http_server/
    base.rb                          # Net::HTTPServer - event flow, cluster, pubsub
    request.rb                       # Net::HTTPServer::Request
    response.rb                      # Net::HTTPServer::Response (buffered, #finish)
    web_socket.rb                    # Net::HTTPServer::WebSocket
    backends/node.rb                 # the backend: node http/https/http2 + ws npm
  rack/handler/up.rb                 # Rack layer: Rack::Handler::Up + PubSubClient
  tempfile.rb                        # StringIO-backed Tempfile (rack needs it)
  cgi/escape.rb                      # feature alias to cgi/util
test/opal/
  net_http_server_smoke.rb           # layer 1 end-to-end smoke
  rack_handler_smoke.rb              # layer 2 end-to-end smoke (Lint-optional)
  ws_client_check.js                 # WebSocket echo+pubsub client
  rack_compat/                       # rack-gem compatibility audit kit
    syntax_check.sh                  # compiles every rack gem file with ./exe/ruby -c
    probe_rack_runtime.rb            # runtime surface probes
    RACK_COMPAT.md                   # findings of the rack-gem audit
```

## Layer 1: the generic network server API (`Net::HTTPServer`)

A high performance, evented HTTP/1.1, HTTP/2, HTTPS and WebSocket
server. There is deliberately no synchronous API (node.js has none)
and it does not attempt to mimic `TCPServer#accept`; the shape is
Ruby-ish (keyword arguments, blocks, IO-like objects) but evented:

```ruby
require 'net/http_server'

server = Net::HTTPServer.new(host: 'localhost', port: 3000)
server.on_request do |req, res|
  # req: request_method, path, query, headers (downcased String keys), body (StringIO|nil)
  res.status = 200
  res['content-type'] = 'text/plain'
  res.write 'hello world'   # buffered until #finish
  res.finish
end
server.on_ws do |req, res|
  res.upgrade(
    on_open:    ->(ws)         { ws.subscribe('news') },
    on_message: ->(ws, msg)    { ws.write(msg) },
    on_close:   ->(ws, code)   { },
    on_drain:   ->(ws)         { }   # write buffer drained
  )
end
server.start          # returns once the socket is open
Net::HTTPServer.publish('news', 'hello subscribers')
server.stop
```

Options: `host:`, `port:`, `scheme: 'http'|'https'|'http2'`,
`tls: {key_file:, cert_file:, ca_file:}`, `workers:` (node cluster),
`logger:`, `backend:` (`Net::HTTPServer::Backends::Node` default).

Backend contract (for new backends): `listen/close`,
`request_method/path/query/headers`, `write_status/write_chunk/
end_response`, `ws_send/ws_close/ws_subscribe/ws_unsubscribe/ws_pending`,
`publish/publish_local`, `accept_upgrade`. `base.rb` owns the Ruby API
and event flow; backends own the transport.

## Layer 2: the Rack handler (`Rack::Handler::Up`)

`require 'rack/handler/up'` registers the handler with
`Rackup::Handler` under the name `up` when rackup is available.
It implements Rack 3 semantics on top of `Net::HTTPServer`:
env building into an Opal Hash (`rack.input` as StringIO), response
status/headers/body (`each`/`call`/`close`), error handling with the
logger, and the iodine-style `rack.upgrade` WebSocket/pubsub API
(on_open/on_message/on_drained/on_close with a `PubSubClient`) — same
as the original up!, except `rack.hijack` was already absent there.

## Differences from the original up implementations

- split into transport layer (`net/http_server`) and Rack layer
  (`rack/handler/up`); neither leaks into the other
- response bodies are buffered and written on `#finish` (the original
  wrote inline in one pass); the status reason phrase is derived from
  the status code instead of always appending " OK"
- the node backend reads request bodies for any method that has a
  `content-length`/`transfer-encoding` header, not only POST
- non-string publish payloads are serialized in Ruby (`#to_json`)
  instead of `JSON.stringify` on Opal objects (which produced garbage)
- all strings crossing into native APIs are normalized to JS
  primitives (boxed Opal strings broke cluster IPC and node fs calls)
- the stack runs on pure node.js: `http/https/http2` plus the `ws` npm
  package; the original's uWebSockets.js backend is gone

## Running the smoke tests

The smoke drivers run evented servers and self-drive HTTP/WS clients,
so they are plain scripts run through `exe/ruby` (which bundles the
whole stdlib - rebuild it with `node tasks/ruby.mjs` after changing
these files), not Minitest files: they stay out of the `test_*.rb`
glob so the batch Minitest runner never picks them up. The WebSocket
checks need a cwd whose `node_modules` has `ws`:

```sh
cd /path/to/an/app-with-ws-in-node-modules
/path/to/opal/exe/ruby /path/to/opal/test/opal/net_http_server_smoke.rb   # 8 checks
/path/to/opal/exe/ruby /path/to/opal/test/opal/rack_handler_smoke.rb      # 5 checks
```

`rack_handler_smoke.rb` wraps its HTTP phase in `Rack::Lint` when the
rack gem is installed and Lint can load; on today's tree Lint cannot
(its regex literals hit the gap documented in
`test/opal/rack_compat/RACK_COMPAT.md`), so the test reports that and
runs the checks unwrapped - it tightens itself once Lint loads.

Last results on this tree: net smoke 8/8 (status 418, POST+PUT
bodies, query, headers, 404, WS echo + pubsub); rack handler smoke
5/5 (GET/POST/PUT echo/404, then WS upgrade echo/pubsub); cluster
`workers: 2` (controller + 2 workers, HTTP round-robin, pubsub
delivered to a WS client); rack-gem probe 32/45 with every failure
mapped to the gap table.

One tree quirk the drivers work around: a script run through
`exe/ruby` gets an implicit `Kernel#exit` at the end of the program,
which would cut an evented server short; they swallow it (redefine
`exit`) and finish with `process.exit`. A built `exe/up` bundle must
be built without that appended exit.

## Follow-ups

- build `exe/up` from `lib/opal/exe/up.rb` (a task parallel to
  `tasks/ruby.mjs`, built without the appended program exit) and port
  its stage-2 `config.ru` compilation to the loader pattern
  (`Opal::Compiler.new(src).compile` + `Opal.platform.load_file` +
  `$LOAD_PATH` + `Gem.try_activate`) - as staged it still uses the old
  `Opal::Builder`
- decide whether the tree itself should depend on `ws` (devDependency)
  so the WS smokes run from the tree root
- drop `-stempfile` from the Minitest stubs in `tasks/testing/minitest.mjs`
  now that `stdlib/tempfile.rb` exists
- the tree-side patches proposed in `test/opal/rack_compat/RACK_COMPAT.md`
  (`Time.httpdate`/`rfc2822`, flag-merging `Regexp.union`,
  `URI::RFC3986_Parser#make_regexp`, the gap-10 regexp translation)
- HTTP/2 WebSocket upgrade and `rack.hijack` remain unsupported;
  consider a `Net::WebSocket#on(:event)` sugar API if review prefers
  it over the options hash

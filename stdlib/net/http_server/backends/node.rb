# backtick_javascript: true
require 'stringio'

%x{
  const node_process = require('node:process');
  const node_http = require('node:http');
  const node_https = require('node:https');
  const node_http2 = require('node:http2');
  const node_fs = require('node:fs');
  const node_text_decoder = new TextDecoder();

  // ws is only needed for WebSocket support; the plain HTTP server
  // works without it
  let node_ws = null;
  try {
    node_ws = require('ws');
  } catch (e) {
    try {
      module.paths.push(node_process.cwd() + '/node_modules');
      node_ws = require('ws');
    } catch (e2) { /* no WebSockets without the 'ws' npm package */ }
  }


  // normalize boxed Opal strings to JavaScript primitive strings
  function opal_js_string(v) {
    if (typeof v === 'string') { return v; }
    if (v && v.$$is_string) { return v.toString(); }
    return String(v);
  }

  // pubsub channels of this process: channel name -> Set of sockets
  const node_ws_channels = new Map();
  function node_ws_subscribe(channel, ws) {
    let c = node_ws_channels.get(channel);
    if (!c) { c = new Set(); node_ws_channels.set(channel, c); }
    c.add(ws);
  }
  function node_ws_unsubscribe(channel, ws) {
    const c = node_ws_channels.get(channel);
    if (c) { c.delete(ws); if (c.size === 0) { node_ws_channels.delete(channel); } }
  }

  function node_req_path(raw) {
    const u = raw.url, qi = u.indexOf('?');
    return qi > 0 ? u.slice(0, qi) : u;
  }
  function node_req_query(raw) {
    const u = raw.url, qi = u.indexOf('?');
    return qi > 0 ? u.slice(qi + 1) : '';
  }
}

module Net
  module HTTP
    class Server
      # The default backend, using the node.js http/https/http2 modules
      # and the 'ws' npm package for WebSockets.
      module Backends
        module Node
          class << self
            def new(server)
              Backend.new(server)
            end
          end

          class Backend
          def initialize(server)
            @server = server
            @ws_server = nil
            @http_server = nil
          end

          # -- listen and close -------------------------------------------

          def listen(host, port, scheme, tls, callback = nil)
            %x{
              let options = {};
              if (scheme === 'https' || scheme === 'http2') {
                options.key = node_fs.readFileSync(#{tls[:key_file]});
                options.cert = node_fs.readFileSync(#{tls[:cert_file]});
                if (#{!!tls[:ca_file]}) { options.ca = node_fs.readFileSync(#{tls[:ca_file]}); }
              }

              function handle_req(req, res) {
                if (req.headers['content-length'] || req.headers['transfer-encoding']) {
                  let buffer = Buffer.from('');
                  req.on('data', (d) => { buffer = Buffer.concat([buffer, Buffer.from(d)]); });
                  req.on('end', () => {
                    self.$handle_http_request(req, res, buffer.toString());
                  });
                  req.on('aborted', () => {});
                } else {
                  self.$handle_http_request(req, res, Opal.nil);
                }
              }

              let server;
              if (scheme === 'https') {
                server = node_https.createServer(options, handle_req);
              } else if (scheme === 'http2') {
                options.allowHTTP1 = true;
                server = node_http2.createSecureServer(options);
                server.on('stream', (stream, headers) => {
                  handle_req(new node_http2.Http2ServerRequest(stream, headers),
                             new node_http2.Http2ServerResponse(stream));
                });
              } else {
                server = node_http.createServer(handle_req);
              }

              if (node_ws !== null) {
                #@ws_server = new node_ws.WebSocketServer({ noServer: true });
              }

              server.on('upgrade', (req, socket, head) => {
                self.$handle_upgrade_request(req, socket, head);
              });

              server.listen(#{port}, #{host}, () => {
                if (callback !== nil && callback !== null) { callback.$call(); }
              });
              #@http_server = server;
            }
            @http_server
          end

          def close(handle)
            %x{
              handle.close();
              if (#@ws_server !== nil && #@ws_server !== null && typeof #@ws_server.close === 'function') {
                try { #@ws_server.close(); } catch (e) {}
              }
            }
            @ws_server = nil
          end

          # -- request primitives -----------------------------------------

          def request_method(raw)
            `String(raw.method)`
          end

          def request_path(raw)
            `node_req_path(raw)`
          end

          def request_query(raw)
            `node_req_query(raw)`
          end

          def request_headers(raw)
            headers = {}
            %x{
              const h = raw.headers;
              for (const k in h) {
                let v = h[k];
                if (Array.isArray(v)) { v = v.join(', '); }
                if (v !== undefined && v !== null) { headers['$[]='](k, String(v)); }
              }
            }
            headers
          end

          # -- response primitives ----------------------------------------

          def write_status(status, headers, raw)
            %x{
              if (typeof raw.setHeader === 'function') {
                raw.statusCode = status;
                for (const h of headers) {
                  let v = h[1];
                  if (v.$$is_array) { v = v.join('\n'); }
                  raw.setHeader(h[0], v);
                }
              } else {
                // raw socket of a rejected upgrade request
                let out = 'HTTP/1.1 ' + status + '\r\nConnection: close\r\n';
                for (const h of headers) {
                  let v = h[1];
                  if (v.$$is_array) { v = v.join('\n'); }
                  out += h[0] + ': ' + v + '\r\n';
                }
                out += '\r\n';
                raw.write(out);
              }
            }
            nil
          end

          def write_chunk(chunk, raw)
            %x{
              raw.write(typeof chunk === 'object' && chunk.$$is_string ? chunk.toString() : chunk);
            }
            nil
          end

          def end_response(raw)
            `raw.end()`
          end

          # -- WebSocket primitives ---------------------------------------

          def ws_send(raw, data)
            %x{
              raw.send(opal_js_string(data));
            }
            nil
          end

          def ws_close(raw, code)
            %x{
              if (code !== nil && code !== null) { raw.close(code); } else { raw.close(); }
            }
            nil
          end

          def ws_subscribe(raw, channel)
            `node_ws_subscribe(opal_js_string(channel), raw)`
          end

          def ws_unsubscribe(raw, channel)
            `node_ws_unsubscribe(opal_js_string(channel), raw)`
          end

          def ws_pending(raw)
            `raw.readyState > 1 ? -1 : (raw.bufferedAmount || 0)`
          end

          # -- pubsub ------------------------------------------------------

          def publish(channel, message)
            %x{
              const msg = opal_js_string(message);
              let clients = node_ws_channels.get(channel);
              if (clients) {
                for (const client of clients) {
                  if (client.readyState === 1) {
                    client.send(msg);
                  } else if (client.readyState > 1) {
                    clients.delete(client);
                  }
                }
                if (clients.size === 0) { node_ws_channels.delete(channel); }
              }
            }
            nil
          end

          # publish called by the cluster machinery when the message came
          # from another process
          def publish_local(channel, message)
            publish(channel, message)
          end

          # -- upgrade -----------------------------------------------------

          def accept_upgrade(rb_req, rb_res, handles)
            %x{
              #@ws_server.handleUpgrade(rb_req.$raw(), handles.socket, handles.head, (ws) => {
                ws.subscribe = (channel) => { node_ws_subscribe(channel, ws); };
                ws.unsubscribe = (channel) => { node_ws_unsubscribe(channel, ws); };
                #@server.$handle_ws_open(ws, rb_res.$websocket_options());
                ws.on('message', (message) => {
                  if (ws.rb_ws) {
                    #@server.$handle_ws_message(ws.rb_ws, node_text_decoder.decode(message));
                  }
                });
                ws.on('close', (code) => {
                  if (ws.rb_ws) {
                    #@server.$handle_ws_close(ws.rb_ws, code);
                  }
                });
                ws.on('drain', () => {
                  if (ws.rb_ws) {
                    #@server.$handle_ws_drain(ws.rb_ws);
                  }
                });
              });
            }
            nil
          end

          private

          # called from JS: body is a String or Opal.nil
          def handle_http_request(req, res, body)
            body = StringIO.new(body) unless body.nil?
            request = Request.new(self, req, body)
            response = Response.new(self, request, res)
            @server.call_request(request, response)
          end

          # called from JS
          def handle_upgrade_request(req, socket, head)
            request = Request.new(self, req, nil)
            response = Response.new(self, request, socket, upgrade: true)
            if @ws_server
              handles = %x{ ({socket: socket, head: head}) }
              @server.call_upgrade(request, response, handles)
            else
              response.status = 426
              response.write 'Upgrade Required: no ws npm package'
              response.finish
            end
          end
          end
        end
      end
    end
  end
end

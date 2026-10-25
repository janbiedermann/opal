# backtick_javascript: true
# End-to-end smoke test for Rack::Handler::Up. The HTTP side runs the
# app behind Rack::Lint, so the env the handler builds and the
# responses it writes are checked against the rack spec; the
# WebSocket side exercises the rack.upgrade echo/pubsub API unwrapped
# (the upgrade convention answers with status 0, which Lint would
# rightly reject).
#
# Run from a directory whose node_modules has the ws npm package:
#
#   cd /path/to/an/app-whose-node_modules-has-ws
#   /path/to/opal/exe/ruby /path/to/opal/test/opal/rack_handler_smoke.rb

# running as a plain script appends an exit at the end of the program,
# which would cut the event loop short; finish with process.exit.
module Kernel
  def exit(code = 0)
  end
end

# rack/lint builds a request-target regexp with
# URI::RFC3986_Parser#make_regexp, which this tree's uri library has
# not ported (RACK_COMPAT gap 8). Until it lands, assemble the same
# pattern from the parser's own grammar constants, dropping the x-mode
# whitespace and the group names so lint can embed it without
# collisions.
require 'uri'
unless URI::RFC3986_Parser.method_defined?(:make_regexp)
  module URI
    class RFC3986_Parser
      def make_regexp(schemes = nil)
        src = URI::RFC3986_Parser::RFC3986_URI.source
        src = src.gsub(/\s+/, '').gsub(/\(\?<[^>]*>/, '(?:')
        Regexp.new(src)
      end
    end
  end
end

require 'rack/handler/up'

# Rack::Lint's own regexes (lint.rb HOST_PATTERN/URI_ISH) use Onigmo
# constructs with no JavaScript counterpart - named subexpression
# calls \g<name>, possessive quantifiers, hyphenated group names -
# and this tree has no Onigmo-to-JavaScript regexp translation (see
# GEMS.md and the stdlib uri header, which pre-copies around it).
# Until that lands (RACK_COMPAT gap 10) or rack rewrites them, Lint
# cannot load, so the spec checks are optional and clearly reported.
LINT_OK = begin
  require 'rack/lint'
  true
rescue Exception => e
  puts "  note rack/lint can not load on this opal: #{e.class}: #{e.message.to_s[0, 90]}..."
  false
end

HTTP_PORT = 3117
WS_PORT   = 3118

$total = 0
$total_failed = 0

def check(name, ok)
  $total += 1
  if ok
    puts "  ok   #{name}"
  else
    $total_failed += 1
    puts "  FAIL #{name}"
  end
end

def finish
  puts "#{$total - $total_failed}/#{$total} checks passed"
  if $total_failed == 0
    puts 'RACK SMOKE OK'
    `process.exit(0)`
  else
    puts 'RACK SMOKE FAILED'
    `process.exit(1)`
  end
end

# -- the apps -----------------------------------------------------------

class HttpApp
  def self.call(env)
    if env['REQUEST_METHOD'] == 'GET' && env['PATH_INFO'] == '/'
      return text(200, 'pong')
    elsif (env['REQUEST_METHOD'] == 'POST' || env['REQUEST_METHOD'] == 'PUT') &&
          env['PATH_INFO'] == '/echo'
      io = env['rack.input']
      io.rewind if io.respond_to?(:rewind)
      return text(200, io ? io.read : '')
    else
      return text(404, 'nope')
    end
  end

  def self.text(status, body)
    [status, { 'content-type' => 'text/plain', 'content-length' => body.bytesize.to_s }, [body]]
  end
end

module WSHandler
  class << self
    def on_open(client)
      client.subscribe('a_channel')
    end

    def on_message(client, data)
      client.write data
      client.publish('a_channel', "sent to a_channel: #{data}")
    end
  end
end

class WSApp
  def self.call(env)
    if env['rack.upgrade?'] == :websocket
      env['rack.upgrade'] = WSHandler
      return [0, {}, []]
    end
    [404, { 'content-type' => 'text/plain', 'content-length' => '4' }, ['nope']]
  end
end

# -- http checks, chained through the JS client's callbacks ------------
# each step: [what, method, path, body, assert-proc]; the assert sees
# $http_status / $http_body. retries cover the window between run()
# and the socket actually listening.

LINT_TAG = LINT_OK ? 'through Rack::Lint' : 'unlinted, rack/lint unavailable'

$http_steps = [
  ["GET 200 #{LINT_TAG}",
   'GET', '/', nil,
   proc { $http_status == 200 && $http_body == 'pong' }],
  ["POST echo body #{LINT_TAG}",
   'POST', '/echo', 'post-body',
   proc { $http_status == 200 && $http_body == 'post-body' }],
  ["PUT echo body #{LINT_TAG}",
   'PUT', '/echo', 'put-body',
   proc { $http_status == 200 && $http_body == 'put-body' }],
  ["unknown route 404 #{LINT_TAG}",
   'GET', '/nope', nil,
   proc { $http_status == 404 && $http_body == 'nope' }],
]

def http_req(index)
  what, method, path, body, _assert = $http_steps[index]
  %x{
    const go = (tries) => {
      const r = require('node:http').request(
        { hostname: '127.0.0.1', port: #{HTTP_PORT}, path: #{path}, method: #{method} },
        (res) => {
          let data = '';
          res.on('data', (d) => { data += d; });
          res.on('end', () => { self.$on_http(#{index}, res.statusCode, data); });
        });
      r.on('error', (e) => {
        if (tries > 0) { setTimeout(() => go(tries - 1), 250); }
        else { self.$on_http(#{index}, 0, e.message); }
      });
      if (#{body} !== nil && #{body} !== undefined && #{body} !== null) { r.write(#{body}); }
      r.end();
    };
    go(8);
  }
end

def on_http(index, status, body)
  _what, _method, _path, _body, assert = $http_steps[index]
  $http_status = status
  $http_body = body
  check(_what, !!assert.call)
  if index + 1 < $http_steps.length
    http_req(index + 1)
  else
    after_http
  end
end

# -- websocket check ----------------------------------------------------

def on_ws(info, ok)
  check("websocket echo + pubsub through the handler (#{info})", ok)
  Rack::Handler::Up.shutdown
  finish
end

def ws_check
  %x{
    const go = (tries) => {
      const ws = new (require('ws'))('ws://127.0.0.1:' + #{WS_PORT} + '/');
      let echo = false, pub = false, done = false;
      const fail = (msg) => {
        if (done) return; done = true;
        ws.close();
        self.$on_ws(msg, false);
      };
      const step = () => {
        if (done) return;
        if (echo && pub) {
          done = true;
          ws.close();
          self.$on_ws('echo: true, pubsub: true', true);
        }
      };
      ws.on('open', () => { ws.send('client-check'); });
      ws.on('message', (m) => {
        m = m.toString();
        if (m === 'client-check') { echo = true; }
        if (m === 'sent to a_channel: client-check') { pub = true; }
        step();
      });
      ws.on('error', (e) => {
        if (tries > 0) { setTimeout(() => go(tries - 1), 250); }
        else { fail(e.message); }
      });
      ws.on('close', () => { if (!done && !(echo && pub)) fail('closed early'); });
      setTimeout(() => { fail('echo: ' + echo + ', pubsub: ' + pub); }, 4000);
    };
    go(8);
  }
end

# -- phases -------------------------------------------------------------

# When Lint can load it turns any spec violation into a LintError,
# which the handler logs and answers with 500, so a failed check here
# means rack found the handler's env or responses non-compliant; the
# lint report is in the log.
Rack::Handler::Up.run(
  LINT_OK ? Rack::Lint.new(HttpApp) : HttpApp,
  Host: '127.0.0.1', Port: HTTP_PORT
)
http_req(0)

def after_http
  Rack::Handler::Up.shutdown
  # phase 2: the upgrade API, unwrapped
  Rack::Handler::Up.run(WSApp, Host: '127.0.0.1', Port: WS_PORT)
  ws_check
end

%x{
  setTimeout(() => {
    console.log('RACK SMOKE TIMEOUT');
    process.exit(2);
  }, 30000);
}

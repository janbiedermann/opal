# backtick_javascript: true
# End-to-end smoke test for Net::HTTPServer, without rack.
#
# Run from an app directory that has the ws npm package (the checks
# connect to localhost and use the cwd's node_modules):
#
#   cd /path/to/an/app-whose-node_modules-has-ws
#   /path/to/opal/exe/ruby /path/to/opal/test/opal/net_http_server_smoke.rb
#
# (exe/ruby bundles the whole stdlib, so no -I is needed; rebuild it
# with `node tasks/ruby.mjs` after stdlib changes.)

# Running as a plain script (exe/ruby, opal CLI) appends an exit at
# the end of the program, which would cut the event loop short before
# the async checks complete; swallow it here. The test's own finish
# ends the process through process.exit.
module Kernel
  def exit(code = 0)
  end
end

require 'net/http_server'

%x{
  const smoke_http = require('node:http');
  try { module.paths.push(process.cwd() + '/node_modules'); } catch (e) {}
  const smoke_ws = require('ws');
}

PORT = 3999
$total = 0
$total_failed = 0

def check(name, ok)
  $total += 1
  unless ok
    $total_failed += 1
    puts "  FAIL #{name}"
  end
  puts "  ok   #{name}" if ok
end

def finish
  puts "#{$total - $total_failed}/#{$total} checks passed"
  if $total_failed == 0
    puts 'SMOKE OK'
    `process.exit(0)`
  else
    puts 'SMOKE FAILED'
    `process.exit(1)`
  end
end

def http_req(method, path, body, headers = nil, &done)
  %x{
    const r = smoke_http.request({
      hostname: '127.0.0.1', port: #{PORT}, path: #{path}, method: #{method},
      headers: (#{headers} === nil || #{headers} === undefined || #{headers} === null) ? {} : #{headers}
    }, (res) => {
      let data = '';
      res.on('data', (d) => { data += d; });
      res.on('end', () => { done.$call(res.statusCode, data); });
    });
    r.on('error', (e) => { done.$call(0, e.message); });
    if (#{body} !== nil && #{body} !== undefined && #{body} !== null) { r.write(#{body}); }
    r.end();
  }
end

def ws_check
  %x{
    const ws = new smoke_ws('ws://127.0.0.1:' + #{PORT} + '/');
    let echo = false, pub = false;
    ws.on('open', () => { ws.send('echo-me'); });
    ws.on('message', (m) => {
      m = m.toString();
      if (m === 'echo-me') { echo = true; ws.send('pub'); }
      if (m === 'P:pub') { pub = true; }
    });
    ws.on('error', (e) => { self.$ws_check_done(e.message, false); });
    setTimeout(() => {
      ws.close();
      self.$ws_check_done('echo: ' + echo + ', pubsub: ' + pub, echo && pub);
    }, 3000);
  }
end

def ws_check_done(info, ok)
  check("websocket echo + pubsub (#{info})", ok)
  finish
end

server = Net::HTTPServer.new(host: '127.0.0.1', port: PORT)
server.logger.level = Logger::ERROR

server.on_request do |req, res|
  case req.path
  when '/echo'
    res.write(req.body ? req.body.read : '')
  when '/query'
    res.write(req.query)
  when '/header'
    res.write(req.headers['x-test'] || '')
  when '/status418'
    res.status = 418
    res.write('teapot')
  else
    res.status = 404
    res.write('not found')
  end
  res.finish
end

server.on_ws do |req, res|
  res.upgrade(
    on_open: lambda do |ws|
      ws.subscribe('chan')
    end,
    on_message: lambda do |ws, msg|
      ws.write(msg)
      server.publish('chan', "P:#{msg}") if msg == 'pub'
    end
  )
end

server.start do
  http_req('GET', '/status418', nil) do |status, body|
    check('status 418', status == 418)
    check('418 body', body == 'teapot')
    http_req('POST', '/echo', 'post-body') do |s2, b2|
      check('POST body read', s2 == 200 && b2 == 'post-body')
      http_req('PUT', '/echo', 'put-body') do |s3, b3|
        check('PUT body read (not only POST)', s3 == 200 && b3 == 'put-body')
        http_req('GET', '/query?x=1&y=2', nil) do |s4, b4|
          check('query string', s4 == 200 && b4 == 'x=1&y=2')
          http_req('GET', '/header', nil, `({'x-test': 'hdr-value'})`) do |s5, b5|
            check('request header seen', s5 == 200 && b5 == 'hdr-value')
            http_req('GET', '/nope', nil) do |s6, b6|
              check('unknown route 404', s6 == 404 && b6 == 'not found')
              ws_check
            end
          end
        end
      end
    end
  end
end

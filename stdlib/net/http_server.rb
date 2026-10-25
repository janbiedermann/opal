# Entry point for the generic Opal network server library.
#
#   require 'net/http_server'
#
# Provides Net::HTTPServer, an evented HTTP/1.1, HTTP/2 and HTTPS server
# with WebSocket support for Opal on Node.js. The backend uses the
# plain node.js http/https/http2 modules plus the 'ws' npm package.
#
require 'net/http_server/base'
require 'net/http_server/backends/node'

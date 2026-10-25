# backtick_javascript: true
require 'logger'
require 'stringio'
require 'json'
require 'net/http_server/request'
require 'net/http_server/response'
require 'net/http_server/web_socket'

%x{
  const cluster = require('node:cluster');

  // Opal strings can be boxed String objects (corelib's $str), which
  // native APIs (cluster IPC, node fs...) reject or
  // mangle; normalize to a JavaScript primitive string
  function opal_js_string(v) {
    if (typeof v === 'string') { return v; }
    if (v && v.$$is_string) { return v.toString(); }
    return String(v);
  }
}

module Net
  module HTTP
    # Net::HTTPServer is a high performance, evented network server for
    # Opal on Node.js. It is not compatible with the blocking socket
    # servers from Ruby's stdlib (TCPServer#accept and friends) because
    # node.js has no synchronous network API. Instead, requests and
    # WebSocket connections are dispatched to handlers:
    #
    #   server = Net::HTTPServer.new(host: 'localhost', port: 3000)
    #   server.on_request do |req, res|
    #     res.write 'hello world'
    #     res.finish
    #   end
    #   server.on_ws do |req, res|
    #     res.upgrade(on_message: ->(ws, message) { ws.write(message) })
    #   end
    #   server.start
    #
    # The transport is pluggable through backends (see Backends::Node).
    # A backend implements the low-level socket and protocol handling;
    # this class implements the Ruby API and the event flow on top of
    # it.
    class Server
      # Backends implement the transport. Backends::Node, the node.js
      # http/https/http2 + 'ws' backend, is always loaded (see
      # net/http_server.rb).
      module Backends
      end

      class << self
        # The last server started, so that code without a reference to the
        # instance can publish to WebSocket pubsub channels.
        attr_accessor :running_instance

        def publish(channel, message)
          raise 'no server instance running' unless running_instance
          running_instance.publish(channel, message)
        end

        # Hook for subclasses, kept for API compatibility with the
        # original up CLI. Always true here.
        def stoppable?
          true
        end
      end

      attr_reader :host, :port, :scheme, :logger

      # scheme: 'http', 'https' or 'http2' (http2 needs tls and is
      # supported by the node backend only)
      # tls:    { key_file:, cert_file:, ca_file: nil }
      # workers: number of cluster processes (node's cluster module)
      def initialize(host: 'localhost', port: 3000, scheme: 'http',
                     tls: nil, workers: nil, logger: nil, backend: nil)
        @scheme = scheme || 'http'
        raise "unsupported scheme #{@scheme}" unless %w[http https http2].include?(@scheme)
        @host   = host || 'localhost'
        @port   = port&.to_i || 3000
        @tls    = tls
        if (@scheme == 'https' || @scheme == 'http2') &&
            (@tls.nil? || @tls[:key_file].nil? || @tls[:cert_file].nil?)
          raise 'for https and http2, tls: {key_file:, cert_file:} must be given'
        end
        @workers = workers
        @logger  = logger || Logger.new($stderr)
        @backend = backend || Backends::Node
        @backend = @backend.new(self)
        @server_handle = nil
        @on_request = nil
        @on_ws      = nil
        @listening  = false
        @worker     = false
        @cluster_members = nil
      end

      # Register the request handler, called for every HTTP request with
      # (request, response). The handler must finish the response.
      def on_request(&handler)
        @on_request = handler
        self
      end

      # Register the WebSocket upgrade handler, called for every upgrade
      # request with (request, response). The handler decides whether to
      # upgrade by calling response#upgrade.
      def on_ws(&handler)
        @on_ws = handler
        self
      end

      # Start listening. Returns once the socket is open; the optional
      # block runs when the server listens. In cluster mode, worker
      # processes return from start and the controller process keeps
      # running in the foreground.
      def start(&on_listening)
        raise 'already running' if @listening
        self.class.running_instance = self
        if @workers && @workers > 1
          @cluster_members = `[]`
          %x{
            if (cluster.isPrimary) {
              #{cluster_controller}
            } else {
              #@worker = true;
              #{cluster_worker_setup}
              #{listen(&on_listening)}
            }
          }
        else
          listen(&on_listening)
        end
        self
      end

      def stop
        return self unless self.class.stoppable?
        if @cluster_members && !@worker
          %x{
            for (const m of #@cluster_members) { m.kill(); }
            #@cluster_members.length = 0;
          }
        elsif @server_handle
          @backend.close(@server_handle)
          @server_handle = nil
        end
        @listening = false
        self.class.running_instance = nil if self.class.running_instance == self
        self
      end

      def listening?
        @listening
      end

      # Publish a message to all WebSocket clients subscribed to the
      # channel. Non-string messages are converted with #to_json. In
      # cluster mode the message is forwarded to all worker processes.
      def publish(channel, message)
        channel = channel.to_s unless channel.is_a?(String)
        message = message.to_json unless message.is_a?(String)
        if @worker
          @backend.publish(channel, message)
          %x{ process.send({c: opal_js_string(#{channel}), m: opal_js_string(#{message})}); }
        elsif @cluster_members && !@worker
          %x{
            const payload = {c: opal_js_string(#{channel}), m: opal_js_string(#{message})};
            for (const m of #@cluster_members) { m.send(payload); }
          }
        else
          @backend.publish(channel, message)
        end
        true
      end

      # Backend event flow: the backend calls these for every event.
      # They are part of the backend contract, not meant for direct use.

      # Called by the backend for a plain HTTP request, with the
      # Request and Response objects already built.
      def call_request(req, res)
        if @on_request
          @on_request.call(req, res)
        else
          res.status = 501
          res.write 'Not Implemented'
        end
        res.finish unless res.finished?
      end

      # Called by the backend for an upgrade request. +handles+ is a
      # backend specific object carrying what #accept_upgrade needs.
      def call_upgrade(req, res, handles)
        if @on_ws
          @on_ws.call(req, res)
        else
          res.status = 426
          res.write 'Upgrade Required'
        end
        if res.websocket?
          @backend.accept_upgrade(req, res, handles)
        elsif !res.finished?
          res.finish
        end
      end

      # Called by the backend after a WebSocket upgrade completed. ws_js
      # must carry a reference to its Ruby Net::HTTPServer::WebSocket in
      # the property rb_ws (see the backends).
      def handle_ws_open(ws_js, options)
        ws = WebSocket.new(@backend, ws_js)
        %x{ ws_js.rb_ws = #{ws}; }
        ws.setup_handlers(options.is_a?(Hash) ? options : {})
        ws.dispatch(:open)
        ws
      end

      # Called by the backend for a WebSocket message (data is a String).
      def handle_ws_message(rb_ws, data)
        rb_ws.dispatch(:message, data)
      end

      # Called by the backend when a WebSocket closes.
      def handle_ws_close(rb_ws, code)
        rb_ws.dispatch(:close, code)
      end

      # Called by the backend when the WebSocket write buffer drained.
      def handle_ws_drain(rb_ws)
        rb_ws.dispatch(:drain)
      end

      def backend
        @backend
      end

      private

      def listen(&on_listening)
        callback = proc do
          @listening = true
          @logger.info { "Server is running on #{@scheme}://#{@host}:#{@port}" }
          on_listening.call if on_listening
        end
        @server_handle = @backend.listen(@host, @port, @scheme, @tls, callback)
      end

      def cluster_controller
        @logger.info { "Cluster Controller PID: #{`process.pid`}" }
        %x{
          cluster.on('message', (worker, message, handle) => {
            if (message.c && message.m) {
              for (const member of #@cluster_members) {
                if (member !== worker) { member.send(message); }
              }
            }
          });
          for (let i = 0; i < #@workers; i++) {
            #@cluster_members.push(cluster.fork());
          }
        }
        nil
      end

      def cluster_worker_setup
        %x{
          process.on('message', (message, handle) => {
            if (message.c && message.m) {
              #@backend.$publish_local(message.c, message.m);
            }
          });
        }
      end
    end
  end

  HTTPServer = HTTP::Server
end

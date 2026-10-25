# backtick_javascript: true
require 'logger'
require 'stringio'
require 'net/http_server'

module Rack
  module Handler
    # Rack handler for the Net::HTTPServer, the Rack layer of up!.
    #
    #   Rack::Handler::Up.run(app, port: 3000, workers: 4)
    #
    # Options: host, port, scheme ('http'/'https'/'http2'), ca_file,
    # cert_file, key_file, workers, logger, backend (defaults to the
    # node backend; a Net::HTTPServer backend module can be passed to
    # replace it).
    #
    # rack.hijack is not implemented; instead rack.upgrade follows the
    # iodine/WebSocket draft spec: on an upgrade request the env gets
    # 'rack.upgrade?' set to :websocket and the app answers by putting
    # the connection handler object into 'rack.upgrade'. The object
    # receives on_open/on_message/on_drained/on_close calls with an
    # iodine compatible PubSubClient.
    class Up
      class << self
        def run(app, options = {})
          raise 'already running' if @instance
          @instance = new(app, options)
          @instance.start
          true
        end

        def shutdown
          @instance&.stop
          @instance = nil
        end

        # iodine compatible global publish
        def publish(channel, message)
          Net::HTTPServer.publish(channel, message)
        end
      end

      # iodine compatible client object handed to the connection
      # handler's on_open/on_message/on_drained/on_close callbacks
      class PubSubClient
        attr_reader :env

        # internal use
        def initialize(server, env)
          @server = server
          @env = env
          @ws = nil
        end

        # internal use
        def attach(ws)
          @ws = ws
        end

        def open?
          !@ws.nil? && @ws.open?
        end

        def close
          @ws&.close
        end

        # bytes waiting in the write buffer, -1 when closed
        def pending
          return -1 unless open?
          @ws.pending
        end

        def publish(channel, message)
          @server.publish(channel, message)
        end

        # is_pattern is not supported, present for iodine API
        # compatibility
        def subscribe(channel, _is_pattern = false)
          @ws&.subscribe(channel.to_s)
          self
        end

        def unsubscribe(channel, _is_pattern = false)
          @ws&.unsubscribe(channel.to_s)
          self
        end

        def write(data)
          @ws&.write(data)
          self
        end
      end

      def initialize(app, options = {})
        @app = app
        @options = options
        %x{
          // if app is a promise, its resolution must happen before
          // handlers below are called
          if (#@app instanceof Promise) {
            #@app.then(function (val) { #@app = val; });
          }
        }
        @logger = options[:logger] || Logger.new($stderr)
        @server = nil
      end

      def start
        raise 'already running' if @server
        @server = Net::HTTPServer.new(
          host:    @options[:host] || @options[:Host] || 'localhost',
          port:    @options[:port] || @options[:Port] || 3000,
          scheme:  @options[:scheme] || 'http',
          tls:     tls_options,
          workers: @options[:workers],
          logger:  @logger,
          backend: backend_class
        )
        @server.on_request { |req, res| call(req, res) }
        @server.on_ws      { |req, res| call_upgrade(req, res) }
        @server.start
      end

      def stop
        @server&.stop
        @server = nil
      end

      private

      def tls_options
        tls = @options[:tls]
        return tls if tls
        ca   = @options[:ca_file]
        cert = @options[:cert_file]
        key  = @options[:key_file]
        return nil unless cert && key
        { key_file: key, cert_file: cert, ca_file: ca }
      end

      def backend_class
        backend = @options[:backend]
        return Net::HTTPServer::Backends::Node if backend.nil? || backend.to_s == 'node'
        return backend if backend.is_a?(Module)
        raise "unknown backend: #{backend}"
      end

      # -- plain HTTP requests -------------------------------------------

      def call(req, res)
        status, headers, body = @app.call(rack_env(req))
        write_response(res, status, headers, body)
      rescue StandardError => e
        @logger.error { "application error: #{e.message}" }
        unless res.finished?
          res.status = 500
          res.write 'Internal Server Error'
          res.finish
        end
        e
      end

      def rack_env(req)
        env = {
          'rack.errors' => $stderr,
          'rack.logger' => @logger,
          'rack.multipart.buffer_size' => 4096,
          'rack.multipart.tempfile_factory' => proc { |filename, _content_type| ::File.new(filename, 'a+') },
          'rack.url_scheme' => @server.scheme,
          'SCRIPT_NAME' => '',
          'SERVER_PROTOCOL' => 'HTTP/1.1',
          'SERVER_NAME' => @server.host,
          'SERVER_PORT' => @server.port.to_s,
          'REQUEST_METHOD' => req.request_method,
          'PATH_INFO' => req.path,
          'QUERY_STRING' => req.query
        }
        req.headers.each do |name, value|
          key = name.upcase.tr('-', '_')
          if key == 'CONTENT_TYPE' || key == 'CONTENT_LENGTH'
            env[key] = value
          else
            env['HTTP_' + key] = value
          end
        end
        env['rack.input'] = req.body if req.body
        env
      end

      def write_response(res, status, headers, body)
        res.status = status
        headers.each do |name, value|
          res[name] = value.is_a?(Array) ? value.join("\n") : value
        end
        if body.respond_to?(:each)
          body.each { |part| res.write(part) }
        elsif body.respond_to?(:call)
          part = body.call
          res.write(part) if part
        end
        body.close if body.respond_to?(:close)
        res.finish
      end

      # -- WebSocket upgrade ----------------------------------------------

      def call_upgrade(req, res)
        env = rack_env(req)
        env['rack.upgrade?'] = :websocket
        status, headers, body = @app.call(env)
        handler = env['rack.upgrade']
        if status < 300 && handler
          res.upgrade(pubsub_handlers(handler, env))
        else
          env.delete('rack.upgrade')
          write_response(res, status, headers, body)
        end
      rescue StandardError => e
        @logger.error { "application error: #{e.message}" }
        unless res.finished?
          res.status = 500
          res.write 'Internal Server Error'
          res.finish
        end
      end

      def pubsub_handlers(handler, env)
        client = PubSubClient.new(@server, env)
        {
          on_open: proc { |ws|
            client.attach(ws)
            handler.on_open(client) if handler.respond_to?(:on_open)
          },
          on_message: proc { |ws, message|
            client.attach(ws)
            handler.on_message(client, message) if handler.respond_to?(:on_message)
          },
          on_drain: proc { |ws|
            client.attach(ws)
            handler.on_drained(client) if handler.respond_to?(:on_drained)
          },
          on_close: proc { |ws, _code|
            client.attach(ws)
            handler.on_close(client) if handler.respond_to?(:on_close)
          }
        }
      end
    end
  end
end

ENV['RACK_HANDLER'] ||= 'up'

begin
  ::Rackup::Handler.register('up', Rack::Handler::Up) if defined?(::Rackup::Handler)
rescue StandardError
  # rackup not available, nothing to register
end

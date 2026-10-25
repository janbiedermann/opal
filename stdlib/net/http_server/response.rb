module Net
  module HTTP
    class Server
      # The response for a request. Data passed to #write is buffered
      # until #finish sends status, headers and body.
      class Response
        # internal use: created by the backends
        def initialize(backend, request, raw, upgrade: false)
          @backend = backend
          @request = request
          @raw = raw
          @upgrade_request = upgrade
          @status = 200
          @headers = {}
          @chunks = []
          @finished = false
          @outcome = nil
          @ws_options = nil
        end

        attr_reader :request, :status

        def status=(code)
          @status = code.to_i
        end

        def headers
          @headers
        end

        def [](name)
          @headers[name.downcase]
        end

        def []=(name, value)
          @headers[name.downcase] = value
        end

        # Write a chunk of the response body.
        def write(data)
          raise 'response already finished' if @finished
          @chunks << data
          self
        end

        # Accept the upgrade request (only meaningful inside the on_ws
        # handler). Options: on_open, on_message, on_close and on_drain
        # callables, called with (ws, ...).
        def upgrade(options = {})
          raise 'upgrade can only be called in the on_ws handler' unless @upgrade_request
          @outcome = :websocket
          @ws_options = options
          self
        end

        def websocket?
          @outcome == :websocket
        end

        # internal use
        def websocket_options
          @ws_options
        end

        # internal use: the raw backend handle (node ServerRequest/
        # ServerResponse, or a socket for rejected upgrades)
        def raw
          @raw
        end

        def finished?
          @finished
        end

        # Send status line, headers and the buffered body, then end the
        # response.
        def finish
          return self if @finished
          @finished = true
          return self if websocket?
          @backend.write_status(@status, @headers, @raw)
          @chunks.each { |chunk| @backend.write_chunk(chunk, @raw) }
          @backend.end_response(@raw)
          self
        end
      end
    end
  end
end

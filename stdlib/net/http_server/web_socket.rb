module Net
  module HTTP
    class Server
      # A WebSocket connection, handed to the on_open handler and passed
      # to every event handler.
      class WebSocket
        # internal use: created by the server backends
        def initialize(backend, raw)
          @backend = backend
          @raw = raw
          @handlers = {}
          @open = false
        end

        # internal use: called by the server with the options given to
        # Response#upgrade
        def setup_handlers(handlers)
          @handlers = handlers
        end

        # internal use: called by the backend/server to dispatch
        # :open, :message, :close and :drain events, looking up the
        # matching on_open/on_message/on_close/on_drain handler
        def dispatch(event, data = nil)
          handler = @handlers[:"on_#{event}"]
          case event
          when :open
            @open = true
            handler&.(self)
          when :message
            handler&.(self, data)
          when :close
            @open = false
            handler&.(self, data)
          when :drain
            handler&.(self)
          end
        end

        def open?
          @open
        end

        # Send data (a String) to the client.
        def write(data)
          @backend.ws_send(@raw, data)
          self
        end

        def close(code = nil)
          @open = false
          @backend.ws_close(@raw, code)
          self
        end

        # Subscribe this connection to a pubsub channel of the server;
        # Net::HTTPServer#publish delivers a message to all connections
        # subscribed to a channel.
        def subscribe(channel)
          @backend.ws_subscribe(@raw, channel)
          self
        end

        def unsubscribe(channel)
          @backend.ws_unsubscribe(@raw, channel)
          self
        end

        # Bytes waiting in the write buffer, -1 when closed.
        def pending
          @backend.ws_pending(@raw)
        end

        # internal use
        def raw
          @raw
        end
      end
    end
  end
end

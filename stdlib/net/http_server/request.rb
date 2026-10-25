module Net
  module HTTP
    class Server
      # A request received by the server. Header names are kept as
      # downcased Strings (Rack-style upcasing happens in the Rack
      # layer). +body+ is a StringIO holding the request body or nil
      # when the request had no body.
      class Request
        # internal use: created by the backends
        def initialize(backend, raw, body = nil)
          @backend = backend
          @raw = raw
          @body = body
          @request_method = backend.request_method(raw)
          @path = backend.request_path(raw)
          @query = backend.request_query(raw)
          @headers = backend.request_headers(raw)
        end

        attr_reader :request_method, :path, :query, :headers, :body, :raw
      end
    end
  end
end

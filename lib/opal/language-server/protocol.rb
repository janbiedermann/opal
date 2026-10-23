# The message layer of the Language Server Protocol: the JSON-RPC 2.0
# wrappers and the protocol constants. Incoming messages are plain Hashes
# (String keys) from Transport#next_message; outgoing ones are built here
# and serialized with #to_h. This follows ruby-lsp's lib/ruby_lsp/utils.rb
# (MIT), pared down to what the server writes.
module Opal
  module LanguageServer
    # https://microsoft.github.io/language-server-protocol/specifications/lsp/3_18/specification/#errorCodes
    module ErrorCodes
      PARSE_ERROR           = -32700
      INVALID_REQUEST       = -32600
      METHOD_NOT_FOUND      = -32601
      INVALID_PARAMS        = -32602
      INTERNAL_ERROR        = -32603
      # LSP-defined:
      SERVER_NOT_INITIALIZED = -32002
      UNKNOWN_ERROR_CODE     = -32001
      REQUEST_CANCELLED      = -32800
    end

    # A base message: jsonrpc is always "2.0".
    class Message
      attr_reader :jsonrpc

      def initialize
        @jsonrpc = "2.0"
      end
    end

    # A one-way message: method + params, no id, no answer.
    class Notification < Message
      attr_reader :method, :params

      def initialize(method, params = nil)
        super()
        @method = method
        @params = params
      end

      def to_h
        if @params.nil?
          { "jsonrpc" => @jsonrpc, "method" => @method }
        else
          { "jsonrpc" => @jsonrpc, "method" => @method, "params" => @params }
        end
      end

      # window/logMessage: MessageType 1=Error 2=Warning 3=Info 4=Log
      def self.log_message(type, message)
        new("window/logMessage", { "type" => type, "message" => message })
      end

      def self.window_show_message(type, message)
        new("window/showMessage", { "type" => type, "message" => message })
      end

      def self.telemetry(properties)
        new("telemetry/event", properties)
      end
    end

    # A message that expects a Response or an Error with its id back.
    class Request < Message
      attr_reader :method, :params, :id

      def initialize(id, method, params = nil)
        super()
        @id = id
        @method = method
        @params = params
      end

      def to_h
        if @params.nil?
          { "jsonrpc" => @jsonrpc, "id" => @id, "method" => @method }
        else
          { "jsonrpc" => @jsonrpc, "id" => @id, "method" => @method, "params" => @params }
        end
      end
    end

    # The successful answer to a Request.
    class Result < Message
      attr_reader :id, :result

      def initialize(id, result)
        super()
        @id = id
        @result = result
      end

      def to_h
        { "jsonrpc" => @jsonrpc, "id" => @id, "result" => @result }
      end
    end

    # The failed answer to a Request.
    class Error < Message
      attr_reader :id, :code, :message

      def initialize(id, code, message)
        super()
        @id = id
        @code = code
        @message = message
      end

      def to_h
        {
          "jsonrpc" => @jsonrpc,
          "id"      => @id,
          "error"   => { "code" => @code, "message" => @message },
        }
      end
    end
  end
end

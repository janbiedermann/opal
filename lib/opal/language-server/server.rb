# The server loop: read a message, answer it, repeat. Single-threaded by
# design — Opal has no threads — so lifecycle and requests share this one
# loop (ruby-lsp's reader/worker/dispatcher threads collapse into it).
require 'opal/language-server/transport'
require 'opal/language-server/protocol'

module Opal
  module LanguageServer
    class Server
      attr_reader :transport

      def initialize(transport = Transport.new)
        @transport = transport
        @stopped = false
        @shutdown = false
      end

      # Read messages until the client closes stdin or asks to exit.
      def run
        until @stopped
          message = @transport.next_message
          break if message.nil?
          process(message)
        end
      end

      private

      def process(message)
        method = message["method"]
        params = message["params"]
        id     = message["id"]

        case method
        when 'initialize'
          run_initialize(id, params)
        when 'initialized'
          # P0: nothing to warm up yet (indexing arrives with P3).
          nil
        when 'shutdown'
          @shutdown = true
          @transport.write(Result.new(id, nil))
        when 'exit'
          # The spec: exit status 0 after a shutdown, 1 otherwise.
          @stopped = true
          ::Kernel.exit(@shutdown ? 0 : 1)
        when '$/cancelRequest'
          # Single-threaded: a request runs to completion; accepted and
          # honored between chunks once long work exists (P6).
          nil
        when nil
          # A response to a request the server sent (window/showMessage
          # etc.) — no such requests yet (P6).
          nil
        else
          if id.nil?
            # Unknown notifications are silently ignored, as the spec says.
            nil
          else
            @transport.write(Error.new(id, ErrorCodes::METHOD_NOT_FOUND,
                                       "Method not found: #{method}"))
          end
        end
      rescue StandardError => e
        # A request must not die silently: answer it as an internal error
        # (ruby-lsp answers the same shape, with the class in the data).
        unless id.nil?
          @transport.write(Error.new(id, ErrorCodes::INTERNAL_ERROR,
                                     "#{e.class}: #{e.message}"))
        end
      end

      def run_initialize(_id, _params)
        # P0 answers minimal static capabilities; positionEncoding is the
        # LSP 3.18 negotiation and utf-16 is the only one offered — JS
        # strings are UTF-16, and the parser reports UTF-16 offsets.
        capabilities = {
          "positionEncoding" => "utf-16",
          "textDocumentSync" => {
            "openClose" => true,
            "change"    => 2, # TextDocumentSyncKind.Incremental
            "save"      => { "includeText" => false },
          },
        }
        @transport.write(Result.new(_id,
                                    "capabilities" => capabilities,
                                    "serverInfo"   => {
                                      "name"    => "opal-language-server",
                                      "version" => ::Opal::VERSION,
                                    }))
      end
    end
  end
end

# The server loop: read a message, answer it, repeat. Single-threaded by
# design — Opal has no threads — so lifecycle and requests share this one
# loop (ruby-lsp's reader/worker/dispatcher threads collapse into it).
require 'opal/language-server/transport'
require 'opal/language-server/protocol'
require 'opal/language-server/store'
require 'opal/language-server/ruby_document'
require 'opal/language-server/features/document_symbol'
require 'opal/language-server/features/folding_ranges'
require 'opal/language-server/features/selection_ranges'

module Opal
  module LanguageServer
    class Server
      attr_reader :transport, :store

      def initialize(transport = Transport.new)
        @transport = transport
        @store = Store.new
        @stopped = false
        @shutdown = false
        @client_capabilities = {}
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
          # P1: nothing to warm up yet (indexing arrives with P3).
          nil
        when 'textDocument/didOpen'
          open_document(params)
        when 'textDocument/didChange'
          change_document(params)
        when 'textDocument/didClose'
          @store.delete(params.dig("textDocument", "uri"))
        when 'textDocument/didSave'
          # The parse gate already ran on the last edit (P5 moves the
          # compile gate here); nothing to do.
          nil
        when 'textDocument/documentSymbol'
          with_document(id, params) { |document| DocumentSymbolFeature.perform(document) }
        when 'textDocument/foldingRange'
          with_document(id, params) { |d| FoldingRangesFeature.perform(d) }
        when 'textDocument/selectionRange'
          with_document(id, params) { |d| SelectionRangesFeature.perform(d, params["positions"] || []) }
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

      def run_initialize(_id, params)
        @client_capabilities = params ? (params["capabilities"] || {}) : {}

        # P2 capabilities: incremental sync, push diagnostics (the 3.17
        # shape), and the AST features. Pull diagnostics
        # (3.18 textDocument/diagnostic) join in P6, negotiated against
        # general.positionEncodings — only utf-16 is offered: JS strings are
        # UTF-16 and the parser reports UTF-16 offsets (lib/opal/parser/index.mjs).
        capabilities = {
          "positionEncoding" => "utf-16",
          "textDocumentSync" => {
            "openClose" => true,
            "change"    => 2, # TextDocumentSyncKind.Incremental
            "save"      => { "includeText" => false },
          },
          "documentSymbolProvider" => true,
          "foldingRangeProvider"   => true,
          "selectionRangeProvider" => true,
        }
        @transport.write(Result.new(_id,
                                    "capabilities" => capabilities,
                                    "serverInfo"   => {
                                      "name"    => "opal-language-server",
                                      "version" => ::Opal::VERSION,
                                    }))
      end

      # ---- document synchronization (P1) ----

      # Answer with the feature's result for the request's document; nil
      # when the document is not open (the client raced a didClose).
      def with_document(id, params)
        document = @store[params.dig("textDocument", "uri")]
        @transport.write(Result.new(id, document && yield(document)))
      end

      def open_document(params)
        text_document = params["textDocument"]
        return unless ruby_language?(text_document["languageId"])
        document = RubyDocument.new(
          uri: text_document["uri"],
          source: text_document["text"] || "",
          version: text_document["version"] || 0,
          language_id: text_document["languageId"],
        )
        @store.set(document)
        publish_parse_gate(document)
      end

      def change_document(params)
        document = @store[params.dig("textDocument", "uri")]
        return if document.nil?
        document.version = params["textDocument"]["version"] if params.dig("textDocument", "version")
        document.push_edits(params["contentChanges"] || [])
        publish_parse_gate(document)
      end

      # The parse gate on every edit (LSP.md §9 P1: the compile gate waits
      # for save, P5). Publishing an empty array clears the squiggles.
      def publish_parse_gate(document)
        @transport.write(Notification.new(
          "textDocument/publishDiagnostics",
          { "uri" => document.uri, "diagnostics" => document.diagnostics },
        ))
      end

      def ruby_language?(language_id)
        language_id.nil? || language_id == "ruby"
      end
    end
  end
end

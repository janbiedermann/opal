# The open documents, keyed by their LSP uri.
module Opal
  module LanguageServer
    class Store
      def initialize
        @documents = {}
      end

      def [](uri)
        @documents[uri]
      end

      def set(document)
        @documents[document.uri] = document
      end

      def key?(uri)
        @documents.key?(uri)
      end

      def delete(uri)
        @documents.delete(uri)
      end

      def each(&block)
        @documents.each_value(&block)
      end

      def size
        @documents.size
      end
    end
  end
end

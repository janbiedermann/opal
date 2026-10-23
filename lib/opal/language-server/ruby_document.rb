# A Ruby document: a Document plus its ParseResult (parse gate).
require 'opal/language-server/document'
require 'opal/language-server/prism/parser'

module Opal
  module LanguageServer
    class RubyDocument < Document
      attr_reader :parse_result

      # Reparse when the source changed; the parse is one pass of Opal's
      # parser and stays on the keystroke path (the compile gate of LSP.md
      # §2 does not - it runs on save, P5).
      def parse!
        @parse_result = ParseResult.new(source) if needs_parsing?
        parsed!
        @parse_result
      end

      def syntax_error?
        parse!.syntax_error?
      end

      def diagnostics
        parse!.diagnostics
      end
    end
  end
end

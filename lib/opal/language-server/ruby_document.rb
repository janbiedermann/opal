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

      # The innermost node containing an LSP {line, character} position (and
      # the chain of nodes containing it, innermost first): the shape
      # ruby-lsp's locate_node answers, used by selectionRange and by the
      # on-type-formatting `end` auto-indent.
      def locate_node(line, character)
        result = parse!
        offset = result.offset_for(line, character)
        containing = []
        stack = [result.ast]
        while (node = stack.pop)
          next unless node.location_start <= offset && offset <= node.location_end
          containing << node
          stack.concat(node.child_nodes)
        end
        containing.sort_by! { |node| node.location_end - node.location_start }
        { node: containing.first, ancestors: containing }
      end
    end
  end
end

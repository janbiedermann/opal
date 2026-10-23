# The textDocument/documentSymbol request: the symbols a document declares,
# nested as a DocumentSymbol tree (LSP prefers the hierarchical shape over
# flat SymbolInformation). The collector listens for the declaring node
# types on the dispatcher; nesting comes from the source ranges: walking
# symbols in start order with a stack, the smallest other symbol strictly
# around a symbol is its parent.
require 'opal/language-server/prism/dispatcher'

module Opal
  module LanguageServer
    module DocumentSymbolFeature
      # LSP SymbolKind values.
      KIND_MODULE   = 2
      KIND_CLASS    = 5
      KIND_METHOD   = 6
      KIND_CONSTANT = 14

      # One found declaration.
      class Symbol
        attr_reader :name, :kind, :range, :selection_range, :start, :end

        def initialize(name, kind, node, selection_range)
          @name = name
          @kind = kind
          @start = node.location_start
          @end = node.location_end
          @range = node.to_range
          @selection_range = selection_range || @range
        end

        def span
          @end - @start
        end
      end

      # The dispatcher listener picking the declaring nodes. ruby-lsp's
      # document_symbol listener names port on_event-by-name; its attr_accessor
      # emulation (synthesizing methods from calls) waits for the index (P3),
      # since it reads the method table rather than the tree.
      class Collector
        attr_reader :symbols

        def initialize(parse_result)
          @parse_result = parse_result
          @symbols = []
        end

        def on_class_node_enter(node)
          add(node.name, KIND_CLASS, node, path_range(node, "constant_path"))
        end

        def on_module_node_enter(node)
          add(node.name, KIND_MODULE, node, path_range(node, "constant_path"))
        end

        def on_singleton_class_node_enter(node)
          add("self", KIND_CLASS, node, nil)
        end

        def on_def_node_enter(node)
          add(node.name, KIND_METHOD, node, @parse_result.range_for_loc(node.raw("name_loc")))
        end

        def on_constant_write_node_enter(node)
          add(node.name, KIND_CONSTANT, node, @parse_result.range_for_loc(node.raw("name_loc")))
        end

        def on_constant_path_write_node_enter(node)
          target = node.child("target")
          add(node.name, KIND_CONSTANT, node, target && target.to_range)
        end

        private

        def add(name, kind, node, selection_range)
          return if name.nil?
          @symbols << Symbol.new(name, kind, node, selection_range)
        end

        def path_range(node, field)
          child = node.child(field)
          child && child.to_range
        end
      end

      class << self
        def perform(document)
          parse_result = document.parse!
          collector = Collector.new(parse_result)
          Dispatcher.new(collector).walk(parse_result.ast)
          nest(collector.symbols)
        end

        private

        # Sort outer-first (start ascending, span descending) and walk with a
        # stack: the live top is the innermost strict container.
        def nest(symbols)
          ordered = symbols.sort_by { |s| [s.start, -s.span] }
          children = {}
          parents = {}
          stack = []

          ordered.each do |sym|
            stack.pop while (top = stack.last) &&
                           (top.end < sym.end || (top.start == sym.start && top.end == sym.end))
            if (top = stack.last) && top.span > sym.span
              parents[sym] = top
              (children[top] ||= []) << sym
            end
            stack.push(sym)
          end

          roots = ordered.reject { |s| parents.key?(s) }
          roots.map { |s| to_h(s, children) }
        end

        def to_h(symbol, children)
          hash = {
            "name"           => symbol.name,
            "kind"           => symbol.kind,
            "range"          => symbol.range,
            "selectionRange" => symbol.selection_range,
          }
          kids = children[symbol]
          hash["children"] = kids.map { |k| to_h(k, children) } if kids && !kids.empty?
          hash
        end
      end
    end
  end
end

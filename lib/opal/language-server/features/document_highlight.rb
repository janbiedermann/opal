# The textDocument/documentHighlight request: put the cursor on an
# identifier and every reference to it in the document lights up, Read for
# reads and Write for assignments (LSP DocumentHighlightKind). The cursor's
# identifier comes from RubyDocument#locate_node; the occurrences from one
# walk over the typed leaves that carry a `name` field.
# backtick_javascript: true
require 'opal/language-server/prism/dispatcher'

module Opal
  module LanguageServer
    module DocumentHighlightFeature
      READ  = 2
      WRITE = 3

      # Prism type => [family, kind]. Only same-family same-name nodes
      # highlight together, so a local `x` does not light the method `x()`.
      TYPES = {
        # locals
        "LocalVariableReadNode"                    => ["local", READ],
        "LocalVariableWriteNode"                   => ["local", WRITE],
        "LocalVariableAndWriteNode"                => ["local", WRITE],
        "LocalVariableOrWriteNode"                 => ["local", WRITE],
        "LocalVariableOperatorWriteNode"           => ["local", WRITE],
        # instance variables
        "InstanceVariableReadNode"                 => ["ivar", READ],
        "InstanceVariableWriteNode"                => ["ivar", WRITE],
        "InstanceVariableAndWriteNode"             => ["ivar", WRITE],
        "InstanceVariableOrWriteNode"              => ["ivar", WRITE],
        "InstanceVariableOperatorWriteNode"        => ["ivar", WRITE],
        # class variables
        "ClassVariableReadNode"                    => ["cvar", READ],
        "ClassVariableWriteNode"                   => ["cvar", WRITE],
        # globals
        "GlobalVariableReadNode"                   => ["gvar", READ],
        "GlobalVariableWriteNode"                  => ["gvar", WRITE],
        "GlobalVariableAndWriteNode"               => ["gvar", WRITE],
        "GlobalVariableOrWriteNode"                => ["gvar", WRITE],
        "GlobalVariableOperatorWriteNode"          => ["gvar", WRITE],
        # constants
        "ConstantReadNode"                         => ["constant", READ],
        "ConstantPathNode"                         => ["constant", READ],
        "ConstantWriteNode"                        => ["constant", WRITE],
        "ConstantPathWriteNode"                    => ["constant", WRITE],
        # methods: DefNode answers Write (the name is a definition),
        # calls Read - the kinds editors print for a "highlightable" method.
        "DefNode"                                  => ["method", WRITE],
        "CallNode"                                 => ["method", READ],
      }.freeze

      # One walk collects every same-family same-name node. The dispatcher's
      # generic on_node_enter answers for it: the whole-tree scan is what
      # this feature is, not a per-type visit.
      class Collector
        attr_reader :highlights

        def initialize(parse_result, name, family)
          @parse_result = parse_result
          @name = name
          @family = family
          @highlights = []
        end

        def on_node_enter(node)
          info = TYPES[node.type]
          return if info.nil?
          family, kind = info
          return unless family == @family && node.name == @name

          # Write nodes' location spans the whole assignment (@x = 1); the
          # highlight is the identifier, which starts at the node and runs
          # for the length of the name (UTF-16 units: `@count`, `CONST`).
          range =
            if node.type == "CallNode"
              @parse_result.range_for_loc(node.raw("message_loc")) || node.to_range
            elsif node.type == "DefNode"
              @parse_result.range_for_loc(node.raw("name_loc")) || node.to_range
            elsif kind == WRITE && !node.type.start_with?("ConstantPath")
              identifier_range(node)
            else
              node.to_range
            end
          @highlights << { "range" => range, "kind" => kind }
        end

        private

        def identifier_range(node)
          start_at = node.location_start
          stop_at = start_at + `String(#{node.name}).length`
          s, sc = @parse_result.position_at(start_at)
          _e, ec = @parse_result.position_at(stop_at)
          {
            "start" => { "line" => s, "character" => sc },
            "end"   => { "line" => s, "character" => ec },
          }
        end
      end

      class << self
        def perform(document, position)
          parse_result = document.parse!
          context = document.locate_node(position["line"], position["character"])

          target = context[:ancestors].find { |node| TYPES.key?(node.type) }
          return [] if target.nil?
          family, = TYPES[target.type]
          return [] if target.name.nil?

          collector = Collector.new(parse_result, target.name, family)
          Dispatcher.new(collector).walk(parse_result.ast)
          collector.highlights
        end
      end
    end
  end
end

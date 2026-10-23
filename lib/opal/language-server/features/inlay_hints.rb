# The textDocument/inlayHint request: hints the editor shows inline but the
# source does not contain. Two, both real gaps in what the reader of the
# code can see, as ruby-lsp advertises them:
# - a bare `rescue` binds the error to an invisible #rescued_value special;
# - the Ruby 3.1 shorthand `{x:}` hides that the value is the local `x`.
# backtick_javascript: true
require 'opal/language-server/prism/dispatcher'

module Opal
  module LanguageServer
    module InlayHintsFeature
      KIND_PARAMETER = 2

      class Collector
        attr_reader :hints

        def initialize(parse_result)
          @parse_result = parse_result
          @hints = []
        end

        def on_node_enter(node)
          case node.type
          when "RescueNode"
            reference = node.raw("reference")
            hint_after_keyword(node) if `reference === nil`
          when "AssocNode"
            shorthand_hint(node)
          end
        end

        private

        # `{x: }`: Prism fills the omitted value with an ImplicitNode
        # wrapping the same-named variable; echo the name back.
        def shorthand_hint(node)
          value = node.child("value")
          return if value.nil? || value.type != "ImplicitNode"
          key = node.child("key")
          return if key.nil?
          name = key.unescaped
          return if name.nil?
          line, character = @parse_result.position_at(key.location_end)
          @hints << { "label" => name, "position" => position_hash(line, character), "kind" => KIND_PARAMETER, "paddingLeft" => true }
        end

        def hint_after_keyword(node)
          loc = node.raw("keyword_loc")
          line, character = @parse_result.position_at(`loc === nil || loc == null ? #{node.location_start} : loc.end`)
          @hints << { "label" => "#rescued_value", "position" => position_hash(line, character), "kind" => KIND_PARAMETER, "paddingLeft" => true }
        end

        def position_hash(line, character)
          { "line" => line, "character" => character }
        end
      end

      class << self
        # The request's range (an LSP Range) filters by line; hints off the
        # visible window cost the editor layout work for nothing.
        def perform(document, range)
          parse_result = document.parse!
          collector = Collector.new(parse_result)
          Dispatcher.new(collector).walk(parse_result.ast)

          first_line = range.dig("start", "line")
          last_line = range.dig("end", "line")
          collector.hints.select do |hint|
            line = hint["position"]["line"]
            line >= first_line && line <= last_line
          end
        end
      end
    end
  end
end

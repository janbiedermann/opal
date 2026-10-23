# The textDocument/semanticTokens/full request: the editor colors
# identifiers with real language knowledge instead of its TextMate regexes.
# Standard LSP legend (the subset this server emits) plus the delta-encoded
# token stream the protocol defines; the walk is the dispatcher's generic
# on_node_enter over the same typed leaves document_highlight reads.
# backtick_javascript: true
require 'opal/language-server/prism/dispatcher'

module Opal
  module LanguageServer
    module SemanticHighlightingFeature
      # Legend order is the protocol: the data array indexes types and
      # modifiers by position in these lists.
      TOKEN_TYPES = [
        "namespace", # module name
        "class",     # class name
        "method",    # method with an explicit receiver, and every def
        "function",  # bare method call (no receiver)
        "parameter", # block/method parameters
        "property",  # instance/class variables
        "variable",  # locals, globals, constants
      ].freeze

      TOKEN_MODIFIERS = [
        "declaration", # a def
        "readonly",    # constant reads
      ].freeze

      DECLARATION = 1 << 0
      READONLY = 1 << 1

      PARAMETER_TYPES = [
        "RequiredParameterNode", "OptionalParameterNode", "RestParameterNode",
        "PostRequiredParameterNode", "KeywordParameterNode",
        "KeywordRestParameterNode", "BlockParameterNode", "ProcBlockParameterNode",
      ].freeze

      PROPERTY_TYPES = [
        "InstanceVariableReadNode", "InstanceVariableWriteNode",
        "InstanceVariableAndWriteNode", "InstanceVariableOrWriteNode",
        "InstanceVariableOperatorWriteNode",
        "ClassVariableReadNode", "ClassVariableWriteNode",
      ].freeze

      # Whole-node tokens (their location is exactly the identifier):
      # type => [token type index, modifier bits]
      LEAF_TOKENS = {
        "LocalVariableReadNode"          => [6, 0],
        "LocalVariableWriteNode"         => [6, 0],
        "GlobalVariableReadNode"         => [6, 0],
        "GlobalVariableWriteNode"        => [6, 0],
        "ConstantReadNode"               => [6, READONLY],
        "ConstantWriteNode"              => [6, 0],
      }.freeze

      class Collector
        attr_reader :tokens

        def initialize(parse_result)
          @parse_result = parse_result
          @tokens = []
          @covered = {}
        end

        def on_node_enter(node)
          case node.type
          when "ModuleNode"
            path = node.child("constant_path")
            if path
              mark_covered(path)
              push(path, 0)
            end
          when "ClassNode"
            path = node.child("constant_path")
            if path
              mark_covered(path)
              push(path, 1)
            end
          when "DefNode"
            push_loc(node.raw("name_loc"), 2, DECLARATION)
          when "CallNode"
            raw_receiver = node.raw("receiver")
            has_receiver = `#{raw_receiver} !== nil`
            push_loc(node.raw("message_loc"), has_receiver ? 2 : 3, 0)
          when "SingletonClassNode"
            push_loc(node.raw("class_keyword_loc"), 1, 0)
          end

          if PARAMETER_TYPES.include?(node.type)
            push(node, 4)
          elsif PROPERTY_TYPES.include?(node.type)
            push(node, 5)
          elsif (token = LEAF_TOKENS[node.type])
            # `class Foo`: ClassNode already tokenized the ConstantReadNode
            # that is its name - one token per span.
            push(node, token[0], token[1]) unless covered?(node)
          end
        end

        private

        def mark_covered(node)
          @covered[[node.location_start, node.location_end]] = true
        end

        def covered?(node)
          @covered[[node.location_start, node.location_end]] ? true : false
        end

        def push(child_node, type, modifiers = 0)
          push_offsets(child_node.location_start, child_node.location_end, type, modifiers)
        end

        # A loc POJO ({start:, end:}) or nil - nil nodes are skipped.
        def push_loc(loc, type, modifiers)
          return if `loc === nil || loc == null`
          push_offsets(`loc.start`, `loc.end`, type, modifiers)
        end

        def push_offsets(start_at, end_at, type, modifiers)
          line, character = @parse_result.position_at(start_at)
          _, end_character = @parse_result.position_at(end_at)
          length = end_character - character
          return if length <= 0
          @tokens << { line: line, character: character, length: length, type: type, modifiers: modifiers }
        end
      end

      class << self
        def legend
          { "tokenTypes" => TOKEN_TYPES.to_a, "tokenModifiers" => TOKEN_MODIFIERS.to_a }
        end

        # Perform answers the LSP SemanticTokens result: {data: [...]},
        # five numbers per token in delta encoding - (deltaLine, deltaStart,
        # length, tokenType, tokenModifiers) each relative to the previous
        # token (deltaStart only when the line delta is 0).
        def perform(document)
          parse_result = document.parse!
          collector = Collector.new(parse_result)
          Dispatcher.new(collector).walk(parse_result.ast)

          ordered = collector.tokens.sort_by { |t| [t[:line], t[:character]] }
          data = []
          previous_line = 0
          previous_character = 0
          ordered.each do |token|
            line_delta = token[:line] - previous_line
            char_delta = line_delta.zero? ? token[:character] - previous_character : token[:character]
            data.push(line_delta, char_delta, token[:length], token[:type], token[:modifiers])
            previous_line = token[:line]
            previous_character = token[:character]
          end
          { "data" => data }
        end
      end
    end
  end
end

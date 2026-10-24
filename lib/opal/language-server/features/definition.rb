# backtick_javascript: true
# The textDocument/definition request. The name under the cursor comes
# from NavigationTarget; resolution is nesting-aware for constants (inner
# scope first, Ruby lookup order) and receiver-based for methods: a
# literal receiver types the call (a String literal answers String's
# ancestor chain - the LSP.md §2 heuristic, no inference engine), a
# constant receiver looks on the singleton side, `Klass.new.m` looks on
# the instance side, and a receiverless call inside a class looks in the
# enclosing module. Locations of baked records resolve through
# FileResolver: the checkout with opalHome, else a dumped copy.
require 'opal/language-server/features/navigation_target'
require 'opal/language-server/indexer/file_resolver'

module Opal
  module LanguageServer
    module DefinitionFeature
      # Prism literal node type -> the class its value instantiates.
      LITERAL_CLASSES = {
        "StringNode" => "String", "StringInterpolationNode" => "String",
        "XStringNode" => "String", "StringHeredocNode" => "String",
        "IntegerNode" => "Integer", "FloatNode" => "Float",
        "ArrayNode" => "Array", "HashNode" => "Hash", "RangeNode" => "Range",
        "RegularExpressionNode" => "Regexp", "TrueNode" => "TrueClass",
        "FalseNode" => "FalseClass", "NilNode" => "NilClass",
      }.freeze

      class << self
        def perform(state, document, position)
          target = NavigationTarget.locate(document, position)
          return nil if target.nil?

          locations =
            case target[:kind]
            when :constant
              constant_locations(state, target)
            when :method
              method_locations(state, target)
            end
          locations.empty? ? nil : locations
        end

        private

        def constant_locations(state, target)
          found = []
          state.index.resolve_constant(target).each do |record|
            range = record.get("name_range") || record.range
            next if `range == null || range === nil` # POJO range: no Ruby sends
            found << location(record.file, range, state.opal_home)
          end
          found
        end

        def method_locations(state, target)
          return [] if target[:definition] # F12 on a def lands on itself: the editor is there already
          receiver = target[:receiver]

          if receiver.nil?
            nesting = target[:nesting] || []
            return [] if nesting.empty?
            definition = state.index.resolve_method(target[:name], nesting.last, false)
          else
            fqcn, singleton = receiver_context(state, receiver, target[:nesting] || [])
            return [] if fqcn.nil?
            definition = state.index.resolve_method(target[:name], fqcn, singleton)
          end

          return [] if definition.nil?
          [location(definition.file, definition.range, state.opal_home)]
        end

        # [class name, singleton-lookup?], or nil when the receiver's type
        # is unknown. Resolution of a constant receiver is nesting-aware.
        def receiver_context(state, receiver, nesting)
          case receiver.type
          when "ConstantReadNode", "ConstantPathNode"
            full = NavigationTarget.full_path_name(receiver)
            last = receiver.name
            candidates = []
            nesting.reverse_each do |outer|
              candidates << "#{outer}::#{full}"
              candidates << "#{outer}::#{last}"
            end
            candidates << full << last
            candidates.uniq.each do |cand|
              return [cand, true] if state.index.module?(cand)
            end
            nil
          when "CallNode"
            # `Klass.new.m` - the instance methods of a known Klass.
            if receiver.name == "new" && receiver.absent?("receiver")
              inner = receiver.child("receiver")
              if inner && (inner.type == "ConstantReadNode" || inner.type == "ConstantPathNode")
                full = NavigationTarget.full_path_name(inner)
                return [full, false] if state.index.module?(full)
              end
            end
            nil
          else
            literal = LITERAL_CLASSES[receiver.type]
            literal.nil? ? nil : [literal, false]
          end
        end

        def location(file, range, opal_home)
          uri = FileResolver.uri_for(file, opal_home)
          return nil if uri.nil?
          { "uri" => uri, "range" => Record.ruby_range(range) }
        end
      end
    end
  end
end

# backtick_javascript: true
# The shared cursor analysis for definition/references/rename: find the
# name under the cursor (constant or method), its identifier range, and
# the module nesting around it. The features then disagree only about what
# to do with the answer.
module Opal
  module LanguageServer
    module NavigationTarget
      CONSTANT_TYPES = ["ConstantReadNode", "ConstantPathNode"].freeze

      # Prism literal node type -> the class its value instantiates (the
      # LSP.md §2 receiver-typing heuristic, shared by definition, hover,
      # signature help and completion).
      LITERAL_CLASSES = {
        "StringNode" => "String", "StringInterpolationNode" => "String",
        "XStringNode" => "String", "StringHeredocNode" => "String",
        "IntegerNode" => "Integer", "FloatNode" => "Float",
        "ArrayNode" => "Array", "HashNode" => "Hash", "RangeNode" => "Range",
        "RegularExpressionNode" => "Regexp", "TrueNode" => "TrueClass",
        "FalseNode" => "FalseClass", "NilNode" => "NilClass",
      }.freeze

      class << self
        def locate(document, position)
          parse_result = document.parse!
          offset = parse_result.offset_for(position["line"], position["character"])
          ancestors = document.locate_node(position["line"], position["character"])[:ancestors]
          nesting = nesting_names(ancestors)

          ancestors.each do |node| # innermost first
            case node.type
            when "ConstantReadNode"
              return { name: node.name, base_name: node.name, kind: :constant,
                       range: node.to_range, nesting: nesting }
            when "ConstantPathNode"
              full = full_path_name(node)
              range = parse_result.range_for_loc(node.raw("name_loc")) || node.to_range
              return { name: full, base_name: node.name, kind: :constant,
                       range: range, nesting: nesting }
            when "ClassNode", "ModuleNode"
              path = node.child("constant_path")
              next if path.nil? || !covers?(path, offset)
              return { name: node.name, base_name: node.name, kind: :constant,
                       range: path.to_range, nesting: nesting }
            when "CallNode"
              message = node.raw("message_loc")
              next if `message == null || message === nil` || !covers_loc?(message, offset)
              return { name: node.name, base_name: node.name, kind: :method,
                       range: parse_result.range_for_loc(message), nesting: nesting,
                       receiver: node.child("receiver") }
            when "DefNode"
              name_loc = node.raw("name_loc")
              next if `name_loc == null || name_loc === nil` || !covers_loc?(name_loc, offset)
              return { name: node.name, base_name: node.name, kind: :method,
                       range: parse_result.range_for_loc(name_loc), nesting: nesting,
                       receiver: node.child("receiver"), definition: true }
            end
          end
          nil
        end

        # The classes/modules around the cursor, qualified outer-first:
        # ["Foo", "Foo::Bar"]. Used to resolve bare constant names and
        # implicit self calls the way Ruby nesting does.
        def nesting_names(ancestors)
          segments = ancestors.select { |n| n.type == "ClassNode" || n.type == "ModuleNode" }
                              .reverse.map { |n| n.name }.compact
          qualified = []
          joined = nil
          segments.each do |seg|
            joined = joined ? "#{joined}::#{seg}" : seg
            qualified << joined
          end
          qualified
        end

        # "A::B::C" rebuilt from the target chain (ConstantPathNode#name is
        # only the last segment).
        def full_path_name(node)
          parts = [node.name]
          target = node.child("target")
          while target && target.type == "ConstantPathNode"
            parts.unshift(target.name)
            target = target.child("target")
          end
          parts.unshift(target.name) if target && target.type == "ConstantReadNode"
          parts.join("::")
        end

        # [fqcn, singleton-lookup?] for a method target's owner; [nil, ...]
        # when unresolvable. Receiverless calls look in the enclosing module
        # (instance side); explicit receivers type through receiver_class.
        def method_owner(state, target)
          receiver = target[:receiver]
          nesting = target[:nesting] || []
          if receiver.nil?
            return [nil, false] if nesting.empty?
            [nesting.last, false]
          else
            rc = receiver_class(state, receiver, nesting)
            rc.nil? ? [nil, false] : rc
          end
        end

        # [class name, singleton-lookup?], or nil when the receiver's type
        # is unknown. Resolution of a constant receiver is nesting-aware.
        def receiver_class(state, receiver, nesting)
          case receiver.type
          when "ConstantReadNode", "ConstantPathNode"
            full = full_path_name(receiver)
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
            if receiver.name == "new"
              inner = receiver.child("receiver")
              if inner && (inner.type == "ConstantReadNode" || inner.type == "ConstantPathNode")
                full = full_path_name(inner)
                return [full, false] if state.index.module?(full)
              end
            end
            nil
          else
            literal = LITERAL_CLASSES[receiver.type]
            literal.nil? ? nil : [literal, false]
          end
        end

        def covers?(node, offset)
          node.location_start <= offset && offset <= node.location_end
        end

        def covers_loc?(loc, offset)
          `#{offset} >= #{loc}.start && #{offset} < #{loc}.end` ? true : false
        end
      end
    end
  end
end

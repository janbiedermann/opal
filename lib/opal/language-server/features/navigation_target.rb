# backtick_javascript: true
# The shared cursor analysis for definition/references/rename: find the
# name under the cursor (constant or method), its identifier range, and
# the module nesting around it. The features then disagree only about what
# to do with the answer.
module Opal
  module LanguageServer
    module NavigationTarget
      CONSTANT_TYPES = ["ConstantReadNode", "ConstantPathNode"].freeze

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

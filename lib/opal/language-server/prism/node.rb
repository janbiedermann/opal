# backtick_javascript: true

module Opal
  module LanguageServer
    # A node of the parse tree: a window onto the POJO convert.mjs builds
    # (lib/opal/parser/convert.mjs: `type`, `location {start, end}`,
    # `node_id`, then the node's own fields; child nodes carry a `type`,
    # locations and nulls don't). Wrapping rather than rebuilding Prism's
    # Ruby class tree is the LSP.md §4.1 decision - every field read is one
    # JS property access, and nothing is allocated for nodes a request never
    # touches.
    #
    # Offsets are UTF-16 code-unit indices; #start_position/#end_position
    # turn them into LSP {line, character} through the ParseResult's line
    # table, so the listener code reads exactly like ruby-lsp's, whose
    # Prism-based listeners this mirrors.
    class Node
      def initialize(node, parse_result)
        @node = node
        @parse_result = parse_result
      end

      attr_reader :node, :parse_result

      def type
        `#{@node}.type`
      end

      def node_id
        `#{@node}.node_id`
      end

      def flags
        `#{@node}.flags || []`
      end

      # snake_case Prism dispatcher name ("ClassNode" -> "class_node",
      # "XStringNode" -> "x_string_node"): the acronym-aware camel_to_snake
      # the Prism::Dispatcher uses, so ruby-lsp listeners' on_class_node_enter
      # names port verbatim (LSP.md §4.1).
      def visitor_name
        @visitor_name ||= `#{@node}.type`.gsub(/([A-Z]+)([A-Z][a-z])/, '\1_\2')
                                 .gsub(/([a-z\d])([A-Z])/, '\1_\2').downcase
      end

      # Raw UTF-16 offsets of the node's own location.
      def location_start
        `#{@node}.location.start`
      end

      def location_end
        `#{@node}.location.end`
      end

      # [line, character] in LSP units (0-based, UTF-16).
      def start_position
        @parse_result.position_at(location_start)
      end

      def end_position
        @parse_result.position_at(location_end)
      end

      def start_line
        start_position[0]
      end

      def start_character
        start_position[1]
      end

      def end_line
        end_position[0]
      end

      def end_character
        end_position[1]
      end

      # An LSP Range object ({start: Position, end: Position}) for #to_json.
      def to_range
        s, sc = start_position
        e, ec = end_position
        {
          "start" => { "line" => s, "character" => sc },
          "end"   => { "line" => e, "character" => ec },
        }
      end

      # The node's string-ish fields come back as JS strings; name/value are
      # the ones listeners read most (nil where the node type lacks them, so
      # callers can use node.name for a quick "does it name something").
      def name
        `((#{@node}).name === undefined || (#{@node}).name === null) ? nil : (#{@node}).name`
      end

      def value
        `((#{@node}).value === undefined || (#{@node}).value === null) ? nil : (#{@node}).value`
      end

      def unescaped
        `((#{@node}).unescaped === undefined || (#{@node}).unescaped === null) ? nil : (#{@node}).unescaped`
      end

      # A raw field read (POJO, JS array, string, number, or nil): callers
      # wrap what they need. Use it for optional keyword locations (the
      # *_loc fields: null when the keyword is absent, else {start, end} -
      # both null and undefined answer nil here, so #nil? always works).
      def raw(field)
        %x{
          var v = #{@node}[#{field}];
          return v == null ? nil : v;
        }
      end

      # A child field as a Node (nil when absent).
      def child(field)
        pojo = `#{@node}[#{field}]`
        return nil if `pojo === null || pojo === undefined`
        Node.new(pojo, @parse_result)
      end

      # A child-array field as Nodes (empty when absent), source order.
      def children(field)
        pojos = `#{@node}[#{field}] || []`
        wrap_all(pojos)
      end

      # Every child node of this node, in field order: the generic walk that
      # features and the dispatcher need, since POJO field names differ per
      # node type (statements/body, body, arguments, elements...). Locations
      # ({start, end}, no `type` key), nulls and scalars are skipped; arrays
      # are flattened one level.
      def child_nodes
        wrap_all(`$prismChildNodes(#{@node})`)
      end

      private

      def wrap_all(pojos)
        nodes = []
        length = `pojos.length`
        length.times do |i|
          nodes << Node.new(`pojos[#{i}]`, @parse_result)
        end
        nodes
      end

      %x{
        function $prismChildNodes(n) {
          var out = [];
          for (var k in n) {
            var v = n[k];
            if (v === null || typeof v !== "object") continue;
            if (Array.isArray(v)) {
              for (var i = 0; i < v.length; i++) {
                var el = v[i];
                if (el !== null && typeof el === "object" && el.type) out.push(el);
              }
            } else if (v.type) {
              out.push(v);
            }
          }
          return out;
        }
      }
    end
  end
end

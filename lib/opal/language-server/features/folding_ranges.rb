# The textDocument/foldingRange request. Three fold kinds, as ruby-lsp
# advertises them (LSP FoldingRangeKind):
# - "comment": consecutive # lines and =begin/=end blocks, from the
#   envelope's comments (raw offsets, not locations - comments aren't nodes);
# - "region": the keyword/end pairs and the brace blocks of the tree;
# - "imports": one fold for the leading run of require/load calls.
# backtick_javascript: true
require 'opal/language-server/prism/dispatcher'

module Opal
  module LanguageServer
    module FoldingRangesFeature
      KIND_COMMENT = "comment"
      KIND_IMPORTS = "imports"
      KIND_REGION  = "region"

      class RegionCollector
        attr_reader :folds

        def initialize
          @folds = []
        end

        # The keyword/end pairs and brace blocks, as [open offset, close offset].
        def on_class_node_enter(node);           fold(node, "class_keyword_loc", "end_keyword_loc"); end
        def on_module_node_enter(node);          fold(node, "module_keyword_loc", "end_keyword_loc"); end
        def on_singleton_class_node_enter(node); fold(node, "class_keyword_loc", "end_keyword_loc"); end
        def on_def_node_enter(node);             fold(node, "def_keyword_loc", "end_keyword_loc"); end
        def on_if_node_enter(node);              fold(node, "keyword_loc", "end_keyword_loc"); end
        def on_unless_node_enter(node);          fold(node, "keyword_loc", "end_keyword_loc"); end
        def on_while_node_enter(node);           fold(node, "keyword_loc", "end_keyword_loc"); end
        def on_until_node_enter(node);           fold(node, "keyword_loc", "end_keyword_loc"); end
        def on_for_node_enter(node);             fold(node, "for_keyword_loc", "end_keyword_loc"); end
        def on_case_node_enter(node);            fold(node, "keyword_loc", "end_keyword_loc"); end
        def on_begin_node_enter(node);           fold(node, "begin_keyword_loc", "end_keyword_loc"); end
        def on_block_node_enter(node);           fold(node, "opening_loc", "closing_loc"); end

        private

        # The *_loc fields are loc POJOs ({start:, end:}) or null when the
        # keyword has no keyword form (modifier if/unless/while). A POJO has
        # no #nil? - the null test goes through JS.
        def fold(node, open_field, close_field)
          open_loc = node.raw(open_field)
          close_loc = node.raw(close_field)
          return if `#{open_loc} == null || #{close_loc} == null`
          @folds << [`open_loc.start`, `close_loc.start`]
        end
      end

      IMPORTS = ["require", "require_relative", "load"].freeze

      class << self
        def perform(document)
          parse_result = document.parse!

          folds = comment_folds(parse_result)
          folds.concat(region_folds(parse_result))
          import = imports_fold(parse_result)
          folds << import if import

          folds.sort_by { |f| [f[:start_line], f[:end_line]] }
                 .map { |f| { "startLine" => f[:start_line], "endLine" => f[:end_line], "kind" => f[:kind] } }
        end

        private

        def comment_folds(parse_result)
          folds = []
          group_start = nil
          group_end = nil

          parse_result.comments.each do |comment|
            s_line, = parse_result.position_at(comment["start"])
            e_line, = parse_result.position_at(comment["end"])

            if comment["type"] == "embdoc"
              folds << { start_line: s_line, end_line: e_line, kind: KIND_COMMENT }
              group_start = group_end = nil
              next
            end

            # Consecutive inline comment lines join one fold; a gap starts over.
            if group_end && s_line <= group_end + 1
              group_end = e_line
            else
              folds << { start_line: group_start, end_line: group_end, kind: KIND_COMMENT } if group_start && group_end > group_start
              group_start = s_line
              group_end = e_line
            end
          end

          folds << { start_line: group_start, end_line: group_end, kind: KIND_COMMENT } if group_start && group_end > group_start
          folds
        end

        def region_folds(parse_result)
          collector = RegionCollector.new
          Dispatcher.new(collector).walk(parse_result.ast)

          folds = []
          collector.folds.each do |(open_offset, close_offset)|
            next if open_offset.nil? || close_offset.nil?
            s_line, = parse_result.position_at(open_offset)
            e_line, = parse_result.position_at(close_offset)
            folds << { start_line: s_line, end_line: e_line, kind: KIND_REGION } if e_line > s_line
          end
          folds
        end

        # One fold spanning a leading run of top-level require/load calls
        # (comments inside the run don't break it - they are not statements).
        def imports_fold(parse_result)
          body = parse_result.ast.child("statements")
          return nil if body.nil?
          statements = body.children("body")

          first = nil
          last = nil
          statements.each do |node|
            # Comments are not statements, so they never break the run here;
            # the first non-import statement does.
            break unless node.type == "CallNode" && IMPORTS.include?(node.name)
            first ||= node
            last = node
          end

          return nil if first.nil? || last.equal?(first)
          s_line, = parse_result.position_at(first.location_start)
          e_line, = parse_result.position_at(last.location_end)
          return nil if e_line <= s_line
          { start_line: s_line, end_line: e_line, kind: KIND_IMPORTS }
        end
      end
    end
  end
end

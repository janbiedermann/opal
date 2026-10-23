# The textDocument/selectionRange request: for each cursor position, the
# innermost node and then the chain outward, as nested SelectionRanges
# (VS Code's expand/shrink-selection). RubyDocument#locate_node gives the
# containing chain; here it becomes the nested hash, skipping nodes that
# share a range with their parent (statements vs program and friends).
module Opal
  module LanguageServer
    module SelectionRangesFeature
      class << self
        def perform(document, positions)
          positions.map do |position|
            chain = document.locate_node(position["line"], position["character"])[:ancestors]
            build(chain)
          end
        end

        private

        # ancestors is innermost-first; walk outermost-in so each node hangs
        # off the previous, leaving the innermost as the head.
        def build(ancestors)
          acc = nil
          previous_range = nil
          ancestors.reverse_each do |node|
            range = node.to_range
            next if previous_range == range # same span as its parent: no selection step
            acc = { "range" => range, "parent" => acc }
            previous_range = range
          end
          acc
        end
      end
    end
  end
end

# backtick_javascript: true
# The textDocument/references request. Constants search the reference map
# (baked + live) and collect their definitions; methods search the live
# method-reference records (the bake skips call sites - LSP.md §5) and the
# definition records across the index. Every hit carries a real range from
# the index, so no re-parse of other files is needed.
require 'opal/language-server/features/navigation_target'
require 'opal/language-server/indexer/file_resolver'

module Opal
  module LanguageServer
    module ReferencesFeature
      class << self
        def perform(state, document, position, include_declaration)
          target = NavigationTarget.locate(document, position)
          return [] if target.nil?

          records =
            if target[:kind] == :constant
              refs = state.index.constant_references(target[:base_name])
              defs = state.index.resolve_constant(target)
              include_declaration ? refs + defs : refs
            else
              refs = state.index.live_method_references(target[:name])
              defs = state.index.method_definitions_all(target[:name])
              include_declaration ? refs + defs : refs
            end

          locations = []
          seen = {}
          records.each do |record|
            range = record.get("name_range") || record.range
            uri = FileResolver.uri_for(record.file, state.opal_home)
            next if `range == null || range === nil`
            next if uri.nil?
            key = `#{uri} + ":" + JSON.stringify(#{range})`
            next if seen[key]
            seen[key] = true
            locations << { "uri" => uri, "range" => Record.ruby_range(range) }
          end
          locations
        end
      end
    end
  end
end

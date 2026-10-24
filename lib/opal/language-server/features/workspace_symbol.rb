# backtick_javascript: true
# The workspace/symbol request: fuzzy-ish name search across the index
# (baked corelib/stdlib + workspace + open documents), capped at 100 by
# Index#search. Module/class hits point at the name segment of the
# declaration; method hits point at a definition record.
require 'opal/language-server/indexer/file_resolver'

module Opal
  module LanguageServer
    module WorkspaceSymbolFeature
      KIND_MODULE = 2
      KIND_CLASS  = 5
      KIND_METHOD = 6

      class << self
        def perform(state, query)
          state.index.search(query.to_s).map { |hit| to_information(state, hit) }.compact
        end

        private

        def to_information(state, hit)
          name, kind = hit[0], hit[1]
          if kind == :module
            record = state.index.module_records(name).first
            return nil if record.nil?
            range = record.get("name_range") || record.range
            uri = FileResolver.uri_for(record.file, state.opal_home)
            return nil if `range == null || range === nil`
            return nil if uri.nil?
            lsp_kind = record.get("kind") == "module" ? KIND_MODULE : KIND_CLASS
            { "name" => name, "kind" => lsp_kind,
              "location" => { "uri" => uri, "range" => Record.ruby_range(range) } }
          else
            module_name = hit[2]
            definition = nil
            state.index.module_records(module_name).each do |record|
              defs = record.method_definitions(name, false) + record.method_definitions(name, true)
              unless defs.empty?
                definition = defs.first
                break
              end
            end
            return nil if definition.nil?
            uri = FileResolver.uri_for(definition.file, state.opal_home)
            return nil if uri.nil?
            label = module_name.nil? ? name : "#{module_name}.#{name}"
            { "name" => label, "kind" => KIND_METHOD,
              "location" => { "uri" => uri, "range" => Record.ruby_range(definition.range) } }
          end
        end
      end
    end
  end
end

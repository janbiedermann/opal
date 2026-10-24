# backtick_javascript: true
# textDocument/prepareRename + textDocument/rename. Renames edit the live
# scope only - the current document, the open documents and the workspace
# files (their record files are uris); the baked corelib/stdlib records are
# reported by references but never edited from the editor, with one
# exception: records indexed from an opalHome checkout carry
# checkout-relative keys and do get edits, since the developer asked for
# that checkout to be authoritative by setting opalHome.
require 'opal/language-server/features/navigation_target'
require 'opal/language-server/indexer/file_resolver'

module Opal
  module LanguageServer
    module RenameFeature
      class << self
        # prepareRename: nil refuses the rename at this position (the
        # editor then says "cannot rename"), otherwise the exact range and
        # the name to prefill.
        def prepare(state, document, position)
          target = NavigationTarget.locate(document, position)
          return nil if target.nil?
          { "range" => target[:range], "placeholder" => target[:base_name] }
        end

        def perform(state, document, position, new_name)
          target = NavigationTarget.locate(document, position)
          return nil if target.nil?
          return nil if new_name.nil? || new_name.empty?

          if target[:kind] == :constant
            records = state.index.constant_references(target[:base_name]) +
                      state.index.resolve_constant(target)
          else
            records = state.index.live_method_references(target[:name]) +
                      state.index.method_definitions_all(target[:name])
          end

          changes = {}
          seen = {}
          records.each do |record|
            file = record.file
            next unless editable?(file, state)
            range = record.get("name_range") || record.range
            uri = FileResolver.uri_for(file, state.opal_home)
            next if `range == null || range === nil`
            next if uri.nil?
            key = `#{uri} + ":" + JSON.stringify(#{range})`
            next if seen[key]
            seen[key] = true
            (changes[uri] ||= []) << { "range" => Record.ruby_range(range), "newText" => new_name }
          end

          changes.empty? ? nil : { "changes" => changes }
        end

        private

        # Live records key by uri; records re-indexed from an opalHome
        # checkout carry their baked-relative key (a developer editing
        # corelib in a checkout is the LSP.md §5 dev flow).
        def editable?(file, state)
          return true if file.start_with?("file://")
          !state.opal_home.nil?
        end
      end
    end
  end
end

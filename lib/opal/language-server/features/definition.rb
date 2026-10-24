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
          fqcn, singleton = NavigationTarget.method_owner(state, target)
          return [] if fqcn.nil?
          definition = state.index.resolve_method(target[:name], fqcn, singleton)
          return [] if definition.nil?
          [location(definition.file, definition.range, state.opal_home)]
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

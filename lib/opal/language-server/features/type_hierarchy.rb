# backtick_javascript: true
# The 3.17 type hierarchy requests. prepareTypeHierarchy anchors on the
# constant under the cursor; supertypes reads the record's superclass and
# the recorded include/prepend/extend names, subtypes scans the index for
# modules declaring that superclass or including that name (matched both
# fully qualified and bare, since the listener records the name as written).
require 'opal/language-server/features/navigation_target'
require 'opal/language-server/indexer/file_resolver'

module Opal
  module LanguageServer
    module TypeHierarchyFeature
      KIND_MODULE = 2
      KIND_CLASS  = 5

      class << self
        # TypeHierarchyItem[] - an array even for one hit, per the spec.
        def prepare(state, document, position)
          target = NavigationTarget.locate(document, position)
          return nil if target.nil? || target[:kind] != :constant
          records = state.index.resolve_constant(target)
          return nil if records.empty?
          [item_for(state, records.first.name, records.first)].compact
        end

        def supertypes(state, item)
          fqcn = item.nil? ? nil : item["data"]
          return [] if fqcn.nil?
          found = {}
          state.index.module_records(fqcn).each do |record|
            add(found, state, record.superclass) unless record.superclass.nil?
            (record.includes + record.prepends + record.extends).each { |name| add(found, state, name) }
          end
          found.values.compact
        end

        def subtypes(state, item)
          fqcn = item.nil? ? nil : item["data"]
          return [] if fqcn.nil?
          last = fqcn.split("::").last
          out = []
          state.index.module_names.each do |name|
            next if name == fqcn
            records = state.index.module_records(name)
            matched = records.any? do |record|
              sup = record.superclass
              (sup == fqcn || sup == last) ||
                (record.includes + record.prepends + record.extends).any? { |n| n == fqcn || n == last }
            end
            out << item_for(state, name, records.first) if matched
          end
          out.compact
        end

        private

        def add(found, state, name)
          return if name.nil? || found.key?(name)
          records = state.index.module_records(name)
          found[name] = records.empty? ? nil : item_for(state, name, records.first)
        end

        def item_for(state, name, record)
          uri = FileResolver.uri_for(record.file, state.opal_home)
          return nil if uri.nil?
          range = Record.ruby_range(record.get("name_range") || record.range)
          {
            "name" => name,
            "kind" => record.get("kind") == "module" ? KIND_MODULE : KIND_CLASS,
            "uri" => uri,
            "range" => range,
            "selectionRange" => range,
            "data" => name,
          }
        end
      end
    end
  end
end

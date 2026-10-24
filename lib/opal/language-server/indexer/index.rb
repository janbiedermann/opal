# The Index: the queryable view over the two record stores - the baked
# corelib/stdlib payload (immutable JS POJO graph from
# lib/opal/language-server/baked_index.mjs, grabbed at startup, §5) and the
# live per-file records of workspace/open documents (plain Ruby Hashes from
# DeclarationListener). Reads go through Record so both shapes share one
# code path; method resolution walks Opal's ancestor linearization
# (prepends, includes, the implicit Object<:BasicObject / Object.include
# Kernel that the runtime gives every core class).
# backtick_javascript: true
require 'opal/language-server/indexer/entry'
require 'opal/language-server/indexer/declaration_listener'

module Opal
  module LanguageServer
    class Index
      def initialize(baked = nil)
        @baked = baked
        @baked_modules = baked ? `#{baked}.modules` : nil
        @baked_constants = baked ? `#{baked}.constants` : nil
        @baked_references = baked ? `#{baked}.constant_references` : nil
        # uri => DeclarationListener; re-indexing replaces the entry whole,
        # so stale records never survive a didChange.
        @files = {}
      end

      attr_reader :files, :baked

      def index_document(document)
        @files[document.uri] = DeclarationListener.new(document.uri, document.parse!).index!
      end

      # Index raw source under a file key (a uri for workspace files, a
      # checkout-relative path when re-indexing a stale baked file).
      def index_source(file, source)
        @files[file] = DeclarationListener.new(file, ParseResult.new(source)).index!
      end

      def remove_document(uri)
        @files.delete(uri)
      end

      def indexed?(uri)
        @files.key?(uri)
      end

      # ---- modules ----

      def module_records(name)
        records = []
        @files.each_value do |listener|
          list = listener.modules[name]
          (list || []).each { |raw| records << Record.new(raw) }
        end
        unless baked_absent?(@baked_modules)
          arr = `#{baked_read(@baked_modules, name)}`
          wrap(arr, records)
        end
        records
      end

      def module_names
        names = []
        @files.each_value { |l| names.concat(l.modules.keys) }
        names.concat(js_keys(@baked_modules)) unless baked_absent?(@baked_modules)
        names.uniq
      end

      def module?(name)
        return true if @files.each_value.any? { |l| l.modules.key?(name) }
        return false if baked_absent?(@baked_modules)
        `#{baked_read(@baked_modules, name)} !== undefined && #{baked_read(@baked_modules, name)} !== null` ? true : false
      end

      # Ruby's lookup order, specialized to Opal's runtime core:
      # [prepends reversed, self, includes reversed, superclass chain];
      # Object gains Kernel implicitly and BasicObject is its parent (the
      # corelib files themselves say `class Object` bare - the runtime adds
      # this, so the index must know it).
      def linearize(fqcn, seen = [])
        return [] if seen.include?(fqcn)
        seen << fqcn

        records = module_records(fqcn)
        prepends = []
        includes = []
        superclass = nil
        records.each do |record|
          prepends.concat(record.prepends)
          includes.concat(record.includes)
          superclass ||= record.superclass
        end

        if fqcn == "Object"
          includes << "Kernel" unless includes.include?("Kernel")
          superclass ||= "BasicObject"
        elsif superclass.nil? && fqcn != "BasicObject"
          superclass = "Object"
        end

        order = prepends.reverse + [fqcn] + includes.reverse
        order.concat(linearize(superclass, seen)) unless superclass.nil?
        order.uniq
      end

      # First definition found in linearization order; live records win
      # (an edited workspace copy of a corelib file shadows the bake).
      def resolve_method(name, fqcn, singleton = false)
        linearize(fqcn).each do |mod|
          records = module_records(mod)
          next if records.empty?
          records.each do |record|
            defs = record.method_definitions(name, singleton)
            return defs.first unless defs.empty?
          end
        end
        nil
      end

      # All method names defined across the linearization (completion and
      # the API gate's "is this name known" check, §2 gate 3).
      def visible_method_names(fqcn, singleton = false)
        names = []
        linearize(fqcn).each do |mod|
          module_records(mod).each do |record|
            names.concat(record.methods(singleton).keys)
          end
        end
        names.uniq
      end

      # ---- constants and references ----

      def constant_definitions(name)
        found = []
        @files.each_value do |listener|
          (listener.constants[name] || []).each { |raw| found << Record.new(raw) }
        end
        unless baked_absent?(@baked_constants)
          wrap(js_get(@baked_constants, name), found)
        end
        found
      end

      # Resolve a NavigationTarget constant to its definition records,
      # nesting-aware: classes/modules win over same-named constants, and
      # inner scopes win over outer ones (Ruby's lookup).
      def resolve_constant(target)
        name = target[:name]
        base = target[:base_name] || name
        candidates = []
        (target[:nesting] || []).reverse_each do |outer|
          candidates << "#{outer}::#{name}"
          candidates << "#{outer}::#{base}" unless base == name
        end
        candidates << name
        candidates << base
        candidates = candidates.uniq

        candidates.each do |cand|
          records = module_records(cand)
          return records unless records.empty?
        end
        candidates.each do |cand|
          consts = constant_definitions(cand)
          return consts unless consts.empty?
        end
        []
      end

      # Definitions of a bare method name across every indexed module
      # (instances and singletons) - the references/rename sweep.
      def method_definitions_all(name)
        out = []
        module_names.each do |mod|
          module_records(mod).each do |record|
            out.concat(record.method_definitions(name, false))
            out.concat(record.method_definitions(name, true))
          end
        end
        out
      end

      # Live method-reference records (the bake skips these).
      def live_method_references(name)
        found = []
        @files.each_value do |listener|
          (listener.method_references[name] || []).each { |raw| found << Record.new(raw) }
        end
        found
      end

      def constant_references(name)
        found = []
        @files.each_value do |listener|
          (listener.constant_references[name] || []).each { |raw| found << Record.new(raw) }
        end
        unless baked_absent?(@baked_references)
          wrap(js_get(@baked_references, name), found)
        end
        found
      end

      # ---- name search (workspaceSymbol) ----

      def search(query, limit = 100)
        needle = query.downcase
        hits = []
        module_names.each do |name|
          hits << [name, :module] if name.downcase.include?(needle)
        end
        # method names across both stores, deduplicated
        seen_methods = {}
        each_method_name do |name, module_name|
          next if seen_methods[name]
          next unless name.downcase.include?(needle)
          seen_methods[name] = module_name
          hits << [name, :method, module_name]
        end
        hits.first(limit)
      end

      private

      # The baked stores are JS POJOs and answer no Ruby methods - not even
      # #nil? - so their presence is tested in JS. Opal nil is not JS null,
      # hence both halves of the guard.
      def baked_absent?(store)
        `#{store} == null || #{store} === nil` ? true : false
      end

      def baked_read(map, name)
        js_get(map, name)
      end

      def js_get(map, name)
        `#{map}[#{name}] == null ? nil : #{map}[#{name}]`
      end

      def js_keys(map)
        keys = `Object.keys(#{map})`
        n = `keys.length`
        out = []
        n.times { |i| out << `keys[#{i}]` }
        out
      end

      def each_method_name
        @files.each_value do |listener|
          listener.modules.each_value do |records|
            records.each do |raw|
              raw["methods"].each_key { |m| yield m, raw["name"] }
            end
          end
        end
        unless baked_absent?(@baked_modules)
          mod_keys = js_keys(@baked_modules)
          mod_keys.each do |mod|
            records = `#{baked_read(@baked_modules, mod)} || []`
            count = `records.length`
            count.times do |i|
              record = `records[#{i}]`
              js_keys(`record.methods`).each { |m| yield m, mod }
            end
          end
        end
      end

      def wrap(array, into)
        return if `array == null || array === nil`
        n = `array.length`
        n.times { |i| into << Record.new(`array[#{i}]`) }
      end
    end
  end
end

# backtick_javascript: true
# textDocument/completion + completionItem/resolve (P4b), index-driven:
# after `.` a receiver types through the same heuristic as definition and
# answers the linearized method names; after `::` the names under that
# scope; bare capitalized words the top-level constants; bare lowercase
# words the implicit-self methods (inside a class) plus keywords; `@` the
# instance variables of the current document (not indexed - ivars are
# document-local); `require "` the require names of the real stdlib from
# the baked digest keys. Items carry a small data tag; resolve fills the
# doc comment from the record (the bake embedded it).
require 'opal/language-server/features/navigation_target'

module Opal
  module LanguageServer
    module CompletionFeature
      KIND_METHOD   = 2
      KIND_VARIABLE = 6
      KIND_CLASS    = 7
      KIND_MODULE   = 9
      KIND_KEYWORD  = 14
      KIND_FILE     = 17
      KIND_CONSTANT = 21
      MAX_ITEMS = 100

      KEYWORDS = %w[
        alias and begin break case class def do else elsif end ensure
        false for if in module next nil not or redo rescue retry return
        self super then true undef unless until when while yield
      ].freeze

      class << self
        def perform(state, document, position)
          parse_result = document.parse!
          offset = parse_result.offset_for(position["line"], position["character"])
          ancestors = document.locate_node(position["line"], position["character"])[:ancestors]
          nesting = NavigationTarget.nesting_names(ancestors)

          items =
            require_items(document, ancestors, offset) ||
            method_items(state, document, ancestors, offset, nesting) ||
            constant_items(state, document, ancestors, offset) ||
            ivar_items(document, offset) ||
            word_items(state, document, offset, nesting)
          (items || []).first(MAX_ITEMS)
        end

        # completionItem/resolve: the item comes back with our data tag;
        # the documentation is the record's baked comment.
        def resolve(state, item)
          data = item["data"]
          return item if data.nil?
          record =
            if data["kind"] == "method"
              state.index.resolve_method(data["name"], data["module"], data["singleton"])
            else
              records = state.index.module_records(data["name"])
              records.first
            end
          return item if record.nil?
          comments = record.comments
          unless `comments == null || comments === nil`
            item["documentation"] = { "kind" => "markdown", "value" => comments }
          end
          params = record.get("parameters")
          unless `params == null || params === nil`
            item["detail"] = "#{data["module"]}#{data["singleton"] ? "." : "#"}#{data["name"]}#{params}"
          end
          item
        end

        private

        # `require "js|` / `require_relative` - the StringNode whose parent
        # call is a require. Features come from the baked file set once.
        def require_items(document, ancestors, offset)
          index = ancestors.index { |n| n.type == "StringNode" }
          return nil if index.nil?
          # an unterminated "jso is wrapped in an InterpolatedStringNode, so
          # the require call may not be the direct parent: take the nearest
          # CallNode ancestor.
          parent = ancestors[(index + 1)..].find { |n| n.type == "CallNode" }
          return nil if parent.nil? || !["require", "require_relative"].include?(parent.name)
          node = ancestors[index]
          return nil if offset <= node.location_start
          prefix = `#{document.source}.slice(#{node.location_start} + 1, #{offset})`
          require_features.select { |feature| feature.start_with?(prefix) }
                         .map { |feature| { "label" => feature, "kind" => KIND_FILE } }
        end

        # `recv.pr|efix` where the cursor sits in the message span.
        def method_items(state, document, ancestors, offset, _nesting)
          call = ancestors.find do |n|
            n.type == "CallNode" && !n.absent?("message_loc") && NavigationTarget.covers?(n, offset) &&
              `#{offset} >= #{n.raw("message_loc")}.start && #{offset} <= #{n.raw("message_loc")}.end` ? true : false
          end
          return nil if call.nil? || call.absent?("receiver")
          receiver = call.child("receiver")
          fqcn, singleton = NavigationTarget.receiver_class(state, receiver, NavigationTarget.nesting_names(ancestors))
          return [] if fqcn.nil? # typed dot but nothing resolved: answer nothing, not constants
          message = call.raw("message_loc")
          prefix = `#{document.source}.slice(#{message}.start, #{offset})`
          state.index.visible_method_names(fqcn, singleton).select { |name| name.start_with?(prefix) }.map do |name|
            {
              "label" => name, "kind" => KIND_METHOD,
              "data" => { "kind" => "method", "name" => name, "module" => fqcn, "singleton" => singleton },
            }
          end
        end

        # A constant read/path node covering the cursor: `Comp|`, `Mod::Pi|`.
        def constant_items(state, document, ancestors, offset)
          node = ancestors.find do |n|
            NavigationTarget::CONSTANT_TYPES.include?(n.type) && NavigationTarget.covers?(n, offset)
          end
          return nil if node.nil?
          start =
            if node.type == "ConstantPathNode"
              loc = node.raw("name_loc")
              `loc == null || loc === nil ? #{node.location_start} : #{loc}.start`
            else
              node.location_start
            end
          prefix = `#{document.source}.slice(#{start}, #{offset})`

          scope = nil
          if node.type == "ConstantPathNode"
            full = NavigationTarget.full_path_name(node)
            scope = full.include?("::") ? full.split("::")[0...-1].join("::") : ""
          end
          names =
            if scope.nil?
              state.index.top_level_constant_names
            else
              state.index.constant_names_under(scope)
            end
          names.select { |name| name.split("::").last.start_with?(prefix) }.map { |name| constant_item(state, name) }
        end

        def constant_item(state, name)
          records = state.index.module_records(name)
          kind =
            if records.empty?
              KIND_CONSTANT
            else
              records.first.get("kind") == "module" ? KIND_MODULE : KIND_CLASS
            end
          { "label" => name.split("::").last, "kind" => kind,
            "detail" => name, "data" => { "kind" => "constant", "name" => name } }
        end

        # `@cou|`: the instance variables mentioned anywhere in this
        # document (v1 scope: a document-local concern, not indexed).
        def ivar_items(document, offset)
          trigger = `(() => { return /@([A-Za-z_][A-Za-z0-9_]*)?$/.test(#{document.source}.slice(0, #{offset})); })()`
          return nil if `trigger === false`
          vars = `(() => {
            var seen = new Set(), out = [];
            for (var m, r = /@[A-Za-z_][A-Za-z0-9_]*/g; (m = r.exec(#{document.source}));) if (!seen.has(m[0])) { seen.add(m[0]); out.push(m[0]); }
            return out;
          })()`
          n = `vars.length`
          out = []
          n.times { |i| name = `vars[#{i}]`; out << { "label" => name, "kind" => KIND_VARIABLE } unless `out.length >= #{MAX_ITEMS}` }
          out
        end

        # A bare word: capitalized -> top-level constants; lowercase ->
        # implicit-self methods inside a class body, plus keywords.
        def word_items(state, document, offset, nesting)
          word = `(() => { var m = /[A-Za-z_][A-Za-z0-9_?!]*$/.exec(#{document.source}.slice(0, #{offset})); return m ? m[0] : null; })()`
          return [] if `word == null`
          prefix = `word`
          if prefix[0] =~ /[A-Z]/
            state.index.top_level_constant_names.select { |n| n.start_with?(prefix) }
              .map { |n| constant_item(state, n) }.first(MAX_ITEMS)
          else
            items = []
            items.concat(KEYWORDS.select { |k| k.start_with?(prefix) }.map { |k| { "label" => k, "kind" => KIND_KEYWORD } })
            if nesting.any?
              names = state.index.visible_method_names(nesting.last, false)
              items.concat(names.select { |m| m.start_with?(prefix) && !m.end_with?("=") }.map do |m|
                { "label" => m, "kind" => KIND_METHOD,
                  "data" => { "kind" => "method", "name" => m, "module" => nesting.last, "singleton" => false } }
              end)
            end
            items.first(MAX_ITEMS)
          end
        end

        # The requireable names: top-level stdlib files plus the opal
        # entrypoints (derived once from the baked digest keys).
        def require_features
          @require_features ||= begin
            digests = `Opal.esm["opal/language-server/baked_index"] ? Opal.esm["opal/language-server/baked_index"].default.digests : null`
            names = `digests === null ? [] : Object.keys(digests)`
            count = `names.length`
            features = {}
            count.times do |i|
              key = `names[#{i}]`
              if key.start_with?("stdlib/")
                feature = key["stdlib/".length...-3]
                features[feature] = true unless feature.include?("/")
              elsif key.start_with?("opal/opal/")
                features[key["opal/".length...-3]] = true
              end
            end
            features.keys.sort
          end
        end
      end
    end
  end
end

# backtick_javascript: true
# The textDocument/hover request: constants render their declaration line
# (kind, name, superclass, the includes recorded by the index) plus the
# doc comment the bake embedded; methods render `def name(params)` under an
# `Owner#name` / `Owner.name` heading. Comments come straight from the
# records - no re-parsing of corelib at run time (LSP.md §5).
require 'opal/language-server/features/navigation_target'

module Opal
  module LanguageServer
    module HoverFeature
      class << self
        def perform(state, document, position)
          target = NavigationTarget.locate(document, position)
          return nil if target.nil?

          value =
            if target[:kind] == :constant
              constant_hover(state.index, target)
            else
              method_hover(state, target)
            end
          return nil if value.nil?
          { "contents" => { "kind" => "markdown", "value" => value } }
        end

        private

        def constant_hover(index, target)
          records = index.resolve_constant(target)
          return nil if records.empty?
          record = records.first
          word = record.get("kind") == "module" ? "module" : "class"
          superclass = nil
          includes = []
          records.each do |mod|
            superclass ||= mod.superclass
            [["include", mod.includes], ["prepend", mod.prepends], ["extend", mod.extends]].each do |word_key, list|
              list.each do |name|
                line = "  #{word_key} #{name}"
                includes << line unless includes.include?(line)
              end
            end
          end
          head = superclass.nil? ? "#{word} #{record.name}" : "#{word} #{record.name} < #{superclass}"
          body = ([head] + includes + ["end"]).join("\n")
          markdown(body, record.comments)
        end

        def method_hover(state, target)
          fqcn, singleton = NavigationTarget.method_owner(state, target)
          return nil if fqcn.nil?
          definition = state.index.resolve_method(target[:name], fqcn, singleton)
          return nil if definition.nil?
          owner = definition.get("module")
          owner = fqcn if `owner == null || owner === nil`
          params = definition.get("parameters")
          params = "()" if `params == null || params === nil`
          sep = singleton ? "." : "#"
          body = "#{singleton ? "def self." : "def "}#{target[:name]}#{params}"
          "### #{owner}#{sep}#{target[:name]}\n\n#{markdown(body, definition.comments)}"
        end

        def markdown(body, comments)
          out = "```ruby\n#{body}\n```"
          unless `comments == null || comments === nil`
            out += "\n\n#{comments}"
          end
          out
        end
      end
    end
  end
end

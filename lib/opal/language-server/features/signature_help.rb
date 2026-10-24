# backtick_javascript: true
# The textDocument/signatureHelp request: find the innermost call whose
# argument list contains the cursor, type the receiver exactly as the
# other navigation features do, and answer the definition's recorded
# parameter list. activeParameter counts the top-level commas already
# typed (JS scan: strings and nested brackets skipped).
require 'opal/language-server/features/navigation_target'

module Opal
  module LanguageServer
    module SignatureHelpFeature
      class << self
        def perform(state, document, position)
          parse_result = document.parse!
          offset = parse_result.offset_for(position["line"], position["character"])
          ancestors = document.locate_node(position["line"], position["character"])[:ancestors]

          call = ancestors.find { |n| n.type == "CallNode" && inside_arguments?(n, offset) }
          return nil if call.nil?
          name = call.name
          return nil if name.nil?

          target = { name: name, receiver: call.child("receiver"), nesting: NavigationTarget.nesting_names(ancestors) }
          fqcn, singleton = NavigationTarget.method_owner(state, target)
          return nil if fqcn.nil?
          definition = state.index.resolve_method(name, fqcn, singleton)
          return nil if definition.nil?

          params = definition.get("parameters")
          params = "()" if `params == null || params === nil`
          labels = parameter_labels(params)
          open = call.raw("opening_loc")
          active = `(() => {
            var s = #{document.source}, d = 0, n = 0, q = null;
            for (var i = #{open}.end; i < #{offset}; i++) {
              var c = s[i];
              if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
              if (c === "\"" || c === "'" || c.charCodeAt(0) === 96) { q = c; continue; }
              if (c === "(" || c === "[" || c === "{") d++;
              else if (c === ")" || c === "]" || c === "}") d--;
              else if (c === "," && d === 0) n++;
            }
            return n;
          })()`

          {
            "signatures" => [{
              "label" => "#{name}#{params}",
              "parameters" => labels.map { |label| { "label" => label } },
            }],
            "activeSignature" => 0,
            "activeParameter" => active > labels.length ? labels.length : active,
          }
        end

        private

        # The cursor sits in the call's argument span: after the '(' and
        # before its ')' (an unclosed call is still "inside").
        def inside_arguments?(call, offset)
          open = call.raw("opening_loc")
          return false if `open == null || open === nil`
          return false if `#{offset} < #{open}.end`
          close = call.raw("closing_loc")
          return true if `close == null || close === nil`
          `#{offset} <= #{close}.start` ? true : false
        end

        # "(a, b = …, *rest, key:, **opts, &block)" -> the label parts; the
        # recorded string splits on ", " (parameters_of never emits a
        # comma inside a part).
        def parameter_labels(params)
          inner = params[1...-1] # drop the "(" and ")"
          return [] if inner.nil? || inner.empty?
          inner.split(", ")
        end
      end
    end
  end
end

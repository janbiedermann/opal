# backtick_javascript: true
# The opalLsp/showSyntaxTree request: the document's Prism parse tree as
# JSON, for the editor side of the `Opal: Show Syntax Tree` command. The
# envelope's AST is already a POJO (lib/opal/parser/convert.mjs) so the
# dump is one JSON.stringify; it comes back as a string because the parse
# tree is the raw compiler data - node ids, flags, everything - not a
# protocol type with its own schema.
module Opal
  module LanguageServer
    module SyntaxTreeFeature
      class << self
        def perform(document)
          parse_result = document.parse!
          ast = `JSON.stringify(#{parse_result.envelope}.ast)`
          errors = `JSON.stringify(#{parse_result.envelope}.errors)`
          { "ast" => ast, "errors" => errors }
        end
      end
    end
  end
end

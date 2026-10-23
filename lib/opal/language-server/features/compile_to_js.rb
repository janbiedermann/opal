# The opalLsp/compileToJs request: what `Opal` would make of this file.
# The runtime compiler (opal-parser, bundled at boot by tasks/lsp/bundle.mjs
# for the compile gate of LSP.md §2 and this request) answers the compiled
# JavaScript, or the Opal::SyntaxError the compiler raised - which is the
# compile-gate diagnostic itself, shown here on demand.
require 'opal-parser'

module Opal
  module LanguageServer
    module CompileToJsFeature
      class << self
        def perform(document)
          document.parse!
          js = ::Opal.compile(document.source)
          { "code" => js }
        rescue ::Opal::SyntaxError => e
          { "error" => { "message" => e.message } }
        end
      end
    end
  end
end

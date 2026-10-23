# Opal's language server: an LSP server for Ruby code developed with and
# for Opal — it speaks the protocol as VS Code speaks it and its language
# model is Opal's Ruby: parse gate (Opal's own Prism parser), compile gate
# (Opal's compiler answers the diagnostics), Opal's corelib/stdlib as the
# index. The plan is LSP.md; the entry point is lib/opal/exe/lsp.rb, built
# into exe/lsp (tasks/lsp.mjs) and exe/lsp.exe (tasks/lsp_exe.mjs).
require 'opal/version'
require 'opal/language-server/protocol'
require 'opal/language-server/transport'
require 'opal/language-server/server'

module Opal
  module LanguageServer
    # The server answers the Opal version — the single source is
    # opal/corelib/version.mjs (LSP.md §0).
    VERSION = ::Opal::VERSION
  end
end

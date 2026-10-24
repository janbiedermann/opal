# Opal's language server: an LSP server for Ruby code developed with and
# for Opal — it speaks the protocol as VS Code speaks it and its language
# model is Opal's Ruby: parse gate (Opal's own Prism parser), compile gate
# (Opal's compiler answers the diagnostics), Opal's corelib/stdlib as the
# index. The plan is LSP.md; the entry point is lib/opal/exe/lsp.rb, built
# into exe/lsp (tasks/lsp.mjs) and exe/lsp.exe (tasks/lsp_exe.mjs).
require 'opal/version'
require 'opal/language-server/protocol'
require 'opal/language-server/prism/parser'
require 'opal/language-server/prism/dispatcher'
require 'opal/language-server/document'
require 'opal/language-server/ruby_document'
require 'opal/language-server/store'
require 'opal/language-server/transport'
require 'opal/language-server/features/document_symbol'
require 'opal/language-server/features/folding_ranges'
require 'opal/language-server/features/selection_ranges'
require 'opal/language-server/features/document_highlight'
require 'opal/language-server/features/semantic_highlighting'
require 'opal/language-server/features/inlay_hints'
require 'opal/language-server/features/on_type_formatting'
require 'opal/language-server/features/syntax_tree'
require 'opal/language-server/features/compile_to_js'
require 'opal/language-server/features/navigation_target'
require 'opal/language-server/features/definition'
require 'opal/language-server/features/references'
require 'opal/language-server/features/rename'
require 'opal/language-server/features/workspace_symbol'
require 'opal/language-server/features/hover'
require 'opal/language-server/features/signature_help'
require 'opal/language-server/features/type_hierarchy'
require 'opal/language-server/features/completion'
require 'opal/language-server/features/opal_gate'
require 'opal/language-server/features/code_actions'
require 'opal/language-server/indexer/global_state'
require 'opal/language-server/indexer/driver'
require 'opal/language-server/server'
require 'opal/language-server/check'

module Opal
  module LanguageServer
    # The server answers the Opal version — the single source is
    # opal/corelib/version.mjs (LSP.md §0).
    VERSION = ::Opal::VERSION
  end
end

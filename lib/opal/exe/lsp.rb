# The `opal-language-server` command: Opal's Ruby language server over
# LSP, on stdio.
#
# tasks/lsp.mjs builds it into exe/lsp and tasks/lsp_exe.mjs into
# exe/lsp.exe: standalone Node.js programs that speak LSP over their stdin
# and stdout, the way VS Code launches language servers (it spawns the
# process and pipes stdio — there is no socket or HTTP mode). See LSP.md
# for the design and the phases; the server answers Opal's version from
# the single source (opal/corelib/version.mjs).
require 'opal/language-server'

module LanguageServerCommand
  class << self
    def run
      case ARGV[0]
      when nil, '', '--stdio'
        # stdio is the only transport: VS Code spawns the server and pipes
        # it. --stdio names it explicitly, as other language servers do.
        Opal::LanguageServer::Server.new.run
      when '--check'
        # Parse gate over a tree, no protocol (LSP.md §6): exit 1 when any
        # file fails to parse under Opal's parser.
        exit Opal::LanguageServer::Check.run(ARGV[1] || Dir.pwd)
      when '--version', '-v'
        puts "opal-language-server #{Opal::LanguageServer::VERSION} (Opal #{Opal::VERSION})"
      when '--help', '-h'
        puts usage
      else
        $stderr.puts "opal-lsp: unknown option #{ARGV[0]} (-h will show valid options)"
        exit 1
      end
    end

    def usage
      <<~TEXT
        Usage: opal-lsp [--stdio] [--check DIR] [--version] [--help]

            --stdio                      Speak LSP over stdin/stdout (default)
            --check DIR                  Parse-gate every .rb under DIR,
                                         print them, exit 1 on any error
            --version, -v                Print the version
            --help, -h                   Print this help

        The server is configured by the client through the LSP initialize
        request; there are no other command-line options yet (LSP.md §6).
      TEXT
    end
  end
end

LanguageServerCommand.run

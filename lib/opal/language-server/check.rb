# Batch mode: run the parse gate over a tree and answer a process exit
# status - CI's way to ask "does everything here parse under Opal?" with no
# protocol involved (LSP.md §6; the compile gate joins in P5).
require 'opal/language-server/prism/parser'

module Opal
  module LanguageServer
    module Check
      SEVERITIES = { 1 => "error", 2 => "warning", 3 => "information", 4 => "hint" }.freeze

      class << self
        def run(dir)
          files = Dir.glob(File.join(dir, "**", "*.rb")).sort
          errors = 0
          warnings = 0

          files.each do |file|
            result = ParseResult.new(File.read(file))
            result.diagnostics.each do |diagnostic|
              severity = diagnostic["severity"]
              errors += 1 if severity == 1
              warnings += 1 if severity == 2
              start = diagnostic["range"]["start"]
              # human output is 1-based, LSP positions are 0-based
              puts "#{file}:#{start["line"] + 1}:#{start["character"] + 1}: " \
                   "#{SEVERITIES[severity]}: #{diagnostic["message"]} [#{diagnostic["code"]}]"
            end
          end

          puts "opal-lsp: #{files.size} files, #{errors} errors, #{warnings} warnings"
          errors.zero? ? 0 : 1
        end
      end
    end
  end
end

# backtick_javascript: true
# textDocument/formatting (LSP.md §9 P7): the server never formats. It
# delegates to an external formatter command configured through
# initializationOptions.formatter or OPAL_LSP_FORMATTER (a full shell
# command line like `st --baseline`), fed the document source on stdin,
# answering the formatted text on stdout. Formatting is whitespace, not
# a language claim, so an outside tool bends nothing; the command is
# whatever the user configured, and an absent or failing one answers
# null - the client simply keeps the buffer (degrading silently, as the
# plan asks).
module Opal
  module LanguageServer
    module FormattingFeature
      class << self
        def perform(document, command)
          return nil if command.nil?
          out = `(() => {
            try {
              const r = require("node:child_process").spawnSync(String(#{command}), {
                shell: true, input: String(#{document.source}),
                encoding: "utf8", timeout: 10_000, maxBuffer: 33554432,
              });
              if (r.status !== 0 || typeof r.stdout !== "string") return null;
              return r.stdout;
            } catch (e) { return null; }
          })()`
          return nil if `out === null || out === nil`
          stop = document.parse!.position_at(document.source.length)
          [{
            "range" => {
              "start" => { "line" => 0, "character" => 0 },
              "end"   => { "line" => stop[0], "character" => stop[1] },
            },
            "newText" => `out`,
          }]
        end
      end
    end
  end
end

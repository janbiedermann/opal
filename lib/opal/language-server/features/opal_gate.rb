# backtick_javascript: true
# The two deep Opal gates (LSP.md §2), beyond the parse gate:
#
# * the compile gate - `opalLsp/compileToJs`'s Compiler, run on SAVE only
#   (heavier than parse): everything the parser accepts but Opal refuses to
#   compile ("unsupported parameter" destructuring params, bad rescue
#   targets, Ruby regexps V8 rejects) becomes a severity-1 diagnostic at
#   the OpalSyntaxError's own location (1-based line, 0-based UTF-16 column
#   - stdlib/opal-parser.rb passes the JS error's POJO location through).
# * the API gate - a curated list of what Opal does not support (no Thread,
#   no Fiber, no Data, immutable Strings, Symbol==String, missing stdlib
#   requires), matched on the parse tree, published with the parse gate on
#   every edit. The list is deliberately small: these patterns run at
#   *edit* time, so they only fire on unambiguous shapes (literal-receiver
#   bangs, an exact require name), never on a plain identifier a workspace
#   file might define itself.
require 'opal/language-server/features/navigation_target'

module Opal
  module LanguageServer
    module OpalGateFeature
      # corelib/unsupported.rb raises NotImplementedError at run time for
      # these on a String receiver.
      BANG_METHODS = %w[
        gsub! sub! tr! squeeze! chop! chomp! slice! strip! lstrip! rstrip!
        upcase! downcase! capitalize! swapcase! delete! succ!
      ].freeze
      STRING_LITERAL_TYPES = NavigationTarget::LITERAL_CLASSES.select { |_k, v| v == "String" }.keys.freeze

      # stdlib names that neither the baked set nor Opal's loader provides:
      # require resolves to nothing and the node platform loader silently
      # skips it (no LoadError - AGENTS.md), so say so at the call.
      MISSING_REQUIRES = %w[psych readline reline irb resolv Reline].freeze

      class << self
        # ---- the compile gate (on save) ----

        def compile_diagnostics(document)
          out = []
          # The result leaves the x-string as a raw JS object; every read
          # back is a JS read (it is a POJO: no Ruby sends). The x-string
          # sits in statement position and assigns through `payload`.
          payload = `null`
          %x{
            var entry = Opal.esm["opal/compiler/index"];
            var warnings = [];
            var options = {
              file: String(#{document.uri}),
              dynamic_require_severity: "ignore",
              warning: function (text) { warnings.push(String(text)); },
            };
            try {
              new entry.Compiler(String(#{document.source}), options).compile();
              payload = { warnings: warnings };
            } catch (e) {
              if (e && e.name === "OpalSyntaxError") {
                payload = {
                  error: { message: String(e.message), line: e.line,
                           column: e.column, sourceLine: e.sourceLine },
                  warnings: warnings,
                };
              } else {
                payload = {
                  error: { message: String((e && e.message) || e), line: null, column: null },
                  warnings: warnings,
                };
              }
            }
          }
          error = `payload.error`
          unless `error == null || error === nil`
            line = `error.line`
            column = `error.column`
            if `typeof line === "number"`
              # LSP positions are 0-based; the error's line is 1-based and
              # its column already a UTF-16 offset. The end spans the
              # source line that failed (it is what the editor shows).
              width = `typeof error.sourceLine === "string" ? String(error.sourceLine).replace(/\s+$/, "").length : 1`
              column = 0 if `typeof column !== "number"`
              width = 1 if `width < 1`
              out << {
                "range" => {
                  "start" => { "line" => `line - 1`, "character" => column },
                  "end" => { "line" => `line - 1`, "character" => `column + width` },
                },
                "severity" => 1, "source" => "opal", "code" => "compile",
                "message" => `error.message`,
              }
            else
              # A compiler refusal with no source position: document start.
              out << {
                "range" => { "start" => { "line" => 0, "character" => 0 },
                             "end" => { "line" => 0, "character" => 0 } },
                "severity" => 1, "source" => "opal", "code" => "compile",
                "message" => `error.message`,
              }
            end
          end
          warnings = `payload.warnings`
          n = `warnings.length`
          n.times do |i|
            text = `warnings[#{i}]`
            next if out.any? { |d| d["message"] == text }
            next if document.diagnostics.any? { |d| d["message"] == text } # the parse gate already said it
            # The Compiler's warning() ends the text with "-- <file>:<line>";
            # recover that line so the diagnostic spans the source line and
            # code actions can anchor to it. (x-strings keep backslashes raw:
            # the regex below needs one literal \d, not the Ruby-escaped \\.)
            wline = `(() => { var m = /:(\d+)$/.exec(#{text}); return m ? Number(m[1]) : null; })()`
            range =
              if `typeof wline === "number"`
                document.parse!.line_range(`wline - 1`)
              else
                { "start" => { "line" => 0, "character" => 0 }, "end" => { "line" => 0, "character" => 0 } }
              end
            out << {
              "range" => range,
              "severity" => 2, "source" => "opal", "code" => "compile-warning",
              "message" => text,
            }
          end
          out
        end

        # ---- the API gate (on open/change, with the parse gate) ----

        def api_diagnostics(document)
          ast = document.parse!.ast
          out = []
          stack = [ast]
          while (node = stack.pop)
            check_node(node, out)
            stack.concat(node.child_nodes)
          end
          out
        end

        private

        def check_node(node, out)
          case node.type
          when "ConstantReadNode"
            case node.name
            when "Thread"
              out << diagnostic(node, "unsupported.thread",
                               "Opal has no Thread: JavaScript has no OS threads")
            when "Fiber"
              out << diagnostic(node, "unsupported.fiber",
                               "Opal has no Fiber: there is no scheduler to yield to")
            end
          when "CallNode"
            receiver = node.child("receiver")
            if node.name == "define" && receiver && receiver.type == "ConstantReadNode" && receiver.name == "Data"
              out << diagnostic(node, "unsupported.data-define", "Opal has no Data class")
            elsif BANG_METHODS.include?(node.name) && receiver && STRING_LITERAL_TYPES.include?(receiver.type)
              out << diagnostic(node, "unsupported.string-mutation",
                                "String is immutable in Opal: String##{node.name} raises NotImplementedError")
            elsif (node.name == "is_a?" || node.name == "kind_of?" || node.name == "instance_of?") &&
                  symbol_argument?(node)
              out << diagnostic(node, "unsupported.symbol-check",
                                "Symbol is String in Opal: is_a?(Symbol) answers true for every String")
            elsif node.name == "===" && receiver && receiver.type == "ConstantReadNode" && receiver.name == "Symbol"
              out << diagnostic(node, "unsupported.symbol-check",
                                "Symbol is String in Opal: Symbol === x answers true for every String")
            elsif node.name == "require" && missing_require?(node)
              out << diagnostic(node, "unsupported.require",
                                "Opal does not provide this stdlib: the require is silently skipped at run time")
            end
          end
        end

        def symbol_argument?(call)
          args = call.child("arguments")
          return false if args.nil?
          args.child_nodes.any? { |a| a.type == "ConstantReadNode" && a.name == "Symbol" }
        end

        def missing_require?(call)
          args = call.child("arguments")
          return false if args.nil?
          args.child_nodes.any? do |a|
            a.type == "StringNode" && MISSING_REQUIRES.include?(a.raw("unescaped"))
          end
        end

        def diagnostic(node, code, message)
          {
            "range" => node.to_range,
            "severity" => 2, "source" => "opal", "code" => code,
            "message" => message,
          }
        end
      end
    end
  end
end

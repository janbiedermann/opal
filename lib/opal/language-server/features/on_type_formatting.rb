# The textDocument/onTypeFormatting request: edits applied as the user
# types (trigger characters "{", "\n", "|", "d"). A direct port of
# ruby-lsp's request - its logic is lines and regexes, not AST, except the
# `end` auto-indent which uses RubyDocument#locate_node (our locate_node).
# $0 snippet anchors to move the cursor are only emitted for clients that
# implement snippets (VS Code, Cursor, VSCodium, Windsurf).
module Opal
  module LanguageServer
    class OnTypeFormattingFeature
      END_REGEXES = [
        /\b(if|unless|for|while|until)\b($|\s|\()/,
        /\b(class|module|def|case)\b($|\s)/,
        /.*\s\bdo\b($|\s)/,
      ].freeze

      SNIPPET_CLIENTS = /\A(Visual Studio Code|Cursor|VSCodium|Windsurf)\z/

      def self.perform(document, params, client_name)
        document.parse!
        new(document.source.lines, document, params["position"], params["ch"], client_name || "").perform
      end
      private_class_method :new

      def initialize(lines, document, position, trigger_character, client_name)
        @lines = lines
        @document = document
        line = @lines[[position["line"] - 1, 0].max]
        @indentation = line ? find_indentation(line) : 0
        @previous_line = line ? line.strip : ""
        @position = position
        @edits = []
        @trigger_character = trigger_character
        @client_name = client_name
      end

      def perform
        case @trigger_character
        when "{"
          handle_curly_brace if @document.syntax_error?
        when "|"
          handle_pipe if @document.syntax_error?
        when "\n"
          if (comment_match = /^#(?!:)(\s*)/.match(@previous_line))
            handle_comment_line(comment_match[1])
          elsif @document.syntax_error?
            match = /<<(-?~?)(['"`]?)(\w+)\2/.match(@previous_line)
            if match
              handle_heredoc_end(match[3])
            else
              handle_statement_end
            end
          end
        when "d"
          auto_indent_after_end_keyword
        end

        @edits
      end

      private

      def handle_pipe
        current_line = @lines[@position["line"]]
        return unless /((?<=do)|(?<={))\s+\|/.match(current_line)

        line = current_line
        # The user closed the parameter list manually: drop the extra pipe
        # the completion added, instead of adding another.
        if line[0..@position["character"]] =~ /(do|{)\s+\|[^|]*\|\|$/
          add_edit("", @position["line"], @position["character"], 1)
        else
          add_edit("|", @position["line"], @position["character"])
        end
        move_cursor(@position["line"], @position["character"])
      end

      def handle_curly_brace
        return unless /".*#\{/.match(@previous_line)
        add_edit("}", @position["line"], @position["character"])
        move_cursor(@position["line"], @position["character"])
      end

      def handle_statement_end
        # A keyword inside a comment or string literal may be coincidental.
        return if /\A["'#]/.match(@previous_line)
        return unless END_REGEXES.any? { |regex| regex.match(@previous_line) }
        # Endless methods (`def foo = 42`) are already complete.
        return if /\bdef\s+[\w.]+[!?=]?(\([^)]*\))?\s*=[^=~>]/.match(@previous_line)

        indents = " " * @indentation
        current_line = @lines[@position["line"]]
        next_line = @lines[@position["line"] + 1]

        if current_line.nil? || current_line.strip.empty? || current_line.include?(")") || current_line.include?("]")
          add_edit("\n#{indents}end", @position["line"], @position["character"])
          move_cursor(@position["line"], @indentation + 2)
        elsif next_line.nil? || next_line.strip.empty?
          add_edit("#{indents}end\n", @position["line"] + 1, 0)
          move_cursor(@position["line"] - 1, @indentation + @previous_line.size + 1)
        end
      end

      def handle_heredoc_end(delimiter)
        indents = " " * @indentation
        add_edit("\n#{indents}#{delimiter}", @position["line"], @position["character"])
        move_cursor(@position["line"], @indentation + 2)
      end

      def handle_comment_line(spaces)
        add_edit("##{spaces}", @position["line"], @position["character"])
      end

      def auto_indent_after_end_keyword
        current_line = @lines[@position["line"]]
        return unless current_line && current_line.strip == "end"

        context = @document.locate_node(@position["line"], @position["character"] - 1)
        target = context[:node]
        return unless ["IfNode", "UnlessNode", "ForNode", "WhileNode", "UntilNode"].include?(target.type)

        statements = target.child("statements")
        return if statements.nil?

        current_indentation = find_indentation(current_line)
        statements.children("body").each do |node|
          line_start, column_start = node.start_position
          line_end, = node.end_position
          next unless column_start == current_indentation
          (line_start..line_end).each do |line|
            add_edit("  ", line, 0)
          end
        end
        move_cursor(@position["line"], @position["character"])
      end

      def add_edit(text, line, character, end_character = character)
        point = { "line" => line, "character" => character }
        @edits << {
          "range"    => { "start" => point, "end" => { "line" => line, "character" => end_character } },
          "newText"  => text,
        }
      end

      def move_cursor(line, character)
        return unless SNIPPET_CLIENTS.match(@client_name)
        # $0 is the snippet anchor VS Code moves the caret to after the
        # edit applies (the other clients ignore snippet syntax).
        add_edit("$0", line, character)
      end

      def find_indentation(line)
        count = 0
        line.each_char do |c|
          break unless c == " "
          count += 1
        end
        count
      end
    end
  end
end

# backtick_javascript: true
require 'opal/parser/index.mjs'

module Opal
  module LanguageServer
    # One parse of a document through Opal's own parser (lib/opal/parser,
    # the Prism 1.9 port the compiler runs on): this is the parse gate of
    # LSP.md §2 - whatever this parser rejects, Opal rejects.
    #
    # The envelope (see lib/opal/parser/index.mjs) is the raw JS one:
    # {ast, comments, magic_comments, errors, warnings, data_loc, offsets,
    # start_line, encoding}. Every offset in it is a UTF-16 code-unit index
    # into the source - LSP's default position unit as well, since JS
    # strings are UTF-16 - so mapping an offset to a Position is a binary
    # search over the envelope's own line table, and a Position to an
    # offset is line_start + character. No code-unit conversion anywhere.
    class ParseResult
      def initialize(source)
        @source = source
        # String(...): the bridge takes the primitive (AGENTS.md boxed-string
        # lesson - a boxed String argument would reach the parser unboxed
        # as an object and throw "expects a string").
        @envelope = `Opal.esm["opal/parser/index"].parseWithMetadata(String(#{source}))`
        @line_count = `#{@envelope}.offsets.length`
      end

      attr_reader :source, :envelope, :line_count

      def error_count
        `#{@envelope}.errors.length`
      end

      def warning_count
        `#{@envelope}.warnings.length`
      end

      def syntax_error?
        `#{@envelope}.errors.length > 0`
      end

      # The parse gate as LSP Diagnostics: errors as severity 1, parser
      # warnings as severity 2, carrying the Prism diagnostic id as `code`.
      # Returned as plain Ruby Hashes so they survive JSON generation
      # whatever the transport parsed.
      def diagnostics
        diags = []
        diags.concat(diagnostics_from("errors", 1))
        diags.concat(diagnostics_from("warnings", 2))
        diags
      end

      # [line, character] (both 0-based, both UTF-16 units) for a UTF-16
      # offset into the parsed source. Binary search over the newline
      # offsets the envelope carries.
      def position_at(offset)
        lo = 0
        hi = @line_count - 1
        while lo < hi
          mid = (lo + hi + 1) >> 1
          if line_start(mid) <= offset
            lo = mid
          else
            hi = mid - 1
          end
        end
        [lo, offset - line_start(lo)]
      end

      private

      def line_start(line)
        `#{@envelope}.offsets[#{line}]`
      end

      def diagnostics_from(key, severity)
        list = []
        count = `#{@envelope}[#{key}].length`
        count.times do |i|
          start_at = `#{@envelope}[#{key}][#{i}].start`
          end_at   = `#{@envelope}[#{key}][#{i}].end`
          message  = `#{@envelope}[#{key}][#{i}].message`
          code     = `#{@envelope}[#{key}][#{i}].type`
          start_line, start_char = position_at(start_at)
          end_line, end_char = position_at(end_at)
          list << {
            "range" => {
              "start" => { "line" => start_line, "character" => start_char },
              "end"   => { "line" => end_line, "character" => end_char },
            },
            "message"  => message,
            "severity" => severity,
            "source"   => "opal",
            "code"     => code,
          }
        end
        list
      end
    end
  end
end

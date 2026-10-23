# backtick_javascript: true
require 'opal/parser/index.mjs'
require 'opal/language-server/prism/node'

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

      # The parse tree root as a Node.
      def ast
        Node.new(`#{@envelope}.ast`, self)
      end

      # The envelope's comments: {type: "inline"|"embdoc", start:, end:} -
      # raw UTF-16 offsets, not location objects (they are not AST nodes).
      def comments
        cs = `#{@envelope}.comments`
        count = `cs.length`
        list = []
        count.times do |i|
          list << {
            "type"  => `#{cs}[#{i}].type`,
            "start" => `#{cs}[#{i}].start`,
            "end"   => `#{cs}[#{i}].end`,
          }
        end
        list
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

      # The inverse: an LSP {line, character} to a UTF-16 offset, clamped to
      # the line end and the source (the same defense Document#push_edits
      # uses against a client racing its own edits).
      def offset_for(line, character)
        return source_length if line >= @line_count
        off = line_start(line) + character
        line_end = (line + 1 < @line_count ? line_start(line + 1) : source_length + 1) - 1
        off = line_end if off > line_end
        off > source_length ? source_length : off
      end

      def source_length
        `String(#{@source}).length`
      end

      # An LSP Range for a Prism loc POJO ({start:, end:} UTF-16 offsets,
      # the optional *_loc fields), or nil when the loc is absent.
      def range_for_loc(loc)
        # a POJO has no #nil? - the null test has to happen in JS
        return nil if `loc == null`
        s, sc = position_at(`loc.start`)
        e, ec = position_at(`loc.end`)
        {
          "start" => { "line" => s, "character" => sc },
          "end"   => { "line" => e, "character" => ec },
        }
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

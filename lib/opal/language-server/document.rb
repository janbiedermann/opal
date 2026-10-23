# backtick_javascript: true

module Opal
  module LanguageServer
    # A text document the client has open: source, version, and incremental
    # edits. Positions are LSP {line, character} with character in UTF-16
    # code units - the unit JS strings are measured in - so an edit splices
    # the unboxed source with plain slice arithmetic. (ruby-lsp negotiates
    # UTF-8/32 scanners too; this server offers only utf-16, so only one
    # path exists - LSP.md §1/§3.)
    class Document
      attr_reader :uri, :language_id
      attr_accessor :source, :version

      def initialize(uri:, source:, version: 0, language_id: "ruby")
        @uri = uri
        @source = source
        @version = version
        @language_id = language_id
        @needs_parsing = true
      end

      def needs_parsing?
        @needs_parsing
      end

      def parsed!
        @needs_parsing = false
      end

      # LSP TextDocumentContentChangeEvent[]: each change replaces a range
      # with its text, in order. A change without a range replaces the
      # whole source (sync kind Full, kept for robustness).
      def push_edits(changes)
        changes.each do |change|
          range = change["range"]
          if range.nil?
            @source = change["text"] || ""
            next
          end
          start_pos = range["start"]
          end_pos   = range["end"]
          text      = change["text"] || ""
          %x{
            var s = String(#{@source});
            var offs = $lineOffsets(s);
            var a = $offsetFor(offs, s.length, #{start_pos["line"]}, #{start_pos["character"]});
            var b = $offsetFor(offs, s.length, #{end_pos["line"]}, #{end_pos["character"]});
            // the JS name for @source is self.source (AGENTS.md x-string note)
            self.source = s.slice(0, a) + String(#{text}) + s.slice(b);
          }
        end
        @needs_parsing = true
      end

      %x{
        // Line start offsets (UTF-16 units) for a source string, splitting
        // on \r\n, \r and \n as LSP line semantics require.
        function $lineOffsets(s) {
          var offs = [0];
          for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c === 10) { offs.push(i + 1); }
            else if (c === 13) {
              offs.push(i + 1);
              if (s.charCodeAt(i + 1) === 10) i++;
            }
          }
          return offs;
        }

        // An LSP {line, character} position to a UTF-16 offset, clamped so a
        // client racing its own edits cannot slice outside the source.
        function $offsetFor(offs, length, line, character) {
          if (line >= offs.length) return length;
          var lineStart = offs[line];
          var nextStart = line + 1 < offs.length ? offs[line + 1] : length + 1;
          var off = lineStart + character;
          if (off > nextStart - 1) off = nextStart - 1; // end of line, before the newline
          return off > length ? length : off;
        }
      }
    end
  end
end

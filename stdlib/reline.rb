# backtick_javascript: true
# Opal port: the staged Reline port, tier 2. The API surface IRB v1.18
# calls is answered here, and line reading on a real tty runs a raw-mode
# line editor over the node tty primitives (platform.tty_raw/tty_isatty):
# key-by-key redraw, arrow/C-p/C-n history recall, and the emacs-ish
# control subset C-a C-b C-f C-e C-d C-k C-u C-w C-l, C-c raising
# Interrupt. Missing still versus upstream Reline: completion menus and
# tabs, incremental history search (C-r), the dialog system, wide-char
# cursor arithmetic and word-wrap redraw. Piped and file input keep the
# cooked-mode reader (the terminal edits those lines itself).
#
# Call sites pinned by the specs under spec/opal/stdlib/reline:
# Reline.readmultiline/readline, input/output/prompt_proc/auto_indent_proc/
# completion_* accessors, output_modifier_proc/dig_perfect_match_proc/
# autocompletion, add_dialog_proc, delete_text/ungetc, encoding_system_needs,
# get_screen_size, ambiguous_width, Reline::HISTORY (Array-backed),
# Reline::IOGate, Reline::Unicode, Reline::Config, Reline::VERSION.

module Reline
  VERSION = '0.7.0-opal'
  DEFAULT_DIALOG_CONTEXT = :Reline_DEFAULT_DIALOG

  class << self
    attr_accessor :input, :output
    attr_accessor :prompt_proc, :auto_indent_proc
    attr_accessor :autocompletion
    attr_accessor :completion_proc, :completion_append_character
    attr_accessor :completer_quote_characters, :basic_word_break_characters
    attr_accessor :output_modifier_proc, :dig_perfect_match_proc
    attr_accessor :ambiguous_width

    # Line reading: one line without the trailing newline, nil at EOF.
    # A real tty on fd 0 gets the raw-mode editor; anything else (pipe,
    # file, StringIO in the specs) reads a cooked line off the input IO.
    def readline(prompt = '', add_to_history: true)
      io = input || $stdin
      out = output || $stdout
      if `!!(Opal.platform.tty_raw && Opal.platform.tty_isatty)` && io.respond_to?(:fileno) && io.fileno == 0 && io.tty?
        line = raw_readline(prompt, out)
        HISTORY << line if add_to_history && line && !line.empty?
        return line
      end
      out.print(prompt) if prompt && !prompt.empty?
      line = io.gets
      return nil if line.nil?
      line = line.chomp
      HISTORY << line if add_to_history && !line.empty?
      line
    end

    # Reads lines until check_termination (the block) accepts the buffer -
    # IRB's RubyLex termination check drives it. Returns the whole code
    # (lines joined with \n, as IRB expects) or nil at EOF.
    def readmultiline(prompt = '', add_to_history = false, &check_termination)
      code = +''
      loop do
        continuation = prompt_line_for(code, prompt)
        line = readline(continuation, add_to_history: false)
        return nil if line.nil?
        code += line + "\n"
        break if check_termination.nil? || check_termination.call(code.dup)
      end
      code.chomp
    end

    private def prompt_line_for(code, prompt)
      return prompt if code.empty?
      proc_ = prompt_proc
      return prompt if proc_.nil?
      # the Reline contract: the proc gets the chomped Array of lines read
      # so far (IRB's dynamic_prompt joins "\n" back and parses per line;
      # unchomped lines would double every newline) and answers an Array of
      # per-line prompts - Reline takes the one for the line being typed
      lines_arr = code.lines.map(&:chomp)
      out = proc_.call(lines_arr)
      return prompt if out.nil?
      out = out[lines_arr.size - 1] if out.is_a?(Array)
      out.to_s
    end

    # Pulls the next chunk of typed bytes from fd 0 (blocking). A fast
    # typist or a paste hands over several keys at once and one key can
    # straddle a chunk, so the leftovers live in @keyq (a JS array: the
    # x-string splices it out whole). node's stdin fd is non-blocking -
    # readSync raises EAGAIN while nothing has been typed yet (and only
    # pre-buffered pipe input makes it look like it works) - Atomics.wait
    # is the synchronous sleep this retry loop needs (a timer would
    # reenter the Opal queue from underneath the read).
    private def read_key_chunk
      %x{
        var q = self.keyq || (self.keyq = []);
        if (q.length) return q.splice(0, q.length);
        var n, buf = Buffer.alloc(128);
        for (;;) {
          try { n = require("fs").readSync(0, buf, 0, 128); break; }
          catch (e) {
            if (e.code === "EAGAIN") {
              Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
              continue;
            }
            return nil;
          }
        }
        if (n === 0) return nil;
        var a = [];
        for (var i = 0; i < n; i++) a.push(buf[i]);
        return a;
      }
    end

    # Full-line redraw: carriage-return, prompt + buffer, clear to end of
    # line, then step back to the cursor. Char columns, not display
    # columns: the tier that learns East Asian widths comes later.
    private def redraw(prompt, chars, pos, out)
      tail = chars.size - pos
      out.print("\r" + prompt + chars.join + "\x1b[K")
      out.print("\x1b[#{tail}D") if tail > 0
      out.flush
    end

    # The tier-2 raw line editor. One key event per case; returns the
    # entered line (without the newline), nil on EOF (C-d on an empty
    # line), and raises Interrupt on C-c - IRB's own rescue takes it.
    private def raw_readline(prompt, out)
      chars = []
      pos = 0
      hist_i = HISTORY.size # HISTORY.size is the "bottom", typing again
      saved = nil
      bytes = nil
      j = 0
      take = proc do
        if bytes.nil? || j >= bytes.size
          bytes = read_key_chunk
          next nil if bytes.nil?
          j = 0
        end
        b = bytes[j]
        j += 1
        b
      end
      recall = proc do
        entry = HISTORY[hist_i].to_s
        entry = entry.lines.first.to_s if entry.include?("\n") # multiline statements
        chars.replace(entry.chomp.chars)
        pos = chars.size
      end
      up = proc do
        next if hist_i.zero?
        saved ||= chars.dup
        hist_i -= 1
        recall.call
      end
      down = proc do
        next if hist_i >= HISTORY.size
        if hist_i + 1 >= HISTORY.size # back to the bottom: typing again
          hist_i = HISTORY.size
          chars.replace(saved.dup) if saved
          chars.clear if saved.nil?
          pos = chars.size
        else
          hist_i += 1
          recall.call
        end
      end
      raw = `Opal.platform.tty_raw(0, true)`
      begin
        redraw(prompt, chars, pos, out)
        loop do
          b = take.call
          return nil if b.nil? # EOF on the stream
          case
          when b == 13 || b == 10 # Enter (swallow a queued \n of a CRLF)
            j += 1 if b == 13 && j < bytes.size && bytes[j] == 10
            out.print("\r\n")
            return chars.join
          when b == 3 # C-c: raise Interrupt like Reline does when it
            # re-signals the app in raw mode; IRB's each_top_level_statement
            # turns it into signal_handle (upstream delivers it as SIGINT
            # to the trap IRB installs - Opal's self-Process.kill raises
            # the bare Interrupt instead, so that rescue dispatches it).
            out.print("\r\n")
            raise Interrupt
          when b == 4 # C-d: EOF on an empty line, delete forward else
            return nil if chars.empty?
            chars.delete_at(pos)
          when b == 127 || b == 8 # backspace
            if pos > 0
              chars.delete_at(pos - 1)
              pos -= 1
            end
          when b == 1 # C-a home
            pos = 0
          when b == 5 # C-e end
            pos = chars.size
          when b == 2 # C-b left
            pos -= 1 if pos > 0
          when b == 6 # C-f right
            pos += 1 if pos < chars.size
          when b == 16 # C-p history up
            up.call
          when b == 14 # C-n history down
            down.call
          when b == 21 # C-u discard the line
            chars.clear
            pos = 0
          when b == 11 # C-k kill to end
            chars[pos..-1] = []
          when b == 23 # C-w kill the word before the cursor
            start = pos
            pos -= 1 while pos > 0 && chars[pos - 1] == ' '
            pos -= 1 while pos > 0 && chars[pos - 1] != ' '
            chars[pos...start] = []
          when b == 12 # C-l clear and redraw
            out.print("\x1b[H\x1b[2J")
            redraw(prompt, chars, pos, out)
          when b == 27 # ESC - arrow keys and friends
            nxt = take.call
            if nxt == 91 # CSI: consume parameter bytes until the final byte
              param = +''
              c = take.call
              c, param = take.call, param + (c.chr) while c && c < 64
              case c
              when 65 then up.call
              when 66 then down.call
              when 67 then pos += 1 if pos < chars.size
              when 68 then pos -= 1 if pos > 0
              when 72, 126 then # H home; ~ with a numeric parameter below
                param = '1' if c == 72
                case param
                when '3' then chars.delete_at(pos) # delete
                when '1', '7' then pos = 0
                when '4', '8' then pos = chars.size
                end
              end
            elsif nxt == 79 # SS3: O + letter
              case take.call
              when 68 then pos -= 1 if pos > 0
              when 67 then pos += 1 if pos < chars.size
              when 72 then pos = 0
              when 70 then pos = chars.size
              end
            end # M-<char> and friends: ignored until completion
          when b == 9 # TAB: ignored until completion lands
          when b >= 32 && b < 127
            chars.insert(pos, b.chr)
            pos += 1
          when b >= 0xC0 # a UTF-8 lead byte: pull the whole sequence
            len = b >= 0xF0 ? 4 : (b >= 0xE0 ? 3 : 2)
            seq = [b]
            (len - 1).times do
              cb = take.call
              break if cb.nil?
              seq << cb
            end
            chars.insert(pos, %x{ new TextDecoder('utf-8').decode(new Uint8Array(#{seq})) })
            pos += 1
          end # other bytes (stray continuations, NUL...) are dropped
          redraw(prompt, chars, pos, out)
        end
      ensure
        # keys from the current chunk that this line did not consume belong
        # to the next readline (fast typing and pastes land whole chunks)
        %x{
          var q = self.keyq || (self.keyq = []);
          if (bytes && j < bytes.length) q.push.apply(q, bytes.slice(j));
        }
        `Opal.platform.tty_raw(0, false)` if `raw === true`
      end
    end

    public

    def add_dialog_proc(name, proc, context = nil)
      (@dialogs ||= {})[name] = [proc, context]
    end

    # The editing surface the cooked-mode reader does not use; IRB's paste
    # path (irb.rb) and dialogs call through them.
    def delete_text; end
    def ungetc(*); end
    def getc; nil; end
    def input_key(*); end
    def line_editor; nil; end
    def completion_context = nil
    def auto_indent_modes = {}
    def vi_mode = false
    def completion_scope = nil
    def menu(_info, *_args); end

    def encoding_system_needs
      ::Encoding::UTF_8
    end

    def get_screen_size
      IOGate.winsize_fallback([24, 80])
    end
  end

  self.ambiguous_width = 1

  class History < Array
    def to_a = self
    def success_concat_of_history = false
    def unshift_unless_duplicate(*) = nil
  end

  class Config
    def inputrc_path
      File.expand_path(ENV['INPUTRC'] || '~/.inputrc')
    end

    def add_key_binding(*); end
    def self.standard_configuration = new
  end

  class IOGate
    class << self
      # Easter-egg path only (the port guards it); answer the calls.
      def prep = nil
      def deprep(otio = nil); end
      def set_winch_handler(&block) = nil
      def winch_handler=(block); end
      def in_pasting? = false

      def winsize_fallback(default = [24, 80])
        size = %x{
          (function () {
            var p = Opal.platform;
            if (p.tty_winsize) { var w = p.tty_winsize(1); if (w && w[0] > 0 && w[1] > 0) return [w[0], w[1]]; }
            return nil;
          })()
        }
        return size unless size == nil
        rows = ENV['LINES']
        cols = ENV['COLUMNS']
        return [rows.to_i, cols.to_i] if rows && cols && rows.to_i > 0 && cols.to_i > 0
        default
      end
      alias winsize winsize_fallback

      def columns = winsize_fallback[1]
      def rows = winsize_fallback[0]

      def with_raw_mode
        if $stdin.tty?
          $stdin.raw { yield }
        else
          yield
        end
      end
      alias raw with_raw_mode

      def encoding = ::Encoding::UTF_8
      def default_scanner = nil
    end
  end

  # Width handling for the pager and the dialogs. East-Asian wide ranges
  # count 2, everything printable 1; escape_for_print makes control
  # characters visible rather than sending them to the terminal.
  module Unicode
    WIDE_RANGES = [
      [0x1100, 0x115F], [0x2E80, 0x303E], [0x3041, 0x33FF], [0x3400, 0x4DBF],
      [0x4E00, 0x9FFF], [0xA000, 0xA4CF], [0xAC00, 0xD7A3], [0xF900, 0xFAFF],
      [0xFE10, 0xFE6F], [0xFF00, 0xFF60], [0xFFE0, 0xFFE6],
      [0x20000, 0x2FFFD], [0x30000, 0x3FFFD]
    ].map { |lo, hi| [lo, hi].freeze }.freeze

    def self.char_width(codepoint)
      return 0 if codepoint < 0x20 || (codepoint >= 0x7F && codepoint < 0xA0)
      lo = 0
      hi = WIDE_RANGES.size - 1
      while lo <= hi
        mid = (lo + hi) >> 1
        if codepoint < WIDE_RANGES[mid][0]
          hi = mid - 1
        elsif codepoint > WIDE_RANGES[mid][1]
          lo = mid + 1
        else
          return 2
        end
      end
      1
    end

    def self.calculate_width(text, _embedded_blocking = false)
      width = 0
      text.each_codepoint { |cp| width += char_width(cp) }
      width
    end

    def self.escape_for_print(str)
      # (Opal: /[\x00-\x1f\x7f]/ rather than /\p{Cntrl}/ - the property class
      # does not survive the Regexp translation to JavaScript.)
      str.gsub(/[\x00-\x1f\x7f]/) do |c|
        case c
        when "\n", "\t" then c
        when "\e" then '^['
        else "^#{(c.ord + 64).chr}"
        end
      end
    end

    def self.split_by_width(target, width, offset = 0, limit = nil)
      lines = ['']
      col = offset
      target.each_char do |c|
        w = char_width(c.ord)
        if col + w > width
          lines << ''
          col = 0
        end
        lines[-1] += c
        col += w
      end
      [lines, nil, nil]
    end

    def self.calculate_width_by_index(index, *_) = index
  end

  class CursorPos
    attr_accessor :x, :y
    def initialize(x = 0, y = 0)
      @x = x
      @y = y
    end
  end

  class DialogRenderInfo
    attr_accessor :pos, :contents, :width, :bg_color, :fg_color
    def initialize(pos:, contents:, width:, bg_color: nil, fg_color: nil)
      @pos = pos
      @contents = contents
      @width = width
      @bg_color = bg_color
      @fg_color = fg_color
    end
  end

  HISTORY = History.new
end

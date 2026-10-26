# backtick_javascript: true
# Opal port: the staged Reline port, tier 1 - the API surface IRB v1.18
# actually calls, answered by a line-buffered reader over the IO objects IRB
# hands in (Reline.input / Reline.output). Line editing, history search,
# completion menus and the dialog system are NOT here yet; they arrive with
# the tier-2 port on the node tty primitives (platform.tty_raw/tty_winsize,
# IO#raw/getch/winsize in opal/io/console.rb). Until then reads work in
# cooked mode (the terminal echoes and edits the line itself), which covers
# piped input completely and interactive use without editing.
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
    def readline(prompt = '', add_to_history: true)
      io = input || $stdin
      out = output || $stdout
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

# frozen_string_literal: true

module Bundler
  module UI
    class Shell
      LEVELS = %w[silent error warn confirm info debug].freeze
      OUTPUT_STREAMS = [:stdout, :stderr].freeze

      attr_writer :shell
      attr_reader :output_stream

      # Opal: upstream paints this Shell through the vendored Thor
      # (bundler/vendor/thor), which the port does not vendor. It answers the
      # same surface over plain $stdout/$stderr: add_color never colors (the
      # corelib has no tty? probe, and coloring test output would be worse
      # than losing color), word_wrap runs at 80 columns, ask/yes?/no? read a
      # line from $stdin, and the per-thread log level collapses onto the
      # instance variable - the port runs cooperatively single-threaded.
      def initialize(options = {})
        @shell = nil
        @level = ENV["DEBUG"] ? "debug" : "info"
        @warning_history = []
        @output_stream = :stdout
      end

      def add_color(string, *color)
        string
      end

      def info(msg = nil, newline = nil)
        return unless info?

        tell_me(msg || yield, nil, newline)
      end

      def confirm(msg = nil, newline = nil)
        return unless confirm?

        tell_me(msg || yield, :green, newline)
      end

      def warn(msg = nil, newline = nil, color = :yellow)
        return unless warn?
        return if @warning_history.include? msg
        @warning_history << msg

        tell_err(msg || yield, color, newline)
      end

      def error(msg = nil, newline = nil, color = :red)
        return unless error?

        tell_err(msg || yield, color, newline)
      end

      def debug(msg = nil, newline = nil)
        return unless debug?

        tell_me(msg || yield, nil, newline)
      end

      def info?
        level("info")
      end

      def confirm?
        level("confirm")
      end

      def warn?
        level("warn")
      end

      def error?
        level("error")
      end

      def debug?
        level("debug")
      end

      def ask(msg, color = nil)
        msg += " " unless msg.end_with?(" ")
        $stdout.print(msg)
        $stdout.flush
        answer = $stdin.gets
        raise "#{msg}No input received" if answer.nil?
        answer.chomp
      end

      def yes?(msg, color = nil)
        ask("#{msg} (Y/N)").match?(/\A(y|yes|y)\z/i)
      end

      def no?(msg, color = nil)
        ask("#{msg} (Y/N)").match?(/\A(n|no|n)\z/i)
      end

      def level=(level)
        raise ArgumentError unless LEVELS.include?(level.to_s)
        @level = level.to_s
      end

      def level(name = nil)
        return @level unless name

        unless index = LEVELS.index(name)
          raise "#{name.inspect} is not a valid level"
        end
        index <= LEVELS.index(@level)
      end

      def output_stream=(symbol)
        raise ArgumentError unless OUTPUT_STREAMS.include?(symbol)
        @output_stream = symbol
      end

      def trace(e, newline = nil, force = false)
        return unless debug? || force
        msg = "#{e.class}: #{e.message}\n#{e.backtrace.join("\n  ")}"
        tell_err(msg, nil, newline)
      end

      def silence(&blk)
        with_level("silent", &blk)
      end

      def progress(&blk)
        with_output_stream(:stderr, &blk)
      end

      def unprinted_warnings
        []
      end

      private

      # valimism
      def tell_me(msg, color = nil, newline = nil)
        return tell_err(msg, color, newline) if output_stream == :stderr

        msg = word_wrap(msg) if newline.is_a?(Hash) && newline[:wrap]
        if newline.nil?
          say(msg)
        else
          say(msg, color, newline)
        end
      end

      # The stand-in for Thor's shell.say: print the message, adding the
      # newline unless it trails whitespace (Thor's own rule).
      def say(msg, color = nil, new_line = nil)
        msg = msg.to_s
        new_line = !msg.match?(/( |\t)\Z/) if new_line.nil?
        $stdout.print(msg)
        $stdout.print("\n") if new_line
      end

      def tell_err(message, color = nil, newline = nil)
        return if $stderr.closed?

        message = message.to_s
        newline = !message.match?(/( |\t)\Z/) if newline.nil?
        message = word_wrap(message) if newline.is_a?(Hash) && newline[:wrap]

        message += "\n" if newline && !message.end_with?("\n")

        $stderr.print(message)
        $stderr.flush
      end

      def strip_leading_spaces(text)
        spaces = text[/\A\s+/, 0]
        spaces ? text.gsub(/#{spaces}/, "") : text
      end

      def word_wrap(text, line_width = 80)
        strip_leading_spaces(text).split("\n").collect do |line|
          line.length > line_width ? line.gsub(/(.{1,#{line_width}})(\s+|$)/, "\\1\n").strip : line
        end * "\n"
      end

      def with_level(desired_level)
        old_level = @level
        @level = desired_level

        yield
      ensure
        @level = old_level
      end

      def with_output_stream(symbol)
        original = output_stream
        self.output_stream = symbol
        yield
      ensure
        @output_stream = original
      end
    end
  end
end

# backtick_javascript: true
# The `ruby` command: run Ruby scripts through Opal's compiler at runtime.
#
# tasks/ruby.mjs builds it into exe/ruby: a standalone Node.js program
# bundling the full corelib (opal), the parser and the compiler
# (opal-parser), the whole stdlib and the port's lib/ as requirable
# modules, and this script. It parses the common CRuby options, then
# loads, compiles and runs the given script in its own process, so the
# script shares this runtime: its requires answer from the bundle, and
# only files outside it - installed gems, -I paths, the current
# directory - are resolved against $LOAD_PATH at runtime.
#
# Unlike CRuby it can't support every option or platform feature: there are
# no threads or fibers, no native extensions, one string encoding, and only
# the options listed by -h are parsed.

require 'opal-parser'
require 'opal/exe/runtime_loader'

module RubyCommand
  # A command line problem: printed like CRuby does, with exit status 1.
  class OptionError < ::StandardError; end

  class << self
    def run
      @evals = []
      @requires = []
      @syntax_check = false
      @loop_mode = nil

      # The stdlib and the port's lib/ are compiled into the bundle as
      # requirable modules, so a script's require of them answers from the
      # module table before the loader below ever touches $LOAD_PATH; the
      # path list is only what -I extends plus the gems an activation puts
      # on it. (This replaced OPAL_HOME, the baked checkout path the
      # loader used to search for the stdlib sources - it made the
      # executables need the tree that built them.)

      RuntimeLoader.install_loader

      begin
        parse_options
      rescue OptionError => e
        $stderr.puts "ruby: #{e.message} (-h will show valid options)"
        exit 1
      end

      source, file = load_source

      if @syntax_check
        check_syntax(source, file)
        exit 0
      end

      @requires.each do |lib|
        begin
          require lib
        rescue ::LoadError => e
          $stderr.puts "ruby: #{e.message} (#{e.class})"
          exit 1
        end
      end

      run_script(source, file)
    end

    # Options are consumed from the front of ARGV; what remains, including
    # the script name, is the script's ARGV (the script name is taken by
    # load_source). Like CRuby, option parsing stops at the first argument,
    # at `--`, or at `-` (the script on stdin).
    def parse_options
      while !ARGV.empty?
        arg = ARGV[0]
        if arg == '--'
          ARGV.shift
          break
        elsif arg.start_with?('--')
          ARGV.shift
          case arg
          when '--version' then puts version_line; exit 0
          when '--help' then puts usage; exit 0
          # --enable/--disable (the usual one is --enable=frozen_string_literal,
          # which mspec's ruby_exe probes pass): accepted and no effect - Opal
          # string literals are already immutable.
          when /\A--(enable|disable)(=|\z)/ then nil
          else raise OptionError, "invalid option #{arg}"
          end
        elsif arg.start_with?('-') && arg.length > 1
          ARGV.shift
          i = 1
          while i < arg.length
            flag = arg[i]
            i += 1
            case flag
            when 'e' then @evals << option_value(arg, i, flag)
            when 'r' then @requires << option_value(arg, i, flag)
            when 'I' then $LOAD_PATH << option_value(arg, i, flag)
            when 'W' then set_warning_level(option_value(arg, i, flag))
            when 'h' then puts usage; exit 0
            when 'c' then @syntax_check = true
            when 'w' then $VERBOSE = true
            when 'v' then puts version_line; $VERBOSE = true
            when 'd' then $DEBUG = true
            when 'n' then @loop_mode = :n
            when 'p' then @loop_mode = :p
            when 'E' then option_value(arg, i, flag) # encodings: accepted, ignored
            when '0' then $/ = nil; i = arg.length # -0[OCTAL]: slurp mode
            else raise OptionError, "invalid option -#{flag}"
            end
            break if flag == 'e' || flag == 'r' || flag == 'I' || flag == 'W' || flag == 'E'
          end
        else
          break
        end
      end
    end

    # The value of a short option, attached (-Ilib) or in the next argument
    # (-I lib); returns it and consumes what it took from the cluster.
    def option_value(arg, i, flag)
      if i < arg.length
        arg[i..]
      else
        value = ARGV.shift
        raise OptionError, "missing argument for -#{flag}" if value.nil?
        value
      end
    end

    def set_warning_level(level)
      $VERBOSE = { '0' => nil, '1' => false, '2' => true }.fetch(level) do
        raise OptionError, "invalid warning level: #{level} (use 0, 1 or 2)"
      end
    end

    # The script: the -e sources, the named file, or stdin.
    def load_source
      if !@evals.empty?
        [@evals.join("\n"), '-e']
      elsif (path = ARGV[0]) && path != '-'
        ARGV.shift
        begin
          [File.read(path), path]
        rescue ::StandardError => e
          $stderr.puts "ruby: #{e.message} (#{e.class})"
          exit 1
        end
      elsif `process.stdin.isTTY`
        $stderr.puts "ruby: no script to run (use -e or a file, -h will show usage)"
        exit 1
      else
        [$stdin.read, '-']
      end
    end

    def check_syntax(source, file)
      Opal::Compiler.new(source, file: file).compile
      puts 'Syntax OK'
    rescue Opal::SyntaxError => e
      $stderr.puts "#{file}: #{e.message}"
      exit 1
    end

    # Compile the script as a program and queue it in this runtime: it runs
    # right after this method, in this process, sharing its globals; an
    # uncaught exception gets the runtime's CRuby-style report and status 1.
    # -n and -p wrap the source in an ARGF loop (its one extra line shifts
    # the script's reported line numbers by one).
    def run_script(source, file)
      source = wrap_loop(source) if @loop_mode
      begin
        js = RuntimeLoader.cached_compile(source, { file: file })
      rescue Opal::SyntaxError => e
        $stderr.puts "#{file}: #{e.message}"
        exit 1
      end
      `eval(js)`
    end

    def wrap_loop(source)
      body = @loop_mode == :p ? "#{source}\nprint $_\n" : source
      "while ($_ = ARGF.gets)\n#{body}\nend\n"
    end

    def version_line
      "#{RUBY_DESCRIPTION} [#{RUBY_PLATFORM}]"
    end

    def usage
      <<~TEXT
        Usage: ruby [options] [-e 'script' | script.rb | -] [arguments]

            -e 'script'                  Run the one-line script (several -e allowed)
            -c                           Check the syntax only, print "Syntax OK"
            -I DIR                       Add DIR to the front of the load path
            -r LIB                       Require LIB before running the script
            -w                           Enable warnings ($VERBOSE = true)
            -W LEVEL                     Warning level: 0 silent, 1 normal, 2 verbose
            -v                           Print the version, then run in verbose mode
            -d                           Enable debug mode ($DEBUG = true)
            -n                         Wrap the script in "while ($_ = ARGF.gets)"
            -p                         Like -n, but prints $_ after the script
            -0                           Read the input whole ($/ = nil)
            -E a:b                       Accepted and ignored (Opal has one encoding)
            --enable[=F] / --disable[=F] Accepted and ignored (Opal literals are immutable)
            -                            Read the script from standard input
            --                           Stop option processing
            -h, --help                   Show this message
            --version                    Print the version and exit

        This is Opal, not CRuby: no threads or fibers, no native extensions,
        and only the options above are supported.
      TEXT
    end
  end
end

RubyCommand.run

# backtick_javascript: true
# The `ruby` command: run Ruby scripts through Opal's compiler at runtime.
#
# tasks/ruby.mjs builds it into exe/ruby: a standalone Node.js program
# bundling the full corelib (opal), the parser and the compiler
# (opal-parser), and this script. It parses the common CRuby options, then
# loads, compiles and runs the given script in its own process, so the
# script shares this runtime: its requires are resolved at runtime against
# $LOAD_PATH (which -I extends and the stdlib directory joins), the stdlib
# directory and the current directory.
#
# Unlike CRuby it can't support every option or platform feature: there are
# no threads or fibers, no native extensions, one string encoding, and only
# the options listed by -h are parsed.

require 'opal-parser'

module RubyCommand
  # A command line problem: printed like CRuby does, with exit status 1.
  class OptionError < ::StandardError; end

  class << self
    def run
      @evals = []
      @requires = []
      @syntax_check = false
      @loop_mode = nil

      # The stdlib sources join the load path so that scripts can require
      # them at runtime; OPAL_HOME is set by tasks/ruby.mjs at build time.
      home = defined?(OPAL_HOME) ? OPAL_HOME : nil
      stdlib = home && File.join(home, 'stdlib')
      $LOAD_PATH << stdlib if stdlib && File.directory?(stdlib)

      install_loader

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

    # The loader of uncompiled features: Opal.require calls it when a path
    # isn't in the bundle. Search $LOAD_PATH for <path> or <path>.rb, then
    # compile it as a requirable module under the require path, and let
    # Opal.load_normalized run it.
    def install_loader
      %x{
        var $orig_load_file = Opal.platform.load_file;
        Opal.platform.load_file = function (path) {
          if (Opal.modules[path]) return;
          var file = #{find_feature(`path`)};
          if (file === nil) return $orig_load_file(path);
          #{compile_feature(`path`, `file`)}
        };
      }
    end

    # Search $LOAD_PATH, then the current directory. Opal.normalize drops
    # the leading "/" of absolute paths, which require_relative produces
    # when the script was given with an absolute path, so also try the
    # path rooted at /.
    def find_feature(path)
      candidates = $LOAD_PATH.flat_map { |dir| [File.join(dir, path), "#{File.join(dir, path)}.rb"] }
      candidates += [path, "#{path}.rb", "/#{path}", "/#{path}.rb"]
      candidates.find { |file| File.file?(file) }
    end

    def compile_feature(path, file)
      source = File.read(file)
      js = Opal::Compiler.new(source, file: path, requirable: true).compile
      `eval(js)`
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
        js = Opal::Compiler.new(source, file: file).compile
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

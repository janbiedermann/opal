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

      # The stdlib sources and the Opal entry points join the load path so
      # that scripts can require them at runtime; OPAL_HOME is set by
      # tasks/ruby.mjs at build time. <home>/opal holds opal/full.rb and the
      # corelib files the autoloads registered by the bundle point at, and
      # <home> itself is what makes `require 'opal/full'` resolve.
      home = defined?(OPAL_HOME) ? OPAL_HOME : nil
      if home
        [File.join(home, 'stdlib'), File.join(home, 'opal'), home].each do |dir|
          $LOAD_PATH << dir if File.directory?(dir)
        end
      end

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
    # isn't in the bundle. Search $LOAD_PATH for <path>, <path>.rb or
    # <path>.js, then compile it as a requirable module under the require
    # path, and let Opal.load_normalized run it.
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
    # path rooted at /. A .js file is a feature compiled ahead of time (a
    # precompiled gem, M7): it is loaded as it stands.
    def find_feature(path)
      candidates = $LOAD_PATH.flat_map do |dir|
        base = File.join(dir, path)
        [base, "#{base}.rb", "#{base}.js"]
      end
      candidates += [path, "#{path}.rb", "#{path}.js", "/#{path}", "/#{path}.rb", "/#{path}.js"]
      candidates.find { |file| File.file?(file) }
    end

    def compile_feature(path, file)
      if file.end_with?('.js')
        # String() in JavaScript, not Kernel#String: File.read returns a
        # boxed String object, and JS eval() returns a non-primitive
        # argument without evaluating it, a silent no-op.
        `eval(String(#{File.read(file)}))`
        # A .js is either a requirable module (a precompiled gem) that
        # registers its Opal.modules entry itself, or a plain JS library
        # that only has side effects (js-yaml-3-6-1.js). Opal.require runs
        # the module after load_file and raises LoadError when there is
        # none, so a side-effect-only file leaves an empty one behind.
        `if (!Opal.modules[path]) Opal.modules[path] = function () {};`
        return
      end
      js = cached_compile(File.read(file), { file: path, requirable: true })
      `eval(js)`
    end

    # The compiled-JS cache, the runtime twin of the builder's FileCache
    # (lib/opal/compiler/builder/cache.mjs): entries are keyed by the
    # source, the compile options and the compiler baked into this
    # executable (OPAL_COMPILER_KEY, set at build time by
    # tasks/ruby/bundle.mjs, since the compiler's files aren't on disk
    # here). OPAL_CACHE_DISABLE turns it off, OPAL_CACHE_DIR moves it.
    # The builder's own entries can't be shared: its key embeds the
    # options object and its files are named by a digest of the compiler
    # sources' mtimes, which don't exist inside this bundle.
    def cached_compile(source, options)
      return Opal::Compiler.new(source, options).compile if ENV['OPAL_CACHE_DISABLE']
      entry = cache_entry(source, options)
      begin
        # String(): File.read returns a boxed String object, and JS eval
        # returns non-primitive arguments without evaluating them
        cached = `String(#{File.read(entry)})`
        return cached unless cached.empty?
      rescue ::StandardError
        # no entry for this source yet
      end
      js = Opal::Compiler.new(source, options).compile
      begin
        # String(): Opal strings carry an encoding and can be boxed String
        # objects, which node's fs and crypto reject
        `require("fs").mkdirSync(String(#{File.dirname(entry)}), { recursive: true })`
        tmp = "#{entry}.#{`process.pid`}.tmp"
        File.write(tmp, js)
        File.rename(tmp, entry)
        evict_cache(File.dirname(entry))
      rescue ::StandardError
        # a read-only or vanished cache dir: run without caching
      end
      js
    end

    def cache_entry(source, options)
      dir = ENV['OPAL_CACHE_DIR'] ? File.join(ENV['OPAL_CACHE_DIR'], 'opal-ruby') : File.join(ENV['HOME'] || '', '.cache', 'opal-ruby')
      kind = options[:requirable] ? 'requirable' : 'program'
      key = `require("crypto").createHash("sha256").update(String(#{[source, options[:file].to_s, kind, compiler_key].join("\0")})).digest("base64url").slice(0, 32)`
      File.join(dir, "#{key}.js")
    end

    def compiler_key
      defined?(OPAL_COMPILER_KEY) ? OPAL_COMPILER_KEY : RUBY_ENGINE_VERSION
    end

    MAX_CACHE_BYTES = 32 * 1024 * 1024

    # Keeps the cache under MAX_CACHE_BYTES, dropping the oldest entries.
    def evict_cache(dir)
      entries = Dir.glob(File.join(dir, '*.js')).map { |f| [File.mtime(f).to_f, File.size(f), f] }
      total = entries.sum { |(_, size, _)| size }
      return if total <= MAX_CACHE_BYTES
      entries.sort!
      entries.each do |(_, size, file)|
        break if total <= MAX_CACHE_BYTES
        File.delete(file)
        total -= size
      end
    rescue ::StandardError
      # racing writers: eviction is best effort
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
        js = cached_compile(source, { file: file })
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

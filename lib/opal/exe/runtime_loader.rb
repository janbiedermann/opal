# backtick_javascript: true
# The loader of uncompiled features, shared by the exe bundles built by
# tasks/ruby.mjs and tasks/irb.mjs: Opal.require calls it when a path is
# not in the bundle. It searches $LOAD_PATH and the current directory,
# activates the installed gem that owns a miss, compiles the file with the
# compiler baked into the executable (cached under ~/.cache/opal-ruby,
# keyed by source, options and OPAL_COMPILER_KEY - see
# tasks/ruby/bundle.mjs), and runs it as a requirable module.
require 'opal-parser'

module RuntimeLoader
  class << self
    # The loader of uncompiled features: Opal.require calls it when a path
    # isn't in the bundle. Search $LOAD_PATH for <path>, <path>.rb or
    # <path>.js, then compile it as a requirable module under the require
    # path, and let Opal.load_normalized run it.
    def install_loader
      %x{
        Opal.platform.load_file = function (path) {
          if (Opal.modules[path]) return;
          var file = #{find_feature(`path`)};
          if (file === nil) { #{feature_not_found(`path`)}; return; }
          #{compile_feature(`path`, `file`)}
        };
      }
    end

    # Ruby promises a feature it cannot find is a LoadError, which is what a
    # caller rescues - and what tells a require to try a gem. The platform's
    # own loader only reads the path, so it fails with ENOENT instead.
    def feature_not_found(path)
      raise LoadError, "cannot load such file -- #{path}"
    end

    # Search $LOAD_PATH, then the current directory. Opal.normalize drops
    # the leading "/" of absolute paths, which require_relative produces
    # when the script was given with an absolute path, so also try the
    # path rooted at /. A .js file is a feature compiled ahead of time (a
    # precompiled gem, M7): it is loaded as it stands.
    def search_load_path(path)
      candidates = $LOAD_PATH.flat_map do |dir|
        base = File.join(dir, path)
        [base, "#{base}.rb", "#{base}.js"]
      end
      candidates += [path, "#{path}.rb", "#{path}.js", "/#{path}", "/#{path}.rb", "/#{path}.js"]
      candidates.find { |file| File.file?(file) }
    end

    # A feature that isn't on the load path may belong to an installed gem.
    # Activating the gem that owns it pushes its lib directories onto
    # $LOAD_PATH, which is where the search looks again. CRuby's RubyGems
    # hooks this in Kernel#require; here the loader above is the one place a
    # require can be intercepted, since Opal compiles `require` to a call of
    # the runtime rather than of Kernel#require.
    def find_feature(path)
      file = search_load_path(path)
      return file if file
      return nil unless defined?(Gem) && Gem.try_activate(path)
      search_load_path(path)
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
  end
end

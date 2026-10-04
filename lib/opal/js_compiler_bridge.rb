# frozen_string_literal: true

# Temporary bridge for POTCH.md phase 2: with OPAL_JS_COMPILER=1 the Ruby
# tooling (builder, CLI, rake test tasks) compiles with the JS compiler in
# lib/opal/compiler through a Node.js process
# (tasks/compiler/bridge_server.mjs). Removed together with the Ruby
# compiler in phase 5.

require 'json'
require 'open3'
require 'opal/compiler'
require 'opal/cache'
require 'opal/source_map'

module Opal
  module JsCompilerBridge
    SERVER = File.expand_path('../../tasks/compiler/bridge_server.mjs', __dir__)

    # A source map received from the JS compiler, as a regular
    # Opal::SourceMap::File (so cached compilers load without the bridge).
    def self.source_map(map, generated_code)
      source_map = ::Opal::SourceMap::File.allocate
      source_map.marshal_load([map.transform_keys(&:to_sym), generated_code])
      source_map
    end

    # Compilers from the JS compiler are cached apart from the Ruby
    # compiler's.
    module CacheKey
      def runtime_key
        "#{super}-js"
      end
    end
    ::Opal::Cache.singleton_class.prepend CacheKey

    @mutex = Mutex.new

    # One server per process: the builder compiles in forked workers, which
    # must not share the parent's pipes.
    def self.server
      if @server_pid != Process.pid
        stdin, stdout, = Open3.popen2('node', SERVER)
        at_exit { stdin.close unless stdin.closed? }
        @server = [stdin, stdout]
        @server_pid = Process.pid
      end
      @server
    end

    def self.compile(source, options)
      # The JS compiler works on JS strings: a source in another encoding
      # (`# encoding: iso-8859-9`) is converted to UTF-8 first, and raw bytes
      # that aren't valid UTF-8 (in binary sources) arrive as U+FFFD.
      encoding = ::Opal::Parser::SourceBuffer.recognize_encoding(source.b)
      if encoding && ![Encoding::UTF_8, Encoding::BINARY, Encoding::US_ASCII].include?(encoding)
        source = source.dup.force_encoding(encoding).encode(Encoding::UTF_8, invalid: :replace, undef: :replace)
      end
      source = source.dup.force_encoding(Encoding::UTF_8)
      source = source.scrub unless source.valid_encoding?

      @mutex.synchronize do
        stdin, stdout = server
        stdin.puts JSON.generate(source: source, options: options)
        stdin.flush
        JSON.parse(stdout.gets)
      end
    end

    # The options as the JS compiler takes them, with the rubyspec filters
    # when the mspec special calls are loaded.
    def self.js_options(compiler)
      options = compiler.instance_variable_get(:@options).to_h do |k, v|
        [k.to_s, v.is_a?(Symbol) ? v.to_s : v]
      end
      options.delete('cache_fragments')
      if defined?(::Opal::Rubyspec::FiltersRewriter) && ::Opal::Rewriter.list.include?(::Opal::Rubyspec::FiltersRewriter)
        options['rubyspec_filters'] = ::Opal::Rubyspec::FiltersRewriter.filters
        options['rubyspec_specials'] = true
      end
      options
    end

    module CompilerOverrides
      # rubocop:disable Naming/MemoizedInstanceVariableName
      def compile
        @result ||= begin
          result = JsCompilerBridge.compile(@source, JsCompilerBridge.js_options(self))
          result['warnings'].each { |w| warn w }
          if result['error']
            error = ::Opal::SyntaxError.new(result['error'])
            error.location = ::Opal::OpalBacktraceLocation.new(result['file'] || file, result['line'], result['source_line'])
            raise error
          end
          @requires = result['requires']
          @required_trees = result['required_trees']
          @autoloads = result['autoloads']
          @dynamic_cache_result = result['dynamic_cache_result']
          @source_map = JsCompilerBridge.source_map(result['source_map'], result['code'])
          result['code']
        end
      end
      # rubocop:enable Naming/MemoizedInstanceVariableName
      alias result compile

      def source_map
        compile
        @source_map
      end

      def fragments
        raise NotImplementedError, 'fragments are not available with OPAL_JS_COMPILER'
      end
    end

    ::Opal::Compiler.prepend CompilerOverrides
  end
end

# helpers: call, raise
# backtick_javascript: true

# Opal's compiler at runtime: Kernel#eval, Opal.compile, Opal.eval,
# require_remote and <script type="text/ruby"> tags. The compiler is the
# JavaScript one (lib/opal/compiler), linked into the program by the
# builder; Opal::Compiler wraps it with the Ruby compiler's API.

require 'opal/compiler/index.mjs'
require 'opal/version'

module Opal
  class Error < ::StandardError; end
  class CompilationError < Error; end

  class SyntaxError < ::SyntaxError
    attr_accessor :location
  end

  # Compiles Ruby source to JavaScript (the Ruby compiler's API).
  #
  #   compiler = Opal::Compiler.new("puts 1", file: 'x.rb', requirable: true)
  #   compiler.compile  # => JavaScript source
  #   compiler.requires # => ["..."]
  class Compiler
    # The JavaScript module (lib/opal/compiler/index.mjs).
    JS = `Opal.esm["opal/compiler/index"]`

    def self.module_name(path)
      `#{JS}.Compiler.moduleName(#{path})`
    end

    # Ruby options hash -> JS options object
    def self.js_options(options)
      %x{
        var js = {};
        #{options}.forEach(function(value, key) {
          if (value === nil || value == null) return;
          if (value.$$is_hash) value = #{js_options(`value`)};
          else if (value.$$is_string) value = value.valueOf();
          js[key] = value;
        });
        return js;
      }
    end

    def initialize(source, options = {})
      source = `#{::Opal.coerce_to!(source, ::String, :to_str)}.valueOf()`
      @source = source
      @options = options
      js_compiler, js_options = `#{JS}.Compiler`, Compiler.js_options(options)
      # compile-time warnings go to Kernel#warn, as with the Ruby compiler
      `js_options.warning = function(text) { #{::Kernel.warn(`text`)} }`
      @js = `new js_compiler(source, js_options)`
    end

    attr_reader :source, :options

    # rubocop:disable Naming/MemoizedInstanceVariableName
    def compile
      @result ||= begin
        js = @js
        %x{
          try {
            return #{js}.compile();
          } catch (e) {
            if (e.name === "OpalSyntaxError") {
              var error = #{::Opal::SyntaxError.new(`e.message`)};
              error.$location = e.location;
              throw error;
            }
            throw e;
          }
        }
      end
    end
    # rubocop:enable Naming/MemoizedInstanceVariableName

    alias result compile

    def requires
      `#{@js}.requires`
    end

    def required_trees
      `#{@js}.requiredTrees`
    end

    def autoloads
      `#{@js}.autoloads`
    end

    def source_map
      compile
      SourceMap.new(`#{@js}.sourceMap`)
    end

    # The source map of a compiled file.
    class SourceMap
      def initialize(js)
        @js = js
      end

      def to_h
        `Opal.hash(#{@js}.map())`
      end

      def to_json(*)
        `JSON.stringify(#{@js}.map())`
      end

      def to_data_uri_comment
        `#{@js}.toDataUriComment()`
      end
    end
  end

  def self.compile(source, options = {})
    Compiler.new(source, options).compile
  end

  singleton_class.alias_method :opal_compile, :compile

  # Templates at runtime: .opalerb (compile) and Ruby ERB (render)
  module ERB
    def self.compile(source, file_name = '(erb)')
      Compiler.new(source, file_name).compile
    end

    # Renders a Ruby ERB template (<%= %>, <% %>, <%# %>) in this runtime;
    # the template's code sees no local variables of the caller.
    #
    #   Opal::ERB.render("1 + 1 = <%= 1 + 1 %>") # => "1 + 1 = 2"
    def self.render(source, file_name = '(erb)')
      source = ::Opal.coerce_to!(source, ::String, :to_str)
      %x{
        var js = Opal.esm["opal/compiler/index"];
        try {
          return js.renderErb(source.valueOf(), { file: file_name, run: js.opalErbRunner(Opal) });
        } catch (e) {
          if (e.name === "OpalSyntaxError") #{::Kernel.raise ::SyntaxError, `e.message`};
          throw e;
        }
      }
    end

    class Compiler
      def initialize(source, file_name = '(erb)')
        @source, @file_name = source, file_name
      end

      def prepared_source
        @prepared_source ||= `Opal.esm["opal/compiler/index"].prepareErb(#{@source}, #{@file_name})`
      end

      def compile
        ::Opal.compile prepared_source
      end
    end
  end
end

module Kernel
  def eval(str, binding = nil, file = nil, line = nil)
    str = `Opal.coerce_to_or_raise(#{str}, Opal.String, "to_str")`
    default_eval_options = { file: file || '(eval)', eval: true }
    compiling_options = __OPAL_COMPILER_CONFIG__.merge(default_eval_options)
    # the code can use and assign the binding's local variables
    compiling_options[:scope_variables] = binding.local_variables.map(&:to_s) if binding
    compiler = Opal::Compiler.new(str, compiling_options)
    code = compiler.compile
    code += compiler.source_map.to_data_uri_comment unless compiling_options[:no_source_map]
    if binding
      binding.js_eval(`code.toString()`)
    else
      %x{
        return (function(self) {
          return eval(code.toString());
        })(self)
      }
    end
  end

  def require_remote(url)
    %x{
      var r = new XMLHttpRequest();
      r.open("GET", url, false);
      r.send('');
    }
    eval `r.responseText`
  end
end

%x{
  Opal.compile = function(str, options) {
    try {
      str = Opal.coerce_to_or_raise(str, Opal.String, "to_str");
      if (options) options = Opal.hash(options);
      return Opal.$opal_compile(str, options);
    }
    catch (e) {
      if (e.$$class === Opal.Opal.SyntaxError) {
        var err = Opal.SyntaxError.$new(e.message);
        err.$set_backtrace(e.$backtrace());
        throw(err);
      }
      else { throw e; }
    }
  };

  Opal['eval'] = function(str, options) {
    if (!options) { options = new Map(); }
    options.set('eval', true);
    return eval(Opal.compile(str, options));
  };

  function run_ruby_scripts() {
    var tag, tags = document.getElementsByTagName('script');

    for (var i = 0, len = tags.length; i < len; i++) {
      tag = tags[i];
      if (tag.type === "text/ruby") {
        if (tag.src)       Opal.Kernel.$require_remote(tag.src);
        if (tag.innerHTML) Opal.Kernel.$eval(tag.innerHTML);
      }
    }
  }

  if (typeof(document) !== 'undefined') {
    if (window.addEventListener) {
      window.addEventListener('DOMContentLoaded', run_ruby_scripts, false);
    }
    else {
      window.attachEvent('onload', run_ruby_scripts);
    }
  }
}

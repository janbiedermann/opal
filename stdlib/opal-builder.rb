# backtick_javascript: true

# Opal's builder at runtime (Node.js only): Opal::Builder wraps the
# JavaScript builder (lib/opal/compiler/builder), linked into the program.
#
#   builder = Opal::Builder.new
#   builder.append_paths('lib')
#   builder.build('app')
#   builder.to_s # => JavaScript source

require 'opal-parser'
require 'opal/compiler/builder/builder.mjs'

module Opal
  class Builder
    JS = `Opal.esm["opal/compiler/builder/builder"]`

    def self.build(*args, &block)
      new.build(*args, &block).to_s
    end

    def initialize(stubs: [], compiler_options: {}, missing_require_severity: :error)
      js_builder = `#{JS}.Builder`
      js_options = `{
        stubs: #{stubs},
        compilerOptions: #{::Opal::Compiler.js_options(compiler_options)},
        missingRequireSeverity: #{missing_require_severity}
      }`
      @js = `new js_builder(js_options)`
    end

    def append_paths(*paths)
      `#{@js}.appendPaths(...#{paths})`
      nil
    end

    def build(path, options = {})
      `#{@js}.build(#{path}, #{::Opal::Compiler.js_options(options)})`
      self
    end

    def build_str(source, rel_path, options = {})
      `#{@js}.buildStr(#{source}, #{rel_path}, #{::Opal::Compiler.js_options(options)})`
      self
    end

    def build_require(path, options = {})
      `#{@js}.buildRequire(#{path}, #{::Opal::Compiler.js_options(options)})`
      self
    end

    def to_s
      `#{@js}.toString()`
    end

    def compiled_source(with_source_map: true)
      `#{@js}.compiledSource({ withSourceMap: #{with_source_map} })`
    end

    def output_extension
      `#{@js}.outputExtension`
    end
  end
end

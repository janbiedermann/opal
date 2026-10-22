# frozen_string_literal: true

require_relative "../rubygems"
require "digest"
require "fileutils"

# Opal: this is D7's compiled tree, which has no upstream counterpart - CRuby
# has no compiler to run ahead of time. A gem's Ruby sources are compiled once,
# by the program that installs them, into
#
#   <gem_dir>/compiled/<full_name>/<digest>/<require_path>/x.js
#
# and a gem activated after that is searched from that tree first, so a require
# meets a `.js` the loader only has to eval. The <digest> names the sources the
# output came from and the compiler that read them, which is what keeps stale
# output from being picked up: after the sources change, or in a bundle whose
# compiler is a different build, the directory this asks for simply is not
# there. One digest directory survives per gem, for compile removes the others.
module Gem::CompiledTree
  DIR = "compiled" # :nodoc:

  module_function

  ##
  # The name of the compiled output for +spec+: the sources it was made from,
  # and the compiler that read them.

  def digest(spec)
    hash = Digest::SHA256.new
    hash.update(compiler_key)

    sources(spec).each do |file, logical|
      hash.update(logical)
      hash.update(File.read(file))
    end

    hash.hexdigest[0, 16]
  end

  ##
  # [source path, path required] pairs for everything under the gem's require
  # paths, in a stable order, so the same sources answer the same digest.

  def sources(spec)
    list = []

    spec.raw_require_paths.each do |require_path|
      base = File.join(spec.full_gem_path, require_path)
      Dir.glob(File.join(base, "**", "*.rb")).sort.each do |file|
        list << [file, file[base.length + 1..-1]]
      end
    end

    list
  end

  ##
  # The directory +spec+'s compiled output lives in, or nil when it has none
  # that this gem and this compiler made.

  def dir(spec)
    base = compiled_base(spec)
    return nil unless File.directory?(base)

    wanted = File.join(base, digest(spec))
    File.directory?(wanted) ? wanted : nil
  end

  ##
  # Which compiler read the sources. A bundle that carries one is stamped with
  # OPAL_COMPILER_KEY by tasks/ruby/bundle.mjs and tasks/gem/bundle.mjs, whose
  # digest changes with the compiler's files; elsewhere the engine version
  # stands in, which is what exe/ruby's own compile cache falls back to.

  def compiler_key
    defined?(OPAL_COMPILER_KEY) ? OPAL_COMPILER_KEY : RUBY_ENGINE_VERSION
  end

  ##
  # Compiles each of +spec+'s requirable sources and writes it under its digest
  # directory, keeping the logical require path. Answers [files written,
  # failures] where a failure is [path required, error]: a source this compiler
  # cannot read leaves its `.rb` to answer the require, which is what was true
  # before compiling was an option.

  def compile(spec)
    target = File.join(compiled_base(spec), digest(spec))
    written = 0
    failed = []

    sources(spec).each do |file, logical|
      out = File.join(target, logical[0..-4] + ".js")

      begin
        js = Opal::Compiler.new(File.read(file), file: logical, requirable: true).compile
      rescue ::StandardError, ::SyntaxError => e
        failed << [logical, e]
        next
      end

      FileUtils.mkdir_p File.dirname(out)
      File.write(out, js)
      written += 1
    end

    clear_other(spec, target)

    [written, failed]
  end

  ##
  # Drops the compiled directories of this gem that the compile just done does
  # not answer for: sources that have changed since, or a different compiler.

  def clear_other(spec, keep)
    base = compiled_base(spec)
    return unless File.directory?(base)

    Dir.glob(File.join(base, "*")).each do |entry|
      FileUtils.rm_rf(entry) if entry != keep
    end
  end

  def compiled_base(spec) # :nodoc:
    File.join(spec.gem_dir, DIR, spec.full_name)
  end
end

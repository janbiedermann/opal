# frozen_string_literal: true

require_relative "../command"
require_relative "../compiled_tree"
require_relative "../version_option"

# Opal only, with no upstream counterpart: CRuby has no ahead-of-time
# compiler. This command writes the requirable Ruby files of an installed
# gem as JavaScript under the tree Gem::CompiledTree describes, and the gem
# is loaded from there afterwards - see that file for the layout and for
# what the digest in it is for.
class Gem::Commands::CompileCommand < Gem::Command
  include Gem::VersionOption

  def initialize
    super "compile", "Compile an installed gem's Ruby files to JavaScript"

    add_version_option "compile"

    add_option("--all", "Compile every installed gem") do |value, options|
      options[:all] = value
    end
  end

  def arguments # :nodoc:
    "GEMNAME       name of installed gem to compile"
  end

  def description # :nodoc:
    <<-EOF
Opal only: there is nothing like this command in upstream RubyGems.

It compiles the requirable Ruby files of an installed gem into JavaScript,
under <gem_dir>/compiled/<full_name>/<digest>/, keeping the paths required.
An activated gem is then searched from that tree first, so a require meets a
.js the loader only has to evaluate - no parser, no compiler, on its way.

The <digest> is built from the gem's sources and the compiler that read them,
so output that no longer matches - a gem edited on disk since, or compiled by
another build of Opal - is never picked up. Each compile also removes the
other compiled directories of the gems it compiles, so one survives per gem.

A file the compiler cannot read is reported, named, and left out; its .rb
stays to answer that require, as it did before compiling was an option.
    EOF
  end

  def execute
    # The compiler is not at the boot of this bundle (a run that never reads
    # a gemspec or compiles a gem should not pay for it), so take it here -
    # the same require Specification.load makes to read a .gemspec.
    require "opal-parser"

    specs =
      if options[:all]
        Gem::Specification.to_a
      else
        get_all_gem_names.flat_map do |name|
          found = Gem::Specification.find_all_by_name name, options[:version]
          if found.empty?
            alert_error "Can't compile gem '#{name}', probably not installed?"
            terminate_interaction 1
          end

          found
        end
      end

    failures = 0

    specs.each do |spec|
      say "Compiling #{spec.full_name}..."

      written, failed = Gem::CompiledTree.compile(spec)

      failed.each do |logical, e|
        say "  cannot compile #{logical}: #{e.class}: #{e.message}"
      end

      say "  #{written} #{written == 1 ? "file" : "files"} compiled"
      failures += failed.length
    end

    if failures > 0
      alert_error "#{failures} #{failures == 1 ? "file" : "files"} could not be compiled"
      terminate_interaction 1
    end
  end
end

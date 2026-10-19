# frozen_string_literal: true

# The exception classes of RubyGems, trimmed to the ones the ported code
# reaches. The upstream file also carries the spell-checking of unknown
# commands and the PubGrub failure wrapper; they come with the command line
# and the resolver.
#
# The activation and lookup failures (Gem::LoadError, MissingSpecError,
# ConflictError) and the error reasons a source answers with live in
# rubygems/errors.rb, as upstream has them: they hang off ::LoadError rather
# than off Gem::Exception, so that the scripts rescuing them see the same
# hierarchy as in CRuby.

# Base exception class of RubyGems. Every exception the ported code raises
# under this one, the load errors of rubygems/errors.rb excepted.

#--
# Workaround for directly loading a Gem:: class before the Gem module exists
module Gem; end
#++

class Gem::Exception < RuntimeError; end

class Gem::CommandLineError < Gem::Exception; end

class Gem::DependencyError < Gem::Exception; end

class Gem::DependencyRemovalException < Gem::Exception; end

class Gem::GemNotInHomeException < Gem::Exception
  attr_accessor :spec

  def initialize(options)
    @spec = options[:spec]

    super("Gem '#{@spec.full_name}' is not installed in directory #{options[:home_dir]}")
  end
end

class Gem::UninstallError < Gem::Exception
  attr_accessor :gem, :explanation

  def initialize(gem, explanation)
    super(explanation)
    @gem = gem
    @explanation = explanation
  end
end

class Gem::DocumentError < Gem::Exception; end

class Gem::EndOfYAMLException < Gem::Exception; end

class Gem::FilePermissionError < Gem::Exception
  attr_reader :directory

  def initialize(directory)
    @directory = directory
    super "You don't have write permissions and the #{@directory} directory " \
      "does not exist, maybe you need to sudo?"
  end
end

class Gem::FormatException < Gem::Exception
  attr_accessor :file_path, :version_line

  def initialize(options)
    @file_path = options[:path]
    @version_line = options[:version_line]

    super "#{@file_path} has a version field I cannot read. (#{options[:line_number]}: #{@version_line})"
  end
end

class Gem::GemNotFoundException < Gem::Exception; end

class Gem::SpecificGemNotFoundException < Gem::GemNotFoundException
  attr_reader :name, :version_requirements

  def initialize(name, version_requirements, existing = nil)
    super format("Could not find gems matching '%s' valid for all platform(s) "\
                 "matching platforms %s.\nSearch gems:\n* %s",
      name,
      Gem.platforms.inspect,
      existing && !existing.empty? ? existing.map { |s| "* #{s.full_name}" }.join("\n  ") : "(none)")

    @name = name
    @version_requirements = version_requirements
  end
end

class Gem::InstallError < Gem::Exception; end

class Gem::RuntimeRequirementNotMetError < Gem::InstallError; end

class Gem::InvalidSpecificationException < Gem::Exception; end

class Gem::OperationNotSupportedError < Gem::Exception; end

class Gem::RemoteError < Gem::Exception; end

class Gem::RemoteInstallationCancelled < Gem::Exception; end

class Gem::RemoteInstallationSkipped < Gem::Exception; end

class Gem::RemoteSourceException < Gem::Exception; end

class Gem::RubyVersionMismatch < Gem::Exception; end

class Gem::VerificationError < Gem::Exception; end

class Gem::SystemExitException < SystemExit
  attr_reader :exit_code

  def initialize(exit_code)
    super
    @exit_code = exit_code
  end
end

class Gem::UnsatisfiableDependencyError < Gem::DependencyError
  attr_reader :original

  def initialize(dependency, original = nil)
    search = nil
    if dependency.type == :development
      search = " (all user-installed gems, plus development dependencies of those gems)"
    elsif dependency.type == :runtime
      search = " (only runtime dependencies)"
    end

    msg = "Error installing gem #{dependency}#{search}: "

    msg += if original
      "original error: #{original.message}"
    else
      "no matching gem"
    end

    super msg
    @original = original
  end

  def dependency
    @dependency
  end
end

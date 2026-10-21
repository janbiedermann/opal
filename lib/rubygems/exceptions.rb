# frozen_string_literal: true

# The exception classes of RubyGems, trimmed to the ones the ported code
# reaches. The upstream file also attaches DidYouMean's spell-checking to the
# unknown-command failure below; there is no DidYouMean here, so that one says
# what is missing and nothing more.
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

##
# Raised by Gem::CommandManager when the name on the command line is not a
# command it registered.

class Gem::UnknownCommandError < Gem::Exception
  attr_reader :unknown_command

  def initialize(unknown_command)
    @unknown_command = unknown_command
    super("Unknown command #{unknown_command}")
  end
end

class Gem::DependencyError < Gem::Exception; end

class Gem::DependencyRemovalException < Gem::Exception; end

##
# Raised by Gem::Resolver when dependency resolution fails.

class Gem::DependencyResolutionError < Gem::DependencyError
  def initialize(conflict)
    @explanation = conflict.explanation
    super @explanation
  end

  def explanation
    @explanation
  end

  def conflict
    nil
  end

  def conflicting_dependencies
    []
  end
end

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
  ##
  # The unsatisfiable dependency.  This is a
  # Gem::Resolver::DependencyRequest, not a Gem::Dependency

  attr_reader :dependency

  ##
  # Errors encountered which may have contributed to this exception

  attr_accessor :errors

  ##
  # Creates a new UnsatisfiableDependencyError for the unsatisfiable
  # Gem::Resolver::DependencyRequest +dep+

  def initialize(dep, platform_mismatch = nil)
    if platform_mismatch && !platform_mismatch.empty?
      plats = platform_mismatch.map {|x| x.platform.to_s }.sort.uniq
      super "Unable to resolve dependency: No match for '#{dep}' on this platform. Found: #{plats.join(", ")}"
    else
      if dep.explicit?
        super "Unable to resolve dependency: user requested '#{dep}'"
      else
        super "Unable to resolve dependency: '#{dep.request_context}' requires '#{dep}'"
      end
    end

    @dependency = dep
    @errors     = []
  end

  ##
  # The name of the unresolved dependency

  def name
    @dependency.name
  end

  ##
  # The Requirement of the unresolved dependency (not Version).

  def version
    @dependency.requirement
  end
end

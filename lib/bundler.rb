# frozen_string_literal: true

# Opal: the port's entry point to Bundler. Upstream reaches for a host
# RubyGems wrapper (rubygems_ext), FileUtils, Pathname autoloads, an
# EnvironmentPreserver for the ORIGINAL_ENV constant and the plugin system
# here; the port keeps the requires it has (no plugin system, no environment
# preserving until M8.3's exec) and requires everything eagerly - an
# autoload would leave the constant outside a compiled bundle.
require "rubygems"
require "pathname"

require_relative "bundler/version"
require_relative "bundler/errors"
require_relative "bundler/rubygems_ext"
require_relative "bundler/constants"
require_relative "bundler/current_ruby"
require_relative "bundler/match_platform"
require_relative "bundler/match_metadata"
require_relative "bundler/match_remote_metadata"
require_relative "bundler/override"
require_relative "bundler/shared_helpers"
require_relative "bundler/dependency"
require_relative "bundler/index"
require_relative "bundler/lazy_specification"
require_relative "bundler/remote_specification"
require_relative "bundler/stub_specification"
require_relative "bundler/endpoint_specification"
require_relative "bundler/materialization"
require_relative "bundler/spec_set"

# Bundler provides a consistent environment for Ruby projects by
# tracking and installing the exact gems and versions that are needed.
#
# Bundler is a part of Ruby's standard library.
#
# Bundler is used by creating _gemfiles_ listing all the project dependencies
# and (optionally) their versions and then using
#
#   require 'bundler/setup'
#
# or Bundler.setup to setup environment where only specified gems and their
# specified versions could be used.
#
# See {Bundler documentation}[https://guides.rubygems.org/command-reference/bundle/] for extensive
# documentation on gemfiles creation and Bundler usage.
#
# As a standard library inside project, Bundler could be used for introspection
# of loaded and required modules.
#
module Bundler
  class << self
    # Opal: upstream's `local_platform` first obeys settings'
    # :force_ruby_platform; settings arrives with M8.2 and the guard comes
    # back with it. Nothing else to ask here: the port's platform is the
    # plain "ruby" one (see Gem::Platform.local).
    def local_platform
      Gem::Platform.local
    end

    def generic_local_platform
      Gem::Platform.generic(local_platform)
    end

    def root
      @root ||= begin
                  SharedHelpers.root
                rescue GemfileNotFound
                  bundle_dir = default_bundle_dir
                  raise GemfileNotFound, "Could not locate Gemfile or .bundle/ directory" unless bundle_dir
                  Pathname.new(File.expand_path("..", bundle_dir))
                end
    end

    def default_gemfile
      SharedHelpers.default_gemfile
    end

    def default_lockfile
      SharedHelpers.default_lockfile
    end

    def default_bundle_dir
      SharedHelpers.default_bundle_dir
    end

    # Opal: bundle_path, specs_path, user_home, configure, ui and the reset
    # family wait for M8.2, where settings and the bundle directory become
    # live code.
  end
end

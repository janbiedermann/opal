# frozen_string_literal: true

module Bundler
  # Opal: upstream pins VERSION to the released version (shared with
  # RubyGems' GEM_VERSION in released trees); the port keeps it tied to the
  # ported RubyGems' version, the way the two have always shipped in step.
  VERSION = Gem::VERSION

  def self.bundler_major_version
    @bundler_major_version ||= gem_version.segments.first
  end

  def self.gem_version
    @gem_version ||= Gem::Version.create(VERSION)
  end

  def self.verbose_version
    @verbose_version ||= "#{VERSION}#{simulated_version ? " (simulating Bundler #{simulated_version})" : ""}"
  end

  def self.simulated_version
    @simulated_version ||= Bundler.settings[:simulate_version]
  end
end

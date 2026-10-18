# frozen_string_literal: true

# Opal's RubyGems: the part of RubyGems that installs, finds and activates
# gems, without the parts a JavaScript runtime cannot do.
#
# The layout, the names and the data formats are upstream's - see
# lib/rubygems/ for the ported files - so a gem built by CRuby installs and
# loads here, and a gemspec written for CRuby reads here. What is left out:
#
# * native extensions: there is no compiler, so Gem::Platform.local is the
#   plain "ruby" platform and a gem with extensions refuses to install.
# * signatures, certificates, MFA and the trust policy.
# * plugins and the `gem pristine`, `gem server`, `gem query` machinery.
# * threads: the download and install pools are sequential, and the
#   in-process locks are gone (see GEMS.md, decision D13). Cross-process
#   locking, which separate gem commands do need, is in Gem.open_file_with_lock.

require_relative "rubygems/exceptions"
require_relative "rubygems/defaults"
require_relative "rubygems/path_support"
require_relative "rubygems/config_file"
require_relative "rubygems/platform"
require_relative "rubygems/version"
require_relative "rubygems/requirement"
require_relative "rubygems/dependency"
require_relative "rubygems/name_tuple"
require_relative "rubygems/yaml_serializer"
require_relative "rubygems/safe_yaml"

module Gem
  # The version of the RubyGems behaviour implemented here, so a gemspec or a
  # message can report one; the `.opal` suffix says which implementation ran.
  VERSION = "4.1.0.opal"

  ##
  # The default remote source URI.

  def self.default_source
    "https://rubygems.org/"
  end

  def self.default_hosts
    ["https://rubygems.org"]
  end

  def self.default_host
    "https://rubygems.org"
  end

  ##
  # The user agent a fetch reports.

  def self.user_agent
    @user_agent ||= "RubyGems/#{VERSION} opal/#{Opal::VERSION} (Node.js #{RUBY_PLATFORM}) Gem/" +
      "#{$LOAD_PATH.size || 0} Rubygems/#{VERSION}"
  end

  ##
  # Whether the Psych YAML library is around to parse a gemspec with: it is
  # not, so the ported YAMLSerializer does the job. (YAMLSerializer defines a
  # Psych module for its error classes, so `defined?(Psych)` cannot answer
  # this.)

  def self.use_psych?
    false
  end

  ##
  # The configuration: the .gemrc file, the environment and the common options.

  def self.configuration
    @configuration ||= ConfigFile.new([])
  end

  def self.configuration=(config)
    @configuration = config
  end

  ##
  # The path support object: GEM_HOME, GEM_PATH and the spec cache.

  def self.paths
    @paths ||= PathSupport.new(ENV)
  end

  def self.paths=(paths)
    defaults_clear
    @paths = paths
  end

  ##
  # Clears the memoized paths and defaults, for the tests and for a command
  # that changed GEM_HOME.

  def self.defaults_clear
    @default_dir = nil
    @default_spec_cache_dir = nil
    @default_sources = nil
    @config_home = nil
    @config_file = nil
    @data_home = nil
    @cache_home = nil
    @state_home = nil
    @state_file = nil
    @user_home = nil
  end

  def self.clear_paths
    @paths = nil
    defaults_clear
  end

  ##
  # The directory gems are installed to and searched in.

  def self.dir
    paths.home
  end

  def self.path
    paths.path
  end

  def self.gems_dir
    File.join dir, "gems"
  end

  def self.spec_cache_dir
    paths.spec_cache_dir
  end

  ##
  # The index in $LOAD_PATH where the paths of the activated gems go.

  def self.load_path_insert_index
    $LOAD_PATH.each_index do |i|
      return i if $LOAD_PATH[i] =~ /\/rubygems\/$/ || $LOAD_PATH[i].to_s.end_with?("/rubygems")
    end
    nil
  end

  ##
  # The platforms a gem may match this system on. `--platform` and the
  # RUBY_PLATFORM of the runtime extend it; a "ruby" gem always matches.

  def self.platforms
    @platforms ||= [Platform::RUBY, Platform.local]
  end

  def self.platforms=(platforms)
    @platforms = platforms
  end

  ##
  # The specs of the gems that are loaded, by name.

  def self.loaded_specs
    @loaded_specs ||= {}
  end

  ##
  # Yields each installed spec, in the order the directories give them.

  def self.all
    Specification.all
  end

  def self.refresh
    Specification.reset
  end
end

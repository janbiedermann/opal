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

# The constants the ported files read while they are being defined, so they
# come before the requires.
module Gem
  # The version of the RubyGems behaviour implemented here, so a gemspec or a
  # message can report one; the `.opal` suffix says which implementation ran.
  VERSION = "4.1.0.opal"
end

require_relative "rubygems/exceptions"
require_relative "rubygems/win_platform"
require_relative "rubygems/user_interaction"
require_relative "rubygems/defaults"
require_relative "rubygems/path_support"
require_relative "rubygems/config_file"
require_relative "rubygems/platform"
require_relative "rubygems/version"
require_relative "rubygems/requirement"
require_relative "rubygems/dependency"
require_relative "rubygems/name_tuple"
require_relative "rubygems/content_address"
require_relative "rubygems/yaml_serializer"
require_relative "rubygems/safe_yaml"
require_relative "rubygems/text"
require_relative "rubygems/basic_specification"
require_relative "rubygems/stub_specification"
require_relative "rubygems/specification_record"
require_relative "rubygems/specification"
require_relative "rubygems/specification_policy"
require_relative "rubygems/security"
require_relative "rubygems/package"

module Gem
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

  ##
  # The hooks a gem may wrap around Specification.reset, as upstream does.

  def self.pre_reset_hooks
    @pre_reset_hooks ||= []
  end

  def self.post_reset_hooks
    @post_reset_hooks ||= []
  end

  ##
  # Opal has no default gems installed next to the runtime.

  def self.register_default_spec(spec)
    loaded_specs[spec.name] ||= spec
  end

  ##
  # The suffixes a requirable file may have. There is no compiled extension
  # here, so it is Ruby plus the JavaScript files the loader understands.

  def self.suffixes
    @suffixes ||= ["", ".rb", ".js"].uniq
  end

  def self.dynamic_library_suffixes
    @dynamic_library_suffixes ||= []
  end

  def self.suffix_pattern
    @suffix_pattern ||= Regexp.union suffixes
  end

  def self.plugin_suffix_pattern
    @plugin_suffix_pattern ||= "_plugin#{suffix_pattern}"
  end

  ##
  # Where a file was called from, for the warnings a gemspec gets.

  def self.location_of_caller(depth = 1)
    caller[depth] =~ /(.*?):(\d+).*?$/i
    file = Regexp.last_match(1)
    lineno = Regexp.last_match(2).to_i

    [file, lineno]
  end

  ##
  # Reproducible builds: the date a gem should claim, from SOURCE_DATE_EPOCH,
  # and the epoch RubyGems falls back to.

  DEFAULT_SOURCE_DATE_EPOCH = 946_713_600 # 2000-01-01 00:00:00 +0000

  def self.source_date_epoch_string
    specified_epoch = ENV["SOURCE_DATE_EPOCH"]

    # If it's empty or just whitespace, treat it like it wasn't set at all.
    specified_epoch = nil if !specified_epoch.nil? && specified_epoch.strip.empty?

    epoch = specified_epoch || DEFAULT_SOURCE_DATE_EPOCH.to_s

    epoch.strip
  end

  def self.source_date_epoch
    require "time"
    Time.at(source_date_epoch_string.to_i)
  end

  ##
  # A requirement read from GEM_REQUIREMENT_NAME, which lets a deployment
  # pin a gem without touching the Gemfile.

  def self.env_requirement(gem_name)
    @env_requirements_by_name ||= {}
    @env_requirements_by_name[gem_name] ||= begin
      req = ENV["GEM_REQUIREMENT_#{gem_name.upcase}"] || ">= 0"
      Gem::Requirement.create req
    end
  end

  ##
  # The ABI a gem's binary extensions would need: there are none, so the
  # version of the language is the only thing to say.

  def self.ruby_abi
    ruby_version.segments.first(2).join(".")
  end

  def self.ruby_api_version
    ruby_version.segments.first(2).join(".")
  end

  def self.extension_api_version # :nodoc:
    ruby_api_version
  end

  ##
  # Opens a file the way the ported code asks, without the lock: two gem
  # commands running at once are kept apart by Gem.open_file_with_lock.

  def self.open_file(path, flags, &block)
    File.open path, flags, &block
  end

  ##
  # The YAML reader the ported code uses. It is loaded with rubygems itself,
  # so this only answers the question upstream asks it.

  def self.load_yaml
    true
  end

  ##
  # The paths of an activated gem go after -I and the load path of the run,
  # which is where upstream puts them.

  def self.add_to_load_path(*paths)
    index = load_path_insert_index
    if index
      $LOAD_PATH.insert index, *paths
    else
      $LOAD_PATH.concat paths
    end
    paths
  end

  ##
  # The spec a name resolves to among the loaded ones.

  def self.activated_spec(name)
    loaded_specs[name.to_s]
  end
end

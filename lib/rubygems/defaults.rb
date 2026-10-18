# frozen_string_literal: true

# The path defaults of RubyGems, trimmed to what Opal needs.
#
# Upstream derives the system gem directory from RbConfig - the prefix of the
# Ruby it was built into. Opal is a single JavaScript program with no install
# prefix, so the user's gem directory is also the default one, and GEM_HOME or
# --install-dir move it. The XDG layout and the legacy ~/.gem fallback are the
# upstream ones, kept so a gem directory can be shared with CRuby's.
#
# There is no vendor directory (no Ruby installation to vendor into) and no
# extension directory (the port refuses native extensions).

module Gem
  ##
  # The remote source gems are fetched from.

  def self.default_sources
    @default_sources ||= ["https://rubygems.org/"]
  end

  ##
  # Default spec cache directory, used for the compact index cache.

  def self.default_spec_cache_dir
    legacy = File.join Gem.user_home, ".gem", "specs"
    return legacy if File.exist?(legacy)

    File.join Gem.cache_home, "gem", "specs"
  end

  ##
  # The default gem directory: the user's own, since Opal has no system one.

  def self.default_dir
    @default_dir ||= user_dir
  end

  ##
  # Path to specification files of default gems: Opal has none.

  def self.default_specifications_dir
    nil
  end

  ##
  # Finds the home directory, to place user gems in rather than
  # sitewide gems.

  def self.find_home
    if File.exist? File.join(Gem.user_home, ".gem")
      Gem.user_home
    end
  end

  ##
  # The user's home directory, from the environment where the platform puts it.

  def self.user_home
    @user_home ||= ENV["HOME"] || ENV["USERPROFILE"] || (Dir.home rescue nil) || ""
  end

  ##
  # Path for gems in the user's home directory: the upstream layout, with
  # Opal's engine name and version in place of Ruby's.

  def self.user_dir
    gem_dir = File.join(Gem.user_home, ".gem")
    gem_dir = File.join(Gem.data_home, "gem") unless File.exist?(gem_dir)
    File.join gem_dir, ruby_engine, ruby_version
  end

  ##
  # The engine name a gem directory uses for its versioned subdirectory.

  def self.ruby_engine
    RUBY_ENGINE
  end

  ##
  # The version a gem directory uses for its versioned subdirectory.

  def self.ruby_version
    RUBY_VERSION
  end

  ##
  # The path to standard location of the user's configuration directory.

  def self.config_home
    @config_home ||= ENV["XDG_CONFIG_HOME"] || File.join(Gem.user_home, ".config")
  end

  ##
  # Finds the user's config file.

  def self.find_config_file
    gemrc = File.join Gem.user_home, ".gemrc"
    if File.exist? gemrc
      gemrc
    else
      File.join Gem.config_home, "gem", "gemrc"
    end
  end

  ##
  # The path to standard location of the user's .gemrc file.

  def self.config_file
    @config_file ||= find_config_file
  end

  ##
  # The path to standard location of the user's state file.

  def self.state_file
    @state_file ||= File.join(Gem.state_home, "gem", "last_update_check")
  end

  ##
  # The path to standard location of the user's cache directory.

  def self.cache_home
    @cache_home ||= ENV["XDG_CACHE_HOME"] || File.join(Gem.user_home, ".cache")
  end

  ##
  # The path to standard location of the user's data directory.

  def self.data_home
    @data_home ||= ENV["XDG_DATA_HOME"] || File.join(Gem.user_home, ".local", "share")
  end

  ##
  # The path to standard location of the user's state directory.

  def self.state_home
    @state_home ||= ENV["XDG_STATE_HOME"] || File.join(Gem.user_home, ".local", "state")
  end

  ##
  # How String Gem paths should be split. Overridable for esoteric platforms.

  def self.path_separator
    File::PATH_SEPARATOR
  end

  ##
  # Default gem load path.

  def self.default_path
    path = []
    path << user_dir if user_home && File.exist?(user_home)
    path
  end

  ##
  # Opal installs no binaries next to a Ruby interpreter; `gem exec` and the
  # gem's own bin/ directory are what put executables around.

  def self.default_bindir
    File.join Gem.user_home, ".local", "bin"
  end

  ##
  # Executables are installed under their own name.

  def self.default_exec_format
    "%s"
  end

  ##
  # A user install is the only install, so it is the default.

  def self.default_user_install # :nodoc:
    true
  end

  ##
  # There are no binary extensions to install.

  def self.install_extension_in_lib # :nodoc:
    false
  end

  ##
  # There is no Ruby installation to vendor gems in.

  def self.vendor_dir # :nodoc:
    nil
  end

  ##
  # The defaults that apply to the platform: Opal runs the same Ruby code
  # everywhere, so a gem is always the plain "ruby" platform.

  def self.platform_defaults
    { "ruby" => true }
  end

  ##
  # What Gem::Platform.local resolves to: the "ruby" platform, because a gem
  # with a native extension cannot be built here.

  def self.local_platform
    Gem::Platform::RUBY
  end
end

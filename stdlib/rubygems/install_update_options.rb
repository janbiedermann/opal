# frozen_string_literal: true

#--
# Copyright 2006 by Chad Fowler, Rich Kilmer, Jim Weirich and others.
# All rights reserved.
# See LICENSE.txt for permissions.
#++

require_relative "../rubygems"

##
# Mixin methods for install and update options for Gem::Commands
#
# Opal: four of upstream's options are not here, and each is missing because
# the machinery behind it is out of scope (§1) or of a later milestone:
#
# * -P/--trust-policy (Gem::SecurityOption): the trust policies are OpenSSL
#   work, and this port's Gem::Security carries the checksums of a package and
#   nothing more, so there is no policy to choose.
# * --cooldown (Gem::CooldownOption): Gem::Cooldown is not ported (M5), and the
#   option would set a value nothing reads.
# * -g/--file and --without (gem dependency files): `gem install -g` runs
#   Gem::RequestSet#install_from_gemdeps, which this port left out with the
#   git, vendor and lock sets and Bundler's lockfile parser (M8).
# * --target-rbconfig: reading a target platform's rbconfig is M7's work.
#
# The options that stay are upstream's, in upstream's order.

module Gem::InstallUpdateOptions
  ##
  # Add the install/update options to the option parser.

  def add_install_update_options
    add_option(:"Install/Update", "-i", "--install-dir DIR",
               "Gem repository directory to get installed",
               "gems") do |value, options|
      options[:install_dir] = File.expand_path(value)
    end

    add_option(:"Install/Update", "-n", "--bindir DIR",
               "Directory where executables will be",
               "placed when the gem is installed") do |value, options|
      options[:bin_dir] = File.expand_path(value)
    end

    add_option(:"Install/Update", "-j", "--build-jobs VALUE", Integer,
               "Specify the number of jobs to pass to `make` when installing",
               "gems with native extensions.",
               "Defaults to the number of processors.",
               "This option is ignored on the mswin platform or",
               "if the MAKEFLAGS environment variable is set.") do |value, options|
      options[:build_jobs] = value
    end

    add_option(:"Install/Update", "--document [TYPES]", Array,
               "Generate documentation for installed gems",
               "List the documentation types you wish to",
               "generate.  For example: rdoc,ri") do |value, options|
      options[:document] = case value
                           when nil   then %w[ri]
                           when false then []
                           else value
      end
    end

    add_option(:"Install/Update", "--build-root DIR",
               "Temporary installation root. Useful for building",
               "packages. Do not use this when installing remote gems.") do |value, options|
      options[:build_root] = File.expand_path(value)
    end

    add_option(:"Install/Update", "--vendor",
               "Install gem into the vendor directory.",
               "Only for use by gem repackagers.") do |_value, options|
      unless Gem.vendor_dir
        raise Gem::OptionParser::InvalidOption.new "your platform is not supported"
      end

      options[:vendor] = true
      options[:install_dir] = Gem.vendor_dir
    end

    add_option(:"Install/Update", "-N", "--no-document",
               "Disable documentation generation") do |_value, options|
      options[:document] = []
    end

    add_option(:"Install/Update", "-E", "--[no-]env-shebang",
               "Rewrite the shebang line on installed",
               "scripts to use /usr/bin/env") do |value, options|
      options[:env_shebang] = value
    end

    add_option(:"Install/Update", "-f", "--[no-]force",
               "Force gem to install, bypassing dependency",
               "checks") do |value, options|
      options[:force] = value
    end

    add_option(:"Install/Update", "-w", "--[no-]wrappers",
               "Use bin wrappers for executables",
               "Not available on dosish platforms") do |value, options|
      options[:wrappers] = value
    end

    add_option(:"Install/Update", "--ignore-dependencies",
               "Do not install any required dependent gems") do |value, options|
      options[:ignore_dependencies] = value
    end

    # Opal: D7. `gem compile` on everything this run installs, so the gem is
    # found as JavaScript from the moment it lands. There is nothing like it
    # upstream - CRuby has no ahead-of-time compiler.
    add_option(:"Install/Update", "--[no-]compile",
               "Compile the installed gems to JavaScript",
               "after installing them (Opal only)") do |value, options|
      options[:compile] = value
    end

    add_option(:"Install/Update", "--[no-]format-executable",
               "Make installed executable names match Ruby.",
               "If Ruby is ruby18, foo_exec will be",
               "foo_exec18") do |value, options|
      options[:format_executable] = value
    end

    add_option(:"Install/Update", "--[no-]user-install",
               "Install in user's home directory instead",
               "of GEM_HOME.") do |value, options|
      options[:user_install] = value
    end

    add_option(:"Install/Update", "--development",
                "Install additional development",
                "dependencies") do |_value, options|
      options[:development] = true
      options[:dev_shallow] = true
    end

    add_option(:"Install/Update", "--development-all",
                "Install development dependencies for all",
                "gems (including dev deps themselves)") do |_value, options|
      options[:development] = true
      options[:dev_shallow] = false
    end

    add_option(:"Install/Update", "--conservative",
                "Don't attempt to upgrade gems already",
                "meeting version requirement") do |_value, options|
      options[:conservative] = true
      options[:minimal_deps] = true
    end

    add_option(:"Install/Update", "--[no-]minimal-deps",
                "Don't upgrade any dependencies that already",
                "meet version requirements") do |value, options|
      options[:minimal_deps] = value
    end

    add_option(:"Install/Update", "--[no-]post-install-message",
                "Print post install message") do |value, options|
      options[:post_install_message] = value
    end

    add_option(:"Install/Update", "--explain",
               "Rather than install the gems, indicate which would",
               "be installed") do |v, _o|
      options[:explain] = v
    end

    add_option(:"Install/Update", "--[no-]lock",
               "Create a lock file (when used with -g/--file)") do |v, _o|
      options[:lock] = v
    end

    add_option(:"Install/Update", "--[no-]suggestions",
               "Suggest alternates when gems are not found") do |v, _o|
      options[:suggest_alternate] = v
    end

    add_option(:"Install/Update", "--[no-]build-extension",
                "Build native extensions during installation.",
                "Defaults to true") do |v, _o|
      options[:build_extension] = v
    end

    add_option(:"Install/Update", "--[no-]install-plugin",
                "Install plugins during installation.",
                "Defaults to true") do |v, _o|
      options[:install_plugin] = v
    end
  end

  ##
  # Default options for the gem install and update commands.

  def install_update_options
    {
      document: %w[ri],
    }
  end

  ##
  # Default description for the gem install and update commands.

  def install_update_defaults_str
    "--document=ri"
  end
end

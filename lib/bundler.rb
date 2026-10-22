# frozen_string_literal: true

# Opal: the port's entry point to Bundler. Upstream reaches for a host
# RubyGems wrapper (rubygems_ext), FileUtils, Pathname autoloads, an
# EnvironmentPreserver for the ORIGINAL_ENV constant and the plugin system
# here; the port keeps the requires it has (no plugin system, no environment
# preserving until M8.3's exec) and requires everything eagerly - an
# autoload would leave the constant outside a compiled bundle.
require "rubygems"
require "pathname"
require "fileutils"

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
require_relative "bundler/ui/silent"
require_relative "bundler/uri_normalizer"
require_relative "bundler/uri_credentials_filter"
require_relative "bundler/plugin"
require_relative "bundler/checksum"
require_relative "bundler/ruby_version"
require_relative "bundler/rubygems_integration"
require_relative "bundler/source"
require_relative "bundler/source/metadata"
require_relative "bundler/source/path"
require_relative "bundler/source/gemspec"
require_relative "bundler/source/git"
require_relative "bundler/source/rubygems"
require_relative "bundler/source_list"
require_relative "bundler/source_map"
require_relative "bundler/lockfile_parser"
require_relative "bundler/dsl"
require_relative "bundler/definition"
require_relative "bundler/gem_version_promoter"
require_relative "bundler/source/rubygems_aggregate"

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
    # Opal: the interactive Shell UI (and with it the RGProxy that mirrors it
    # into Gem's user interaction) arrives with the command layer in M8.2;
    # until then callers only log, so this answers upstream's Silent UI - the
    # same one upstream's --silent runs use.
    def ui
      @ui ||= UI::Silent.new
    end

    def ui=(ui)
      # Opal: upstream also wires UI::RGProxy.new(ui) into Gem's user
      # interaction; that comes with the Shell UI in M8.2.
      @ui = ui
    end

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

    # Opal: upstream answers settings[:frozen] and falls back to
    # settings[:deployment]; Bundler.settings is not ported yet (it lands
    # with the `bundle` command slices), so the settings default - not
    # frozen - answers until then.
    def frozen_bundle?
      false
    end

    # Opal: upstream's reset! also resets the plugin system (not ported) and
    # undoes the RubyGems activation patches (they arrive with M8.3's setup),
    # so reset! is just reset_paths! for now. The path resets matter because
    # specs need to be able to drop the memoized root.
    def reset!
      reset_paths!
    end

    def reset_settings_and_root!
      @settings = nil
      @root = nil
    end

    def reset_paths!
      @bin_path = nil
      @bundle_path = nil
      @configure = nil
      @configured_bundle_path = nil
      @definition = nil
      @load = nil
      @locked_gems = nil
      @root = nil
      @settings = nil
      @setup = nil
      @user_home = nil
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

    def read_file(file)
      SharedHelpers.filesystem_access(file, :read) do
        File.open(file, "r:UTF-8", &:read)
      end
    end

    def safe_load_marshal(data)
      if Gem.respond_to?(:load_safe_marshal)
        Gem.load_safe_marshal
        begin
          Gem::SafeMarshal.safe_load(data)
        rescue Gem::SafeMarshal::Reader::Error, Gem::SafeMarshal::Visitors::ToRuby::Error => e
          raise MarshalError, "#{e.class}: #{e.message}"
        end
      else
        load_marshal(data, marshal_proc: SafeMarshal.proc)
      end
    end

    def load_gemspec(file, validate = false)
      @gemspec_cache ||= {}
      key = File.expand_path(file)
      @gemspec_cache[key] ||= load_gemspec_uncached(file, validate)
      # Protect against caching side-effected gemspecs by returning a
      # new instance each time.
      @gemspec_cache[key]&.dup
    end

    def load_gemspec_uncached(file, validate = false)
      path = Pathname.new(file).expand_path
      contents = read_file(path.to_s)
      spec = eval_gemspec(path, contents)
      return unless spec
      spec.loaded_from = path.to_s
      Bundler.rubygems.validate(spec) if validate
      spec
    end

    def clear_gemspec_cache
      @gemspec_cache = {}
    end

    def user_home
      @user_home ||= begin
        home = Bundler.rubygems.user_home
        bundle_home = home ? File.join(home, ".bundle") : nil

        warning = if home.nil?
          "Your home directory is not set."
        elsif !File.directory?(home)
          "`#{home}` is not a directory."
        elsif !File.writable?(home) && (!File.directory?(bundle_home) || !File.writable?(bundle_home))
          "`#{home}` is not writable."
        end

        if warning
          Bundler.ui.warn "#{warning}\n"
          user_home = tmp_home_path
          Bundler.ui.warn "Bundler will use `#{user_home}' as your home directory temporarily.\n"
          user_home
        else
          Pathname.new(home)
        end
      end
    end

    def tmp_home_path
      Kernel.send(:require, "tmpdir")
      SharedHelpers.filesystem_access(Dir.tmpdir) do
        path = Bundler.tmp
        at_exit { Bundler.rm_rf(path) }
        path
      end
    end

    def tmp(name = Process.pid.to_s)
      Kernel.send(:require, "tmpdir")
      Pathname.new(Dir.mktmpdir(["bundler", name]))
    end

    def rm_rf(path)
      FileUtils.remove_entry_secure(path) if path && File.exist?(path)
    end

    # Opal: upstream asks settings for the cache directory name; settings
    # arrives with M8.2, and until then this answers its default.
    def app_cache(custom_path = nil)
      path = custom_path || root
      Pathname.new(path).join("vendor", "cache")
    end

    def eval_yaml_gemspec(path, contents)
      # Opal: psych is not vendored; the port's Gem::Specification.from_yaml
      # parses through the ported Gem::YAMLSerializer instead, which is what
      # upstream reaches for after loading psych anyway.
      Gem::Specification.from_yaml(contents)
    end

    def eval_gemspec(path, contents)
      if contents.start_with?("---") # YAML header
        eval_yaml_gemspec(path, contents)
      else
        # Eval the gemspec from its parent directory, because some gemspecs
        # depend on "./" relative paths. The caller expands `path` first,
        # expanding it here would resolve against the gemspec directory once
        # the chdir is active.
        SharedHelpers.chdir(path.dirname.to_s) do
          # Opal: the upstream Ruby::Box branch picks a binding inside a
          # Box; Opal has no Ruby::Box, so the port always takes the plain
          # TOPLEVEL_BINDING path. eval needs the parser provisioned, and the
          # require is dynamic so bundles that never eval stay without it.
          require "opal-parser"
          eval(contents, TOPLEVEL_BINDING.dup, path.to_s)
        end
      end
    rescue ScriptError, StandardError => e
      msg = "There was an error while loading `#{path.basename}`: #{e.message}"

      raise GemspecError, Dsl::DSLError.new(msg, path.to_s, e.backtrace, contents)
    end
  end
end

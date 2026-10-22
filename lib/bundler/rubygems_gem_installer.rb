# frozen_string_literal: true

require "rubygems/installer"

module Bundler
  class RubyGemsGemInstaller < Gem::Installer
    # Opal: what this port leaves out of upstream's file, one deviation for
    # whole subsystems the port's RubyGems lacks (GEMS.md §1):
    #
    # * native extensions: Gem::Installer#verify_buildable refuses gems that
    #   declare extensions and there is no Gem::Ext, so the build_extensions
    #   override, its cache copying, the jobserver slotting (build_jobs,
    #   connect_to_jobserver, prepare_extension_build) and the
    #   warn_skipped_extensions half all go;
    # * plugins: the port generates no plugins, so the
    #   generate_plugins/remove_stale_plugins fork of #install and
    #   warn_skipped_plugins go with them;
    # * RubyGems backports: the `Bundler.rubygems.provides?` guards answer
    #   false against the ported 4.1 and stay in place for the record.

    def check_executable_overwrite(filename)
      # Bundler needs to install gems regardless of binstub overwriting
    end

    def install
      assign_content_address

      pre_install_checks

      run_pre_install_hooks

      spec.loaded_from = spec_file

      # Completely remove any previous gem files
      strict_rm_rf gem_dir
      # Opal: with no extensions there is no extension_dir half of this;
      # the ported Specification answers nil.
      strict_rm_rf(spec.extension_dir) if spec.extension_dir

      SharedHelpers.filesystem_access(gem_dir, :create) do
        FileUtils.mkdir_p gem_dir
      end

      SharedHelpers.filesystem_access(gem_dir, :write) do
        extract_files
      end

      write_build_info_file
      run_post_build_hooks

      SharedHelpers.filesystem_access(bin_dir, :write) do
        generate_bin
      end

      write_spec

      SharedHelpers.filesystem_access("#{gem_home}/cache", :write) do
        write_cache_file
      end

      say spec.post_install_message unless spec.post_install_message.nil?

      run_post_install_hooks

      spec
    end

    if Bundler.rubygems.provides?("< 3.5")
      def pre_install_checks
        super
      rescue Gem::FilePermissionError
        # Ignore permission checks in RubyGems. Instead, go on, and try to write
        # for real. We properly handle permission errors when they happen.
        nil
      end
    end

    def ensure_writable_dir(dir)
      super
    rescue Gem::FilePermissionError
      # Ignore permission checks in RubyGems. Instead, go on, and try to write
      # for real. We properly handle permission errors when they happen.
      nil
    end

    def spec
      if Bundler.rubygems.provides?("< 3.3.12") # RubyGems implementation rescues and re-raises errors before 3.3.12 and we don't want that
        @package.spec
      else
        super
      end
    end

    def gem_checksum
      Checksum.from_gem_package(@package)
    end

    private

    def strict_rm_rf(dir)
      return unless File.exist?(dir)
      return if Dir.empty?(dir)

      parent = File.dirname(dir)
      parent_st = File.stat(parent)

      if parent_st.world_writable? && !parent_st.sticky?
        raise InsecureInstallPathError.new(spec.full_name, dir)
      end

      begin
        FileUtils.remove_entry_secure(dir)
      rescue StandardError => e
        raise unless File.exist?(dir)

        raise DirectoryRemovalError.new(e, "Could not delete previous installation of `#{dir}`")
      end
    end
  end
end

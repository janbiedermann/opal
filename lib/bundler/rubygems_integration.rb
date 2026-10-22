# frozen_string_literal: true

require "rubygems" unless defined?(Gem)

module Bundler
  class RubygemsIntegration
    # Opal: no vendored monitor; a Mutex from the stdlib thread library is
    # enough here - upstream's EXT_LOCK only guards extension builds, which
    # the port does not run (pwd/chdir skip the lock for the same reason).
    require "thread"

    EXT_LOCK = Mutex.new

    def initialize
      @replaced_methods = {}
    end

    def version
      @version ||= Gem.rubygems_version
    end

    def provides?(req_str)
      Gem::Requirement.new(req_str).satisfied_by?(version)
    end

    def build_args
      require "rubygems/command"
      Gem::Command.build_args
    end

    def build_args=(args)
      require "rubygems/command"
      Gem::Command.build_args = args
    end

    def set_target_rbconfig(path)
      Gem.set_target_rbconfig(path)
    end

    def loaded_specs(name)
      Gem.loaded_specs[name]
    end

    def mark_loaded(spec)
      if spec.respond_to?(:activated=)
        current = Gem.loaded_specs[spec.name]
        current.activated = false if current
        spec.activated = true
      end
      Gem.loaded_specs[spec.name] = spec
    end

    def validate(spec)
      Bundler.ui.silence { spec.validate_for_resolution }
    rescue Gem::InvalidSpecificationException => e
      error_message = "The gemspec at #{spec.loaded_from} is not valid. Please fix this gemspec.\n" \
        "The validation error was '#{e.message}'\n"
      raise Gem::InvalidSpecificationException.new(error_message)
    rescue Errno::ENOENT
      nil
    end

    def stub_set_spec(stub, spec)
      stub.instance_variable_set(:@spec, spec)
    end

    def path(obj)
      obj.to_s
    end

    def ruby_engine
      Gem.ruby_engine
    end

    def read_binary(path)
      Gem.read_binary(path)
    end

    def inflate(obj)
      Gem::Util.inflate(obj)
    end

    def gem_dir
      Gem.dir
    end

    def gem_bindir
      Gem.bindir
    end

    def user_home
      Gem.user_home
    end

    def gem_path
      Gem.path
    end

    def reset
      Gem::Specification.reset
    end

    def post_reset_hooks
      Gem.post_reset_hooks
    end

    def suffix_pattern
      Gem.suffix_pattern
    end

    def gem_cache
      gem_path.map {|p| File.expand_path("cache", p) }
    end

    def spec_cache_dirs
      @spec_cache_dirs ||= begin
        dirs = gem_path.flat_map {|dir| Gem::SpecificationRecord.dirs_from([dir]) }
        dirs << Gem.spec_cache_dir
        dirs.uniq.select {|dir| File.directory? dir }
      end
    end

    def marshal_spec_dir
      Gem::MARSHAL_SPEC_DIR
    end

    def clear_paths
      Gem.clear_paths
    end

    def bin_path(gem, bin, ver)
      Gem.bin_path(gem, bin, ver)
    end

    def loaded_gem_paths
      loaded_gem_paths = Gem.loaded_specs.map {|_, s| s.full_require_paths }
      loaded_gem_paths.flatten
    end

    def ui=(obj)
      Gem::DefaultUserInteraction.ui = obj
    end

    def ext_lock
      EXT_LOCK
    end

    def spec_from_gem(path)
      require "rubygems/package"
      package = Gem::Package.new(path)
      spec = package.spec
      if package.respond_to?(:content_address)
        spec.content_address = package.content_address
      end
      spec
    end

    def build_gem(gem_dir, spec)
      build(spec)
    end

    def security_policy_keys
      %w[High Medium Low AlmostNo No].map {|level| "#{level}Security" }
    end

    def security_policies
      @security_policies ||= begin
        require "rubygems/security"
        Gem::Security::Policies
      rescue LoadError, NameError
        {}
      end
    end
    # Opal: upstream's gem-activation cluster - reverse_rubygems_kernel_mixin,
    # replace_gem, replace_bin_path, replace_entrypoints, add_default_gems_to,
    # undo_replacements, redefine_method, method_visibility and
    # stub_rubygems - waits for M8.3's setup/exec, where the port decides how
    # activation works when require is the runtime's own and Gem::Specification
    # carries no activation state to steal.
    def plain_specs
      Gem::Specification._all
    end

    def plain_specs=(specs)
      Gem::Specification.all = specs
    end

    def fetch_specs(remote, name, fetcher)
      require "rubygems/remote_fetcher"
      path = remote.uri.to_s + "#{name}.#{Gem.marshal_version}.gz"
      string = fetcher.fetch_path(path)
      specs = Bundler.safe_load_marshal(string)
      raise MarshalError, "Specs #{name} from #{remote} is expected to be an Array but was unexpected class #{specs.class}" unless specs.is_a?(Array)
      specs
    rescue Gem::RemoteFetcher::FetchError
      # it's okay for prerelease to fail
      raise unless name == "prerelease_specs"
    end

    def fetch_all_remote_specs(remote, gem_remote_fetcher)
      specs = fetch_specs(remote, "specs", gem_remote_fetcher)
      pres = fetch_specs(remote, "prerelease_specs", gem_remote_fetcher) || []

      specs.concat(pres)
    end

    def download_gem(spec, uri, cache_dir, fetcher)
      require "rubygems/remote_fetcher"
      uri = Bundler.settings.mirror_for(uri)
      redacted_uri = Gem::Uri.redact(uri)

      Bundler::Retry.new("download gem from #{redacted_uri}").attempts do
        gem_file_name = spec.file_name
        local_gem_path = File.join cache_dir, gem_file_name
        return if File.exist? local_gem_path

        begin
          remote_gem_path = uri + "gems/#{gem_file_name}"

          SharedHelpers.filesystem_access(local_gem_path) do
            fetcher.cache_update_path remote_gem_path, local_gem_path
          end
        rescue Gem::RemoteFetcher::FetchError
          raise if spec.original_platform == spec.platform

          original_gem_file_name = "#{spec.original_name}.gem"
          raise if gem_file_name == original_gem_file_name

          gem_file_name = original_gem_file_name
          retry
        end
      end
    rescue Gem::RemoteFetcher::FetchError => e
      raise Bundler::HTTPError, "Could not download gem from #{redacted_uri} due to underlying error <#{e.message}>"
    end

    def build(spec, skip_validation = false)
      require "rubygems/package"
      Gem::Package.build(spec, skip_validation)
    end

    def path_separator
      Gem.path_separator
    end

    def all_specs
      SharedHelpers.feature_removed! "Bundler.rubygems.all_specs has been removed in favor of Bundler.rubygems.installed_specs"
    end

    def installed_specs
      Gem::Specification.stubs.reject(&:default_gem?).map do |stub|
        StubSpecification.from_stub(stub)
      end
    end

    def default_specs
      Gem::Specification.default_stubs.map do |stub|
        StubSpecification.from_stub(stub)
      end
    end

    def find_bundler(version)
      find_name("bundler").find {|s| s.version.to_s == version.to_s }
    end

    def find_name(name)
      Gem::Specification.stubs_for(name).map(&:to_spec)
    end

    def default_stubs
      Gem::Specification.default_stubs("*.gemspec")
    end

    private

    def gem_class
      class << Gem; self; end
    end
  end

  def self.rubygems
    @rubygems ||= RubygemsIntegration.new
  end
end

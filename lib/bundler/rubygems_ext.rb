# frozen_string_literal: true

require "rubygems/dependency"
require "rubygems/stub_specification"

# We can't let `Gem::Source` be autoloaded in the `Gem::Specification#source`
# redefinition below, so we need to load it upfront. (Upstream's comment goes
# on: the redefined `source` can fire during gem activation, and the autoload
# would then re-enter a require and fail.)
require "rubygems/source"

# Opal: a partial port of upstream's rubygems_ext.rb. Upstream patches a host
# RubyGems it does not control; the port sits on the ported one, so only the
# additions Bundler's own files expect go on top. The compatibility guards go
# for the same reason: the ported BasicSpecification and NameTuple already
# carry content_address, SpecificationRecord, Gem.open_file_with_lock, the
# Gem::ContentAddress concept, Gem::Platform's platform constants and
# Specification#validate_for_resolution; Gem.freebsd_platform? stays unasked
# by the port's platform.rb. The compact-index and ActivationRequest backport
# guards all read false against the port's 4.1 Gem, and the
# FilterIgnoredSpecs backport goes with them. The BasicSpecification universal-
# Ruby block is dropped too: the port's platform is not a universal one.
module Gem
  VALIDATES_FOR_RESOLUTION = Specification.new.respond_to?(:validate_for_resolution).freeze

  class Specification
    require_relative "match_metadata"
    require_relative "match_platform"

    include ::Bundler::MatchMetadata

    attr_accessor :remote, :relative_loaded_from

    module AllowSettingSource
      attr_writer :source

      def source
        (defined?(@source) && @source) || super
      end
    end

    prepend AllowSettingSource

    alias_method :rg_full_gem_path, :full_gem_path
    alias_method :rg_loaded_from,   :loaded_from

    def full_gem_path
      if source.respond_to?(:root)
        File.expand_path(File.dirname(loaded_from), source.root)
      else
        rg_full_gem_path
      end
    end

    def loaded_from
      if relative_loaded_from
        source.path.join(relative_loaded_from).to_s
      else
        rg_loaded_from
      end
    end

    def load_paths
      full_require_paths
    end

    alias_method :rg_extension_dir, :extension_dir
    def extension_dir
      # following instance variable is already used in original method
      # and that is the reason to prefix it with bundler_ and add rubocop exception
      @bundler_extension_dir ||= if source.respond_to?(:extension_dir_name) # rubocop:disable Naming/MemoizedInstanceVariableName
        unique_extension_dir = [source.extension_dir_name, File.basename(full_gem_path)].uniq.join("-")
        File.expand_path(File.join(extensions_dir, unique_extension_dir))
      else
        rg_extension_dir
      end
    end

    alias_method :rg_build_info_dir, :build_info_dir
    def build_info_dir
      # A git checkout's build logs belong with that checkout's extension build.
      # base_dir points at the directory holding every checkout, so logs keyed by
      # full_name would collide between revisions of the same gem and would sit
      # outside anything `bundle clean` prunes. extension_dir is unique per
      # revision and goes away with the checkout.
      if source.respond_to?(:extension_dir_name)
        extension_dir
      else
        rg_build_info_dir
      end
    end

    # Opal: upstream removes the host's own gem_dir first; here redefining it
    # in the reopened class shadows the ported answer the same way, and
    # remove_method would depend on corelib's ownership split.
    def gem_dir
      full_gem_path
    end

    def insecurely_materialized?
      false
    end

    def groups
      @groups ||= []
    end

    def git_version
      return unless loaded_from && source.is_a?(Bundler::Source::Git)
      " #{source.revision[0..6]}"
    end

    def to_gemfile(path = nil)
      # Opal: no mutable String#<< in corelib; the lines concatenate.
      gemfile = String.new("source 'https://rubygems.org'\n")
      gemfile += dependencies_to_gemfile(nondevelopment_dependencies)
      unless development_dependencies.empty?
        gemfile += "\n"
        gemfile += dependencies_to_gemfile(development_dependencies, :development)
      end
      gemfile
    end

    def nondevelopment_dependencies
      dependencies - development_dependencies
    end

    def installation_missing?
      !default_gem? && !File.directory?(full_gem_path)
    end

    def lock_name
      @lock_name ||= name_tuple.lock_name
    end

    private

    def dependencies_to_gemfile(dependencies, group = nil)
      gemfile = String.new
      if dependencies.any?
        gemfile += "group :#{group} do\n" if group
        dependencies.each do |dependency|
          gemfile += "  " if group
          gemfile += %(gem "#{dependency.name}")
          req = dependency.requirements_list.first
          gemfile += %(, "#{req}") if req
          gemfile += "\n"
        end
        gemfile += "end\n" if group
      end
      gemfile
    end
  end

  module BetterPermissionError
    def data
      super
    rescue Errno::EACCES
      raise Bundler::PermissionError.new(loaded_from, :read)
    end
  end

  class StubSpecification
    prepend BetterPermissionError
  end

  class Dependency
    require_relative "force_platform"

    include ::Bundler::ForcePlatform

    attr_reader :force_ruby_platform

    attr_accessor :source, :groups

    alias_method :eql?, :==

    # Opal: corelib's method_defined? answers for inherited methods too and
    # takes no second argument; the ported Dependency defines encode_with
    # itself, so the guard reads false here either way.
    unless method_defined?(:encode_with)
      def encode_with(coder)
        [:@name, :@requirement, :@type, :@prerelease, :@version_requirements].each do |ivar|
          coder[ivar.to_s.sub(/^@/, "")] = instance_variable_get(ivar)
        end
      end
    end

    def to_lock
      # Opal: corelib has no mutable String#<< (see unsupported.rb), so the
      # appends go through concatenation.
      out = String.new("  #{name}")
      unless requirement.none?
        reqs = requirement.requirements.map {|o, v| "#{o} #{v}" }.sort.reverse
        out += " (#{reqs.join(", ")})"
      end
      out
    end
  end

  class NameTuple
    # Opal: upstream's two initialize backport guards read Method#parameters,
    # which corelib only fills for keyword-taking methods, and the port's Gem
    # is 4.1 - both signatures are already the modern ones - so the backports
    # go and only lock_name, the piece Bundler adds, comes.
    def lock_name
      if platform == Gem::Platform::RUBY
        "#{name} (#{version})"
      else
        "#{name} (#{version}-#{platform})"
      end
    end
  end
end

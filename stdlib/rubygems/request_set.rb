# frozen_string_literal: true

# Opal: upstream requires its vendored tsort here as Gem::TSort and mixes that
# in; this port uses the tsort library of stdlib/tsort.rb under its own name
# (M1), as rubygems/dependency_list.rb does. And Gem::Cooldown, which upstream
# reads the --cooldown option through here, is not ported yet: @cooldown stays
# nil, which is what upstream itself runs with when no cooldown is configured,
# so every filter it would apply is inert and M6 restores the option.
require "tsort"

##
# A RequestSet groups a request to activate a set of dependencies.
#
#   nokogiri = Gem::Dependency.new 'nokogiri', '>= 1.6'
#   pg = Gem::Dependency.new 'pg', '>= 0.14'
#
#   set = Gem::RequestSet.new nokogiri, pg
#
#   requests = set.resolve
#
#   p requests.map { |r| r.full_name }
#   #=> ["nokogiri-1.6.0", "mini_portile-0.5.1", "pg-0.17.0"]

class Gem::RequestSet
  include TSort

  ##
  # Array of gems to install even if already installed

  attr_accessor :always_install

  ##
  # The Gem::Cooldown applied to release candidates, if any.

  attr_accessor :cooldown

  attr_reader :dependencies

  attr_accessor :development

  ##
  # Errors fetching gems during resolution.

  attr_reader :errors

  ##
  # Set to true if you want to install only direct development dependencies.

  attr_accessor :development_shallow

  ##
  # The set of git gems imported via load_gemdeps.

  attr_reader :git_set # :nodoc:

  ##
  # When true, dependency resolution is not performed, only the requested gems
  # are installed.

  attr_accessor :ignore_dependencies

  attr_reader :install_dir # :nodoc:

  ##
  # If true, allow dependencies to match prerelease gems.

  attr_accessor :prerelease

  ##
  # When false no remote sets are used for resolving gems.

  attr_accessor :remote

  attr_reader :resolver # :nodoc:

  ##
  # Sets used for resolution

  attr_reader :sets # :nodoc:

  ##
  # Treat missing dependencies as silent errors

  attr_accessor :soft_missing

  ##
  # The set of vendor gems imported via load_gemdeps.

  attr_reader :vendor_set # :nodoc:

  ##
  # The set of source gems imported via load_gemdeps.

  attr_reader :source_set

  ##
  # Creates a RequestSet for a list of Gem::Dependency objects, +deps+.  You
  # can then #resolve and #install the resolved list of dependencies.
  #
  #   nokogiri = Gem::Dependency.new 'nokogiri', '>= 1.6'
  #   pg = Gem::Dependency.new 'pg', '>= 0.14'
  #
  #   set = Gem::RequestSet.new nokogiri, pg

  def initialize(*deps)
    @dependencies = deps

    @always_install      = []
    @conservative        = false
    @cooldown            = nil
    @dependency_names    = {}
    @development         = false
    @development_shallow = false
    @errors              = []
    @git_set             = nil
    @ignore_dependencies = false
    @install_dir         = Gem.dir
    @prerelease          = false
    @remote              = true
    @requests            = []
    @sets                = []
    @soft_missing        = false
    @sorted_requests     = nil
    @specs               = nil
    @vendor_set          = nil
    @source_set          = nil

    yield self if block_given?
  end

  ##
  # Declare that a gem of name +name+ with +reqs+ requirements is needed.

  def gem(name, *reqs)
    if dep = @dependency_names[name]
      dep.requirement.concat reqs
    else
      dep = Gem::Dependency.new name, *reqs
      @dependency_names[name] = dep
      @dependencies << dep
    end
  end

  ##
  # Add +deps+ Gem::Dependency objects to the set.

  def import(deps)
    @dependencies.concat deps
  end

  ##
  # Installs gems for this RequestSet using the Gem::Installer +options+.
  #
  # If a +block+ is given an activation +request+ and +installer+ are yielded.
  # The +installer+ will be +nil+ if a gem matching the request was already
  # installed.

  def install(options, &block) # :yields: request, installer
    if dir = options[:install_dir]
      requests = install_into dir, false, options, &block
      return requests
    end

    @prerelease = options[:prerelease]

    requests = []

    # Opal: upstream hands the downloads to a pool of Thread::Queue workers
    # (Gem.configuration.concurrent_downloads). There are no threads here and
    # installs run sequentially (GEMS.md D13), so the same downloads just happen
    # one after another before anything is written.
    sorted_requests.each do |req|
      req.spec.download options unless req.installed?
    end

    # Install requested gems after they have been downloaded
    sorted_requests.each do |req|
      if req.installed? && @always_install.none? {|spec| spec == req.spec.spec }
        req.spec.spec.build_extensions unless options[:build_extension] == false
        yield req, nil if block_given?
        next
      end

      spec =
        begin
          req.spec.install options do |installer|
            yield req, installer if block_given?
          end
        rescue Gem::RuntimeRequirementNotMetError => e
          suggestion = "There are no versions of #{req.request} compatible with your Ruby & RubyGems"
          suggestion += ". Maybe try installing an older version of the gem you're looking for?" unless @always_install.include?(req.spec.spec)
          e.suggestion = suggestion
          raise
        end

      requests << spec
    end

    return requests if options[:gemdeps]

    install_hooks requests, options

    requests
  end

  # Opal: #install_from_gemdeps, #load_gemdeps and #load_lockfile are left out.
  # They read a Gemfile or a `gem install -g` lockfile through
  # Gem::RequestSet::GemDependencyAPI and Bundler::LockfileParser and fill the
  # git, vendor and lock sets, for which this port has no source classes
  # (GEMS.md §1); #git_set, #vendor_set and #source_set stay nil and #resolve
  # drops them. Writing a lockfile belongs to Bundler's side, which is M8.

  def install_into(dir, force = true, options = {})
    gem_home = ENV["GEM_HOME"]
    ENV["GEM_HOME"] = dir

    existing = force ? [] : specs_in(dir)
    existing.delete_if {|s| @always_install.include? s }

    dir = File.expand_path dir

    installed = []

    options[:development] = false
    options[:install_dir] = dir
    options[:only_install_dir] = true
    @prerelease = options[:prerelease]

    sorted_requests.each do |request|
      spec = request.spec

      if existing.find {|s| s.full_name == spec.full_name }
        yield request, nil if block_given?
        next
      end

      spec.install options do |installer|
        yield request, installer if block_given?
      end

      installed << request
    end

    install_hooks installed, options

    installed
  ensure
    ENV["GEM_HOME"] = gem_home
  end

  ##
  # Call hooks on installed gems

  def install_hooks(requests, options)
    specs = requests.map do |request|
      case request
      when Gem::Resolver::ActivationRequest then
        request.spec.spec
      else
        request
      end
    end

    require_relative "dependency_installer"
    inst = Gem::DependencyInstaller.new options
    inst.installed_gems.replace specs

    Gem.done_installing_hooks.each do |hook|
      hook.call inst, specs
    end unless Gem.done_installing_hooks.empty?
  end

  def pretty_print(q) # :nodoc:
    q.group 2, "[RequestSet:", "]" do
      q.breakable

      if @remote
        q.text "remote"
        q.breakable
      end

      if @prerelease
        q.text "prerelease"
        q.breakable
      end

      if @development_shallow
        q.text "shallow development"
        q.breakable
      elsif @development
        q.text "development"
        q.breakable
      end

      if @soft_missing
        q.text "soft missing"
      end

      q.group 2, "[dependencies:", "]" do
        q.breakable
        @dependencies.map do |dep|
          q.text dep.to_s
          q.breakable
        end
      end

      q.breakable
      q.text "sets:"

      q.breakable
      q.pp @sets.map(&:class)
    end
  end

  ##
  # Resolve the requested dependencies and return an Array of Specification
  # objects to be activated.

  def resolve(set = Gem::Resolver::BestSet.new)
    @sets << set
    @sets << @git_set
    @sets << @vendor_set
    @sets << @source_set

    set = Gem::Resolver.compose_sets(*@sets)
    set.remote = @remote
    set.prerelease = @prerelease

    resolver = Gem::Resolver.new @dependencies, set
    resolver.cooldown            = @cooldown
    resolver.development         = @development
    resolver.development_shallow = @development_shallow
    resolver.ignore_dependencies = @ignore_dependencies
    resolver.soft_missing        = @soft_missing

    if @conservative
      installed_gems = {}
      Gem::Specification.find_all do |spec|
        (installed_gems[spec.name] ||= []) << spec
      end
      resolver.skip_gems = installed_gems
    end

    @resolver = resolver

    @requests = resolver.resolve

    @errors = set.errors

    @requests
  end

  ##
  # Resolve the requested dependencies against the gems available via Gem.path
  # and return an Array of Specification objects to be activated.

  def resolve_current
    resolve Gem::Resolver::CurrentSet.new
  end

  def sorted_requests
    @sorted_requests ||= strongly_connected_components.flatten
  end

  def specs
    @specs ||= @requests.map(&:full_spec)
  end

  def specs_in(dir)
    Gem::SpecificationRecord.dirs_from([dir]).flat_map do |spec_dir|
      Gem::Util.glob_files_in_dir("*.gemspec", spec_dir).map do |g|
        Gem::Specification.load g
      end
    end
  end

  def tsort_each_node(&block) # :nodoc:
    @requests.each(&block)
  end

  def tsort_each_child(node) # :nodoc:
    node.spec.dependencies.each do |dep|
      next if dep.type == :development && !@development

      match = @requests.find do |r|
        dep.match?(r.spec.name, r.spec.version, r.spec.is_a?(Gem::Resolver::InstalledSpecification) || @prerelease)
      end

      unless match
        next if dep.type == :development && @development_shallow
        next if @soft_missing
        raise Gem::DependencyError,
              "Unresolved dependency found during sorting - #{dep} (requested by #{node.spec.full_name})"
      end

      yield match
    end
  end
end

# Opal: the two files upstream requires here, request_set/gem_dependency_api
# (the Gemfile DSL) and request_set/lockfile (`gem dependencies`), go with the
# methods above.

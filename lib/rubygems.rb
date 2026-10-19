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


  # The hooks a gem or a command may add, as upstream does; the arrays have
  # to exist before the hooks are added to them.
  @loaded_specs          = {}
  @post_build_hooks      = []
  @post_install_hooks    = []
  @post_uninstall_hooks  = []
  @pre_uninstall_hooks   = []
  @pre_install_hooks     = []
  @pre_reset_hooks       = []
  @post_reset_hooks      = []
  @done_installing_hooks = []
end

# Upstream loads its classes lazily with `autoload`; the port requires them
# here instead: a gem command is shipped as one compiled bundle, where a
# require decided at run time would have nothing to load (GEMS.md M6).
require_relative "rubygems/exceptions"
require_relative "rubygems/deprecate"
require_relative "rubygems/win_platform"
require_relative "rubygems/user_interaction"
require_relative "rubygems/defaults"
require_relative "rubygems/path_support"
require_relative "rubygems/config_file"
require_relative "rubygems/uri"
require_relative "rubygems/util"
require_relative "rubygems/util/atomic_file_writer"
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
require_relative "rubygems/source"
require_relative "rubygems/source_list"
require_relative "rubygems/dependency_list"
require_relative "rubygems/installer"
require_relative "rubygems/uninstaller"

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
  # The sources gems are looked for in: the ones the configuration names, or
  # the default remote one. A local directory or a .gem file becomes a source
  # of its own (Gem::Source::Local, Gem::Source::SpecificFile).

  def self.sources
    require_relative "rubygems/source_list"

    source_list = configuration.sources || default_sources
    @sources ||= Gem::SourceList.from(source_list)
  end

  def self.sources=(new_sources)
    require_relative "rubygems/source_list"

    @sources = case new_sources
               when Gem::SourceList
                 new_sources
               else
                 Gem::SourceList.from new_sources
    end
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
  # The install, build and uninstall hooks, added by Gem.pre_install and
  # friends.

  def self.pre_install_hooks
    @pre_install_hooks
  end

  def self.post_install_hooks
    @post_install_hooks
  end

  def self.post_build_hooks
    @post_build_hooks
  end

  def self.done_installing_hooks
    @done_installing_hooks
  end

  def self.pre_uninstall_hooks
    @pre_uninstall_hooks
  end

  def self.post_uninstall_hooks
    @post_uninstall_hooks
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
    @suffix_pattern ||= "{#{suffixes.join(",")}}"
  end

  def self.plugin_suffix_pattern
    @plugin_suffix_pattern ||= "_plugin#{suffix_pattern}"
  end

  def self.suffix_regexp
    @suffix_regexp ||= /#{Regexp.union(suffixes)}\z/
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
    @activated_gem_paths = activated_gem_paths + paths.size

    index = load_path_insert_index
    if index
      $LOAD_PATH.insert index, *paths
    else
      $LOAD_PATH.concat paths
    end
    paths
  end

  ##
  # How many paths activated gems have added to $LOAD_PATH.

  def self.activated_gem_paths
    @activated_gem_paths ||= 0
  end

  ##
  # The spec a name resolves to among the loaded ones.

  def self.activated_spec(name)
    loaded_specs[name.to_s]
  end

  ##
  # Subdirectories in a gem repository.
  #
  # Opal: no `extensions` directory - the port refuses native extensions - and
  # no `plugins` one - plugins are out of scope (GEMS.md §1).

  REPOSITORY_SUBDIRECTORIES = %w[
    build_info
    cache
    doc
    gems
    specifications
  ].freeze

  ##
  # Try to activate a gem containing +path+. Returns true if
  # activation succeeded or wasn't needed because it was already
  # activated. Returns false if it can't find the path in a gem.

  def self.try_activate(path)
    # finds the _latest_ version... regardless of loaded specs and their deps
    # if another gem had a requirement that would mean we shouldn't
    # activate the latest version, then either it would already be activated
    # or if it was ambiguous (and thus unresolved) the code in our custom
    # require will try to activate the more specific version.

    spec = Gem::Specification.find_by_path path
    return false unless spec
    return true if spec.activated?

    begin
      spec.activate
    rescue Gem::LoadError # this could fail due to gem dep collisions, go lax
      name = spec.name
      spec = Gem::Specification.find_unloaded_by_path(path)
      spec ||= Gem::Specification.find_by_name(name)
      if spec.nil?
        raise
      else
        spec.activate
      end
    end

    true
  end

  ##
  # The full path to the binary +exec_name+ of the gem +name+, activating it.

  def self.bin_path(name, exec_name = nil, *requirements)
    requirements = Gem::Requirement.default if
      requirements.empty?

    find_spec_for_exe(name, exec_name, requirements).bin_file exec_name
  end

  ##
  # The spec of the gem +name+ whose executable +exec_name+ runs, activated.

  def self.find_and_activate_spec_for_exe(name, exec_name, requirements)
    spec = find_spec_for_exe name, exec_name, requirements

    spec.activate

    # Opal: upstream also runs Gem.finish_resolve here, which asks the
    # resolver (M5) for the gems still unresolved; with only installed gems
    # to choose from, activate above is all there is.
    spec
  end

  # DOC: This method needs documentation
  def self.find_spec_for_exe(name, exec_name, requirements)
    raise ArgumentError, "you must supply exec_name" unless exec_name

    dep = Gem::Dependency.new name, requirements

    loaded = Gem.loaded_specs[name]

    return loaded if loaded && dep.matches_spec?(loaded)

    specs = dep.matching_specs(true)

    specs = specs.find_all do |spec|
      spec.executables.include? exec_name
    end if exec_name

    unless spec = specs.first
      msg = "can't find gem #{dep} with executable #{exec_name}"
      raise Gem::GemNotFoundException, msg
    end

    spec
  end

  ##
  # Activates and loads the binary +exec_name+ of gem +name+.

  def self.activate_and_load_bin_path(name, exec_name = nil, *requirements)
    load find_and_activate_spec_for_exe(name, exec_name, requirements).bin_file(exec_name)
  end

  ##
  # Activates the binary +exec_name+ of gem +name+ and answers its path.

  def self.activate_bin_path(name, exec_name = nil, *requirements) # :nodoc:
    find_and_activate_spec_for_exe(name, exec_name, requirements).bin_file exec_name
  end

  ##
  # The mode a file holding bytes is read and written with.

  def self.binary_mode
    "rb"
  end

  ##
  # The path where gem executables are to be installed.

  def self.bindir(install_dir = Gem.dir)
    return File.join install_dir, "bin" unless
      install_dir.to_s == Gem.default_dir.to_s
    Gem.default_bindir
  end

  ##
  # Compresses +data+ with zlib.

  def self.deflate(data)
    require "zlib"
    Zlib::Deflate.deflate data
  end

  ##
  # Ensure the Gem directory +dir+ contains all the proper
  # subdirectories. If we can't create a directory due to a permission
  # problem, then we will silently continue.
  #
  # If +mode+ is given, missing directories are created with this mode.
  #
  # World-writable directories will never be created.

  def self.ensure_gem_subdirectories(dir = Gem.dir, mode = nil)
    ensure_subdirectories(dir, mode, REPOSITORY_SUBDIRECTORIES)
  end

  def self.ensure_subdirectories(dir, mode, subdirs) # :nodoc:
    old_umask = File.umask
    File.umask old_umask | 0o002

    options = {}

    options[:mode] = mode if mode

    subdirs.each do |name|
      subdir = File.join dir, name
      next if File.exist? subdir

      require "fileutils"

      begin
        FileUtils.mkdir_p subdir, **options
      rescue SystemCallError
      end
    end
  ensure
    File.umask old_umask
  end

  ##
  # Adds a hook that runs after Gem::Ext::Builder::build_extensions finishes
  # (with or without an error).

  def self.post_build(&hook)
    @post_build_hooks << hook
  end

  ##
  # Adds a post-install hook that will be passed an Gem::Installer instance
  # when Gem::Installer#install is called

  def self.post_install(&hook)
    @post_install_hooks << hook
  end

  ##
  # Adds a post-installs hook that will be passed a Gem::DependencyInstaller
  # and a list of installed specifications when
  # Gem::DependencyInstaller#install is complete

  def self.done_installing(&hook)
    @done_installing_hooks << hook
  end

  ##
  # Adds a hook that will get run after Gem::Specification.reset is
  # run.

  def self.post_reset(&hook)
    @post_reset_hooks << hook
  end

  ##
  # Adds a post-uninstall hook that will be passed a Gem::Uninstaller instance
  # and the spec that was uninstalled when Gem::Uninstaller#uninstall is
  # called

  def self.post_uninstall(&hook)
    @post_uninstall_hooks << hook
  end

  ##
  # Adds a pre-install hook that will be passed an Gem::Installer instance
  # when Gem::Installer#install is called.  If the hook returns +false+ then
  # the install will be aborted.

  def self.pre_install(&hook)
    @pre_install_hooks << hook
  end

  ##
  # Adds a hook that will get run before Gem::Specification.reset is
  # run.

  def self.pre_reset(&hook)
    @pre_reset_hooks << hook
  end

  ##
  # Adds a pre-uninstall hook that will be passed an Gem::Uninstaller instance
  # and the spec that will be uninstalled when Gem::Uninstaller#uninstall is
  # called

  def self.pre_uninstall(&hook)
    @pre_uninstall_hooks << hook
  end

  ##
  # Safely read a file in binary mode on all platforms.

  def self.read_binary(path)
    File.binread(path)
  end

  ##
  # Atomically write a file in binary mode on all platforms.

  def self.write_binary(path, data)
    Gem::AtomicFileWriter.open(path) do |file|
      file.write(data)
    end
  end

  ##
  # Open a file with given flags, and protect access with a lock.
  #
  # Opal: Node.js has no flock (upstream's open_file_with_flock), so the lock
  # is a file created exclusively, `<path>.lock`, and held until the block
  # returns: another process asking for it waits, and takes it over once it
  # is older than Gem::LOCK_TIMEOUT seconds, which is how long a stuck process
  # may keep it. Only cross-process locking is here: separate gem commands
  # need it, and nothing in this port locks inside one process (GEMS.md D13).

  LOCK_TIMEOUT = 30 # seconds

  def self.open_file_with_lock(path, &block)
    file_lock = "#{path}.lock"
    open_file_with_flock(file_lock, &block)
  ensure
    require "fileutils"
    FileUtils.rm_f file_lock
  end

  def self.open_file_with_flock(path, &block) # :nodoc:
    require "time"

    deadline = Time.now + LOCK_TIMEOUT

    io = nil
    warned = false
    loop do
      begin
        io = File.open(path, File::CREAT | File::EXCL | File::WRONLY)
        break
      rescue Errno::EEXIST
        # Steal a lock that its owner died holding.
        if File.exist?(path) && Time.now - File.mtime(path) > LOCK_TIMEOUT
          require "fileutils"
          FileUtils.rm_f path
          retry
        end

        unless warned
          warned = true
          warn "Waiting for another process to let go of lock: #{path}"
        end
        raise "timed out waiting for lock: #{path}" if Time.now > deadline

        sleep 0.05
      end
    end

    begin
      io.puts Process.pid
      yield io
    ensure
      io.close unless io.closed?
    end
  end

  ##
  # The path to the running Ruby interpreter.
  #
  # Opal: there is no RbConfig to ask. A gem's binstub runs with this, so it
  # names whichever `ruby` command speaks Opal: $RUBY when the environment
  # says one, otherwise the plain command name, which finds the `ruby` of the
  # PATH (exe/ruby, built by tasks/ruby.mjs, is such a command).

  def self.ruby
    @ruby ||= begin
      found = ENV["RUBY"] || "ruby"
      %("#{found}") # a path with a space in it needs the quotes, as upstream's does
    end
  end

  ##
  # The name of the ruby command, without a directory or an extension.

  def self.ruby_install_name
    ENV["RUBY"] ? File.basename(ENV["RUBY"]) : "ruby"
  end

  ##
  # The version of the RubyGems behaviour implemented here, as a Version.

  def self.rubygems_version
    return @rubygems_version if defined? @rubygems_version
    @rubygems_version = Gem::Version.new Gem::VERSION
  end

  ##
  # Reports how long +block+ took, when verbose.

  def self.time(msg, width = 0, display = Gem.configuration.verbose)
    now = Time.now

    value = yield

    elapsed = Time.now - now

    ui.say format("%2$*1$s: %3$3.3fs", -width, msg, elapsed) if display

    value
  end
end

# frozen_string_literal: true

# Opal: the install command, as upstream writes it, with four things taken out
# because the machinery behind them is out of scope (§1) or of a later
# milestone (see also lib/rubygems/install_update_options.rb, which drops the
# options those parts read):
#
# * install_from_gemdeps and its `gemdeps` branch: `gem install -g` runs
#   Gem::RequestSet#install_from_gemdeps, left out with the git, vendor and
#   lock sets. The description section about gem dependency files goes with it.
# * load_hooks, which pulls in the post-install message printer and the rdoc
#   and ri document generators: no documentation and no plugins here.
# * Gem::UpdateSuggestion, which offers to run `gem update --system`: this port
#   is not a RubyGems installation that can update itself, and the class reads
#   Gem::CIDetector and the state file that goes with it.
# * Gem::Cooldown.output_skipped_summary, Gem::Cooldown not being ported (M5).
#   The @cooldown_skipped list stays, as Gem::DependencyInstaller#cooldown_skipped
#   answers the empty list upstream's cooldown would have filled.
#
# The upstream file also requires ../validator, which it never uses here; the
# port leaves that require out because Gem::Validator is not ported.

require_relative "../command"
require_relative "../install_update_options"
require_relative "../dependency_installer"
require_relative "../local_remote_options"
require_relative "../version_option"

##
# Gem installer command line tool
#
# See `gem help install`

class Gem::Commands::InstallCommand < Gem::Command
  attr_reader :installed_specs # :nodoc:

  include Gem::VersionOption
  include Gem::LocalRemoteOptions
  include Gem::InstallUpdateOptions

  def initialize
    defaults = Gem::DependencyInstaller::DEFAULT_OPTIONS.merge({
      format_executable: false,
      lock: true,
      suggest_alternate: true,
      version: Gem::Requirement.default,
      without_groups: [],
    })

    defaults.merge!(install_update_options)

    super "install", "Install a gem into the local repository", defaults

    add_install_update_options
    add_local_remote_options
    add_platform_option
    add_version_option
    add_prerelease_option "to be installed. (Only for listed gems)"

    @installed_specs = []
  end

  def arguments # :nodoc:
    "GEMNAME       name of gem to install"
  end

  def defaults_str # :nodoc:
    "--both --version '#{Gem::Requirement.default}' --no-force\n" \
      "--install-dir #{Gem.dir} --lock\n" +
      install_update_defaults_str
  end

  def description # :nodoc:
    <<-EOF
The install command installs local or remote gem into a gem repository.

For gems with executables ruby installs a wrapper file into the executable
directory by default.  This can be overridden with the --no-wrappers option.
The wrapper allows you to choose among alternate gem versions using _version_.

For example `rake _0.7.3_ --version` will run rake version 0.7.3 if a newer
version is also installed.

Extension Install Failures
==========================

If an extension fails to compile during gem installation the gem
specification is not written out, but the gem remains unpacked in the
repository.  You may need to specify the path to the library's headers and
libraries to continue.  You can do this by adding a -- between RubyGems'
options and the extension's build options:

  $ gem install some_extension_gem
  [build fails]
  Gem files will remain installed in \\
  /path/to/gems/some_extension_gem-1.0 for inspection.
  Results logged to /path/to/build_info/some_extension_gem-1.0.gem_make.out
  $ gem install some_extension_gem -- --with-extension-lib=/path/to/lib
  [build succeeds]
  $ gem list some_extension_gem

  *** LOCAL GEMS ***

  some_extension_gem (1.0)
  $

If you correct the compilation errors by editing the gem files you will need
to write the specification by hand.  For example:

  $ gem install some_extension_gem
  [build fails]
  Gem files will remain installed in \\
  /path/to/gems/some_extension_gem-1.0 for inspection.
  Results logged to /path/to/build_info/some_extension_gem-1.0.gem_make.out
  $ [cd /path/to/gems/some_extension_gem-1.0]
  $ [edit files or what-have-you and run make]
  $ gem spec ../../cache/some_extension_gem-1.0.gem --ruby > \\
             ../../specifications/some_extension_gem-1.0.gemspec
  $ gem list some_extension_gem

  *** LOCAL GEMS ***

  some_extension_gem (1.0)
  $

Command Alias
==========================

You can use `i` command instead of `install`.

  $ gem i GEMNAME

    EOF
  end

  def usage # :nodoc:
    "#{program_name} [options] GEMNAME [GEMNAME ...] -- --build-flags"
  end

  def check_version # :nodoc:
    if options[:version] != Gem::Requirement.default &&
       get_all_gem_names.size > 1
      alert_error "Can't use --version with multiple gems. You can specify multiple gems with" \
                  " version requirements using `gem install 'my_gem:1.0.0' 'my_other_gem:>=2'`"
      terminate_interaction 1
    end
  end

  def execute
    @installed_specs = []
    @cooldown_skipped = []

    ENV.delete "GEM_PATH" if options[:install_dir].nil?

    check_version

    exit_code = install_gems

    compile_installed if options[:compile]

    show_installed

    terminate_interaction exit_code
  end

  def install_gem(name, version) # :nodoc:
    return if options[:conservative] &&
              !Gem::Dependency.new(name, version).matching_specs.empty?

    req = Gem::Requirement.create(version)

    dinst = Gem::DependencyInstaller.new options

    request_set = dinst.resolve_dependencies name, req

    if options[:explain]
      say "Gems to install:"

      request_set.sorted_requests.each do |activation_request|
        say "  #{activation_request.full_name}"
      end
    else
      @installed_specs.concat request_set.install options
    end

    (@cooldown_skipped ||= []).concat dinst.cooldown_skipped

    show_install_errors dinst.errors
  end

  def install_gems # :nodoc:
    exit_code = 0

    get_all_gem_names_and_versions.each do |gem_name, gem_version|
      gem_version ||= options[:version]
      domain = options[:domain]
      domain = :local unless options[:suggest_alternate]
      suppress_suggestions = (domain == :local)

      begin
        install_gem gem_name, gem_version
      rescue Gem::InstallError => e
        alert_error "Error installing #{gem_name}:\n\t#{e.message}"
        exit_code |= 1
      rescue Gem::DependencyResolutionError => e
        alert_error "Error installing #{gem_name}:\n\t#{e.message}"
        exit_code |= 2
      rescue Gem::UnsatisfiableDependencyError => e
        show_lookup_failure e.name, e.version, e.errors, suppress_suggestions,
                            "'#{gem_name}' (#{gem_version})"

        exit_code |= 2
      end
    end

    exit_code
  end

  def show_install_errors(errors) # :nodoc:
    return unless errors

    errors.each do |x|
      next unless Gem::SourceFetchProblem === x

      require_relative "../uri"
      msg = "Unable to pull data from '#{Gem::Uri.redact(x.source.uri)}': #{x.error.message}"

      alert_warning msg
    end
  end

  # Opal: what --compile asks for (D7) - run gem compile's work over each
  # spec this run installed. The gems are installed by the time this runs
  # and the compile is an optimization: a file the compiler cannot read is
  # reported and left out, its .rb answering that require, and neither a
  # failure nor anything else changes the exit status of an install that
  # succeeded, the way `gem compile` alone would answer for it.
  def compile_installed # :nodoc:
    require "opal-parser" # the compiler the output is made of, as CompileCommand takes it

    @installed_specs.each do |spec|
      written, failed = Gem::CompiledTree.compile(spec)

      failed.each do |logical, e|
        alert_warning "Cannot compile #{logical} of #{spec.full_name}: #{e.class}: #{e.message}"
      end

      verbose { "Compiled #{written} #{written == 1 ? "file" : "files"} for #{spec.full_name}" }
    end
  end

  def show_installed # :nodoc:
    return if @installed_specs.empty?

    gems = @installed_specs.length == 1 ? "gem" : "gems"
    say "#{@installed_specs.length} #{gems} installed"
  end
end

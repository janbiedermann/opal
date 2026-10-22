# frozen_string_literal: true

module Bundler
  # Opal: upstream's CLI is a Thor subcommand - bundler vendors Thor, and
  # desc/long_desc/method_option/map, the help rendering and dispatch all
  # come from it. The port vendors no Thor, and keeps the same entry points
  # (.start, the constants, the per-command methods the exe and
  # auto_install reach) while driving argv through a scanner of its own:
  # the OPTIONS tables below restate upstream's per-command method_option
  # declarations (name, type, switches, default, lazy_default, repeatable),
  # and the parser builds the same options hash Thor handed the command
  # classes - where upstream read a key as a Symbol or a String makes no
  # difference here, since the port's Symbol is a String. Three Thor
  # surfaces stay out: the man pages and help text were never bundled (help
  # prints these tables), warn_on_outdated_bundler needs the compact-index
  # fetcher of M8.4, and handle_no_command_error would exec a
  # bundler-#{command} executable this port does not ship, so an unknown
  # command answers the message Thor itself would print.
  class CLI
    require_relative "cli/common"
    require_relative "cli/install"

    AUTO_INSTALL_CMDS = %w[show binstubs outdated exec open console licenses clean].freeze
    PARSEABLE_COMMANDS = %w[check config help exec platform show version].freeze

    COMMAND_ALIASES = {
      "check" => "c",
      "install" => "i",
      "plugin" => "",
      "list" => "ls",
      "exec" => ["e", "ex", "exe"],
      "cache" => ["package", "pack"],
      "version" => ["-v", "--version"],
    }.freeze

    # The class_options every command carries, and the per-command
    # method_option tables: name => type, extra switches, pre-set default,
    # lazy_default for a flag given bare, and whether repeats collect.
    GLOBAL_OPTIONS = {
      "no-color" => {type: :boolean},
      "retry" => {type: :numeric, switches: ["-r"], desc: "Specify the number of times you wish to attempt network commands"},
      "verbose" => {type: :boolean, switches: ["-V"], desc: "Enable verbose output mode"},
    }.freeze

    OPTIONS = {
      "install" => {
        "binstubs" => {type: :string, desc: "Generate bin stubs for bundled gems to ./bin (removed)"},
        "clean" => {type: :boolean, desc: "Run bundle clean automatically after install (removed)"},
        "deployment" => {type: :boolean, desc: "Install using defaults tuned for deployment environments (removed)"},
        "frozen" => {type: :boolean, desc: "Do not allow the Gemfile.lock to be updated after this install (removed)"},
        "full-index" => {type: :boolean, desc: "Fall back to using the single-file index of all gems"},
        "gemfile" => {type: :string, desc: "Use the specified gemfile instead of Gemfile"},
        "jobs" => {type: :numeric, switches: ["-j"], desc: "Specify the number of jobs to run in parallel"},
        "local" => {type: :boolean, desc: "Do not attempt to fetch gems remotely and use the gem cache instead"},
        "lockfile" => {type: :string, desc: "Use the specified lockfile instead of the default."},
        "prefer-local" => {type: :boolean, desc: "Only attempt to fetch gems remotely if not present locally, even if newer versions are available remotely"},
        "no-cache" => {type: :boolean, desc: "Don't update the existing gem cache."},
        "no-lock" => {type: :boolean, desc: "Don't create a lockfile."},
        "force" => {type: :boolean, desc: "Force reinstalling every gem, even if already installed"},
        "redownload" => {type: :boolean, desc: "Alias of --force"},
        "no-prune" => {type: :boolean, desc: "Don't remove stale gems from the cache (removed)."},
        "path" => {type: :string, desc: "Specify a different path than the system default (removed)."},
        "quiet" => {type: :boolean, desc: "Only output warnings and errors."},
        "shebang" => {type: :string, desc: "Specify a different shebang executable name than the default (removed)"},
        "standalone" => {type: :array, lazy_default: [], desc: "Make a bundle that can work without the Bundler runtime"},
        "system" => {type: :boolean, desc: "Install to the system location (removed)"},
        "trust-policy" => {type: :string, switches: ["-P"], desc: "Gem trust policy (like gem install -P)"},
        "target-rbconfig" => {type: :string, desc: "Path to rbconfig.rb for the deployment target platform"},
        "without" => {type: :array, desc: "Exclude gems that are part of the specified named group (removed)."},
        "with" => {type: :array, desc: "Include gems that are part of the specified named group (removed)."},
        "cooldown" => {type: :numeric, desc: "Only consider gem versions published at least N days ago. Use 0 to disable."},
      },
      "check" => {
        "dry-run" => {type: :boolean, default: false, desc: "Lock the Gemfile"},
        "gemfile" => {type: :string, desc: "Use the specified gemfile instead of Gemfile"},
        "path" => {type: :string, desc: "Specify a different path than the system default (removed)"},
      },
      "list" => {
        "name-only" => {type: :boolean, desc: "print only the gem names"},
        "only-group" => {type: :array, default: [], desc: "print gems from a given set of groups"},
        "without-group" => {type: :array, default: [], desc: "print all gems except from a given set of groups"},
        "format" => {type: :string, desc: "format output ('json' is the only supported format)"},
        "paths" => {type: :boolean, desc: "print the path to each gem in the bundle"},
      },
      "lock" => {
        "update" => {type: :array, lazy_default: true, repeatable: true, desc: "ignore the existing lockfile, update all gems by default, or update list of given gems"},
        "local" => {type: :boolean, default: false, desc: "do not attempt to fetch remote gemspecs and use the local gem cache only"},
        "print" => {type: :boolean, default: false, desc: "print the lockfile to STDOUT instead of writing to the file system"},
        "gemfile" => {type: :string, desc: "Use the specified gemfile instead of Gemfile"},
        "lockfile" => {type: :string, default: nil, desc: "the path the lockfile should be written to"},
        "full-index" => {type: :boolean, default: false, desc: "Fall back to using the single-file index of all gems"},
        "add-checksums" => {type: :boolean, default: false, desc: "Adds checksums to the lockfile"},
        "add-platform" => {type: :array, default: [], repeatable: true, desc: "Add a new platform to the lockfile"},
        "remove-platform" => {type: :array, default: [], repeatable: true, desc: "Remove a platform from the lockfile"},
        "normalize-platforms" => {type: :boolean, default: false, desc: "Normalize lockfile platforms"},
        "patch" => {type: :boolean, desc: "If updating, prefer updating only to next patch version"},
        "minor" => {type: :boolean, desc: "If updating, prefer updating only to next minor version"},
        "major" => {type: :boolean, desc: "If updating, prefer updating to latest major version (default)"},
        "pre" => {type: :boolean, desc: "If updating, always choose the highest allowed version, regardless of prerelease status"},
        "strict" => {type: :boolean, desc: "If updating, do not allow any gem to be updated past latest --patch | --minor | --major"},
        "conservative" => {type: :boolean, desc: "If updating, use bundle install conservative update behavior and do not allow shared dependencies to be updated"},
        "bundler" => {type: :string, lazy_default: ">= #{Bundler::VERSION}", desc: "Update the locked version of bundler"},
        "cooldown" => {type: :numeric, desc: "Only consider gem versions published at least N days ago. Use 0 to disable."},
      },
      "clean" => {
        "dry-run" => {type: :boolean, default: false, desc: "Only print out changes, do not clean gems"},
        "force" => {type: :boolean, default: false, desc: "Forces cleaning up unused gems even if Bundler is configured to use globally installed gems"},
      },
      "version" => {},
      "cli_help" => {},
      "help" => {},
    }.freeze

    def self.start(argv = ARGV, _options = {})
      new(argv).run
    ensure
      Bundler::SharedHelpers.print_major_deprecations!
    end

    def self.all_aliases
      @all_aliases ||= begin
                         command_aliases = {}

                         COMMAND_ALIASES.each do |name, aliases|
                           Array(aliases).each do |one_alias|
                             command_aliases[one_alias] = name
                           end
                         end

                         command_aliases
                       end
    end

    def self.aliases_for(command_name)
      COMMAND_ALIASES.select {|k, _| k == command_name }.invert
    end

    # Opal: Thor's default_command class method, pared to what the port
    # needs: which command a bare `bundle` runs, and its one-time notice.
    def self.default_command
      unless Bundler.settings[:default_cli_command]
        Bundler.ui.info <<~MSG
          In a future version of Bundler, running `bundle` without argument will no longer run `bundle install`.
          Instead, the `cli_help` command will be displayed. Please use `bundle install` explicitly for scripts like CI/CD.
          You can use the future behavior now with `bundle config set default_cli_command cli_help --global`,
          or you can continue to use the current behavior with `bundle config set default_cli_command install --global`.
          This message will be removed after a default_cli_command value is set.

        MSG
      end

      Bundler.settings[:default_cli_command] || "install"
    end

    attr_reader :options, :current_command

    def initialize(argv)
      # @options is set before the parse so the ensure below still has a
      # hash to build the UI from when the parser raises InvalidOption.
      @options = {}
      @help_subject = nil
      tokens = argv.clone.map {|t| t.to_s }

      # Opal: Thor's exe reformats `--help` into `bundle help COMMAND`
      # through reformatted_help_args; the port reads the flag here.
      help_index = tokens.index {|t| t == "-h" || t == "--help" }
      if help_index
        tokens.delete_at(help_index)
        subject_index = tokens.index {|t| !t.start_with?("-") }
        @help_subject = tokens.delete_at(subject_index) if subject_index
        @current_command = "help"
        @options = parse(tokens, OPTIONS["help"])
      else
        @current_command = extract_command!(tokens)
        # `bundle help COMMAND` carries its subject as a positional, like
        # Thor's help method argument; it goes out before the parse.
        if @current_command == "help"
          subject_index = tokens.index {|t| !t.start_with?("-") }
          @help_subject = tokens.delete_at(subject_index) if subject_index
        end
        # an unported command must reach run's "Could not find command"
        # answer rather than the parser's stray-positional one: Thor's
        # option parser likewise never inspects an unknown command's
        # arguments, dispatch fails first.
        @options = parse(tokens, OPTIONS.fetch(@current_command, {})) if OPTIONS.key?(@current_command)
      end

      # Opal: two calls of upstream's initialize are skipped:
      # check_invalid_ext_option guards `bundle gem`, which is unported,
      # and auto_switch asks the self-manager, which has nothing to
      # restart under a locked bundler version.
      unless current_command == "config"
        Bundler.configure_custom_gemfile(options[:gemfile])

        # lock --lockfile works differently than install --lockfile
        unless current_command == "lock"
          custom_lockfile = options[:lockfile] || ENV["BUNDLE_LOCKFILE"] || Bundler.settings[:lockfile]
          if custom_lockfile && !custom_lockfile.empty?
            Bundler::SharedHelpers.set_env "BUNDLE_LOCKFILE", File.expand_path(custom_lockfile)
            reset_settings = true
          end
        end
      end

      Bundler.reset_settings_and_root! if reset_settings

      Bundler.settings.set_command_option_if_given :retry, options[:retry]

      Bundler.auto_install if AUTO_INSTALL_CMDS.include?(current_command)
    ensure
      unprinted_warnings = Bundler.ui.unprinted_warnings
      Bundler.ui = UI::Shell.new(options)
      Bundler.ui.level = "debug" if options[:verbose] || Bundler.settings[:verbose]
      unprinted_warnings.each {|w| Bundler.ui.warn(w) }
    end

    def run
      unless OPTIONS.key?(current_command)
        # Opal: the message Thor's handle_no_command_error answers when no
        # bundler-#{name} executable sits on the PATH either.
        raise InvalidOption, "Could not find command \"#{current_command}\"."
      end
      send(current_command)
    end

    def check
      remembered_flag_deprecation("path")

      require_relative "cli/check"
      Check.new(options).run
    end

    def install
      %w[clean deployment frozen path shebang without with].each do |option|
        remembered_flag_deprecation(option)
      end

      remembered_flag_deprecation("no-prune", option_name: "keep_outdated_cache")

      print_remembered_flag_deprecation("--system", "path.system", "true") if ARGV.include?("--system")

      remembered_flag_deprecation("deployment", negative: true)

      if ARGV.include?("--binstubs")
        removed_message = "The --binstubs option has been removed in favor of `bundle binstubs --all`"
        raise InvalidOption, removed_message
      end

      require_relative "cli/install"
      # Opal: upstream rebinds the `options` method name to a local here;
      # a local by that name would be hoisted over the reader across the
      # whole method in this compiler, so the copy keeps its own name.
      command_options = self.options.dup
      command_options["lockfile"] ||= ENV["BUNDLE_LOCKFILE"]
      Bundler.settings.temporary(no_install: false) do
        Install.new(command_options).run
      end
    rescue GemfileNotFound => error
      cli_help
      raise error # re-raise to show the error and get a failing exit status
    end

    def list
      require_relative "cli/list"
      List.new(options).run
    end

    def lock
      require_relative "cli/lock"
      Lock.new(options).run
    end

    def clean
      require_relative "cli/clean"
      Clean.new(options.dup).run
    end

    def version
      # Opal: upstream stamps "(timestamp commit sha)" through the bundler
      # gem's BuildMetadata, stamped at gem-build time; this port runs no
      # such package, so the version answers bare.
      Bundler.ui.info Bundler.verbose_version
    end

    def cli_help
      version
      Bundler.ui.info "\n"

      # Opal: Thor renders printable_commands through man-page one-line
      # descriptions; the port lists the ported commands directly.
      Bundler.ui.info "Bundler commands:\n\n"
      OPTIONS.each_key do |name|
        next if %w[cli_help help].include?(name)
        Bundler.ui.info "    #{name}"
      end
    end

    def help(cli = @help_subject)
      # the alias table maps alias -> command; a canonical name passes
      # through it unchanged.
      cli = self.class.all_aliases[cli] || cli if cli

      # Opal: man pages ship with the bundler gem and the builder bundles
      # no non-Ruby files, so help prints this file's own option tables.
      if cli.nil?
        cli_help
        return
      end

      unless OPTIONS.key?(cli)
        raise InvalidOption, "Could not find command \"#{cli}\"."
      end

      Bundler.ui.info "bundle #{cli} [options]"
      GLOBAL_OPTIONS.merge(OPTIONS[cli]).each do |name, spec|
        line = "    --#{name}"
        line += " (#{spec[:type]})" unless spec[:type] == :boolean
        line += " #{spec[:desc]}" if spec[:desc]
        Bundler.ui.info line
      end
    end

    private

    def extract_command!(tokens)
      index = tokens.index {|t| !t.start_with?("-") }

      if index
        token = tokens.delete_at(index)
        return self.class.all_aliases[token] || token
      end

      # a flag-only call: `bundle -v` and `bundle --version` map to the
      # version command through the alias table
      alias_index = tokens.index {|t| self.class.all_aliases.key?(t) }
      if alias_index
        token = tokens.delete_at(alias_index)
        return self.class.all_aliases[token]
      end

      self.class.default_command
    end

    def parse(tokens, table)
      options = {}
      table.each {|name, spec| options[name] = spec[:default] if spec.key?(:default) }

      switches = {}
      table.each do |name, spec|
        (Array(spec[:switches]) + ["--#{name}"]).each {|s| switches[s] = name }
      end
      CLI::GLOBAL_OPTIONS.each do |name, spec|
        options[name] = spec[:default] if spec.key?(:default)
        (Array(spec[:switches]) + ["--#{name}"]).each {|s| switches[s] = name }
      end

      i = 0
      while i < tokens.size
        token = tokens[i]
        i += 1

        unless token.start_with?("-")
          # Opal: Thor swept stray positionals into its
          # UnknownArgumentError message; the port rejects them in place.
          raise InvalidOption, "bundle #{current_command} does not take positional argument `#{token}`."
        end

        flag, eq, inline = token.partition("=")

        name = switches[flag]
        negated = false
        if name.nil? && flag.start_with?("--no-")
          base = flag.sub(/\A--no-/, "")
          base_spec = table[base] || CLI::GLOBAL_OPTIONS[base]
          if base_spec && base_spec[:type] == :boolean
            name = base
            negated = true
          end
        end

        if name.nil?
          raise InvalidOption, "Could not find command-line option #{flag}."
        end

        spec = table[name] || CLI::GLOBAL_OPTIONS[name]

        if negated
          value = false
        elsif eq.empty?
          value, consumed = read_option_value(spec, tokens[(i)..])
          i += consumed
        else
          value = cast_inline(spec, inline)
        end

        if spec[:repeatable]
          options[name] = [] unless options[name].is_a?(Array)
          options[name] << value
        else
          options[name] = value
        end
      end

      options
    end

    # Answers [value, consumed-tokens]; consumes the space-separated form
    # Thor's :array options take, and applies lazy_default when a value
    # option is given bare.
    def read_option_value(spec, rest)
      case spec[:type]
      when :boolean
        [true, 0]
      when :numeric
        peek = rest[0]
        return [spec[:lazy_default], 0] if peek.nil? || peek.start_with?("-")
        [peek.to_i, 1]
      when :string
        peek = rest[0]
        return [spec[:lazy_default], 0] if peek.nil? || peek.start_with?("-")
        [peek, 1]
      when :array
        consumed = 0
        collected = []
        rest.each do |t|
          break if t.start_with?("-")
          collected << t
          consumed += 1
        end
        value = collected.empty? ? (spec.key?(:lazy_default) ? spec[:lazy_default] : []) : collected
        [value, consumed]
      end
    end

    def cast_inline(spec, inline)
      case spec[:type]
      when :boolean then Settings.to_bool(inline)
      when :numeric then inline.to_i
      when :array then inline.split(" ")
      else inline
      end
    end

    def flag_passed?(name)
      ARGV.any? {|arg| name == arg.to_s.split("=")[0] }
    end

    def remembered_flag_deprecation(name, negative: false, option_name: nil)
      flag_name = "--#{name}"
      flag_name = "--no-" + name if negative
      return unless flag_passed?(flag_name)

      value = options[name]
      value = value.join(" ").to_s if option_type(name) == :array
      value = "'#{value}'" unless option_type(name) == :boolean

      print_remembered_flag_deprecation(flag_name, option_name || name.tr("-", "_"), value)
    end

    def print_remembered_flag_deprecation(flag_name, option_name, option_value)
      removed_message =
        "The `#{flag_name}` flag has been removed because it relied on being " \
        "remembered across bundler invocations, which bundler no longer does. " \
        "Instead please use `bundle config set #{option_name} #{option_value}`, " \
        "and stop using this flag"
      raise InvalidOption, removed_message
    end

    def option_type(name)
      spec = OPTIONS[current_command][name]
      spec && spec[:type]
    end
  end
end

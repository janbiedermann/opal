# frozen_string_literal: true

# Opal: upstream declared this command as a Thor subcommand class - list,
# get, set and unset are Thor commands, --parseable is a class_option, and
# a hidden default task `base` still translates the Bundler 1 interface
# (`bundle config NAME [VALUE]`, `--delete`). The port's CLI hands the
# positional tokens here and the dispatch in .run rebuilds their shapes;
# the missing-argument guards answer with InvalidOption where Thor raised
# its RequiredArgumentMissingError (both status 15). The `thor` argument
# of upstream's Base only fed Thor's own with_padding, which never styled
# the Bundler.ui lines printed inside it, so it goes.
module Bundler
  class CLI::Config
    SUBCOMMANDS = %w[list get set unset].freeze

    def self.run(args, options)
      case args.first
      when "list"
        Base.new(options, nil, nil).run
      when "get"
        raise InvalidOption, "bundle config get requires a NAME argument." if args.size < 2
        Base.new(options, args[1], nil).run
      when "set"
        raise InvalidOption, "bundle config set requires a NAME and VALUE argument." if args.size < 3
        Base.new(options, args[1], args[2..]).run
      when "unset"
        raise InvalidOption, "bundle config unset requires a NAME argument." if args.size < 2
        options[:delete] = true
        Base.new(options, args[1], nil).run
      when "help"
        Bundler.ui.info "Commands: config get NAME, config list, config set [--global|--local] NAME VALUE, config unset [--global|--local] NAME"
      else
        base(args, options)
      end
    end

    # The Bundler 1 interface upstream still answers, translated with its
    # own deprecation message and reading ARGV as upstream does.
    def self.base(args, options)
      new_args =
        if ARGV.size == 1
          ["config", "list"]
        elsif ARGV.include?("--delete")
          ARGV.map {|arg| arg == "--delete" ? "unset" : arg }
        elsif ARGV.include?("--global") || ARGV.include?("--local") || ARGV.size == 3
          ["config", "set", *ARGV[1..-1]]
        else
          ["config", "get", ARGV[1]]
        end

      message = "Using the `config` command without a subcommand [list, get, set, unset] is deprecated and will be removed in the future. Use `bundle #{new_args.join(" ")}` instead."
      SharedHelpers.feature_deprecated! message

      Base.new(options, args[0], args[1..]).run
    end

    class Base
      attr_reader :name, :value, :options, :scope

      def initialize(options, name, value)
        @options = options
        @name = name
        value = Array(value)
        @value = value.empty? ? nil : value.join(" ")
        validate_scope!
      end

      def run
        unless name
          warn_unused_scope "Ignoring --#{scope}"
          confirm_all
          return
        end

        if options[:delete]
          if !explicit_scope? || scope != "global"
            Bundler.settings.set_local(name, nil)
          end
          if !explicit_scope? || scope != "local"
            Bundler.settings.set_global(name, nil)
          end
          return
        end

        if value.nil?
          warn_unused_scope "Ignoring --#{scope} since no value to set was given"
          current_value = Bundler.settings[name]

          if options[:parseable]
            if value = Bundler.settings[name]
              Bundler.ui.info("#{name}=#{value}")
            end
          else
            confirm(name)
          end

          if current_value.nil? && !Bundler.settings.stored_outside_config_files?(name)
            exit 1
          else
            return
          end
        end

        Bundler.ui.info(message) if message
        Bundler.settings.send("set_#{scope}", name, new_value)
      end

      def confirm_all
        if @options[:parseable]
          # --parseable output is fed back to `bundle config set`, where a
          # placeholder would be read back as the credential itself.
          Bundler.settings.all.each do |setting|
            val = Bundler.settings[setting]
            Bundler.ui.info "#{setting}=#{val}"
          end
        else
          Bundler.ui.confirm "Settings are listed in order of priority. The top value will be used.\n"
          Bundler.settings.all_including_stored_credentials.each do |setting|
            Bundler.ui.confirm setting
            show_pretty_values_for(setting)
            Bundler.ui.confirm ""
          end
        end
      end

      def confirm(name)
        Bundler.ui.confirm "Settings for `#{name}` in order of priority. The top value will be used"
        show_pretty_values_for(name)
      end

      def new_value
        pathname = Pathname.new(value)
        if name.start_with?("local.") && pathname.directory?
          pathname.expand_path.to_s
        else
          value
        end
      end

      def message
        locations = Bundler.settings.locations(name)
        if @options[:parseable]
          "#{name}=#{new_value}" if new_value
        elsif scope == "global"
          if !locations[:local].nil?
            "Your application has set #{name} to #{locations[:local].inspect}. " \
              "This will override the global value you are currently setting"
          elsif locations[:env]
            "You have a bundler environment variable for #{name} set to " \
              "#{locations[:env].inspect}. This will take precedence over the global value you are setting"
          elsif !locations[:global].nil? && locations[:global] != value
            "You are replacing the current global value of #{name}, which is currently " \
              "#{locations[:global].inspect}"
          end
        elsif scope == "local" && !locations[:local].nil? && locations[:local] != value
          "You are replacing the current local value of #{name}, which is currently " \
            "#{locations[:local].inspect}"
        end
      end

      def show_pretty_values_for(setting)
        Bundler.settings.pretty_values_for(setting).each do |line|
          Bundler.ui.info line
        end
      end

      def explicit_scope?
        @explicit_scope
      end

      def warn_unused_scope(msg)
        return unless explicit_scope?
        return if options[:parseable]

        Bundler.ui.warn(msg)
      end

      def validate_scope!
        @explicit_scope = true
        scopes = %w[global local].select {|s| options[s] }
        case scopes.size
        when 0
          @scope = inside_app? ? "local" : "global"
          @explicit_scope = false
        when 1
          @scope = scopes.first
        else
          raise InvalidOption,
            "The options #{scopes.join " and "} were specified. Please only use one of the switches at a time."
        end
      end

      private

      def inside_app?
        Bundler.root
        true
      rescue GemfileNotFound
        false
      end
    end
  end
end

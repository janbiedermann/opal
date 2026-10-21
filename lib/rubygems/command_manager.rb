# frozen_string_literal: true

#--
# Copyright 2006 by Chad Fowler, Rich Kilmer, Jim Weirich and others.
# All rights reserved.
# See LICENSE.txt for permissions.
#++

require_relative "command"
require_relative "user_interaction"
require_relative "text"

##
# The command manager registers and installs all the individual sub-commands
# supported by the gem command.
#
# Extra commands can be provided by writing a rubygems_plugin.rb
# file in an installed gem.  You should register your command against the
# Gem::CommandManager instance, like this:
#
#   # file rubygems_plugin.rb
#   require 'rubygems/command_manager'
#
#   Gem::CommandManager.instance.register_command :edit
#
# You should put the implementation of your command in rubygems/commands.
#
#   # file rubygems/commands/edit_command.rb
#   class Gem::Commands::EditCommand < Gem::Command
#     # ...
#   end
#
# See Gem::Command for instructions on writing gem commands.
#
# Opal: three things differ from upstream, and all three are what §1 leaves out.
#
# * BUILTIN_COMMANDS lists the commands this port carries, not upstream's
#   thirty-odd: the certificate, push/pull/signin/signout, yank, server, exec,
#   open, rdoc, pristine, rebuild, update, generate_index and owner commands are
#   out with signing, documentation, and the git/lock/vendor machinery, and a
#   command that is not listed here is not loaded - it answers UnknownCommand.
#   The list grows as the milestones port them.
# * the plugin hook above cannot fire: no plugins (§1).
# * upstream requires its vendored Timeout for the `Gem::Timeout::Error` the
#   rescue below catches; this port's transport defines that name
#   (vendored_net_http.rb), so it is what the guard asks for.

class Gem::CommandManager
  include Gem::Text
  include Gem::UserInteraction

  BUILTIN_COMMANDS = [ # :nodoc:
    :build,
    :cleanup,
    :contents,
    :dependency,
    :environment,
    :fetch,
    :help,
    :info,
    :install,
    :list,
    :outdated,
    :search,
    :sources,
    :specification,
    :uninstall,
    :unpack,
    :which,
  ].freeze

  ALIAS_COMMANDS = {
    "i" => "install",
  }.freeze

  ##
  # Return the authoritative instance of the command manager.

  def self.instance
    @instance ||= new
  end

  ##
  # Returns self. Allows a CommandManager instance to stand
  # in for the class itself.

  def instance
    self
  end

  ##
  # Reset the authoritative instance of the command manager.

  def self.reset
    @instance = nil
  end

  ##
  # Register all the subcommands supported by the gem command.

  def initialize
    require_relative "vendored_net_http" unless defined?(Gem::Timeout)
    @commands = {}

    BUILTIN_COMMANDS.each do |name|
      register_command name
    end
  end

  ##
  # Register the Symbol +command+ as a gem command.

  def register_command(command, obj = false)
    @commands[command] = obj
  end

  ##
  # Unregister the Symbol +command+ as a gem command.

  def unregister_command(command)
    @commands.delete command
  end

  ##
  # Returns a Command instance for +command_name+

  def [](command_name)
    command_name = command_name.intern
    return nil if @commands[command_name].nil?
    @commands[command_name] ||= load_and_instantiate(command_name)
  end

  ##
  # Return a sorted list of all command names as strings.

  def command_names
    @commands.keys.collect(&:to_s).sort
  end

  ##
  # Run the command specified by +args+.

  def run(args, build_args = nil)
    process_args(args, build_args)
  rescue StandardError, Gem::Timeout::Error => ex
    msg = ex.detailed_message(highlight: false).sub(/\A(.*?)(?: \(.+?\))/) { $1 }
    alert_error clean_text("While executing gem ... (#{ex.class})\n    #{msg}")
    ui.backtrace ex

    terminate_interaction(1)
  rescue Interrupt
    alert_error clean_text("Interrupted")
    terminate_interaction(1)
  end

  def process_args(args, build_args = nil)
    if args.empty?
      say Gem::Command::HELP
      terminate_interaction 1
    end

    case args.first
    when "-h", "--help" then
      say Gem::Command::HELP
      terminate_interaction 0
    when "-v", "--version" then
      say Gem::VERSION
      terminate_interaction 0
    when "-C" then
      args.shift
      start_point = args.shift
      if Dir.exist?(start_point)
        Dir.chdir(start_point) { invoke_command(args, build_args) }
      else
        alert_error clean_text("#{start_point} isn't a directory.")
        terminate_interaction 1
      end
    when /^-/ then
      alert_error clean_text("Invalid option: #{args.first}. See 'gem --help'.")
      terminate_interaction 1
    else
      invoke_command(args, build_args)
    end
  end

  def find_command(cmd_name)
    cmd_name = find_alias_command cmd_name

    possibilities = find_command_possibilities cmd_name

    if possibilities.size > 1
      raise Gem::CommandLineError,
            "Ambiguous command #{cmd_name} matches [#{possibilities.join(", ")}]"
    elsif possibilities.empty?
      raise Gem::UnknownCommandError.new(cmd_name)
    end

    self[possibilities.first]
  end

  def find_alias_command(cmd_name)
    alias_name = ALIAS_COMMANDS[cmd_name]
    alias_name ? alias_name : cmd_name
  end

  def find_command_possibilities(cmd_name)
    len = cmd_name.length

    found = command_names.select {|name| cmd_name == name[0, len] }

    exact = found.find {|name| name == cmd_name }

    exact ? [exact] : found
  end

  private

  def load_and_instantiate(command_name)
    command_name = command_name.to_s
    # Opal: upstream appends "Command" to the name in place (a String#<<), and
    # strings are immutable here, so it is a new string instead.
    const_name = command_name.capitalize.gsub(/_(.)/) { $1.upcase } + "Command"

    # Opal: upstream requires "rubygems/commands/<name>_command" here, inside a
    # rescue LoadError for a command a rubygems_plugin.rb file had already
    # defined, because its commands load lazily. This port requires them eagerly
    # from lib/rubygems.rb (§6: no autoload, so that a compiled bundle carries
    # them), so the file is already here; and a computed require path reads as a
    # static one to the builder, which then asks for a file that cannot exist and
    # makes every build of the port warn. The require and the LoadError rescue
    # are therefore both out, plugins being out of scope as well (§1).
    begin
      Gem::Commands.const_get(const_name).new
    rescue StandardError => e
      alert_error clean_text("Loading command: #{command_name} (#{e.class})\n\t#{e}")
      ui.backtrace e
    end
  end

  def invoke_command(args, build_args)
    cmd_name = args.shift.downcase
    cmd = find_command cmd_name
    terminate_interaction 1 unless cmd
    cmd.deprecation_warning if cmd.deprecated?
    cmd.invoke_with_build_args args, build_args
  end
end

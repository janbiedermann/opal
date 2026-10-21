# frozen_string_literal: true

require "optparse"

require_relative "yaml_serializer"

# The part of RubyGems' configuration a gem command needs: the .gemrc file,
# the GEM_* environment variables and the few options the commands share.
#
# The upstream file is four times this size because it also carries the
# options of the MFA/WebAuthn sign-in flow, the security policy, the
# certificate and the trust policy settings, and the plugin loader. None of
# those exist here: there is no signing, no trust policy and no plugin.
# Options that would ask for them are rejected with a clear message rather
# than accepted and ignored.


#--
# Workaround for directly loading a Gem:: class before the Gem module exists
module Gem; end
#++

class Gem::ConfigFile
  attr_reader :update_sources, :backtrace, :verbose, :bulk_threshold,
    :config_file_name, :force, :silent, :ignore_default, :install_dir,
    :concurrency, :default_sources, :args,
    :cert_expiration_length_days

  attr_accessor :args

  BOOL = { true: true, yes: true, on: true,
           false: false, no: false, off: false }.freeze # :nodoc:

  def initialize(args = [])
    @args = args.dup
    @update_sources = true
    @verbose = true
    @backtrace = false
    @bulk_threshold = 3
    @concurrency = 8
    @default_sources = true
    @force = false
    @silent = false
    @cert_expiration_length_days = nil
    @ignore_default = false
    @sources = nil
    @install_dir = ENV["GEM_HOME"]

    @config_file_name = find_config_file_name args
    @hash = load_config_file

    # The file wins over the defaults, the environment over the file and the
    # command line over both, as upstream does.
    apply_options "file", @hash
    apply_options "environment", env_options
    # The command line is the last word, and what its scan reads comes off @args
    # as it goes: the command manager reads @args itself, and a --backtrace left
    # in front of the command name would read to it as an unknown switch.
    handle_arguments @args
  end

  ##
  # Path of the configuration file actually read, or nil if there was none.

  def find_config_file_name(args)
    index = args.index("--config-file") || args.index("--config")
    return args[index + 1] if index && args[index + 1]

    match = args.find { |arg| arg =~ /^--(?:config-file|config)=(.+)$/ }
    return Regexp.last_match(1) if match

    Gem.config_file
  end

  ##
  # The options that came from the file, for `gem env` and `gem config`.

  def options
    @hash || {}
  end

  def [](key)
    @hash[key.to_s]
  end

  def verbosity
    if @verbose
      @silent ? 0 : 1
    else
      0
    end
  end

  def verbose?
    @verbose && !@silent
  end

  ##
  # Really verbose mode gives the commands extra output: it takes a verbosity
  # beyond the on/off of --verbose, which is what -V counting gives.

  def really_verbose
    case @verbose
    when true, false, nil then false
    else true
    end
  end

  def silent?
    @silent
  end

  def no_version?
    false
  end

  def disable_default_sources
    !@default_sources
  end

  def enable_default_sources
    @default_sources
  end

  ##
  # The sources to look gems up in, in the order they should be tried.

  def sources
    return @sources if @sources

    if @hash["sources"]
      @sources = @hash["sources"]
    elsif @hash[:sources]
      @sources = @hash[:sources]
    else
      @sources = Gem.default_sources
    end
    @sources
  end

  ##
  # Where the HTTP requests go through, if at all.

  def http_proxy
    ENV["http_proxy"] || ENV["HTTP_PROXY"]
  end

  def https_proxy
    ENV["https_proxy"] || ENV["HTTPS_PROXY"] || http_proxy
  end

  def concurrency
    @concurrency
  end

  ##
  # Delegates to the config file's hash, as upstream's does: the four settings
  # the reader already answers for come out first, then what the file added.

  def each(&block)
    hash = @hash.dup
    hash.delete :update_sources
    hash.delete :verbose
    hash.delete :backtrace
    hash.delete :bulk_threshold

    yield :update_sources, @update_sources
    yield :verbose, @verbose
    yield :backtrace, @backtrace
    yield :bulk_threshold, @bulk_threshold

    yield "config_file_name", @config_file_name if @config_file_name

    hash.each(&block)
  end

  ##
  # Writes the file the sources and the shared options live in, as upstream's
  # write does.

  def write
    require "fileutils"

    FileUtils.mkdir_p File.dirname(config_file_name)

    # Opal: upstream writes Psych's to_yaml; there is no Psych here, so the
    # port's own YAMLSerializer writes the hash - which is the shape a .gemrc
    # is read back from.
    File.open config_file_name, "w" do |io|
      io.write Gem::YAMLSerializer.dump(to_yaml)
    end
  end

  # to_yaml only overwrites things you can't override on the command line.
  #
  # Opal: upstream fetches the five settings from @hash with its DEFAULT_*
  # constants as the fallback; this trimmed file has no such constants and
  # keeps the resolved values in ivars, so those - the file, then the
  # environment, then the command line - are what a write answers. The source
  # list is written as URIs, for a Gem::Source has no YAML form here.
  def to_yaml # :nodoc:
    yaml_hash = {}
    yaml_hash[:backtrace] = @backtrace
    yaml_hash[:bulk_threshold] = @bulk_threshold
    yaml_hash[:sources] = Gem.sources.to_a.map {|source| source.to_s }
    yaml_hash[:update_sources] = @update_sources
    yaml_hash[:verbose] = @verbose
    yaml_hash[:concurrent_downloads] = @concurrency

    keys = yaml_hash.keys.map(&:to_s)
    keys << "debug"
    re = Regexp.union(*keys)

    @hash.each do |key, value|
      key = key.to_s
      next if key&.match?(re)

      yaml_hash[key] = value
    end

    yaml_hash
  end

  ##
  # Reads the options the commands share off the head of the command line, as
  # upstream's handle_arguments reads the few it needs there, and stops at the
  # first argument that is not one of them: what it reads is taken off ARG_LIST,
  # so the command does not meet it twice, and what it does not know stays where
  # it is for the command manager to refuse or the command to take.
  #
  # Upstream reads --backtrace, --debug and --norc here; this trimmed file also
  # reads the verbosity pair, --config-file, --install-dir, --no-interactive and
  # --[no-]default-sources. Neither reads them with optparse: the standard
  # library's parser answers --help and --version for every parser of its own
  # accord (its Officious table), where --version aborts the process when the
  # parser has no version of its own, and it also takes an unknown option off
  # the list before raising, which would hide a `gem --frobnicate` from the
  # command manager that has to answer for it. What the loop below gives up, in
  # exchange, is optparse's abbreviation of a long option and its clustered
  # short ones: --verb and -qN are not read here.

  def handle_arguments(arg_list)
    while (argument = arg_list.first)
      break unless argument.start_with?("-") && argument != "-"

      name, value = argument.split("=", 2)
      takes_value = false

      case name
      when "--verbose" then @verbose = true
      when "--no-verbose" then @verbose = false
      when "-V" then @verbose = (@verbose.is_a?(Integer) ? @verbose : 1) + 1
      when "-q", "--quiet" then @verbose = false; @silent = true
      when "--backtrace" then @backtrace = true
      when "--no-backtrace" then @backtrace = false
      when "-N", "--no-interactive" then @force = true
      when "--default-sources" then @default_sources = true
      when "--no-default-sources" then @default_sources = false
      when "--config-file", "--config"
        takes_value = true
        @config_file_name = value || arg_list[1]
      when "-i", "--install-dir"
        takes_value = true
        @install_dir = value || arg_list[1]
      else
        break
      end

      arg_list.shift
      arg_list.shift if takes_value && value.nil?
    end

    arg_list
  end

  private

  def load_config_file
    return {} unless @config_file_name && File.exist?(@config_file_name)

    config = Gem::YAMLSerializer.load File.read(@config_file_name)
    # A .gemrc whose top level is not a mapping would blow up further down.
    return {} unless config.is_a?(Hash)

    self.class.deep_transform_config_keys(config)
  rescue StandardError, SyntaxError => e
    raise Gem::FilePermissionError, "Problem loading config file #{@config_file_name}: #{e.message}"
  end

  ##
  # The YAMLSerializer reads a .gemrc into strings; the keys of RubyGems
  # options are written ":verbose" and the values "false", so both sides are
  # turned into what the options take. Upstream mutates the hash in place;
  # Opal strings have no in-place methods, so this builds the new hash.

  def self.deep_transform_config_keys(config)
    config.each_with_object({}) do |(key, value), out|
      out[transform_config_key(key)] = transform_config_value(value)
    end
  end

  def self.transform_config_key(key)
    if key =~ /\A:(.*)\z/
      Regexp.last_match(1)
    elsif key.include?("__") || key.end_with?("/")
      key.gsub(/__/, ".").sub(%r{/\z}, "")
    else
      key
    end
  end

  def self.transform_config_value(value)
    case value
    when String
      if value =~ /\A:(.*)\z/
        Regexp.last_match(1)
      elsif value =~ /\A[+-]?\d+\z/
        value.to_i
      elsif value =~ /\A(?:true|false)\z/
        value == "true"
      elsif value.empty?
        nil
      else
        value
      end
    when Array
      value.map { |element| transform_config_value(element) }
    when Hash
      deep_transform_config_keys(value)
    else
      value
    end
  end

  def env_options
    options = {}
    options[:update_sources] = false if ENV["GEM_SKIP_UPDATE"]
    options[:sources] = ENV["GEM_SOURCES"].split(",") if ENV["GEM_SOURCES"]
    options[:verbose] = false if ENV["GEM_QUIET"]
    options[:backtrace] = ENV["GEM_BACKTRACE"] ? true : nil
    options.compact
  end

  def apply_options(_from, options)
    return unless options

    options.each do |key, value|
      key = key.to_sym
      next if value.nil?

      case key
      when :update_sources, :verbose, :backtrace, :force, :silent,
        :ignore_default, :default_sources
        instance_variable_set "@#{key}", BOOL[value] || value == true
      when :bulk_threshold, :concurrency
        instance_variable_set "@#{key}", value.to_i
      when :install_dir
        @install_dir = value
      when :sources
        @sources = value
      end
    end
  end
end

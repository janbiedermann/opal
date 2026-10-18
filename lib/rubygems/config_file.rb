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
    :concurrency, :default_sources, :args

  attr_accessor :args

  BOOL = { true: true, yes: true, on: true,
           false: false, no: false, off: false }.freeze # :nodoc:

  def initialize(args = [])
    @args = args
    @update_sources = true
    @verbose = true
    @backtrace = false
    @bulk_threshold = 3
    @concurrency = 8
    @default_sources = true
    @force = false
    @silent = false
    @ignore_default = false
    @sources = nil
    @install_dir = ENV["GEM_HOME"]

    @config_file_name = find_config_file_name args
    @hash = load_config_file

    # The file wins over the defaults, the environment over the file and the
    # command line over both, as upstream does.
    apply_options "file", @hash
    apply_options "environment", env_options
    apply_options "command line", get_config_from_options(args)
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
  # The arguments left over for the command itself.

  def handle_options(args)
    parser = options_parser
    parser.parse!(args)
    args
  end

  private

  def options_parser
    OptionParser.new do |opts|
      opts.banner = "Common options:"

      opts.on("--[no-]verbose", "Level of logging") do |v|
        @verbose = v
      end

      opts.on("-q", "--quiet", "Enables quiet mode. Only warnings and errors") do |v|
        @verbose = !v
        @silent = v
      end

      opts.on("--[no-]backtrace", "Enable hiding backtrace information") do |v|
        @backtrace = v
      end

      opts.on("--config-file FILE", "Config file location, default is ~/.gemrc") do |v|
        @config_file_name = v
      end

      opts.on("--config FILE", "Config file location, default is ~/.gemrc") do |v|
        @config_file_name = v
      end

      opts.on("-i", "--install-dir DIR", "Install to the given directory") do |v|
        @install_dir = v
      end

      opts.on("-N", "--no-interactive", "Defaults to 'yes' for questions that arise") do |v|
        @force = v
      end

      opts.on("--no-default-sources", "Default sources (https://rubygems.org) will be ignored") do
        @default_sources = false
      end

      opts.on("--default-sources", "Default sources (https://rubygems.org) will be used") do
        @default_sources = true
      end
    end
  end

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

  def get_config_from_options(args)
    # Only the options the commands share are taken off the command line here;
    # the command then parses the rest of the arguments itself.
    options = {}
    scan = args.dup
    parser = options_parser
    parser.order!(scan)
    options
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

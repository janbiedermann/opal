# frozen_string_literal: true

# Opal: upstream requires "bundler/rubygems_ext" here for the patches it puts
# over a host Gem; the port already runs on the ported Gem, so there is
# nothing to patch under and the require goes.
module Bundler
  # Returns current version of Ruby
  #
  # @return [CurrentRuby] Current version of Ruby
  def self.current_ruby
    @current_ruby ||= CurrentRuby.new
  end

  class CurrentRuby
    ALL_RUBY_VERSIONS = [*18..27, *30..34, *40..41].freeze
    KNOWN_MINOR_VERSIONS = ALL_RUBY_VERSIONS.map {|v| v.digits.reverse.join(".") }.freeze
    KNOWN_MAJOR_VERSIONS = ALL_RUBY_VERSIONS.map {|v| v.digits.last.to_s }.uniq.freeze
    PLATFORM_MAP = {
      ruby: [Gem::Platform::RUBY, CurrentRuby::ALL_RUBY_VERSIONS],
      mri: [Gem::Platform::RUBY, CurrentRuby::ALL_RUBY_VERSIONS],
      rbx: [Gem::Platform::RUBY],
      truffleruby: [Gem::Platform::RUBY],
      jruby: [Gem::Platform::JAVA, [18, 19]],
      windows: [Gem::Platform::WINDOWS, CurrentRuby::ALL_RUBY_VERSIONS],
      # deprecated
      mswin: [Gem::Platform::MSWIN, CurrentRuby::ALL_RUBY_VERSIONS],
      mswin64: [Gem::Platform::MSWIN64, CurrentRuby::ALL_RUBY_VERSIONS - [18]],
      mingw: [Gem::Platform::UNIVERSAL_MINGW, CurrentRuby::ALL_RUBY_VERSIONS],
      x64_mingw: [Gem::Platform::UNIVERSAL_MINGW, CurrentRuby::ALL_RUBY_VERSIONS - [18, 19]],
    }.each_with_object({}) do |(platform, spec), hash|
      hash[platform] = spec[0]
      spec[1]&.each {|version| hash[:"#{platform}_#{version}"] = spec[0] }
    end.freeze

    # Opal: upstream reads the RUBY_ENGINE constant to answer these engine
    # predicates. On Opal that constant is "opal", so none of the engines it
    # tests - ruby, rbx, maglev, truffleruby, jruby - ever match: the engine
    # halves of the answers are gone and what survives is what Opal always
    # answered. The predicates stay as methods because PLATFORM_MAP generates
    # the `#{platform}_#{version}?` predicates from their names, and Gemfile
    # platform matching sends them.

    def ruby?
      Bundler::MatchPlatform.generic_local_platform_is_ruby?
    end

    def mri?
      false
    end

    def rbx?
      false
    end

    def jruby?
      false
    end

    def maglev?
      removed_message =
        "`CurrentRuby#maglev?` was removed with no replacement. Please use the " \
        "built-in Ruby `RUBY_ENGINE` constant to check the Ruby implementation you are running on."
      SharedHelpers.feature_removed!(removed_message)
    end

    def truffleruby?
      false
    end

    def windows?
      Gem.win_platform?
    end
    alias_method :mswin?, :windows?
    alias_method :mswin64?, :windows?
    alias_method :mingw?, :windows?
    alias_method :x64_mingw?, :windows?

    (KNOWN_MINOR_VERSIONS + KNOWN_MAJOR_VERSIONS).each do |version|
      trimmed_version = version.tr(".", "")
      define_method(:"on_#{trimmed_version}?") do
        RUBY_VERSION.start_with?("#{version}.")
      end

      PLATFORM_MAP.keys.each do |platform|
        define_method(:"#{platform}_#{trimmed_version}?") do
          send(:"#{platform}?") && send(:"on_#{trimmed_version}?")
        end
      end

      define_method(:"maglev_#{trimmed_version}?") do
        removed_message =
          "`CurrentRuby##{__method__}` was removed with no replacement. Please use the " \
          "built-in Ruby `RUBY_ENGINE` and `RUBY_VERSION` constants to perform a similar check."

        SharedHelpers.feature_removed!(removed_message)

        send(:"maglev?") && send(:"on_#{trimmed_version}?")
      end
    end
  end
end

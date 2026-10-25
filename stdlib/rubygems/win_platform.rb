# frozen_string_literal: true

module Gem
  ##
  # An Array of Regexps that match windows Ruby platforms.

  WIN_PATTERNS = [
    /mingw/i,
    /mswin/i,
  ].freeze

  @@win_platform = nil

  ##
  # Is this a windows platform? The runtime's platform name answers it: Opal
  # has no RbConfig to ask, and it does not run on a Windows engine.

  def self.win_platform?
    return @@win_platform unless @@win_platform.nil?

    @@win_platform = !WIN_PATTERNS.find { |r| RUBY_PLATFORM =~ r }.nil?
  end
end

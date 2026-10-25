# frozen_string_literal: true

module Bundler
  module ForcePlatform
    # The `:force_ruby_platform` value used by dependencies for resolution, and
    # by locked specifications for materialization is `false` by default.
    # Upstream answers true only on TruffleRuby, whose native extensions can
    # still match the RUBY platform; there is no such engine here.

    def default_force_ruby_platform
      false
    end
  end
end

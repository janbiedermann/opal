# frozen_string_literal: true

##
# Keeps a `BUNDLER_VERSION` in the environment in front of the bundler gems a
# lookup would otherwise answer with.
#
# Upstream also reads the lockfile of the application and the version bundler
# itself was activated with; that part belongs to bundler, which is ported on
# its own, so this file only covers what the environment says.
module Gem
  module BundlerVersionFinder
    def self.prioritize!(specs)
      version = ENV["BUNDLER_VERSION"]
      return specs if !version || version.empty?

      wanted, rest = specs.partition { |spec| spec.version.to_s == version }
      wanted + rest
    end
  end
end

# frozen_string_literal: true

# Opal: upstream autoloads Injector from the bundler root; this port resolves
# requires at compile time, so the file names it here.
require_relative "../injector"

module Bundler
  class CLI::Remove
    def initialize(gems, options)
      @gems = gems
      @options = options
    end

    def run
      raise InvalidOption, "Please specify gems to remove." if @gems.empty?

      Injector.remove(@gems, {})
      Installer.install(Bundler.root, Bundler.definition)
    end
  end
end

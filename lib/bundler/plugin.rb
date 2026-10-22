# frozen_string_literal: true

# Opal: Bundler's plugin system is not ported (see the omissions in GEMS.md):
# it installs plugin gems, loads them at boot and drives them through commands.
# The module exists because the lockfile parser dispatches its PLUGIN SOURCE
# section here and SourceList's plugin commands call it; those answer with a
# PluginError saying so, and the fetch hooks - plugins only watch them - do
# nothing.
module Bundler
  module Plugin
    NOT_PORTED = "Bundler's plugin system is not ported to Opal"

    def self.from_lock(options)
      raise PluginError, NOT_PORTED
    end

    def self.source(name)
      raise PluginError, NOT_PORTED
    end

    def self.hook(event, *args); end

    module Events
      GEM_BEFORE_FETCH = :gem_before_fetch
      GEM_AFTER_FETCH = :gem_after_fetch
    end
  end
end

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

    # The DSL's `source ..., type:` asks which plugin provides a source type;
    # with no plugin system the answer is always none, and the DSL then
    # raises InvalidOption for the requested type.
    def self.source_plugin(type)
      nil
    end

    def self.hook(event, *args); end

    # Upstream defines its event names in plugin/events.rb; the hooks are
    # no-ops here, the constants only need to exist for the call sites.
    module Events
      GEM_BEFORE_EVAL = "before-eval"
      GEM_AFTER_EVAL = "after-eval"
      GEM_BEFORE_INSTALL_ALL = "before-install-all"
      GEM_BEFORE_FETCH = "before-fetch"
      GEM_AFTER_FETCH = "after-fetch"
      GIT_BEFORE_FETCH = "before-git-fetch"
      GIT_AFTER_FETCH = "after-git-fetch"
      GEM_BEFORE_INSTALL = "before-install"
      GEM_AFTER_INSTALL = "after-install"
      GEM_AFTER_INSTALL_ALL = "after-install-all"
      GEM_BEFORE_REQUIRE_ALL = "before-require-all"
      GEM_BEFORE_REQUIRE = "before-require"
      GEM_AFTER_REQUIRE = "after-require"
      GEM_AFTER_REQUIRE_ALL = "after-require-all"
    end
  end
end

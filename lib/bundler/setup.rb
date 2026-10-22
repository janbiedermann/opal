# frozen_string_literal: true

require_relative "shared_helpers"

if Bundler::SharedHelpers.in_bundle?
  require_relative "../bundler"

  # Opal: upstream's auto_switch (the self-manager restarting under the
  # lockfile's bundler version) is not ported - there is no installed
  # bundler gem to restart under. The tty question goes too: corelib has
  # no IO#tty?, so the port always runs upstream's terminal arm - the
  # failure is reported through the UI and answered with its status code
  # rather than left to crash - which is also what BUNDLER_FORCE_TTY
  # selects upstream.
  #
  # Try to auto_install first before we get to the `Bundler.ui.silence`, so
  # the user knows what is happening.
  Bundler.auto_install

  begin
    Bundler.ui.silence { Bundler.setup }
  rescue Bundler::BundlerError => e
    Bundler.ui.error e.message
    Bundler.ui.warn e.backtrace.join("\n") if ENV["DEBUG"]
    if e.is_a?(Bundler::GemNotFound)
      # Opal: upstream compares against Gem.bin_path("bundler", "bundle")'s
      # default-gem location; the port has no bundler gem installed, so the
      # suggestion names the exe/bundler the SharedHelpers already located.
      suggested_cmd = "#{Bundler::SharedHelpers.bundle_bin_path} install"
      original_gemfile = Bundler.original_env["BUNDLE_GEMFILE"]
      suggested_cmd += " --gemfile #{original_gemfile}" if original_gemfile
      Bundler.ui.warn "Run `#{suggested_cmd}` to install missing gems."
    end
    exit e.status_code
  end

  # We might be in the middle of shelling out to rubygems
  # (RUBYOPT=-rbundler/setup), so we need to give rubygems the opportunity of
  # not being silent.
  Gem::DefaultUserInteraction.ui = nil
end

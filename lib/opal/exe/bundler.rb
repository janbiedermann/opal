# frozen_string_literal: true

# The `bundle` command: lock and install the gems of a Gemfile (GEMS.md's
# milestone M8). tasks/bundler.mjs builds it into exe/bundler: a standalone
# Node.js program bundling opal/full, the single-thread shim, RubyGems and
# Bundler (lib/bundler.rb, which requires its layer eagerly), plus this
# script. Like upstream's exe/bundle it only hands the command line to
# Bundler::CLI inside Bundler.with_friendly_errors; a failing command ends
# the run through exit_status and Kernel#exit, and an uncaught SystemExit
# ends an Opal program with that status, so nothing here translates it.
#
# Not yet: the remote sources (M8.4 - `bundle install` runs with --local
# until Source::Rubygems::Remote and Bundler::Fetcher land), the runtime
# setup half behind `bundle exec` and `bundle setup` (M8.3), and the
# `config`/`update`/`inject` command cluster.
#
# Opal: upstream's exe installs a SIGINT trap to print the interrupt's
# backtrace; the port's corelib has no Signal.trap and node answers SIGINT
# itself, so there is none here. Upstream also reformats a `--help` flag
# into `bundle help COMMAND` through Thor's reformatted_help_args; the
# port's CLI reads the flag itself.

require "bundler"
require "bundler/friendly_errors"
require "bundler/cli"

Bundler.with_friendly_errors do
  Bundler::CLI.start(ARGV, debug: true)
end

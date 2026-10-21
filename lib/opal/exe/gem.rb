# The `gem` command: install, uninstall and inspect gems in a repository.
#
# tasks/gem.mjs builds it into exe/gem: a standalone Node.js program bundling
# the full corelib (opal/full), the single-thread shim and RubyGems
# (lib/rubygems.rb, which requires the command classes eagerly), and this
# script. Like upstream's exe/gem it only hands the command line to
# Gem::GemRunner; a command ends with Gem::Command#terminate_interaction, which
# raises Gem::SystemExitException, and an uncaught SystemExit ends an Opal
# program with that status, so nothing here has to translate it.
#
# The options the runner understands before a command name: -h/--help,
# -v/--version and -C DIR; the command itself brings the rest. `gem` reads
# GEM_HOME, GEM_PATH and GEM_SPEC_CACHE, and a .gemrc like upstream does.
#
# What it cannot do is what the port leaves out (GEMS.md §1): no native
# extensions, no signing or certificates, no documentation generation, no
# plugins, and no Bundler.

require 'rubygems'
require 'rubygems/gem_runner'

Gem::GemRunner.new.run ARGV.clone

# frozen_string_literal: true

require "rbconfig"

# Opal: upstream autoloads these from this file through a `constants` path;
# the port requires it eagerly - an autoloaded constant would sit outside a
# compiled bundle. NULL is left out: Opal's File has no NULL device constant,
# and it lands where shell redirection does, with M8.3's binstubs.
module Bundler
  WINDOWS = RbConfig::CONFIG["host_os"] =~ /(mswin|mingw)/
  deprecate_constant :WINDOWS

  FREEBSD = RbConfig::CONFIG["host_os"].to_s.include?("bsd")
  deprecate_constant :FREEBSD
end

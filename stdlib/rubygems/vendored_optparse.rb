# frozen_string_literal: true

# Opal: upstream vendors optparse (lib/rubygems/vendor/optparse) and hands the
# commands its own name for it, Gem::OptionParser, which the command classes and
# their option parsers below are written against. This port has one optparse -
# stdlib/optparse.rb, the file the stdlib's own option parsers use - so the
# vendor name is defined to point at it. The exceptions live under it too
# (Gem::OptionParser::InvalidOption and the rest), which the alias carries.

require "optparse"

module Gem
  OptionParser = ::OptionParser
end

# frozen_string_literal: true
# Prints the Ruby compiler's source map for stdin (for comparisons).
$LOAD_PATH.unshift File.expand_path('../../lib', __dir__)
require 'opal'
require 'json'
c = Opal::Compiler.new($stdin.read, file: ARGV[0] || 't.rb')
c.compile
puts JSON.generate(c.source_map.to_h)

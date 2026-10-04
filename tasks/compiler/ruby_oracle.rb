# frozen_string_literal: true

# Compiles Ruby sources with the Ruby compiler (lib/opal/compiler.rb) for
# comparison with the JS compiler (lib/opal/compiler/). Used only while the
# Ruby compiler still exists (see POTCH.md, phase 2).
#
# Protocol: one JSON request per line on stdin,
#   {"source": "...", "options": {"file": "t.rb", ...}}
# answered by one JSON line on stdout,
#   {"code": "..."} or {"error": "..."}

$LOAD_PATH.unshift File.expand_path('../../lib', __dir__)
require 'json'
require 'stringio'
require 'opal'
require 'opal/compiler'

Opal::Parser::WithRubyLexer.diagnostics_consumer = ->(_) {}
$stdout.sync = true

$stdin.each_line do |line|
  request = JSON.parse(line)
  options = request.fetch('options', {}).to_h { |k, v| [k.to_sym, v] }
  options[:dynamic_require_severity] = options[:dynamic_require_severity].to_sym if options[:dynamic_require_severity]
  begin
    old_stderr = $stderr
    $stderr = StringIO.new
    code = Opal::Compiler.new(request.fetch('source'), options).compile
    $stdout.puts JSON.generate(code: code)
  rescue Exception => e # rubocop:disable Lint/RescueException
    $stdout.puts JSON.generate(error: "#{e.class}: #{e.message}")
  ensure
    $stderr = old_stderr
  end
end

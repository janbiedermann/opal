# backtick_javascript: true

`/* global Bun */`

module Bun
  VERSION = `Bun.version`
end

`Opal.exit = process.exit`

ARGV = `process.argv.slice(2)`
ARGV.shift if ARGV.first == '--'

$stdout.write_proc = ->(string) { `process.stdout.write(string)` }
$stderr.write_proc = ->(string) { `process.stderr.write(string)` }

`var __fs__ = require('fs')`
$stdin.read_proc = %x{function(_count) {
  // Ignore count, return as much as we can get
  var buf = Buffer.alloc(65536), count;
  try {
    count = __fs__.readSync(this.fd, buf, 0, 65536, null);
  }
  catch (e) { // Windows systems may raise EOF
    return nil;
  }
  if (count == 0) return nil;
  return buf.toString('utf8', 0, count);
}}

$stdin.tty = true
$stdout.tty = true
$stderr.tty = true

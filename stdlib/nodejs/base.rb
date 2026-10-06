# backtick_javascript: true

module NodeJS
  VERSION = `process.version`
end

`Opal.exit = process.exit`

# ARGV and $0 (the script, or the executable) are the process's: set again
# at start when the program comes from a startup snapshot taken after this
# file ran (Node.js executables run Opal.process_start_hooks then).
ARGV = []
alias $PROGRAM_NAME $0
%x{
  function set_argv() {
    var argv = process.argv.slice(2);
    if (argv[0] === '--') argv.shift();
    #{ARGV.replace(`argv`)};
    Opal.gvars['0'] = process.argv[1] == null ? nil : process.argv[1];
  }
  (Opal.process_start_hooks = Opal.process_start_hooks || []).push(set_argv);
  set_argv();
}

STDOUT.write_proc = ->(string) { `process.stdout.write(string)` }
STDERR.write_proc = ->(string) { `process.stderr.write(string)` }

`var __fs__ = require('fs')`
STDIN.read_proc = %x{function(_count) {
  // Ignore count, return as much as we can get
  var buf = Buffer.alloc(65536), count;
  try {
    count = __fs__.readSync(this.fd, buf, 0, 65536, null);
  }
  catch { // Windows systems may raise EOF
    return nil;
  }
  if (count == 0) return nil;
  return buf.toString('utf8', 0, count);
}}

STDIN.tty = true
STDOUT.tty = true
STDERR.tty = true

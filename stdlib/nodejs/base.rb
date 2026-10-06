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

# (whether they are terminals: set at start, see ARGV; asked with tty.isatty,
# as process.stdin would put a piped stdin into non-blocking mode, where the
# synchronous reads above find no data and end)
%x{
  function set_ttys() {
    var tty = require('tty');
    #{STDIN.tty = `tty.isatty(0)`};
    #{STDOUT.tty = `tty.isatty(1)`};
    #{STDERR.tty = `tty.isatty(2)`};
  }
  Opal.process_start_hooks.push(set_ttys);
  set_ttys();
}

module NodeJS
  # An exception nothing rescued ends the program as in CRuby: the at_exit
  # blocks run, then it is reported on stderr (Exception#full_message) and
  # the process exits with 1; a SystemExit exits with its status. (Before
  # other handlers, such as the opal runner's.)
  def self.uncaught_exception(error)
    if ::SystemExit === error
      ::Kernel.exit(error.status)
    elsif ::Exception === error
      begin
        until ($__at_exit__ ||= []).empty?
          $__at_exit__.pop.call
        end
      rescue ::Exception => at_exit_error
        $stderr.write(at_exit_error.full_message)
      end
      $stderr.write(error.full_message)
    else
      `console.error(#{error})`
    end
    `Opal.exit(1)`
  end
end

# (again at start: listeners of a startup snapshot's process aren't kept)
%x{
  function listen_uncaught() {
    if (Opal.uncaught_exception_listener) process.removeListener('uncaughtException', Opal.uncaught_exception_listener);
    Opal.uncaught_exception_listener = function(error) { #{NodeJS.uncaught_exception(`error`)} };
    process.prependListener('uncaughtException', Opal.uncaught_exception_listener);
  }
  Opal.process_start_hooks.push(listen_uncaught);
  listen_uncaught();
}

# backtick_javascript: true

# (ENV is the process's environment, so a change of ENV['TZ'] changes the
# time zone, as in CRuby)

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

# STDIN/STDOUT/STDERR are fd-based now (corelib/io.rb through $platform,
# see runtime/platforms/node_compatible.js); their tty state comes from
# the platform layer too.

module NodeJS
  # An exception nothing rescued ends the program as in CRuby: the at_exit
  # blocks run, then it is reported on stderr (Exception#full_message) and
  # the process exits with 1; a SystemExit exits with its status. (Before
  # other handlers, such as the opal runner's.)
  def self.uncaught_exception(error)
    if ::SystemExit === error
      status = error.status
      begin
        until ($__at_exit__ ||= []).empty?
          $__at_exit__.pop.call
        end
      rescue ::SystemExit => at_exit_error
        status = at_exit_error.status
      end
      `Opal.exit(#{status})`
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

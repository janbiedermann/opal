# backtick_javascript: true
# The `drill` command: run Ruby programs on a runner (nodejs default, chrome,
# firefox, server, ...) - the tool the test matrix runs its drills on.
#
# tasks/drill.mjs builds it into exe/drill (and tasks/drill_exe.mjs into the
# single-file exe/drill.exe), the family shape of exe/ruby: the bundle boots
# opal, opal/full and thread for this script, and this script is compiled in
# as the program. It is thin on purpose: the option table, the parsing and
# the runners live in the JavaScript core (lib/opal/drill/), so the flag
# semantics stay identical to exe/opal's - both go through the same option
# machinery - and drill reaches the core through the esm registry the builder
# links (require 'opal/drill/index.mjs' below, like stdlib/opal-parser.rb
# reaches the compiler).
#
# What drill *runs* never loads into this process: the core builds a separate
# program bundle and hands it to the runner, which reports the program's exit
# status. exe/drill is a testing and tooling command; to run Ruby from a
# shell use exe/ruby (scripts) or exe/irb (interactive).
require 'opal/drill/index.mjs'

DRILL = `Opal.esm["opal/drill/index"]`

# The bundle carries no trailing ::Kernel.exit (unlike exe/ruby's): the
# runners are async - the server and the browser runners live on the event
# loop - so the process ends when the drill ends, process.exitCode carrying
# its status.
%x{
  Promise.resolve()
    .then(function () { return #{DRILL}.main(Opal.to_a(#{ARGV})); })
    .then(
      function (status) { process.exitCode = status || 0; },
      function (err) {
        process.stderr.write(String((err && err.stack) || err) + "\n");
        process.exitCode = 1;
      }
    );
}

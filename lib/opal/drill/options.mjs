// The `drill` runner CLI's option table (exe/drill). drill is not part of
// the compiler: it builds a program and runs it on a runner, so it carries
// the options that change what the program *does* (input, bundle boot,
// compiler settings, runner choice) and none of the output shaping
// (`-o -P --minify --mangle --watch -L -O --dce --compile-to-exe -c`) or the
// compile-time debug views (`--sexp --debug-source-map`) — those are
// `opal`'s, and drill rejects them with a pointer. Parsing is the compiler's
// machinery (clusters, attached arguments, prefix abbreviations), over this
// table.
import { ENTRY, runnerEntry } from "../compiler/cli/options.mjs";
import { RUNNERS } from "./runners/index.mjs";

const RUNNER_NAMES = Object.keys(RUNNERS);

export const DRILL_OPTIONS = [
  ["section", "Basic Options:"],
  ENTRY.verbose,
  ENTRY.verboseLong,
  ENTRY.debug,
  ENTRY.version,
  ENTRY.help,
  ENTRY.eval,
  ENTRY.require,
  ENTRY.plugin,
  ENTRY.include,
  ENTRY.stub,
  ENTRY.preload,
  ENTRY.gem,
  ["section", "Running Options:"],
  runnerEntry(RUNNER_NAMES),
  ENTRY.serverPort,
  ENTRY.runnerOptions,
  ["section", "Builder Options:"],
  ENTRY.noSourceMap,
  ENTRY.noCache,
  ENTRY.noExit,
  ["section", "Compiler Options:"],
  ENTRY.enable,
  ENTRY.useStrict,
  ENTRY.esm,
  ENTRY.directory,
  ENTRY.arityCheck,
  ENTRY.dynamicRequire,
  ENTRY.missingRequire,
  ENTRY.enableSourceLocation,
  ENTRY.parseComments,
  ENTRY.await,
  ENTRY.noMethodMissing,
  ENTRY.file,
  ENTRY.inlineOperators,
];

// The first line of drill's help: drill takes a program file and its args
// (everything the options don't consume goes to ARGV).
export const DRILL_USAGE = "Usage: drill [options] -- [programfile]";
DRILL_OPTIONS.usage = DRILL_USAGE;

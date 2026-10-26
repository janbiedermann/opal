// The `drill` runner core (exe/drill's JavaScript side; the command entry is
// the Ruby program lib/opal/exe/drill.rb). drill builds the program through
// the compiler's CLI class and runs it on one of drill's runners, so the
// flag spellings, clusters and prefix abbreviations are shared with `opal`
// by parsing through the same machinery - over drill's own table
// (DRILL_OPTIONS), which keeps what changes the program and drops what
// shapes output.
import { CLI } from "../compiler/cli/cli.mjs";
import { parseOptions, InvalidOption, movedOption } from "../compiler/cli/options.mjs";
import { DRILL_OPTIONS } from "./options.mjs";
import { RUNNERS } from "./runners/index.mjs";
import { RunnerError } from "./runners/system.mjs";
import { builderPaths, compilerKey } from "./paths.mjs";

// exe/opal owns these; drill answers a lost one with the pointer instead of
// a bare "invalid option" (the parse itself would reject them anyway - they
// are not in DRILL_OPTIONS).
const MOVED_TO_OPAL = new Map([
  ["-c", "use exe/opal to compile"],
  ["--compile", "use exe/opal to compile"],
  ["-o", "exe/opal writes the JavaScript (-o)"],
  ["--output", "exe/opal writes the JavaScript (--output)"],
  ["-P", "exe/opal writes the source map (-P)"],
  ["--map", "exe/opal writes the source map (--map)"],
  ["--minify", "exe/opal minifies (--minify)"],
  ["--mangle", "exe/opal mangles (--mangle)"],
  ["--watch", "exe/opal recompiles on change (--watch)"],
  ["-L", "exe/opal compiles libraries only (-L)"],
  ["--library", "exe/opal compiles libraries only (--library)"],
  ["-O", "exe/opal drops the opal boot (-O)"],
  ["--no-opal", "exe/opal drops the opal boot (--no-opal)"],
  ["--dce", "exe/opal eliminates dead code (--dce)"],
  ["--compile-to-exe", "exe/opal builds a standalone application (--compile-to-exe)"],
  ["--sexp", "exe/opal shows the syntax tree (--sexp)"],
  ["--debug-source-map", "exe/opal shows the source map (--debug-source-map)"],
]);

// exe/drill: returns the process exit status (the program's own status when
// a runner ran it; sysexits codes for command problems).
export async function main(args = process.argv.slice(2), io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  let parsed;
  try {
    const moved = movedOption(args, DRILL_OPTIONS, MOVED_TO_OPAL);
    if (moved) {
      stderr.write(`drill: ${moved} (-h will show drill's options)\n`);
      return 64; // EX_USAGE
    }
    let exitNow = null;
    parsed = parseOptions(args, {
      out: (s) => stdout.write(s),
      err: (s) => stderr.write(s),
      exit: (s) => { exitNow = s; throw exitNow; },
    }, DRILL_OPTIONS);
  } catch (e) {
    if (typeof e === "string") {
      stdout.write(e);
      return 0;
    }
    if (e instanceof InvalidOption) {
      stderr.write(`drill: ${e.message} (-h will show drill's options)\n`);
      return 64; // EX_USAGE
    }
    throw e;
  }

  const options = parsed.options;
  options.argv = parsed.argv;
  try {
    // The load paths and the cache key answer where the *running* drill is
    // (tree next to the exe, embedded sources, or the tree it was imported
    // from) - a bundle bakes no checkout path.
    const cli = new CLI({
      ...options,
      // The class defaults to the compiler runner (opal's); drill runs.
      runner: options.runner || "nodejs",
      runners: RUNNERS,
      stdout,
      stderr,
      stdin: io.stdin,
      builder_paths: builderPaths(),
      compiler_key: compilerKey(),
    });
    const status = await cli.run();
    return status || 0;
  } catch (e) {
    if (e instanceof RunnerError) {
      stderr.write(e.message + "\n");
      return 72; // EX_OSRELMAJOR: the runner's executable is missing
    }
    throw e;
  }
}

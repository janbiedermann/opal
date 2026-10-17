// Command line options of `opal`. Port of the former Ruby
// lib/opal/cli_options.rb; parses like Ruby's OptionParser: clustered short
// flags (-cOE), attached arguments (-Ilib, --output=x), options after the
// program file, and `--` to end the options.
import { VERSION } from "../version.mjs";
import { RUNNERS, EXE_RUNTIMES } from "./runners/index.mjs";

export class InvalidOption extends Error {}

const push = (key) => (o, v) => { (o[key] ||= []).push(v); };
const set = (key, value = true) => (o) => { o[key] = value; };
const runnerOption = (key) => (o, v) => { (o.runner_options ||= {})[key] = v; };

function choice(values, name) {
  return (v) => {
    if (!values.includes(v)) throw new InvalidOption(`invalid argument: ${name} ${v}`);
    return v;
  };
}

const RUNNER_NAMES = Object.keys(RUNNERS);
const SEVERITIES = ["error", "warning", "ignore"];

// [short, long, argument ("required"/"optional"/null), description lines, apply]
export const OPTIONS = [
  ["section", "Basic Options:"],
  [null, "--repl", null, ["Run the Opal REPL"], set("repl")],
  [null, "--compile-to-exe RUNTIME", "required",
    [`Compiles and builds a standalone application with RUNTIME. The following RUNTIMEs are available: ${EXE_RUNTIMES.join(", ")}`],
    (o, v) => {
      choice(EXE_RUNTIMES, "--compile-to-exe")(v);
      o.exe_type = v;
      o.runner = "compiler";
      // an executable is shipped, not read: minify and mangle it by default
      o.minify = true;
      o.mangle = true;
      o.output ||= `opal_${v}_exe`;
    }],
  ["-v", "--verbose", null, ["print version number, then turn on verbose mode"], (o, _v, ctx) => {
    if (ctx.flag === "-v") ctx.out(`Opal v${VERSION}\n`);
    o.verbose = true;
  }],
  [null, "--verbose", null, ["turn on verbose mode (set $VERBOSE to true)"], set("verbose")],
  ["-d", "--debug", null, ["turn on debug mode (set $DEBUG to true)"], set("debug")],
  [null, "--version", null, ["Print the version"], (_o, _v, ctx) => ctx.exit(`Opal v${VERSION}\n`)],
  ["-h", "--help", null, ["Show this message"], (_o, _v, ctx) => ctx.exit(helpText())],
  ["-e", "--eval SOURCE", "required", ["One line of script. Several -e's allowed. Omit [programfile]"], push("evals")],
  ["-r", "--require LIBRARY", "required", ["Require the library before executing your script"], push("requires")],
  ["-q", "--plugin MODULE", "required", ["Import the JavaScript module before compiling (its default export gets the CLI, e.g. to set compiler options)"], push("plugins")],
  ["-I", "--include DIR", "required", ["Append a load path (may be used more than once)"], push("load_paths")],
  ["-s", "--stub FILE", "required", ["Stubbed files will be compiled as empty files"], push("stubs")],
  ["-p", "--preload FILE", "required", ["Preloaded files will be prepared for dynamic requires"], push("preload")],
  ["-g", "--gem GEM_NAME", "required", ["Adds the specified GEM_NAME to Opal's load path. (not available in Node.js; ignored)"], push("gems")],
  ["section", "Running Options:"],
  ["-R", "--runner RUNNER", "required", ["Choose the runner:", `nodejs (default), ${RUNNER_NAMES.filter((r) => r !== "nodejs" && r !== "compiler").join(", ")}`],
    (o, v) => { o.runner = choice(RUNNER_NAMES, "--runner")(v); }],
  [null, "--server-port PORT", "required", ["Set the port for the server runner (default port: 3000)"], (o, v) => runnerOption("port")(o, parseInt(v, 10))],
  [null, "--runner-options JSON", "required", ["Set options specific to the selected runner as a JSON string (e.g. port for server)"],
    (o, v) => { Object.assign((o.runner_options ||= {}), JSON.parse(v)); }],
  ["section", "Builder Options:"],
  ["-c", "--compile", null, ["Compile to JavaScript"], set("runner", "compiler")],
  [null, "--minify", null, ["Compress the compiled JavaScript with terser (not with --directory; source maps are dropped)"], set("minify")],
  [null, "--mangle", null, ["Mangle the names in the compiled JavaScript with terser (not with --directory; source maps are dropped)"], set("mangle")],
  ["-o", "--output FILE", "required", ["Output JavaScript to FILE (or directory if --directory enabled)"], (o, v) => { o.output = v; }],
  ["-P", "--map FILE", "required", ["Output source map to FILE"], runnerOption("map_file")],
  [null, "--no-source-map", null, ["Don't append source map to a compiled file"], (o) => runnerOption("no_source_map")(o, true)],
  [null, "--watch", null, ["Run the compiler in foreground, recompiling every filesystem change"], (o) => runnerOption("watch")(o, true)],
  [null, "--no-cache", null, ["Disable filesystem cache"], set("no_cache")],
  ["-L", "--library", null, ["Compile only required libraries. Omit [programfile] and [-e]. Assumed [-cOE]."], (o) => {
    o.lib_only = true;
    o.no_exit = true;
    o.compile = true;
    o.skip_opal_require = true;
  }],
  ["-O", "--no-opal", null, ["Disable implicit `require \"opal\"`"], set("skip_opal_require")],
  ["-E", "--no-exit", null, ["Do not append a Kernel#exit at the end of file"], set("no_exit")],
  [null, "--dce [OPTIONS]", "optional", ["EXPERIMENTAL: Enable dead code elimination to reduce bundle size.",
    "You can select multiple optimizations separated with a comma (,):", "method (default), const"],
    (o, v) => { o.dce = (v || "method").split(","); }],
  ["section", "Compiler Options:"],
  [null, "--use-strict", null, ["Enables JavaScript's strict mode (i.e., adds 'use strict'; statement)"], set("use_strict")],
  [null, "--esm", null, ["Wraps compiled bundle as ES6 module"], set("esm")],
  [null, "--directory", null, ["Builds the program as a directory of JS files"], set("directory")],
  ["-A", "--arity-check", null, ["Enable arity check"], set("arity_check")],
  ["-D", "--dynamic-require LEVEL", "required", ["Set level of dynamic require severity.", `(default: error, values: ${SEVERITIES.join(", ")})`],
    (o, v) => { o.dynamic_require_severity = choice(SEVERITIES, "--dynamic-require")(v); }],
  [null, "--missing-require LEVEL", "required", ["Set level of missing require severity.", `(default: error, values: ${SEVERITIES.join(", ")})`],
    (o, v) => { o.missing_require_severity = choice(SEVERITIES, "--missing-require")(v); }],
  [null, "--enable-source-location", null, ["Compiles source location for each method definition."], set("enable_source_location")],
  [null, "--parse-comments", null, ["Compiles comments for each method definition."], set("parse_comments")],
  [null, "--enable-file-source-embed", null, ["Embeds file sources to be accessed by applications."], set("enable_file_source_embed")],
  [null, "--irb", null, ["Enable IRB var mode"], set("irb")],
  [null, "--await", null, ["Enable async/await support"], set("await")],
  ["-M", "--no-method-missing", null, ["Disable method missing"], set("method_missing", false)],
  ["-F", "--file FILE", "required", ["Set filename for compiled code"], (o, v) => { o.file = v; }],
  ["-V", null, null, ["(deprecated; always enabled) Enable inline Operators"], (o, _v, ctx) => {
    ctx.err("* -V is deprecated and has no effect\n");
    o.inline_operators = true;
  }],
  ["section", "Debug Options:"],
  [null, "--sexp", null, ["Show the syntax tree"], set("sexp")],
  [null, "--debug-source-map", null, ["Debug source map"], set("debug_source_map")],
];

const ENTRIES = OPTIONS.filter((e) => e[0] !== "section").map(([short, long, arg, desc, apply]) => ({
  short,
  long: long && long.split(" ")[0],
  argName: long && long.split(" ")[1],
  arg,
  desc,
  apply,
}));

export function helpText() {
  const lines = ["Usage: opal [options] -- [programfile]", ""];
  for (const entry of OPTIONS) {
    if (entry[0] === "section") {
      lines.push("", entry[1], "");
      continue;
    }
    const [short, long, , desc] = entry;
    const head = `    ${short ? short + (long ? ", " : "") : "    "}${long || ""}`;
    desc.forEach((d, i) => {
      if (i === 0 && head.length < 37) lines.push(head.padEnd(37) + d);
      else if (i === 0) lines.push(head, " ".repeat(37) + d);
      else lines.push(" ".repeat(37) + d);
    });
  }
  lines.push("");
  return lines.join("\n") + "\n";
}

// Long options can be abbreviated to any unambiguous prefix, as in
// OptionParser.
function findLong(name) {
  const exact = ENTRIES.filter((e) => e.long === name);
  // a later definition wins (`-v, --verbose` and `--verbose`)
  if (exact.length) return exact[exact.length - 1];
  const prefixed = ENTRIES.filter((e) => e.long && e.long.startsWith(name));
  const longs = [...new Set(prefixed.map((e) => e.long))];
  if (longs.length === 1) return prefixed[0];
  if (longs.length > 1) throw new InvalidOption(`ambiguous option: ${name}`);
  throw new InvalidOption(`invalid option: ${name}`);
}

// Parses argv: returns { options, argv } (argv: the remaining arguments).
// ctx: { out, err, exit } for -v/-h/--version.
export function parseOptions(args, ctx) {
  const options = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      rest.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = eq === -1 ? a : a.slice(0, eq);
      const entry = findLong(name);
      let value;
      if (entry.arg === "required") {
        if (eq !== -1) value = a.slice(eq + 1);
        else if (i + 1 < args.length) value = args[++i];
        else throw new InvalidOption(`missing argument: ${a}`);
      } else if (entry.arg === "optional") {
        if (eq !== -1) value = a.slice(eq + 1);
        else if (i + 1 < args.length && !args[i + 1].startsWith("-")) value = args[++i];
      } else if (eq !== -1) {
        throw new InvalidOption(`needless argument: ${a}`);
      }
      entry.apply(options, value, { ...ctx, flag: entry.long });
    } else if (a.startsWith("-") && a.length > 1) {
      for (let j = 1; j < a.length; j++) {
        const flag = `-${a[j]}`;
        const entry = ENTRIES.find((e) => e.short === flag);
        if (!entry) throw new InvalidOption(`invalid option: ${flag}`);
        if (entry.arg) {
          let value = a.slice(j + 1);
          if (value === "") {
            if (i + 1 < args.length) value = args[++i];
            else if (entry.arg === "required") throw new InvalidOption(`missing argument: ${flag}`);
            else value = undefined;
          }
          entry.apply(options, value, { ...ctx, flag });
          break;
        }
        entry.apply(options, undefined, { ...ctx, flag });
      }
    } else {
      rest.push(a);
    }
  }
  return { options, argv: rest };
}

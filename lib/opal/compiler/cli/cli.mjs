// The `opal` command (exe/opal). Port of the former Ruby lib/opal/cli.rb and
// exe/opal.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Builder } from "../builder/builder.mjs";
import { NullCache } from "../builder/cache.mjs";
import { Compiler } from "../compiler.mjs";
import { parseWithMetadata } from "../../potch/index.mjs";
import { parseOptions, InvalidOption } from "./options.mjs";
import { RUNNERS } from "./runners/index.mjs";
import { RunnerError } from "./runners/system.mjs";
import { compileExe } from "./exe_compiler.mjs";

// Options passed on to the compiler (CLI#compiler_option_names)
const COMPILER_OPTION_NAMES = [
  "method_missing", "arity_check", "dynamic_require_severity", "irb", "inline_operators",
  "enable_source_location", "enable_file_source_embed", "use_strict", "parse_comments",
  "esm", "directory", "await",
];

export class CLI {
  // options: as produced by parseOptions, plus argv, and optionally
  // stdout/stderr/stdin for embedding and tests.
  constructor(options = {}) {
    options = { ...options };
    const take = (key, fallback) => {
      const value = key in options ? options[key] : fallback;
      delete options[key];
      return value;
    };
    this.runnerType = take("runner", "nodejs");
    this.runnerOptions = take("runner_options", {});
    this.sexp = take("sexp");
    this.repl = take("repl");
    this.noExit = take("no_exit");
    this.libOnly = take("lib_only");
    take("compile");
    this.argv = take("argv", []);
    this.evals = take("evals", []);
    this.loadPaths = take("load_paths", []);
    this.gems = take("gems", []);
    this.stubs = take("stubs", []);
    this.preload = take("preload", []);
    this.output = take("output", null);
    this.verbose = take("verbose", false);
    this.debug = take("debug", false);
    this.requires = [...take("requires", [])];
    this.noCache = take("no_cache", false);
    this.plugins = take("plugins", []);
    this.dce = take("dce", false);
    this.exeType = take("exe_type");
    this.file = take("file");
    this.debugSourceMap = take("debug_source_map", false);
    this.missingRequireSeverity = take("missing_require_severity", "error");
    this.stdout = take("stdout", process.stdout);
    this.stderr = take("stderr", process.stderr);
    this.stdin = take("stdin", null);
    if (!take("skip_opal_require")) this.requires.unshift("opal");

    this.compilerOptions = {};
    for (const name of COMPILER_OPTION_NAMES) {
      if (name in options) this.compilerOptions[name] = take(name);
    }
    take("inline_operators");

    // directory is both a runner and compiler option
    this.directory = this.compilerOptions.directory;
    this.runnerOptions.directory = this.directory;

    if (this.libOnly) {
      if (this.requires.length === 0) throw new Error("no libraries to compile");
      if (this.argv.length || this.evals.length) throw new Error("can't accept evals, file, or extra arguments in `library only` mode");
    } else if (this.evals.length) {
      this.filename = "-e";
      this.sourceFn = () => this.evals.join("\n");
    } else if (this.argv[0] && this.argv[0] !== "-") {
      this.filename = this.argv.shift();
      const filename = this.filename;
      this.sourceFn = () => readFileSync(filename, "utf8");
    } else {
      this.filename = this.argv.shift() || "-";
      this.sourceFn = () => (this.stdin != null ? String(this.stdin) : readFileSync(0, "utf8"));
    }

    const unknown = Object.keys(options);
    if (unknown.length) throw new Error(`unknown options: ${unknown.join(", ")}`);
  }

  // The program's source (read once).
  get source() {
    if (this.libOnly) return null;
    if (this.sourceValue === undefined) this.sourceValue = this.sourceFn();
    return this.sourceValue;
  }

  async run() {
    if (this.sexp) return this.showSexp();
    if (this.debugSourceMap) return this.showDebugSourceMap();
    if (this.repl) {
      const { REPL } = await import("./repl.mjs");
      return new REPL(this.runnerType).run(this.argv);
    }

    // --plugin
    for (const plugin of this.plugins) {
      const mod = await import(pathToFileURL(resolve(plugin)).href);
      if (typeof mod.default === "function") await mod.default(this);
    }

    const runner = RUNNERS[this.runnerType];
    if (!runner) throw new Error(`unknown runner: ${this.runnerType}`);

    let output = this.output;
    if (output == null) output = this.exeType ? `opal_${this.exeType}_exe` : this.stdout;

    // A runner may build the program several times (a server rebuilding
    // on every page load, --watch), so it gets a builder factory.
    this.exitStatus = await runner({
      options: this.runnerOptions,
      output,
      argv: this.argv,
      builder: () => this.createBuilder(),
      err: (s) => this.stderr.write(s),
    });

    if (this.exeType && this.exitStatus === 0) this.exitStatus = compileExe(this.exeType, output, (s) => this.stdout.write(s));
    return this.exitStatus;
  }

  createBuilder() {
    const builder = new Builder({
      stubs: this.stubs,
      compilerOptions: this.compilerOptions,
      missingRequireSeverity: this.missingRequireSeverity,
      dce: this.dce,
      cache: this.noCache ? new NullCache() : null,
      warn: (msg) => this.stderr.write(msg + "\n"),
    });

    // --include
    builder.appendPaths(...this.loadPaths);

    // --gem
    for (const gem of this.gems) {
      this.stderr.write(`Opal: gems are not available in Node.js. The option \`--gem ${gem}\` has been ignored.\n`);
    }

    // --require
    for (const required of this.requires) builder.build(required, { requirable: true, load: true });

    // --preload
    for (const path of this.preload) builder.buildRequire(path);

    // --verbose
    if (this.verbose) builder.buildStr("$VERBOSE = true", "(flags)", { no_export: true });

    // --debug
    if (this.debug) builder.buildStr("$DEBUG = true", "(flags)", { no_export: true });

    // --eval / stdin / file
    const source = this.source;
    if (source != null) builder.buildStr(source, this.file || this.filename);

    // --no-exit
    if (!this.noExit) builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

    return builder;
  }

  // --sexp: the syntax tree, one node per line
  showSexp() {
    const source = this.source;
    if (source == null) return 0;
    const { ast, errors } = parseWithMetadata(source);
    for (const error of errors) this.stderr.write(`${this.filename}: ${error.message}\n`);
    this.stdout.write(sexp(ast) + "\n");
    return errors.length ? 1 : 0;
  }

  showDebugSourceMap() {
    const source = this.source;
    if (source == null) return 0;
    const compiler = new Compiler(source, { file: this.filename, ...this.compilerOptions });
    const result = compiler.compile();
    const b64 = [result, JSON.stringify(compiler.sourceMap.map()), source].map((s) => Buffer.from(s, "utf8").toString("base64")).join(",");
    this.stdout.write(`https://sokra.github.io/source-map-visualization/#base64,${b64}\n`);
    return 0;
  }
}

const SKIPPED_FIELDS = new Set(["type", "location", "node_id", "flags"]);

// A compact s-expression-like dump of a (Prism) syntax tree.
export function sexp(node, indent = "") {
  if (node === null || node === undefined) return "nil";
  if (Array.isArray(node)) return `[${node.map((n) => sexp(n, indent)).join(", ")}]`;
  if (typeof node === "bigint") return String(node);
  if (typeof node !== "object") return JSON.stringify(node);
  if (!node.type) return JSON.stringify(node);
  const name = node.type.replace(/Node$/, "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  const fields = Object.entries(node).filter(([k, v]) => !SKIPPED_FIELDS.has(k) && !k.endsWith("_loc") && v !== null && !(Array.isArray(v) && v.length === 0));
  if (fields.length === 0) return `(${name})`;
  const inner = indent + "  ";
  const parts = fields.map(([k, v]) => {
    const value = v && typeof v === "object" && (v.type || Array.isArray(v)) ? sexpChild(v, inner) : sexp(v, inner);
    return `\n${inner}${k}: ${value}`;
  });
  return `(${name}${parts.join("")})`;
}

function sexpChild(v, indent) {
  if (!Array.isArray(v)) return sexp(v, indent);
  return `[${v.map((n) => `\n${indent}  ${sexp(n, indent + "  ")}`).join(",")}]`;
}

// exe/opal: returns the process exit status.
export async function main(args = process.argv.slice(2), io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  let parsed;
  try {
    let exitNow = null;
    parsed = parseOptions(args, {
      out: (s) => stdout.write(s),
      err: (s) => stderr.write(s),
      exit: (s) => { exitNow = s; throw exitNow; },
    });
  } catch (e) {
    if (typeof e === "string") {
      stdout.write(e);
      return 0;
    }
    if (e instanceof InvalidOption) {
      stderr.write(`opal: ${e.message} (-h will show valid options)\n`);
      return 64;
    }
    throw e;
  }

  const options = parsed.options;
  if (!options.lib_only) options.argv = parsed.argv;
  try {
    const cli = new CLI({ ...options, stdout, stderr, stdin: io.stdin });
    const status = await cli.run();
    return status || 0;
  } catch (e) {
    if (e instanceof RunnerError) {
      stderr.write(e.message + "\n");
      return 72;
    }
    throw e;
  }
}


// The JS bundle of the `ruby` command, shared by tasks/ruby.mjs (exe/ruby)
// and tasks/ruby_exe.mjs (exe/ruby.exe): the full corelib (opal), the
// parser and compiler (opal-parser), RubyGems (lib/rubygems.rb, so an
// installed gem is requirable), the whole stdlib and the port's lib/ as
// requirable modules, the OPAL_COMPILED_BUNDLE and OPAL_COMPILER_KEY
// constants, and lib/opal/exe/ruby.rb, minified with terser.
//
// The stdlib and lib/ sweeps are what let a script `require 'optparse'` or
// `require 'bundler/setup'` under exe/ruby with no checkout beside the
// program: Opal.require consults the module table before the loader touches
// $LOAD_PATH, so every file the bundle carries answers from inside it. This
// is what replaced OPAL_HOME - the checkout path the bundle used to bake so
// its loader could find the stdlib sources at run time - which made the
// executables depend on the tree that built them.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";

// The compiler sources the bundle embeds, digested by content: unlike the
// builder's runtimeKey (sizes and mtimes, see builder/cache.mjs) this
// survives checkouts that don't change the compiler. Exported for
// tasks/gem/bundle.mjs, whose bundle has to stamp the same key: the digest
// that names a gem's compiled tree (Gem::CompiledTree) is read back by the
// exe/ruby loader, and both bundles have to mean the same compiler by it.
export function compilerKey() {
  const hash = createHash("sha256");
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (path.endsWith(".mjs")) hash.update(readFileSync(path));
    }
  };
  for (const dir of ["lib/opal/compiler", "lib/opal/parser"]) walk(join(ROOT, dir));
  return hash.digest("base64url").slice(0, 32);
}

// Every .rb file under dir as the require name it answers once its directory
// joins the load path: the path relative to it without ".rb" (an ".js.rb"
// file keeps its ".js", the name require uses for it). Bundles sweep these
// to carry the whole tree as requirable modules.
export function treeRequireNames(dir, prefix = "") {
  const names = [];
  const walk = (path, name) => {
    const entries = readdirSync(join(ROOT, path), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isDirectory()) walk(`${path}/${entry.name}`, `${name}${entry.name}/`);
      else if (entry.name.endsWith(".rb")) names.push(`${name}${entry.name.slice(0, -3)}`);
    }
  };
  walk(dir, prefix);
  return names;
}

export async function buildRubyBundle() {
  // dynamic_require_severity: the script's `require lib` for -r is meant to
  // be dynamic, the warning would only be noise.
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  // load: true puts them in the bundle's boot index, as the CLI does for
  // its requires, so they run before the program.
  builder.build("opal", { requirable: true, load: true });
  // opal/full pulls in corelib/file_test, corelib/string/unpack and
  // corelib/array/pack and registers the Marshal/ObjectSpace/Struct/Set/
  // Dir/ENV/Random/PatternMatching/TracePoint autoloads, which the builder
  // compiles here (they are found at build time, so they need no runtime
  // lookup). +406 KB over opal alone, and it is what lets a script use
  // them with no -I and no require.
  builder.build("opal/full", { requirable: true, load: true });
  // stdlib/thread.rb is the only home of Thread::Backtrace::Location, which
  // Kernel#caller_locations needs, and of Thread.current thread-locals.
  // It is a single-threaded shim: no Thread.new (GEMS.md D13).
  builder.build("thread", { requirable: true, load: true });
  // lib/rubygems.rb, loaded at boot: it is what lets a script `require` a
  // file an installed gem owns, with no -I and no require of its own (M4).
  // The loader below calls Gem.try_activate when a path is not on the load
  // path, and the activated gem's lib directories land on $LOAD_PATH.
  builder.build("rubygems", { requirable: true, load: true });
  builder.build("opal-parser", { requirable: true, load: true });
  // The whole stdlib and the port's lib/, compiled and requirable but not
  // loaded: no checkout sits beside the program, so a script's runtime
  // require of any of them must answer from the module table (the loader
  // below only runs once Opal.require misses). The explicit builds above
  // registered their names expanded, and #processRequire dedups on the raw
  // name, so the sweep skips them; opal-builder is skipped too - the
  // runtime builder wrapper links lib/opal/compiler/builder, whose erb
  // worker loads from a file beside the checkout (its import.meta.url is
  // the build machine's at compile time), so embedding it would bake a
  // path and it was never reachable through exe/ruby anyway. opal/base and
  // opal/mini are the entry points opal/full does not cover.
  const bootNames = new Set(["thread", "opal-parser", "opal-builder", "rubygems", "opal", "opal/full"]);
  for (const name of treeRequireNames("stdlib")) {
    if (!bootNames.has(name)) builder.buildRequire(name);
  }
  for (const name of treeRequireNames("lib/bundler", "bundler/")) builder.buildRequire(name);
  for (const name of treeRequireNames("lib/rubygems", "rubygems/")) builder.buildRequire(name);
  builder.buildRequire("opal/base");
  builder.buildRequire("opal/mini");
  // What the program is, with no path in it: lib/bundler branches on this
  // instead of OPAL_HOME, the build checkout's path that used to be baked
  // in and made the executables need that tree to work.
  builder.buildStr("OPAL_COMPILED_BUNDLE = true\n", "(opal-compiled-bundle)", { no_export: true });
  builder.buildStr("OPAL_PROGRAM = \"ruby\"\n", "(opal-program)", { no_export: true });
  // The HTTP transport (Gem::HTTPTransport): embedded as source text, because
  // a single-file executable's require() answers only built-in modules and no
  // tree sits beside the program to read it from anyway.
  builder.buildStr(`OPAL_HTTP_TRANSPORT = ${JSON.stringify(readFileSync(join(ROOT, "lib", "opal", "gems", "http.cjs"), "utf8"))}\n`, "(http-transport)", { no_export: true });
  builder.buildStr(`OPAL_COMPILER_KEY = ${JSON.stringify(compilerKey())}\n`, "(opal-compiler-key)", { no_export: true });
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "ruby.rb"), "utf8"), "lib/opal/exe/ruby.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // the same terser the CLI's --minify/--mangle use
  return minifyJs(`${builder}`, { minify: true, mangle: true });
}

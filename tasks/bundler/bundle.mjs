// The JS bundle of the `bundle` command, shared by tasks/bundler.mjs
// (exe/bundler) and tasks/bundler_exe.mjs (exe/bundler.exe): the full
// corelib (opal and opal/full), the single-thread shim, RubyGems
// (lib/rubygems.rb), Bundler (lib/bundler.rb, which requires its layer
// eagerly), the whole stdlib as requirable modules (so a binstub loaded
// by bundle exec finds what it requires inside the program) and
// lib/opal/exe/bundler.rb, minified with terser.
//
// It carries opal-parser as a requirable module like the `gem` bundle does:
// a Gemfile and a .gemspec are Ruby source, so Bundler compiles when it
// reads one (Dsl#eval_gemfile and Bundler.load_gemspec_uncached require
// "opal-parser" themselves before the eval), and a run that never parses
// either never pays for loading the compiler.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";
import { compilerKey, treeRequireNames } from "../ruby/bundle.mjs";

export async function buildBundlerBundle() {
  // dynamic_require_severity: Runtime#require requires each Gemfile
  // dependency by name, and the CLI reaches its command classes through
  // paths the scan cannot follow; those requires are deliberate, not
  // mistakes, and the files they ask for are the user's or already bundled.
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  // load: true puts them in the bundle's boot index, as the CLI does for
  // its requires, so they run before the program.
  builder.build("opal", { requirable: true, load: true });
  // opal/full is what gives the port FileTest, Marshal, pack/unpack, Set
  // and the Dir and ENV classes Bundler reads the environment with.
  builder.build("opal/full", { requirable: true, load: true });
  // stdlib/thread.rb: Thread::Mutex (the ProcessLock and the rubygems
  // locks take it) and Thread::Backtrace::Location. No Thread.new (D13).
  builder.build("thread", { requirable: true, load: true });
  // RubyGems first: Bundler sits on top of it (Bundler.rubygems is the
  // rubygems_integration shim over the ported Gem namespace).
  builder.build("rubygems", { requirable: true, load: true });
  // Bundler: building this one file carries the whole ported layer -
  // definition, resolver, sources, settings, installers and the UI - the
  // way building rubygems carries the gem port. cli.rb joins through the
  // program's require below, as it does upstream.
  builder.build("bundler", { requirable: true, load: true });
  // opal-parser, requirable but not loaded at boot (see the header).
  builder.build("opal-parser", { requirable: true });
  // The whole stdlib, compiled and requirable: bundle exec loads a gem's
  // binstub in this process, and that script's requires - 'optparse',
  // 'yaml', whatever the gem reaches for - must answer from the module
  // table, since no checkout sits beside the program (OPAL_HOME is gone).
  // #processRequire dedups on the raw require name, but the explicit
  // build above registered its own expanded, so the sweep skips them -
  // as it skips opal-builder, the runtime builder wrapper whose erb worker
  // would load from a file beside the checkout (see tasks/ruby/bundle.mjs).
  const bootNames = new Set(["thread", "opal-parser", "opal-builder"]);
  for (const name of treeRequireNames("stdlib")) {
    if (!bootNames.has(name)) builder.buildRequire(name);
  }
  // What the program is, with no path in it: lib/bundler branches on this
  // instead of OPAL_HOME, the build checkout's path that used to be baked
  // in and made the executables need that tree to work.
  builder.buildStr("OPAL_COMPILED_BUNDLE = true\n", "(opal-compiled-bundle)", { no_export: true });
  builder.buildStr("OPAL_PROGRAM = \"bundler\"\n", "(opal-program)", { no_export: true });
  // The HTTP transport (Gem::HTTPTransport): embedded as source text, because
  // a single-file executable's require() answers only built-in modules and no
  // tree sits beside the program to read it from anyway.
  builder.buildStr(`OPAL_HTTP_TRANSPORT = ${JSON.stringify(readFileSync(join(ROOT, "lib", "opal", "gems", "http.cjs"), "utf8"))}\n`, "(http-transport)", { no_export: true });
  // The compiled-tree digest of `gem compile` (Gem::CompiledTree) names
  // its output with this key, and a bundle finding a gem's compiled tree
  // re-computes it to find the tree back; every bundle stamps the same
  // value (tasks/ruby/bundle.mjs exports the digest for exactly this).
  builder.buildStr(`OPAL_COMPILER_KEY = ${JSON.stringify(compilerKey())}\n`, "(opal-compiler-key)", { no_export: true });
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "bundler.rb"), "utf8"), "lib/opal/exe/bundler.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // terser mangle-only (the compress pass doubles the build for ~5%)
  return minifyJs(`${builder}`, { mangle: true });
}

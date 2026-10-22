// The JS bundle of the `bundle` command, shared by tasks/bundler.mjs
// (exe/bundler) and tasks/bundler_exe.mjs (exe/bundler.exe): the full
// corelib (opal and opal/full), the single-thread shim, RubyGems
// (lib/rubygems.rb), Bundler (lib/bundler.rb, which requires its layer
// eagerly) and lib/opal/exe/bundler.rb, minified with terser.
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
import { compilerKey } from "../ruby/bundle.mjs";

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
  // OPAL_HOME, the same constant tasks/ruby/bundle.mjs bakes in: the
  // transport (Gem::HTTPTransport.transport_path) finds
  // lib/opal/gems/http.mjs through it, and a bundle has no source tree of
  // its own to look in.
  builder.buildStr(`OPAL_HOME = ${JSON.stringify(ROOT)}\n`, "(opal-home)", { no_export: true });
  // The compiled-tree digest of `gem compile` (Gem::CompiledTree) names
  // its output with this key, and a bundle finding a gem's compiled tree
  // re-computes it to find the tree back; every bundle stamps the same
  // value (tasks/ruby/bundle.mjs exports the digest for exactly this).
  builder.buildStr(`OPAL_COMPILER_KEY = ${JSON.stringify(compilerKey())}\n`, "(opal-compiler-key)", { no_export: true });
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "bundler.rb"), "utf8"), "lib/opal/exe/bundler.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // the same terser the CLI's --minify/--mangle use
  return minifyJs(`${builder}`, { minify: true, mangle: true });
}

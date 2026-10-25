// The JS bundle of the `gem` command, shared by tasks/gem.mjs (exe/gem) and
// tasks/gem_exe.mjs (exe/gem.exe): the full corelib (opal and opal/full), the
// single-thread shim, RubyGems (lib/rubygems.rb, which requires the command
// classes eagerly), opal-parser for reading .gemspec files, and
// lib/opal/exe/gem.rb, minified with terser.
//
// It carries the parser and the compiler, then, but only as a requirable
// module: a .gemspec is Ruby source, so `gem` compiles when it reads one, and
// a run that never loads a gemspec (gem --version, gem help) never pays for
// loading the compiler. exe/gem is still smaller than exe/ruby, which has the
// compiler at boot because everything it runs has to be compiled.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";
import { compilerKey } from "../ruby/bundle.mjs";

export async function buildGemBundle() {
  // dynamic_require_severity: Gem::CommandManager loads a command with a
  // computed require path, and the file is already in the bundle (lib/rubygems.rb
  // requires the commands), so neither the warning nor the failure applies.
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  // load: true puts them in the bundle's boot index, as the CLI does for
  // its requires, so they run before the program.
  builder.build("opal", { requirable: true, load: true });
  // opal/full is what gives the port FileTest, Marshal, pack/unpack, Set and
  // the Dir and ENV classes it reads the repository and the environment with.
  builder.build("opal/full", { requirable: true, load: true });
  // stdlib/thread.rb: Thread::Mutex (the transport and the compact-index cache
  // lock with it) and Thread::Backtrace::Location. No Thread.new (D13).
  builder.build("thread", { requirable: true, load: true });
  // RubyGems and, through it, the command classes: building this one file
  // carries the whole port, install_command's `require "fileutils"` included.
  builder.build("rubygems", { requirable: true, load: true });
  // opal-parser, requirable but not loaded at boot: a .gemspec is Ruby source
  // (Gem::Specification.load evals it, and Gem::Installer#ensure_loadable_spec
  // evals the copy it writes for the repository), so `gem` needs the compiler
  // for the gems it reads, and it is carried here rather than the program
  // carrying it: the boot cost is only paid by a command that loads a gemspec
  // (GEMS.md risk 5).
  builder.build("opal-parser", { requirable: true });
  // The HTTP transport, embedded as source text rather than as a path into
  // the build checkout: the program has no tree beside it to read it from
  // (Gem::HTTPTransport runs the source through new Function), the exe is
  // relocatable, and a single-file executable's require() - which answers
  // only built-in modules - is never asked for it.
  builder.buildStr(`OPAL_HTTP_TRANSPORT = ${JSON.stringify(readFileSync(join(ROOT, "lib", "opal", "gems", "http.cjs"), "utf8"))}\n`, "(http-transport)", { no_export: true });
  // The compiled-tree digest of `gem compile` (Gem::CompiledTree) names its
  // output with this key, and the exe/ruby loader re-computes it to find the
  // tree back: both bundles carry the same compiler, so both stamp the same
  // value (tasks/ruby/bundle.mjs exports the digest for exactly this).
  builder.buildStr(`OPAL_COMPILER_KEY = ${JSON.stringify(compilerKey())}\n`, "(opal-compiler-key)", { no_export: true });
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "gem.rb"), "utf8"), "lib/opal/exe/gem.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // terser mangle-only: the compress pass doubles the build for ~5% of size
  return minifyJs(`${builder}`, { mangle: true });
}

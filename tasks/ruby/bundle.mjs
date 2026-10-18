// The JS bundle of the `ruby` command, shared by tasks/ruby.mjs (exe/ruby)
// and tasks/ruby_exe.mjs (exe/ruby.exe): the full corelib (opal), the
// parser and compiler (opal-parser), the OPAL_HOME constant (the load path
// of the stdlib sources), the OPAL_COMPILER_KEY constant (the identity of
// the compiler baked into the bundle, which keys its runtime compile cache)
// and lib/opal/exe/ruby.rb, minified with terser.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";

// The compiler sources the bundle embeds, digested by content: unlike the
// builder's runtimeKey (sizes and mtimes, see builder/cache.mjs) this
// survives checkouts that don't change the compiler.
function compilerKey() {
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
  builder.build("opal-parser", { requirable: true, load: true });
  builder.buildStr(`OPAL_HOME = ${JSON.stringify(ROOT)}\n`, "(opal-home)", { no_export: true });
  builder.buildStr(`OPAL_COMPILER_KEY = ${JSON.stringify(compilerKey())}\n`, "(opal-compiler-key)", { no_export: true });
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "ruby.rb"), "utf8"), "lib/opal/exe/ruby.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // the same terser the CLI's --minify/--mangle use
  return minifyJs(`${builder}`, { minify: true, mangle: true });
}

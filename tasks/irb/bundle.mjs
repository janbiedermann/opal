// The JS bundle of the `irb` command, shared by tasks/irb.mjs (exe/irb)
// and tasks/irb_exe.mjs (exe/irb.exe): the same shape as
// tasks/ruby/bundle.mjs - the full corelib (opal), opal/full, the thread
// shim, the RubyGems port and the parser/compiler (opal-parser) at boot,
// the whole stdlib as requirable modules - but with lib/opal/exe/irb.rb
// as the program: IRB.start, the vendored IRB's own session driver,
// replaces the script runner. Every exe carries all of stdlib, so the
// irb, prism and reline ports need no special case in the sweep.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";
import { compilerKey, treeRequireNames } from "../ruby/bundle.mjs";

export async function buildIrbBundle() {
  // dynamic_require_severity: IRB's load_modules loop (`require m` over
  // conf[:LOAD_MODULES]) and the -r option are meant to be dynamic, the
  // warning would only be noise.
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  // load: true puts them in the bundle's boot index, as the CLI does for
  // its requires, so they run before the program. IRB itself runs them
  // too (its top-level requires), but the boot index is what keeps the
  // Gem try_activate seam and Kernel#caller_locations alive with no
  // require in sight.
  builder.build("opal", { requirable: true, load: true });
  builder.build("opal/full", { requirable: true, load: true });
  builder.build("thread", { requirable: true, load: true });
  // stdlib/rubygems.rb, loaded at boot: the loader installed by the
  // program calls Gem.try_activate when a path is not on $LOAD_PATH, and
  // an activated gem's lib directories then answer that require.
  builder.build("rubygems", { requirable: true, load: true });
  // IRB is one eval loop: Kernel#eval (and the TOPLEVEL_BINDING locals
  // bridge, see Binding#irb_vars in opal/corelib/binding.rb) ships in
  // opal-parser, which irb.rb requires eagerly.
  builder.build("opal-parser", { requirable: true, load: true });
  // The whole stdlib, compiled and requirable but not loaded, exactly as
  // in tasks/ruby/bundle.mjs (see the reasoning there): the sweep dedups
  // on the raw require name, so the boot entries above stay as expanded.
  const bootNames = new Set(["thread", "opal-parser", "opal-builder", "rubygems", "opal", "opal/full"]);
  for (const name of treeRequireNames("stdlib")) {
    if (!bootNames.has(name)) builder.buildRequire(name);
  }
  builder.buildRequire("opal/base");
  builder.buildRequire("opal/mini");
  // What the program is, with no path in it (same constants as the other
  // exe bundles: SharedHelpers#program_path and friends answer paths
  // from these).
  builder.buildStr("OPAL_COMPILED_BUNDLE = true\n", "(opal-compiled-bundle)", { no_export: true });
  builder.buildStr("OPAL_PROGRAM = \"irb\"\n", "(opal-program)", { no_export: true });
  // The HTTP transport (Gem::HTTPTransport): embedded as source text, so
  // the gem port's network half works with no tree beside the program.
  builder.buildStr(`OPAL_HTTP_TRANSPORT = ${JSON.stringify(readFileSync(join(ROOT, "lib", "opal", "gems", "http.cjs"), "utf8"))}\n`, "(http-transport)", { no_export: true });
  builder.buildStr(`OPAL_COMPILER_KEY = ${JSON.stringify(compilerKey())}\n`, "(opal-compiler-key)", { no_export: true });
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "irb.rb"), "utf8"), "lib/opal/exe/irb.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // terser mangle-only: the compress pass doubles the build for ~5% of size
  return minifyJs(`${builder}`, { mangle: true });
}

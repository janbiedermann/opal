// The JS bundle of the `ruby` command, shared by tasks/ruby.mjs (exe/ruby)
// and tasks/ruby_exe.mjs (exe/ruby.exe): the full corelib (opal), the
// parser and compiler (opal-parser), the OPAL_HOME constant (the load path
// of the stdlib sources) and lib/opal/exe/ruby.rb, minified with terser.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { OPAL_ROOT } from "../../lib/opal/compiler/paths.mjs";
import { ROOT } from "../testing/common.mjs";

export async function buildRubyBundle() {
  // dynamic_require_severity: the script's `require lib` for -r is meant to
  // be dynamic, the warning would only be noise.
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  // load: true puts them in the bundle's boot index, as the CLI does for
  // its requires, so they run before the program.
  builder.build("opal", { requirable: true, load: true });
  builder.build("opal-parser", { requirable: true, load: true });
  builder.buildStr(`OPAL_HOME = ${JSON.stringify(ROOT)}\n`, "(opal-home)", { no_export: true });
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "ruby.rb"), "utf8"), "lib/opal/exe/ruby.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // terser from node_modules, as tasks/dist.mjs does: the bundle's own code
  // is compressed and mangled; the scripts compiled at runtime are eval'd
  // strings, untouched by this pass.
  const { minify } = await import(pathToFileURL(join(OPAL_ROOT, "node_modules", "terser", "main.js")).href);
  const minified = await minify(`${builder}`, { compress: true, mangle: true });
  if (minified.error) throw minified.error;
  return minified.code;
}

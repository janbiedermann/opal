// The JS bundle of the `drill` command, shared by tasks/drill.mjs (exe/drill)
// and tasks/drill_exe.mjs (exe/drill.exe): the corelib boot the Ruby entry
// needs (opal, opal/full, thread), the drill toolchain graph (lib/opal/drill:
// its option table, runners, and through them the Builder, Compiler and the
// vendored parser - linked by the builder's esm recipe, the way
// stdlib/opal-parser.rb reaches the compiler), the OPAL_PROGRAM and
// OPAL_COMPILER_KEY constants, a copy of Opal's Ruby sources for relocatable
// mode, and lib/opal/exe/drill.rb, minified with terser.
//
// No checkout path is baked, as in every other bundle: the runners and the
// Builder resolve the tree *beside the running exe* at run time
// (lib/opal/drill/paths.mjs), so an exe/drill inside a checkout compiles the
// working tree - edits included, with no rebuild - which is what the test
// harness and dev probes need.
//
// Relocatable mode (a lone exe/drill.exe): the bundle embeds opal/ and
// stdlib/ as gzip'd source, which drill unpacks to its cache directory and
// builds from. Sources, not precompiled JS: the Builder then does exactly
// what it does in a checkout - autoloads, ERB and require trees keep their
// build-time handling. The lib/ tree is not embedded: a relocatable drill
// builds programs, not toolchains, so programs that require 'opal-parser'
// (or opal-builder) into their own runtime need a checkout beside the exe.
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";
import { compilerKey } from "../ruby/bundle.mjs";

// The tree beside the exe wins (lib/opal/drill/paths.mjs); this map only
// answers when no tree is found. node_modules stays out: stdlib/nodejs's
// vendored npm packages are JavaScript dependencies, not Ruby sources.
function drillSources() {
  const sources = {};
  const walk = (dir, rel) => {
    const entries = readdirSync(join(ROOT, dir), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === "node_modules") continue;
      if (entry.isDirectory()) walk(`${dir}/${entry.name}`, `${rel}${entry.name}/`);
      else if (/\.(rb|mjs|js)$/.test(entry.name)) sources[`${rel}${entry.name}`] = readFileSync(join(ROOT, dir, entry.name), "utf8");
    }
  };
  for (const dir of ["opal", "stdlib"]) walk(dir, `${dir}/`);
  return sources;
}

export async function buildDrillBundle() {
  // dynamic_require_severity: the program's dynamic requires are the
  // harness's business, the warning would only be noise (as in exe/ruby's).
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  // The entry's own runtime: opal + opal/full + thread, booted like exe/ruby's.
  // The program drill *runs* never joins this boot - the runners build and
  // spawn it separately.
  builder.build("opal", { requirable: true, load: true });
  builder.build("opal/full", { requirable: true, load: true });
  builder.build("thread", { requirable: true, load: true });
  // What the program is, with no path in it (the family's stamp).
  builder.buildStr("OPAL_PROGRAM = \"drill\"\n", "(opal-program)", { no_export: true });
  // lib/opal/exe/drill.rb pulls the JS core in (require 'opal/drill/index.mjs'),
  // and the builder links its whole static graph behind that one require.
  builder.buildStr(readFileSync(join(ROOT, "lib", "opal", "exe", "drill.rb"), "utf8"), "lib/opal/exe/drill.rb");
  // No trailing ::Kernel.exit (exe/ruby's bundle has one): the runners are
  // async - the server and browser drills live on the event loop - and
  // process.exitCode carries the status out.

  // The stamps the JS core reads at run time (lib/opal/drill/paths.mjs):
  // OPAL_COMPILER_KEY lets the Builder's FileCache key its entries without
  // the compiler files on disk (the one digest tasks/ruby/bundle.mjs
  // stamps); the sources map is gzip'd JSON with its own content key, so a
  // rebuilt drill unpacks a fresh cache directory and an old one is stale by
  // name, not by surprise.
  const sources = JSON.stringify(drillSources());
  const sourcesKey = createHash("sha256").update(sources).digest("base64url").slice(0, 32);
  const stamps = [
    `globalThis.OPAL_COMPILER_KEY=${JSON.stringify(compilerKey())};`,
    `globalThis.OPAL_DRILL_SOURCES_KEY=${JSON.stringify(sourcesKey)};`,
    `globalThis.OPAL_DRILL_SOURCES=${JSON.stringify(gzipSync(Buffer.from(sources, "utf8")).toString("base64"))};`,
  ].join("");

  // terser mangle-only: the compress pass doubles the build for ~5% of size
  return minifyJs(`${stamps}${builder}`, { mangle: true });
}

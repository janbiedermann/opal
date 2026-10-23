// The JS bundle of the `opal-language-server` command, shared by
// tasks/lsp.mjs (exe/lsp) and tasks/lsp_exe.mjs (exe/lsp.exe): the full
// corelib (opal and opal/full), the single-thread shim, json (the protocol
// is JSON-RPC), the language server (lib/opal/language-server.rb and its
// tree as requirable modules), and lib/opal/exe/lsp.rb, minified with
// terser.
//
// P0 carries only the lifecycle (transport, initialize, shutdown, exit);
// the compiler (opal-parser) joins at boot when the compile gate and
// opalLsp/compileToJs land (LSP.md P5/P2), and the baked corelib index
// (baked_index.mjs, §5) joins in P3.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Builder } from "../../lib/opal/compiler/builder/builder.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";
import { treeRequireNames } from "../ruby/bundle.mjs";

export async function buildLspBundle() {
  const builder = new Builder({ compilerOptions: { dynamic_require_severity: "ignore" }, warn: (msg) => process.stderr.write(msg + "\n") });
  // load: true puts them in the bundle's boot index, as the CLI does for
  // its requires, so they run before the program.
  builder.build("opal", { requirable: true, load: true });
  // opal/full for Set, Marshal and the Dir/ENV classes later phases read
  // (workspace indexing, --check).
  builder.build("opal/full", { requirable: true, load: true });
  // stdlib/thread.rb: Thread::Backtrace::Location for the error answers'
  // backtraces, Mutex for the (single-threaded, but faithful) locks.
  builder.build("thread", { requirable: true, load: true });
  // The protocol's JSON-RPC codec.
  builder.build("json", { requirable: true, load: true });
  // opal-parser at boot: the compile gate, opalLsp/compileToJs and P5's
  // save-time diagnostics all ask the real compiler (LSP.md §5 note on why
  // it is always in the bundle, not lazy).
  builder.build("opal-parser", { requirable: true, load: true });
  // The umbrella requires the whole server; the sweep carries every file
  // of the tree as a requirable module too, so later phases can require
  // the parts the umbrella does not yet load.
  builder.build("opal/language-server", { requirable: true, load: true });
  for (const name of treeRequireNames("lib/opal/language-server", "opal/language-server/")) builder.buildRequire(name);
  builder.buildStr(readFileSync(join(ROOT, "lib/opal/exe/lsp.rb"), "utf8"), "lib/opal/exe/lsp.rb");
  builder.buildStr("::Kernel.exit", "(exit)", { no_export: true });

  // the same terser the CLI's --minify/--mangle use
  return minifyJs(`${builder}`, { minify: true, mangle: true });
}

// The JS bundle of the `opal-language-server` command, shared by
// tasks/lsp.mjs (exe/lsp) and tasks/lsp_exe.mjs (exe/lsp.exe): the plain-JS
// language server (lib/opal/language-server/), its two committed bake
// payloads (baked_index.mjs, corelib_sources.mjs), Opal's parser and the
// Compiler (the compile gate and opalLsp/compileToJs ask it at run time,
// LSP.md §5) - the whole static ESM graph inlined into one classic script
// by the builder's esm_linker, then minified with terser - mangle only,
// compress off: the build is ~2x faster for ~1% more bytes (AGENTS.md).
// One relocatable file: no checkout paths baked (the lsp_cli suite pins
// that).
//
// Mangle-only terser keeps console.* (the compress pass used to drop it):
// the server logs through window/logMessage and process.stderr.write, and
// the CLI's human output through process.stdout.write.
import { join } from "node:path";
import { link } from "../../lib/opal/compiler/builder/esm_linker.mjs";
import { minifyJs } from "../../lib/opal/compiler/cli/minify.mjs";
import { ROOT } from "../testing/common.mjs";

export async function buildLspBundle() {
  const entry = join(ROOT, "lib", "opal", "language-server", "main.mjs");
  const script = link(entry, { root: ROOT });
  return minifyJs(script, { mangle: true });
}

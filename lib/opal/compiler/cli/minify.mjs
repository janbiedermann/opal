// Minification of compiled JavaScript with terser, the --minify/--mangle
// options of the CLI. terser is bundled in lib/opal/dependencies/node_modules
// (like chrome-remote-interface for the browser runners), not the root one.
import { createRequire } from "node:module";
import { join } from "node:path";
import { OPAL_ROOT } from "../paths.mjs";

const require = createRequire(join(OPAL_ROOT, "lib", "opal", "dependencies", "index.mjs"));

// Returns the minified code; {minify} compresses, {mangle} mangles names.
export async function minifyJs(code, { minify = false, mangle = false } = {}) {
  if (!minify && !mangle) return code;
  const result = await require("terser").minify(code, { compress: minify, mangle: mangle });
  if (result.error) throw result.error;
  return result.code;
}

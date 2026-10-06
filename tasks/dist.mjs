// Builds corelib and stdlib to build/ (or DIR).
//
//   node tasks/dist.mjs
//   DIR=/tmp/foo FILES=opal.rb,base64.rb FORMATS=js,min,gz,map node tasks/dist.mjs
//
// FILES restricts the libraries (comma separated), FORMATS selects the
// outputs: js, min (terser), gz (gzipped min), map (embedded source map).
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { Builder } from "../lib/opal/compiler/builder/builder.mjs";
import { OPAL_ROOT } from "../lib/opal/compiler/paths.mjs";

const rubyFiles = (dir) => readdirSync(join(OPAL_ROOT, dir)).filter((f) => f.endsWith(".rb")).map((f) => basename(f, ".rb"));

const buildDir = process.env.DIR || "build";
const files = process.env.FILES
  ? process.env.FILES.split(",")
  : [...rubyFiles("opal"), ...rubyFiles("stdlib"), ...rubyFiles("opal/opal").map((f) => `opal/${f}`)].sort();
const formats = (process.env.FORMATS || "js,min,gz").split(",");
const width = Math.max(...files.map((f) => f.length));

// terser from node_modules (needs `bin/yarn install`): compressed and
// mangled, keeping the names of Opal's functions ($$name: methods and
// blocks, which backtraces show). Mangling makes opal.min.js 27 % and
// opal-parser.min.js 40 % smaller; compiled code with a direct eval (Kernel#eval
// with a binding) keeps its names, as terser leaves such scopes alone.
const KEEP_FNAMES = /^\$\$/;
async function uglify(source) {
  const { minify } = await import(pathToFileURL(join(OPAL_ROOT, "node_modules", "terser", "main.js")).href);
  const result = await minify(source, { compress: { keep_fnames: KEEP_FNAMES }, mangle: { keep_fnames: KEEP_FNAMES } });
  return result.code;
}

const kb = (s) => (s.length / 1000).toFixed(2).padStart(7);

mkdirSync(buildDir, { recursive: true });
for (const lib of files) {
  let log = `* building ${lib}...`.padEnd(width + "* building ... ".length);
  // Set requirable to true, unless building opal. This allows opal to be auto-loaded.
  const requirable = !["opal", "opal/mini", "opal/base"].includes(lib);
  // (the libraries are standalone bundles: linked ES modules export only
  // what the bundle uses, so terser drops the rest)
  const builder = new Builder({
    compilerOptions: { arity_check: false, dynamic_require_severity: "warning" },
    missingRequireSeverity: "error",
    esmPrune: true,
  });
  builder.build(lib, { requirable });

  let src = builder.toString();
  if (formats.includes("map")) src += ";" + builder.sourceMap.toDataUriComment();
  const min = formats.includes("min") || formats.includes("gz") ? await uglify(src) : null;
  const gzp = formats.includes("gz") ? gzipSync(min) : null;

  const out = join(buildDir, `${lib}.js`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, src);
  if (min) writeFileSync(join(buildDir, `${lib}.min.js`), min);
  if (gzp) writeFileSync(join(buildDir, `${lib}.min.js.gz`), gzp);

  log += `done. (development: ${kb(src)}KB`;
  if (min) log += `, minified: ${kb(min)}KB`;
  if (gzp) log += `, gzipped: ${kb(gzp)}KB`;
  console.log(log + ").");
}

#!/usr/bin/env node
// Tracks generated code size (run by CI or manually): compiles the core
// bundles with the current checkout and with a previous ref (GIT_BASE_REF
// or master, like tasks/performance.mjs) and compares the size of the
// generated code.
//
//   node tasks/codesize.mjs                    # compare with master
//   node tasks/codesize.mjs --current          # only measure the current checkout
//   GIT_BASE_REF=branch node tasks/codesize.mjs
//
// Bundles: opal/mini, opal/base, opal/full and "stdlib" (opal/full plus
// every library of stdlib/). Each is compiled from an entry file with the
// ref's own CLI. Generated files go to tmp/codesize/<ref>/; sizes are
// measured plain, minified, minified+mangled (terser, keeping Opal's $$
// names) and gzipped. Results more than 1% larger (5% for the stdlib
// bundle) are reported as failures (informative) and their lines are
// marked FAIL.
//
// The previous ref is built with its own bin/opal, so a ref from before the
// Node.js toolchain needs Ruby and Bundler.
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { ROOT } from "./testing/common.mjs";

const CODESIZE = join(ROOT, "tmp", "codesize");
const ENTRIES = join(CODESIZE, "entries");
const TERSER = join(ROOT, "node_modules", "terser", "main.js");
const KEEP_FNAMES = /^\$\$/; // Opal's $$name functions, shown in backtraces

const failures = [];
const sh = (cmd, options = {}) => execSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true, ...options });
const kb = (n) => (n / 1000).toFixed(2).padStart(9);

// The checked-out ref's own CLI.
function opalCommand() {
  return readFileSync(join(ROOT, "bin", "opal"), "utf8").startsWith("#!/usr/bin/env node")
    ? "node bin/opal"
    : "bundle exec ruby bin/opal";
}

function stdlibEntry() {
  const libs = readdirSync(join(ROOT, "stdlib"))
    .filter((f) => f.endsWith(".rb"))
    .map((f) => f.slice(0, -3))
    .filter((lib) => lib !== "opal");
  return `require "opal/full"\n` + libs.map((lib) => `require ${JSON.stringify(lib)}`).join("\n") + "\n";
}

function bundles() {
  return [
    { name: "opal/base", source: 'require "opal/base"\n' },
    { name: "opal/mini", source: 'require "opal/mini"\n' },
    { name: "opal/full", source: 'require "opal/full"\n' },
    { name: "stdlib", source: stdlibEntry() },
  ];
}

async function uglify(source, mangle) {
  const { minify } = await import(pathToFileURL(TERSER).href);
  const options = mangle
    ? { compress: { keep_fnames: KEEP_FNAMES }, mangle: { keep_fnames: KEEP_FNAMES } }
    : { compress: true, mangle: false };
  const result = await minify(source, options);
  return result.code;
}

// The core bundles are the ones users ship; their growth is held to 1%,
// the stdlib bundle to 5%.
const THRESHOLDS = { "opal/mini": 1, "opal/base": 1, "opal/full": 1, "stdlib": 5 };

class Size {
  constructor(size) {
    this.size = size;
  }

  compareTo(previous, name, threshold) {
    const change = (100 * (this.size - previous.size)) / previous.size;
    const failed = change > threshold;
    console.log(`${name.padStart(24)}: ${kb(previous.size)} kB -> ${kb(this.size)} kB (change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%)${failed ? "  FAIL" : ""}`);
    if (failed) failures.push(`${name} increased by more than ${threshold}%`);
  }
}

// Compiles every bundle with the checked-out ref's CLI and measures it.
async function measure(label) {
  const dir = join(CODESIZE, label);
  mkdirSync(dir, { recursive: true });
  mkdirSync(ENTRIES, { recursive: true });
  const opal = opalCommand();
  const sizes = {};

  for (const bundle of bundles()) {
    const entry = join(ENTRIES, `${label}_${bundle.name.replace("/", "_")}.rb`);
    const out = join(dir, `${bundle.name.replace("/", "_")}.js`);
    writeFileSync(entry, bundle.source);
    console.log(`\n* Building ${bundle.name} with ${label} (${opal})...`);
    sh(`${opal} --no-cache -c -E -O -D ignore --missing-require ignore ${entry} > ${out}`);

    const source = readFileSync(out, "utf8");
    const min = await uglify(source, false);
    const mangled = await uglify(source, true);
    const gz = gzipSync(mangled);
    writeFileSync(join(dir, `${bundle.name.replace("/", "_")}.min.js`), min);
    writeFileSync(join(dir, `${bundle.name.replace("/", "_")}.min.mangled.js`), mangled);
    writeFileSync(join(dir, `${bundle.name.replace("/", "_")}.min.mangled.js.gz`), gz);
    sizes[bundle.name] = {
      development: new Size(source.length),
      minified: new Size(min.length),
      mangled: new Size(mangled.length),
      gzipped: new Size(gz.length),
    };
  }
  return sizes;
}

async function compare() {
  const thisRef = execSync("git describe --tags --always", { cwd: ROOT, encoding: "utf8" }).trim();
  const ref = process.env.GIT_BASE_REF || "master";

  const current = await measure("current");

  let previous;
  sh(`git checkout --recurse-submodules ${ref}`);
  try {
    if (existsSync(join(ROOT, "Gemfile"))) sh("bundle install > /dev/null 2>&1");
    else sh("bin/yarn install > /dev/null 2>&1");
    previous = await measure("previous");
  } finally {
    sh("git checkout --recurse-submodules -");
  }

  console.log("\n=== Summary ===");
  console.log(`Summary of generated code size changes between (previous) ${ref} and (current) ${thisRef}:\n`);
  for (const name of Object.keys(current)) {
    console.log(`Bundle ${name}:`);
    for (const metric of ["development", "minified", "mangled", "gzipped"]) {
      current[name][metric].compareTo(previous[name][metric], `${name} ${metric}`, THRESHOLDS[name]);
    }
    console.log("");
  }

  if (failures.length) {
    console.log("--- Failures ---");
    for (const f of failures) console.log(` - ${f}`);
    console.log("\nThis run failed - some size checks did not pass. Don't worry, this is");
    console.log("informative, not fatal. It may be worth to rerun the task, rebase the branch,");
    console.log("or consult those results with a pull request reviewer.");
    return 1;
  }
  return 0;
}

async function current() {
  const sizes = await measure("current");
  console.log("\n=== Summary ===");
  for (const name of Object.keys(sizes)) {
    const s = sizes[name];
    console.log(`${name}: development ${kb(s.development.size)} kB, minified ${kb(s.minified.size)} kB, mangled ${kb(s.mangled.size)} kB, gzipped ${kb(s.gzipped.size)} kB`);
  }
  return 0;
}

process.exitCode = await (process.argv.includes("--current") ? current() : compare());

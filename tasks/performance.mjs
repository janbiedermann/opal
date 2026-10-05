#!/usr/bin/env node
// Tracks performance regressions (run by CI): compares the current checkout with a previous ref (GITHUB_BASE_REF
// or master) by
//   * the V8 optimization status of corelib methods
//   * compiling Asciidoctor (a real-life Opal application), running it and
//     the size of the bundle (plain, minified, mangled)
// Results more than 5% worse are reported as failures (informative).
// `node tasks/performance.mjs --current` only measures the current checkout.
//
// The previous ref is built with its own bin/opal, so a ref from before the
// Node.js toolchain needs Ruby and Bundler. The Asciidoctor output is
// checked against CRuby's when `ruby` is available, otherwise against the
// previous ref's.
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./testing/common.mjs";

const PERF = join(ROOT, "tmp", "performance");
const ASCIIDOCTOR_REPO_BASE = process.env.ASCIIDOCTOR_REPO_BASE || "https://github.com/asciidoctor";
// Selected asciidoctor versions were working on Aug 19 2021, feel free to update.
const ASCIIDOCTOR_COMMIT = "869e8236";
const ASCIIDOCTOR_JS_COMMIT = "053fa0d3";
const TERSER = join(ROOT, "node_modules", "terser", "bin", "terser");

const failures = [];
const sh = (cmd, options = {}) => execSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true, ...options });
const hasCommand = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" }).status === 0;
const now = () => Number(process.hrtime.bigint() / 1000n); // microseconds

class Timing {
  constructor(tries, fn) {
    this.times = Array.from({ length: tries }, () => {
      const t = now();
      fn();
      return now() - t;
    }).sort((a, b) => a - b);
  }

  get best() {
    return this.times[0];
  }

  get error() {
    return this.times[this.times.length - 1] - this.times[0];
  }

  compareTo(previous, name) {
    const percent = (a, b) => (a / b) * 100;
    const change = percent(this.best - previous.best, previous.best);
    console.log(`${name.padStart(30)}: ${(previous.best / 1e6).toFixed(3)} (+${percent(previous.error, previous.best).toFixed(2)}%) -> ${(this.best / 1e6).toFixed(3)} (+${percent(this.error, this.best).toFixed(2)}%) (change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%)`);
    if (change > 5) failures.push(`${name} increased by more than 5%`);
  }
}

class Size {
  constructor(size) {
    this.size = size;
  }

  compareTo(previous, name) {
    const change = (100 * (this.size - previous.size)) / previous.size;
    console.log(`${name.padStart(30)}: ${(previous.size / 1000).toFixed(2)} kB -> ${(this.size / 1000).toFixed(2)} kB (change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%)`);
    if (change > 5) failures.push(`${name} increased by more than 5%`);
  }
}

function prepare() {
  mkdirSync(PERF, { recursive: true });
  for (const [repo, commit] of [["asciidoctor", ASCIIDOCTOR_COMMIT], ["asciidoctor.js", ASCIIDOCTOR_JS_COMMIT]]) {
    if (!existsSync(join(PERF, repo))) sh(`git clone -q ${ASCIIDOCTOR_REPO_BASE}/${repo}`, { cwd: PERF });
    const dir = join(PERF, repo);
    const head = execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf8" }).trim();
    // (file mode changes, e.g. on shared folders, don't block the checkout)
    if (!head.startsWith(commit)) sh(`git -c core.fileMode=false checkout -q ${commit}`, { cwd: dir });
  }
  const data = readFileSync(join(PERF, "asciidoctor", "benchmark", "sample-data", "mdbasics.adoc"), "utf8");
  writeFileSync(join(PERF, "asciidoctor_test.rb"), readFileSync(join(ROOT, "tasks", "performance", "asciidoctor_test.rb"), "utf8") + "\n__END__\n" + data);
}

function minifiedSize(source, mangle) {
  const result = spawnSync(process.execPath, [TERSER, "-c", ...(mangle ? ["-m"] : [])], { input: source, maxBuffer: 1 << 30 });
  return new Size(result.status === 0 ? result.stdout.length : Infinity);
}

function stat(name) {
  // the checked-out ref's own CLI
  const opal = readFileSync(join(ROOT, "bin", "opal"), "utf8").startsWith("#!/usr/bin/env node") ? "node bin/opal" : "bundle exec ruby bin/opal";
  console.log(`\n* Checking optimization status with ${name}...`);
  sh(`${opal} tasks/performance/optimization_status.rb > tmp/performance/optstatus_${name}`, { env: { ...process.env, NODE_OPTS: "--allow-natives-syntax" } });

  console.log(`\n* Building AsciiDoctor with ${name}...`);
  const build = `${opal} --no-cache -c -Itmp/performance/asciidoctor/lib -Itmp/performance/asciidoctor.js/packages/core/lib -sconcurrent/map -sslim/include tmp/performance/asciidoctor_test.rb > tmp/performance/asciidoctor_test.js`;
  const compileTime = new Timing(7, () => sh(build));

  console.log(`\n* Running AsciiDoctor with ${name}...`);
  const output = `tmp/performance/opal_result_${name}_node.html`;
  const runTime = new Timing(31, () => sh(`node tmp/performance/asciidoctor_test.js > ${output}`));

  const source = readFileSync(join(PERF, "asciidoctor_test.js"), "utf8");
  console.log(`\n* Minifying AsciiDoctor with ${name}...`);
  return {
    compileTime,
    runTime,
    output: readFileSync(join(ROOT, output), "utf8"),
    size: new Size(statSync(join(PERF, "asciidoctor_test.js")).size),
    minSize: minifiedSize(source, false),
    minSizeMangled: minifiedSize(source, true),
  };
}

function compare() {
  const thisRef = execSync("git describe --tags --always", { cwd: ROOT, encoding: "utf8" }).trim();
  const ref = process.env.GITHUB_BASE_REF || "master";

  console.log("\n* Preparing asciidoctor...");
  prepare();

  let rubyResult = null;
  if (hasCommand("ruby")) {
    console.log("\n* Running AsciiDoctor with CRuby...");
    sh("ruby -Itmp/performance/asciidoctor/lib tmp/performance/asciidoctor_test.rb > tmp/performance/ruby_result.html");
    rubyResult = readFileSync(join(PERF, "ruby_result.html"), "utf8");
  }

  const current = stat("current");

  let previous;
  sh(`git checkout --recurse-submodules ${ref}`);
  try {
    if (existsSync(join(ROOT, "Gemfile"))) sh("bundle install > /dev/null 2>&1");
    else sh("bin/yarn install > /dev/null 2>&1");
    previous = stat("previous");
  } finally {
    sh("git checkout --recurse-submodules -");
  }

  console.log("\n=== Summary ===");
  console.log(`Summary of performance changes between (previous) ${ref} and (current) ${thisRef}:\n`);
  const diff = spawnSync("diff", ["--report-identical-files", "-F", "^Class", "-Naur", join(PERF, "optstatus_previous"), join(PERF, "optstatus_current")], { encoding: "utf8" }).stdout;
  console.log("Comparison of V8 function optimization status:");
  console.log(diff);
  if (/^-\s+\[COMPILED\]/m.test(diff)) failures.push("Some methods are no longer compiled on V8");

  console.log("\nComparison of the Asciidoctor (a real-life Opal application) compile and run:");
  if (rubyResult !== null) {
    if (current.output !== rubyResult) failures.push("Wrong result on the current branch for node");
    if (previous.output !== rubyResult) failures.push("Wrong result on the previous branch for node - ignore it");
  } else if (current.output !== previous.output) {
    failures.push("The result differs from the previous branch's for node (no ruby to check which is right)");
  }
  current.compileTime.compareTo(previous.compileTime, "Compile time");
  current.runTime.compareTo(previous.runTime, "Run time on node");
  current.size.compareTo(previous.size, "Bundle size");
  current.minSize.compareTo(previous.minSize, "Minified bundle size");
  current.minSizeMangled.compareTo(previous.minSizeMangled, "Mangled & minified");

  if (failures.length) {
    console.log("--- Failures ---");
    for (const f of failures) console.log(` - ${f}`);
    console.log("\nThis run failed - some performance checks did not pass. Don't worry, this is");
    console.log("informative, not fatal. It may be worth to rerun the task, rebase the branch,");
    console.log("or consult those results with a pull request reviewer.");
    return 1;
  }
  return 0;
}

// --current: only measure the current checkout
function current() {
  prepare();
  const result = stat("current");
  console.log(`\nCompile time: ${(result.compileTime.best / 1e6).toFixed(3)}s, run time: ${(result.runTime.best / 1e6).toFixed(3)}s`);
  console.log(`Bundle: ${(result.size.size / 1000).toFixed(2)} kB, minified: ${(result.minSize.size / 1000).toFixed(2)} kB, mangled: ${(result.minSizeMangled.size / 1000).toFixed(2)} kB`);
  return 0;
}

process.exitCode = process.argv.includes("--current") ? current() : compare();

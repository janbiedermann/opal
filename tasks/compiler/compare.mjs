#!/usr/bin/env node
// Compares the JS compiler (lib/opal/compiler) with the Ruby compiler
// (lib/opal/compiler.rb) while both exist (POTCH.md, phase 2).
//
//   node tasks/compiler/compare.mjs [--diff[=N]] [--list] [--write=DIR] [--options=JSON] <file|dir>...
//   node tasks/compiler/compare.mjs [--diff] -e 'ruby code'
//   node tasks/compiler/compare.mjs --update-fixtures [<fixture dir>...]
//
// Files are compiled by both compilers with `file` set to their path
// relative to the load path they were found in (opal/, stdlib/, lib/, or
// the directory given). The report counts identical outputs, differing
// outputs and failures of either compiler. --diff prints the first N
// differences as line diffs; --list prints the file names per category;
// --write saves both outputs of each differing file to DIR (as
// <name>.ruby.js and <name>.js.js) for a full diff.
//
// --update-fixtures regenerates the expected outputs of the compiler
// fixtures (spec/lib/fixtures/compiler/**/*.rb -> *.js) with the Ruby
// compiler. A fixture can set compiler options with a first line of
//   # opal-options: {"requirable": true}
// Where the JS compiler deliberately differs from the Ruby compiler, its
// expected output is kept in <name>.potch.js next to the fixture; files
// whose JS output matches it are reported as "intended".
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Compiler } from "../../lib/opal/compiler/index.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURES = join(ROOT, "spec", "lib", "fixtures", "compiler");

export class RubyOracle {
  constructor() {
    this.child = spawn("bundle", ["exec", "ruby", join(ROOT, "tasks/compiler/ruby_oracle.rb")], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "inherit"],
    });
    this.pending = [];
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      this.pending.shift()(JSON.parse(line));
    });
  }

  compile(source, options) {
    return new Promise((resolvePromise) => {
      this.pending.push(resolvePromise);
      this.child.stdin.write(JSON.stringify({ source, options }) + "\n");
    });
  }

  close() {
    this.child.stdin.end();
  }
}

export function jsCompile(source, options) {
  try {
    return { code: new Compiler(source, { warning: () => {}, ...options }).compile() };
  } catch (error) {
    return { error: `${error.name}: ${error.message}` };
  }
}

// Compiler options from a fixture's `# opal-options: {...}` first line.
export function fixtureOptions(source) {
  const m = /^# opal-options: (\{.*\})\s*$/m.exec(source.split("\n")[0]);
  return m ? JSON.parse(m[1]) : {};
}

function walk(path, out = []) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path).sort()) walk(join(path, entry), out);
  } else if (path.endsWith(".rb")) {
    out.push(path);
  }
  return out;
}

// `file` option for a path: relative to the load path it lives in.
function fileOption(path, base) {
  for (const loadPath of ["opal", "stdlib", "lib"]) {
    const dir = join(ROOT, loadPath) + "/";
    if (path.startsWith(dir)) return path.slice(dir.length);
  }
  return relative(base, path);
}

function lineDiff(a, b, context = 2) {
  const al = a.split("\n");
  const bl = b.split("\n");
  let start = 0;
  while (start < al.length && start < bl.length && al[start] === bl[start]) start++;
  let endA = al.length - 1;
  let endB = bl.length - 1;
  while (endA >= start && endB >= start && al[endA] === bl[endB]) {
    endA--;
    endB--;
  }
  const out = [];
  for (let i = Math.max(0, start - context); i < start; i++) out.push(`  ${al[i]}`);
  for (let i = start; i <= endA; i++) out.push(`- ${al[i]}`);
  for (let i = start; i <= endB; i++) out.push(`+ ${bl[i]}`);
  for (let i = endA + 1; i <= Math.min(al.length - 1, endA + context); i++) out.push(`  ${al[i]}`);
  return out.join("\n");
}

async function updateFixtures(dirs) {
  const oracle = new RubyOracle();
  const files = (dirs.length ? dirs : [FIXTURES]).flatMap((d) => walk(resolve(d)));
  let written = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const options = { file: relative(FIXTURES, file), ...fixtureOptions(source) };
    const result = await oracle.compile(source, options);
    const target = file.replace(/\.rb$/, ".js");
    const content = result.code != null ? result.code : `// error: ${result.error}\n`;
    if (!existsSync(target) || readFileSync(target, "utf8") !== content) {
      writeFileSync(target, content);
      written++;
    }
  }
  oracle.close();
  console.log(`${files.length} fixtures, ${written} expected outputs written`);
}

async function main() {
  const args = process.argv.slice(2);
  const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split(/=(.*)/s);
    return [k, v === undefined ? true : v];
  }));
  const positional = args.filter((a) => !a.startsWith("--"));

  if (flags["update-fixtures"]) return updateFixtures(positional);

  const extraOptions = flags.options ? JSON.parse(flags.options) : {};
  const diffLimit = flags.diff === true ? 5 : flags.diff ? Number(flags.diff) : 0;

  let inputs;
  const eIndex = positional.indexOf("-e");
  if (args.includes("-e")) {
    const code = args[args.indexOf("-e") + 1];
    inputs = [{ name: "-e", source: code, options: { file: "-e", ...extraOptions } }];
  } else {
    inputs = positional.filter((_, i) => i !== eIndex).flatMap((p) => {
      const base = statSync(p).isDirectory() ? resolve(p) : dirname(resolve(p));
      return walk(resolve(p)).map((file) => {
        const source = readFileSync(file, "utf8");
        const intendedPath = file.replace(/\.rb$/, ".potch.js");
        const intended = existsSync(intendedPath) ? readFileSync(intendedPath, "utf8") : null;
        return { name: relative(ROOT, file), source, intended, options: { file: fileOption(file, base), ...fixtureOptions(source), ...extraOptions } };
      });
    });
  }

  const oracle = new RubyOracle();
  const categories = { identical: [], intended: [], different: [], js_error: [], ruby_error: [], both_error: [] };
  let diffs = 0;
  let jsTime = 0;

  for (const input of inputs) {
    const ruby = await oracle.compile(input.source, input.options);
    const started = performance.now();
    const js = jsCompile(input.source, input.options);
    jsTime += performance.now() - started;

    let category;
    if (ruby.error && js.error) category = "both_error";
    else if (ruby.error) category = "ruby_error";
    else if (js.error) category = "js_error";
    else if (ruby.code === js.code) category = "identical";
    else category = input.intended != null && input.intended === js.code ? "intended" : "different";
    categories[category].push(input.name);

    if (flags.write && category === "different") {
      const base = join(flags.write, input.name.replaceAll("/", "__"));
      mkdirSync(flags.write, { recursive: true });
      writeFileSync(`${base}.ruby.js`, ruby.code);
      writeFileSync(`${base}.js.js`, js.code);
    }

    if (diffLimit && diffs < diffLimit && category !== "identical" && category !== "intended") {
      diffs++;
      console.log(`=== ${input.name} (${category})`);
      if (category === "different") console.log(lineDiff(ruby.code, js.code));
      else console.log(js.error || ruby.error);
    }
  }
  oracle.close();

  const total = inputs.length;
  const summary = Object.entries(categories).map(([k, v]) => `${k}=${v.length}`).join(" ");
  console.log(`${total} files: ${summary} (JS compile time ${jsTime.toFixed(0)} ms)`);
  if (flags.list) {
    for (const [k, v] of Object.entries(categories)) {
      if (k !== "identical" && k !== "intended" && v.length) console.log(`${k}:\n  ${v.join("\n  ")}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

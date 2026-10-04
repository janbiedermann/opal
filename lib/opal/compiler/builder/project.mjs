// Opal projects: directories described by an Opalfile (or a Gemfile/
// gemspec), whose load paths get added to the builder. Port of
// lib/opal/project.rb.
//
// The Opalfile is a Ruby DSL; this reads the subset Opal uses:
// add_load_path(s) with string arguments, add_gem_dependency (gems don't
// exist in Node.js, so it is skipped with a warning) and
// `if RUBY_ENGINE == 'opal'` / `!= 'opal'` blocks.
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, basename, isAbsolute, resolve } from "node:path";

const PROJECT_DEFINING = (entry) => entry === "Opalfile" || entry === "Gemfile" || entry.endsWith(".gemspec");

export class UnknownOpalfileDirective extends Error {}

// Evaluates an Opalfile; calls collection.appendPaths for load paths.
export function evaluateOpalfile(source, rootDir, collection, warn = console.warn) {
  const stack = [true]; // whether the current branch is active
  const active = () => stack.every(Boolean);

  for (const raw of source.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;

    let m;
    if ((m = /^if\s+RUBY_ENGINE\s*(==|!=)\s*['"](\w+)['"]$/.exec(line))) {
      stack.push((m[1] === "==") === (m[2] === "opal"));
    } else if (/^if\b/.test(line) || /^unless\b/.test(line)) {
      stack.push(false); // conditions we can't evaluate are skipped
    } else if (line === "else") {
      stack[stack.length - 1] = !stack[stack.length - 1];
    } else if (line === "end") {
      stack.pop();
    } else if (!active()) {
      continue;
    } else if ((m = /^add_load_paths?(?:\s+|\s*\()(.*?)\)?$/.exec(line))) {
      const paths = splitArguments(m[1]).map((arg) => evaluateString(arg, rootDir, line));
      collection.appendPaths(...paths.map((p) => (isAbsolute(p) ? p : realpathOrResolve(resolve(rootDir, p)))));
    } else if ((m = /^add_gem_dependency\s*\(?\s*["']([^"']*)["']/.exec(line))) {
      warn(`Opal: gems are not available in Node.js. The directive \`add_gem_dependency ${m[1]}\` has been ignored.`);
    } else {
      throw new UnknownOpalfileDirective(`unknown directive in Opalfile: ${line}`);
    }
  }
}

// The arguments of a call, split at top-level commas.
function splitArguments(str) {
  const args = [];
  let current = "";
  let quote = null;
  for (const ch of str) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ",") {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// A string expression: string literals and __dir__ joined with +.
function evaluateString(expr, rootDir, line) {
  return expr.split("+").map((part) => {
    part = part.trim();
    if (part === "__dir__") return rootDir;
    const m = /^(["'])(.*)\1$/.exec(part);
    if (!m) throw new UnknownOpalfileDirective(`unsupported expression in Opalfile: ${line}`);
    return m[2];
  }).join("");
}

function realpathOrResolve(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

// Finds the project root for a file: the nearest ancestor directory with an
// Opalfile, Gemfile or *.gemspec (stopping at a "vendor" directory).
export function locateRootDir(file) {
  let current;
  try {
    current = realpathSync(file);
  } catch {
    return null;
  }
  const isCandidate = (dir) => {
    try {
      return statSync(dir).isDirectory() && readdirSync(dir).some(PROJECT_DEFINING);
    } catch {
      return false;
    }
  };
  while (!isCandidate(current)) {
    const parent = dirname(current);
    if (current === parent || basename(current) === "vendor") break;
    current = parent;
  }
  return isCandidate(current) ? current : null;
}

// A set of projects whose load paths extend a path list.
export class ProjectCollection {
  constructor(appendPaths, warn = console.warn) {
    this.projects = new Map();
    this.loading = new Set();
    this.appendPathsFn = appendPaths;
    this.warn = warn;
  }

  appendPaths(...paths) {
    for (const path of paths) this.setupProject(path);
    this.appendPathsFn(...paths);
  }

  // Registers the project the file belongs to (once) and applies its Opalfile.
  setupProject(file) {
    const rootDir = locateRootDir(file);
    if (!rootDir || this.projects.has(rootDir) || this.loading.has(rootDir)) return;
    this.projects.set(rootDir, { rootDir });
    const opalfile = `${rootDir}/Opalfile`;
    if (existsSync(opalfile)) {
      this.loading.add(rootDir);
      try {
        evaluateOpalfile(readFileSync(opalfile, "utf8"), rootDir, this, this.warn);
      } finally {
        this.loading.delete(rootDir);
      }
    }
  }

  get rootDirs() {
    return [...this.projects.keys()];
  }
}

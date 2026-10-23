// Opal projects: directories marked by a Gemfile or a *.gemspec, which the
// builder registers to say what was loaded when a require is missing. Port
// of lib/opal/project.rb, minus its Opalfile DSL: load paths come from the
// builder's paths and -I, gem paths from gem_paths.mjs (--gem).
import { readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, basename } from "node:path";

const PROJECT_DEFINING = (entry) => entry === "Gemfile" || entry.endsWith(".gemspec");

// Finds the project root for a file: the nearest ancestor directory with a
// Gemfile or *.gemspec (stopping at a "vendor" directory).
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
  constructor(appendPaths) {
    this.projects = new Set();
    this.appendPathsFn = appendPaths;
  }

  appendPaths(...paths) {
    for (const path of paths) this.setupProject(path);
    this.appendPathsFn(...paths);
  }

  // Registers the project the file belongs to (once).
  setupProject(file) {
    const rootDir = locateRootDir(file);
    if (rootDir) this.projects.add(rootDir);
  }

  get rootDirs() {
    return [...this.projects];
  }
}

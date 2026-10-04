// Finds files in load paths with a list of extensions. Port of
// lib/opal/hike.rb (itself based on the hike gem).
import { readdirSync, statSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";

const IGNORED_ENTRY = /^\.|~$|^#.*#$/;

function escapeRegexp(str) {
  return str.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
}

export class FileFinder {
  constructor(root = ".") {
    this.root = resolve(root);
    this.paths = [];
    this.extensions = [];
    this.entriesCache = new Map();
    this.patterns = new Map();
  }

  appendPaths(...paths) {
    for (const p of paths) this.paths.push(resolve(this.root, p));
  }

  appendExtensions(...extensions) {
    for (const e of extensions) this.extensions.push(e.startsWith(".") ? e : `.${e}`);
    this.patterns.clear();
  }

  // The first file matching the logical path (with any of the extensions),
  // or null. "./x" and "../x" are resolved against the root.
  find(logicalPath) {
    logicalPath = logicalPath.replace(/^\//, "");
    if (/^\.\.?\//.test(logicalPath)) {
      const candidate = join(this.root, logicalPath);
      const dir = dirname(candidate);
      if (this.paths.some((p) => dir.startsWith(p))) return this.match(dir, basename(candidate));
      return null;
    }
    const dir = dirname(logicalPath);
    const base = basename(logicalPath);
    for (const path of this.paths) {
      const found = this.match(join(path, dir), base);
      if (found) return found;
    }
    return null;
  }

  entries(path) {
    let entries = this.entriesCache.get(path);
    if (!entries) {
      try {
        entries = readdirSync(path).filter((e) => !IGNORED_ENTRY.test(e)).sort();
      } catch {
        entries = [];
      }
      this.entriesCache.set(path, entries);
    }
    return entries;
  }

  match(dir, base) {
    const pattern = this.patternFor(base);
    const matches = this.entries(dir).filter((m) => pattern.test(m));
    for (const m of this.sortMatches(matches, base)) {
      const path = join(dir, m);
      try {
        if (statSync(path).isFile()) return path;
      } catch {
        // gone
      }
    }
    return null;
  }

  patternFor(base) {
    let pattern = this.patterns.get(base);
    if (!pattern) {
      const extensions = this.extensions.map(escapeRegexp).join("|");
      pattern = new RegExp(`^${escapeRegexp(base)}(?:${extensions})*$`);
      this.patterns.set(base, pattern);
    }
    return pattern;
  }

  // Prefers matches whose extensions come first in the extension list.
  sortMatches(matches, base) {
    const score = (m) => {
      const extnames = m.slice(base.length).match(/\.[^.]+/g) || [];
      return extnames.reduce((sum, ext) => {
        const index = this.extensions.indexOf(ext);
        return index === -1 ? sum : sum + index + 1;
      }, 0);
    };
    return [...matches].sort((a, b) => score(a) - score(b));
  }
}

// A file cache for compiled files (lib/opal/cache.rb), in OPAL_CACHE_DIR
// or ~/.cache/opal-js. Entries are keyed by a digest of the inputs and of
// the compiler's own files, so a changed compiler doesn't reuse them.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { homedir } from "node:os";
import { join } from "node:path";
import { OPAL_ROOT } from "../paths.mjs";

export class NullCache {
  fetch(_key, fn) {
    return fn();
  }
}

function digest(str) {
  return createHash("sha256").update(str).digest("base64url").slice(0, 32);
}

// Files of the compiler and parser (their sizes and mtimes key the cache).
function runtimeKey() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (path.endsWith(".mjs")) files.push(path);
    }
  };
  walk(join(OPAL_ROOT, "lib", "opal", "compiler"));
  walk(join(OPAL_ROOT, "lib", "opal", "potch"));
  walk(join(OPAL_ROOT, "opal", "runtime"));
  return digest(files.sort().map((f) => {
    const st = statSync(f);
    return `${f}:${st.size}:${st.mtimeMs}`;
  }).join("/"));
}

export class FileCache {
  constructor({ dir = null, maxSize = 32 * 1024 * 1024 } = {}) {
    this.dir = dir || FileCache.findDir();
    this.maxSize = maxSize;
    this.runtimeKey = runtimeKey();
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    this.tidyUp();
  }

  static findDir() {
    if (process.env.OPAL_CACHE_DIR) return process.env.OPAL_CACHE_DIR;
    return join(homedir(), ".cache", "opal-js");
  }

  // The cached value for the key (an array of strings/objects), or the
  // result of fn(), which is stored unless it is marked dynamic.
  fetch(key, fn) {
    const file = join(this.dir, `${digest(JSON.stringify(key))}-${this.runtimeKey}.json.gz`);
    if (existsSync(file)) {
      try {
        return JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
      } catch {
        // a broken entry: recompile
      }
    }
    const value = fn();
    if (!value.dynamicCacheResult) {
      const tmp = `${file}.${process.pid}.tmp`;
      writeFileSync(tmp, gzipSync(JSON.stringify(value)));
      renameSync(tmp, file);
    }
    return value;
  }

  // Keeps the cache at most maxSize bytes, removing the oldest entries.
  tidyUp() {
    let entries;
    try {
      entries = readdirSync(this.dir).filter((e) => e.endsWith(".json.gz")).map((e) => {
        const path = join(this.dir, e);
        const st = statSync(path);
        return { path, size: st.size, atime: st.atimeMs };
      });
    } catch {
      return;
    }
    let total = entries.reduce((sum, e) => sum + e.size, 0);
    if (total <= this.maxSize) return;
    entries.sort((a, b) => a.atime - b.atime);
    for (const e of entries) {
      if (total <= this.maxSize * 0.75) break;
      try {
        unlinkSync(e.path);
        total -= e.size;
      } catch {
        // already gone
      }
    }
  }
}

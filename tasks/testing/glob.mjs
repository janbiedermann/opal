// Dir[]-like globbing for the test drivers: `*`, `?`, `**` (any number of
// directories; `**x` within a segment is like `*x`) and `{a,b}`. Patterns are
// relative to the working directory; results are sorted.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function expandBraces(pattern) {
  const m = /\{([^{}]*)\}/.exec(pattern);
  if (!m) return [pattern];
  return m[1].split(",").flatMap((alt) => expandBraces(pattern.slice(0, m.index) + alt + pattern.slice(m.index + m[0].length)));
}

function segmentRegexp(segment) {
  const src = segment.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*+/g, "[^/]*").replace(/\?/g, "[^/]");
  return new RegExp(`^${src}$`);
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function entries(dir) {
  try {
    return readdirSync(dir === "" ? "." : dir).filter((e) => !e.startsWith("."));
  } catch {
    return [];
  }
}

function walk(base, segments, out) {
  if (segments.length === 0) {
    out.add(base);
    return;
  }
  const [segment, ...rest] = segments;
  if (segment === "**") {
    walk(base, rest, out);
    for (const e of entries(base)) {
      const path = base === "" ? e : join(base, e);
      if (isDirectory(path)) walk(path, segments, out);
    }
    return;
  }
  if (!/[*?]/.test(segment)) {
    const path = base === "" ? segment : join(base, segment);
    if (rest.length === 0 ? pathExists(path) : isDirectory(path)) walk(path, rest, out);
    return;
  }
  const re = segmentRegexp(segment);
  for (const e of entries(base)) {
    if (!re.test(e)) continue;
    const path = base === "" ? e : join(base, e);
    if (rest.length === 0 || isDirectory(path)) walk(path, rest, out);
  }
}

function pathExists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

export function glob(pattern) {
  const out = new Set();
  for (const p of expandBraces(pattern)) {
    const absolute = p.startsWith("/");
    walk(absolute ? "/" : "", p.split("/").filter(Boolean), out);
  }
  return [...out].sort();
}

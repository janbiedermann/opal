// opal --plugin for running ruby/spec: enables the compile-time handling
// of mspec's guards (not_supported_on, platform_is, ...) and leaves out the
// specs listed in spec/filters/{bugs,unsupported}.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseWithMetadata } from "../../lib/opal/parser/index.mjs";

const FILTERS_DIR = new URL("../../spec/filters/", import.meta.url).pathname;

function rubyFiles(dir) {
  return readdirSync(dir).sort().flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return rubyFiles(path);
    return entry.endsWith(".rb") ? [path] : [];
  });
}

// The spec names in `fails "..."` / `fails_badly "..."` calls, inside
// `opal_filter` blocks (skipped with INVERT_RUNNING_MODE) and
// `opal_unsupported_filter` blocks.
export function filtersIn(source) {
  const out = [];
  const { ast } = parseWithMetadata(source);
  const visit = (node, include) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((n) => visit(n, include));
    if (node.type === "CallNode" && !node.receiver) {
      if (node.name === "opal_filter") return visit(node.block, include && !process.env.INVERT_RUNNING_MODE);
      if (node.name === "opal_unsupported_filter") return visit(node.block, include);
      if ((node.name === "fails" || node.name === "fails_badly") && include) {
        const arg = node.arguments && node.arguments.arguments[0];
        if (arg && arg.type === "StringNode") out.push(arg.unescaped);
        return;
      }
    }
    for (const [key, value] of Object.entries(node)) if (key !== "location") visit(value, include);
  };
  visit(ast, true);
  return out;
}

export function rubyspecFilters() {
  return ["unsupported", "bugs"].flatMap((dir) => rubyFiles(join(FILTERS_DIR, dir))).flatMap((f) => filtersIn(readFileSync(f, "utf8")));
}

export default function (cli) {
  cli.compilerOptions.rubyspec_specials = true;
  cli.compilerOptions.rubyspec_filters = rubyspecFilters();
}

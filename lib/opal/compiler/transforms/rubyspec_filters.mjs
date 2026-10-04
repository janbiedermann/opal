// Support for running ruby/spec (mspec) with Opal. Port of
// lib/opal/rewriters/rubyspec/filters_rewriter.rb: with the
// `rubyspec_filters` option (an array of spec names), describe/it/context
// blocks whose full name is filtered are compiled to nil, and
// fixture(__FILE__, "name") calls with string arguments are expanded at
// compile time.
import { mapChildren } from "./walk.mjs";

const RUBYSPEC_DSL = new Set(["describe", "it", "context"]);

// Adapted from: spec/mspec/lib/mspec/helpers/fixture.rb
function fixture(file, ...args) {
  let path = file.lastIndexOf("/") === -1 ? "." : file.slice(0, file.lastIndexOf("/")) || "/";
  if (path.endsWith("/shared")) path = path.slice(0, -7);
  const fixtures = path.endsWith("/fixtures") ? "" : "fixtures";
  return [path, fixtures, ...args].filter((p) => p !== "").join("/");
}

// The name a spec block contributes: its first argument when that is a
// string or symbol.
function specName(node) {
  const first = node.arguments ? node.arguments.arguments[0] : null;
  if (!first) return "";
  if (first.type === "StringNode" || first.type === "SymbolNode") return first.unescaped;
  if (first.type === "SourceFileNode") return null;
  return "";
}

export function rubyspecFilters(compiler, root) {
  const filters = compiler.options.rubyspec_filters;
  if (!filters) return root;
  const filtered = new Set(filters);
  const specsStack = [];

  function process(node) {
    if (node.type === "CallNode" && RUBYSPEC_DSL.has(node.name)) {
      compiler.dynamicCacheResult = true;
      specsStack.push(specName(node));
      try {
        if (filtered.has(specsStack.join(" "))) return { type: "NilNode", location: node.location };
        return mapChildren(node, process);
      } finally {
        specsStack.pop();
      }
    }

    if (node.type === "CallNode" && node.name === "fixture") {
      // We want to expand the fixture paths before autoload happens.
      const args = node.arguments ? node.arguments.arguments : [];
      const strings = args.map((arg) => {
        if (arg.type === "StringNode") return arg.unescaped;
        if (arg.type === "SourceFileNode") return compiler.file;
        return null;
      });
      if (args.length > 0 && !strings.includes(null)) {
        return { type: "OpalStr", location: node.location, value: fixture(...strings) };
      }
    }

    return mapChildren(node, process);
  }

  return process(root);
}

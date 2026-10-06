// Bundles the npm packages a compiled program requires (`require('name')`
// in its JavaScript (an npm package a stdlib file requires) into it, for a Node.js
// single executable application, where only Node's own modules can be
// required. Packages are CommonJS modules (.js and .json files) found from
// the current directory, Opal's stdlib/nodejs and NODE_PATH; their files
// are the ones reached by static relative requires.
import { readFileSync } from "node:fs";
import { createRequire, isBuiltin } from "node:module";
import { delimiter, join, relative } from "node:path";
import { OPAL_ROOT } from "../paths.mjs";

// (Node's require, not Opal's: Opal.require(...), self.$require(...))
const NPM_REQUIRE = /(?<![.$\w])require\(\s*(['"])((?![./])[^'"]+)\1\s*\)/g;
const RELATIVE_REQUIRE = /(?<![.$\w])require\(\s*(['"])(\.{1,2}\/[^'"]*|\.{1,2})\1\s*\)/g;

// The names of the npm packages `source` requires.
export function npmRequires(source) {
  const names = new Set();
  for (const m of source.matchAll(NPM_REQUIRE)) {
    if (!isBuiltin(m[2])) names.add(m[2]);
  }
  return [...names];
}

// Returns { prelude, wrap(code), missing }: `prelude` defines the bundled
// packages, and wrap(code) runs `code` with a `require` that serves them
// (anything else goes to Node's require). `missing` are the packages that
// weren't found (left out).
export function bundleNpmPackages(source, { cwd = process.cwd(), nodePath = process.env.NODE_PATH } = {}) {
  const names = npmRequires(source);
  const paths = [cwd, join(OPAL_ROOT, "stdlib", "nodejs"), ...(nodePath || "").split(delimiter).filter(Boolean)];
  const resolver = createRequire(join(cwd, "__opal_exe__.js"));
  const files = new Map(); // path -> { id, code, deps: { spec: id } }
  const entries = {}; // package name -> id of its main file
  const missing = [];
  const root = (path) => relative(cwd, path).split("\\").join("/");

  const add = (path) => {
    if (files.has(path)) return files.get(path).id;
    const entry = { id: root(path), code: readFileSync(path, "utf8"), deps: {} };
    files.set(path, entry);
    if (path.endsWith(".js") || path.endsWith(".cjs")) {
      const fileRequire = createRequire(path);
      for (const m of entry.code.matchAll(RELATIVE_REQUIRE)) {
        entry.deps[m[2]] = add(fileRequire.resolve(m[2]));
      }
    }
    return entry.id;
  };

  for (const name of names) {
    try {
      entries[name] = add(resolver.resolve(name, { paths }));
    } catch {
      missing.push(name);
    }
  }

  const definitions = [...files.values()].map(({ id, code, deps }) => {
    const body = id.endsWith(".json") ? `module.exports = ${code.trim()};` : code;
    return `${JSON.stringify(id)}: [function(module, exports, require, __filename, __dirname) {\n${body}\n}, ${JSON.stringify(deps)}]`;
  });
  const prelude = [
    "var __opal_npm_require__ = (function(nodeRequire) {",
    `  var modules = {\n${definitions.join(",\n")}\n  };`,
    `  var entries = ${JSON.stringify(entries)};`,
    "  var cache = {};",
    "  function load(id) {",
    "    if (cache[id]) return cache[id].exports;",
    "    var module = cache[id] = { exports: {} }, definition = modules[id];",
    "    var dir = id.indexOf('/') === -1 ? '.' : id.slice(0, id.lastIndexOf('/'));",
    "    definition[0].call(module.exports, module, module.exports, function(spec) {",
    "      return definition[1][spec] !== undefined ? load(definition[1][spec]) : bundledRequire(spec);",
    "    }, id, dir);",
    "    return module.exports;",
    "  }",
    "  function bundledRequire(spec) {",
    "    return entries[spec] !== undefined ? load(entries[spec]) : nodeRequire(spec);",
    "  }",
    "  return bundledRequire;",
    "})(require);",
  ].join("\n");
  return {
    prelude: files.size ? prelude : "",
    wrap: (code) => files.size ? `(function(require) {\n${code}\n})(__opal_npm_require__);\n` : code,
    missing,
    packages: Object.keys(entries),
  };
}

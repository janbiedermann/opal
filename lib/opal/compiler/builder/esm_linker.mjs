// A small ES module linker: inlines a graph of .mjs modules into one
// classic script expression that evaluates to the entry module's exports.
// The builder uses it for .mjs files with import/export statements (e.g.
// the JS compiler in opal-parser).
//
// It reads import/export statements at the start of a line (top level in
// formatted code) and handles the forms Opal's own modules use:
//   import { a, b as c } from "./x.mjs";   import * as ns from "./x.mjs";
//   import d from "./x.mjs";               import "./x.mjs";
//   export function/class/const/let/var name ...
//   export { a, b as c };                  export { a } from "./x.mjs";
//   export * from "./x.mjs";               export default expression;
// `node:` modules come from process.getBuiltinModule (Node.js only) and
// import.meta.url becomes the module file's URL. Exports are copied when a
// module has finished evaluating, so a module graph must not have import
// cycles and exported bindings must not be reassigned later.
import { readFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

export class LinkError extends Error {}

const IDENT = String.raw`[A-Za-z_$][\w$]*`;

export function hasModuleSyntax(source) {
  return /^(?:import|export)\b/m.test(source);
}

// Returns the script (an expression) for the module graph of entryPath.
//
// Options:
//   root      module ids are paths relative to it (default: the entry's
//             directory)
//   registry  a JS expression for an object where the script keeps its
//             modules ({modules, cache}), shared by scripts that use the
//             same one (default: private to the script)
//   linked    a Set of module paths: those in it are not included (an
//             earlier script with the same registry has them), and the
//             included ones are added
export function link(entryPath, { root = dirname(entryPath), registry = null, linked = null } = {}) {
  const modules = new Map(); // path -> transformed body
  const order = [];
  const visiting = [];

  const load = (path) => {
    if (modules.has(path) || (linked && linked.has(path))) return;
    if (visiting.includes(path)) {
      const cycle = visiting.slice(visiting.indexOf(path)).concat(path).map((p) => relative(root, p));
      throw new LinkError(`import cycle: ${cycle.join(" -> ")}`);
    }
    visiting.push(path);
    const { body, deps } = transform(readFileSync(path, "utf8"), path, root);
    for (const dep of deps) load(dep);
    visiting.pop();
    modules.set(path, body);
    order.push(path);
  };
  load(resolve(entryPath));
  if (linked) for (const path of order) linked.add(path);

  const id = (path) => moduleId(root, path);
  const store = registry ? `${registry} || (${registry} = { modules: {}, cache: {} })` : "{ modules: {}, cache: {} }";
  const parts = ["(function() {", '"use strict";', `var __registry = ${store}, __modules = __registry.modules, __cache = __registry.cache;`,
    "function __require(id) { var m = __cache[id]; if (!m) { m = __cache[id] = {}; __modules[id](m); } return m; }",
    "function __builtin(name) { return process.getBuiltinModule(name); }"];
  for (const path of order) {
    parts.push(`__modules[${id(path)}] = function(__exports) {`, modules.get(path), "};");
  }
  parts.push(`return __require(${id(resolve(entryPath))});`, "})()");
  return parts.join("\n");
}

function moduleId(root, path) {
  return JSON.stringify(relative(root, path));
}

function parseSpecifiers(list) {
  return list.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = new RegExp(`^(${IDENT}|default)(?:\\s+as\\s+(${IDENT}|default))?$`).exec(s);
    if (!m) throw new LinkError(`unsupported import/export specifier: ${s}`);
    return { imported: m[1], local: m[2] || m[1] };
  });
}

function transform(source, path, root) {
  const deps = [];
  const exports = []; // [name, expression]
  const stars = [];
  const dir = dirname(path);
  let counter = 0;

  const moduleRef = (spec) => {
    if (spec.startsWith("node:")) return `__builtin(${JSON.stringify(spec)})`;
    if (!spec.startsWith(".")) throw new LinkError(`${path}: can't link the package import "${spec}"`);
    const target = resolve(dir, spec);
    deps.push(target);
    return `__require(${moduleId(root, target)})`;
  };

  const lines = source.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^(?:import|export)\b/.test(line)) {
      out.push(line);
      continue;
    }
    // a statement may span lines: join until it is complete
    let stmt = line;
    const complete = (s) => /^import\s*["']/.test(s) ? /;\s*$/.test(s)
      : /^(?:import|export)\s*(?:\{|\*)/.test(s) || /^import\s/.test(s) ? /(?:from\s*["'][^"']+["']|\})\s*;\s*$/.test(s)
      : true;
    let consumed = 0;
    while (!complete(stmt) && i + consumed + 1 < lines.length) {
      consumed++;
      stmt += "\n" + lines[i + consumed];
    }
    const flat = stmt.replace(/\s+/g, " ").trim();
    let m;
    let replacement;
    if ((m = /^import ["']([^"']+)["'];?$/.exec(flat))) {
      replacement = `${moduleRef(m[1])};`;
    } else if ((m = new RegExp(`^import \\* as (${IDENT}) from ["']([^"']+)["'];?$`).exec(flat))) {
      replacement = `const ${m[1]} = ${moduleRef(m[2])};`;
    } else if ((m = new RegExp(`^import (?:(${IDENT})\\s*,?\\s*)?(?:\\{([^}]*)\\})? ?from ["']([^"']+)["'];?$`).exec(flat))) {
      const ref = moduleRef(m[3]);
      const tmp = `__m${counter++}`;
      const decls = [`const ${tmp} = ${ref};`];
      if (m[1]) decls.push(`const ${m[1]} = ${tmp}.default;`);
      if (m[2]) {
        const specs = parseSpecifiers(m[2]);
        if (specs.length) decls.push(`const { ${specs.map((s) => (s.imported === s.local ? s.local : `${s.imported}: ${s.local}`)).join(", ")} } = ${tmp};`);
      }
      replacement = decls.join(" ");
    } else if ((m = /^export \* from ["']([^"']+)["'];?$/.exec(flat))) {
      stars.push(moduleRef(m[1]));
      replacement = "";
    } else if ((m = /^export \{([^}]*)\} from ["']([^"']+)["'];?$/.exec(flat))) {
      const tmp = `__m${counter++}`;
      replacement = `const ${tmp} = ${moduleRef(m[2])};`;
      for (const s of parseSpecifiers(m[1])) exports.push([s.local, `${tmp}.${s.imported}`]);
    } else if ((m = /^export \{([^}]*)\};?$/.exec(flat))) {
      for (const s of parseSpecifiers(m[1])) exports.push([s.local, s.imported]);
      replacement = "";
    } else if ((m = /^export default /.exec(line))) {
      exports.push(["default", "__default"]);
      out.push(line.replace(/^export default /, "const __default = "));
      continue;
    } else if ((m = new RegExp(`^export ((?:async )?function\\*? ?(${IDENT})|class (${IDENT})|(?:const|let|var) (${IDENT}))`).exec(line))) {
      const name = m[2] || m[3] || m[4];
      exports.push([name, name]);
      out.push(line.slice("export ".length));
      continue;
    } else {
      throw new LinkError(`${path}: unsupported statement: ${flat.slice(0, 80)}`);
    }
    out.push(replacement);
    // keep the line count (for stack traces)
    for (let k = 0; k < consumed; k++) out.push("");
    i += consumed;
  }

  let body = out.join("\n").replace(/\bimport\.meta\.url\b/g, JSON.stringify(pathToFileURL(path).href));
  if (/\bimport\s*\(/.test(body.replace(/\/\/.*$/gm, ""))) {
    // dynamic import() stays as it is (works in ES module output only)
  }
  const assigns = [];
  for (const star of stars) assigns.push(`(function(m) { for (var k in m) if (k !== "default" && !(k in __exports)) __exports[k] = m[k]; })(${star});`);
  for (const [name, expr] of exports) assigns.push(`__exports[${JSON.stringify(name)}] = ${expr};`);
  body += "\n" + assigns.join("\n");
  return { body, deps };
}

#!/usr/bin/env node
// tasks/potch/assemble.mjs — generate lib/opal/potch/potch.mjs from lib/opal/potch/parts/*.mjs.
//
// lib/opal/potch/potch.mjs is a build artifact: a single import header, one banner per
// part, the concatenated part bodies, and an export block naming every
// top-level declaration. Parts are plain fragments (no import/export); this
// script resolves which names they reference from the sibling modules and
// emits the matching import header.
//
// Usage:
//   bin/rake potch:assemble          # write lib/opal/potch/potch.mjs
//   bin/rake potch:assemble_check    # verify lib/opal/potch/potch.mjs is up to date
//
// (or directly: node tasks/potch/assemble.mjs [--check])

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(root, "lib", "opal", "potch");

const PARTS = [
  "potch_part1.mjs",
  "potch_part2.mjs",
  "potch_part3.mjs",
  "potch_part4.mjs",
  "potch_part5.mjs",
  "potch_part6a.mjs",
  "potch_part6b.mjs",
  "potch_part7.mjs",
].map((name) => join(SRC, "parts", name));

const MODULES = new Map([
  ["./util/pm_buffer.mjs", join(SRC, "util/pm_buffer.mjs")],
  ["./util/pm_char.mjs", join(SRC, "util/pm_char.mjs")],
  ["./util/pm_constant_pool.mjs", join(SRC, "util/pm_constant_pool.mjs")],
  ["./util/pm_integer.mjs", join(SRC, "util/pm_integer.mjs")],
  ["./util/pm_newline_list.mjs", join(SRC, "util/pm_newline_list.mjs")],
  ["./util/pm_strpbrk.mjs", join(SRC, "util/pm_strpbrk.mjs")],
  ["./ast.mjs", join(SRC, "ast.mjs")],
  ["./diagnostic.mjs", join(SRC, "diagnostic.mjs")],
  ["./token_type.mjs", join(SRC, "token_type.mjs")],
  ["./encoding.mjs", join(SRC, "encoding.mjs")],
  ["./options.mjs", join(SRC, "options.mjs")],
  ["./static_literals.mjs", join(SRC, "static_literals.mjs")],
  ["./regexp.mjs", join(SRC, "regexp.mjs")],
  ["./node.mjs", join(SRC, "node.mjs")],
]);

// Serialization API belongs to the dropped serialization subsystem; strip it
// from the assembled parser if it ever reappears in the parts.
const SERIALIZE_FUNCS = [
  "pm_serialize_header",
  "pm_serialize",
  "pm_serialize_parse",
  "pm_serialize_parse_stream",
  "pm_serialize_parse_comments",
];

function moduleExports(path) {
  const names = new Set();
  const text = readFileSync(path, "utf8");
  for (const m of text.matchAll(/^export (?:const|function|let|var|class) (\w+)/gm)) {
    names.add(m[1]);
  }
  for (const m of text.matchAll(/^export \{([^}]*)\}/gm)) {
    for (let entry of m[1].split(",")) {
      entry = entry.trim();
      if (!entry) continue;
      names.add(entry.split(" as ").pop().trim());
    }
  }
  return names;
}

// Remove top-level `function name(...) {...}` blocks by brace matching.
function removeFunctions(text, names) {
  for (const name of names) {
    const re = new RegExp(`\\n(?:export default )?(?:async )?function ${name}\\(`);
    let m = re.exec(text);
    while (m) {
      const start = m.index;
      const i = text.indexOf("{", m.index + m[0].length - 1);
      let depth = 0;
      let j = i;
      const n = text.length;
      while (j < n) {
        const c = text[j];
        if (c === '"' || c === "'" || c === "`") {
          const q = c;
          j++;
          while (j < n && text[j] !== q) {
            if (text[j] === "\\") j++;
            j++;
          }
        } else if (c === "{") {
          depth++;
        } else if (c === "}") {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      let end = j + 1;
      // consume trailing semicolon/newline
      while (end < n && (text[end] === ";" || text[end] === "\n")) end++;
      text = text.slice(0, start) + text.slice(end);
      m = re.exec(text);
    }
  }
  return text;
}

// Strip // and /* comments from the parts, leaving string and template
// literals (including ${...} interpolations) intact. The import-header scan
// below has to see code references only: several module names are mentioned
// in comments alone, and searching the raw text gives them a live-looking
// import in the generated bundle.
function stripComments(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  let inTemplate = false;
  const interpolations = []; // brace depth of each open ${ ... }

  while (i < n) {
    const c = text[i];

    if (inTemplate) {
      if (c === "\\") { out += text.slice(i, i + 2); i += 2; continue; }
      if (c === "`") { out += c; inTemplate = false; i++; continue; }
      if (c === "$" && text[i + 1] === "{") {
        interpolations.push(1);
        out += "${";
        i += 2;
        inTemplate = false;
        continue;
      }
      out += c;
      i++;
      continue;
    }

    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      out += "\n";
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      out += c;
      i++;
      while (i < n) {
        if (text[i] === "\\") { out += text.slice(i, i + 2); i += 2; continue; }
        out += text[i];
        if (text[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === "`") { out += c; inTemplate = true; i++; continue; }
    if (c === "{" && interpolations.length > 0) {
      interpolations[interpolations.length - 1]++;
      out += c;
      i++;
      continue;
    }
    if (c === "}" && interpolations.length > 0) {
      interpolations[interpolations.length - 1]--;
      if (interpolations[interpolations.length - 1] === 0) {
        interpolations.pop();
        inTemplate = true;
      }
      out += c;
      i++;
      continue;
    }

    out += c;
    i++;
  }

  return out;
}

const modExports = new Map();
for (const [mod, path] of MODULES) modExports.set(mod, moduleExports(path));

let partText = PARTS.map((p) => readFileSync(p, "utf8")).join("\n");

// strip serialization API from the assembled parser
partText = removeFunctions(partText, SERIALIZE_FUNCS);

const partCode = stripComments(partText);

const localDefs = new Set();
for (const m of partText.matchAll(/^(?:async )?function (\w+)|^const (\w+)\s*=/gm)) {
  for (const g of m.slice(1)) if (g) localDefs.add(g);
}

const headerLines = [];
let usedTotal = 0;
for (const [mod] of MODULES) {
  const used = [];
  for (const name of [...modExports.get(mod)].sort()) {
    if (localDefs.has(name)) continue;
    if (new RegExp(`\\b${name}\\b`).test(partCode)) used.push(name);
  }
  if (used.length > 0) {
    usedTotal += used.length;
    headerLines.push(`import { ${used.join(", ")} } from "${mod}";`);
  }
}

const out = ["// Generated: assembled from lib/opal/potch/parts/*.mjs (uni / UTF-16 string build)"];
out.push(...headerLines);
out.push("");
for (const p of PARTS) {
  const body = readFileSync(p, "utf8").trim();
  out.push("// " + "-".repeat(70));
  out.push("// " + p.split("/").pop());
  out.push("// " + "-".repeat(70));
  out.push(body);
  out.push("");
}

const exportsFound = [];
for (const m of partText.matchAll(/^(?:async )?function (\w+)/gm)) exportsFound.push(m[1]);
for (const m of partText.matchAll(/^const (\w+)\s*=/gm)) exportsFound.push(m[1]);

const exportNames = [...new Set(exportsFound)];

out.push("export {");
for (let i = 0; i < exportNames.length; i += 6) {
  out.push("  " + exportNames.slice(i, i + 6).join(", ") + ",");
}
out.push("};");
// node destroy lives in node.js (dump_json intentionally excluded from uni)
out.push('export { pm_visit_node, pm_visit_child_nodes } from "./node.mjs";');

const generated = out.join("\n") + "\n";
const target = join(SRC, "potch.mjs");

if (process.argv.includes("--check")) {
  const current = readFileSync(target, "utf8");
  if (current === generated) {
    console.log("lib/opal/potch/potch.mjs is up to date");
  } else {
    console.error("lib/opal/potch/potch.mjs is OUT OF DATE — run: bin/rake potch:assemble");
    process.exit(1);
  }
} else {
  writeFileSync(target, generated);
  console.log(
    `assembled ${generated.split("\n").length} lines; imported ${usedTotal} names; exported ${exportNames.length}`
  );
}

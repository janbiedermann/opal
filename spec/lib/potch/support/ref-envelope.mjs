// Builds a comparable {ast, errors, warnings} envelope from `@ruby/prism`
// (the published WASM build of the real C parser - see UNI.md), normalized
// into the same shape target_js_uni's own envelope uses: snake_case keys,
// `location: {start, end}` in byte offsets, `type` as the bare node-class
// name, `flags` as a sorted array of lowercase flag names, numeric leaves
// stringified (sidesteps Number-vs-BigInt skew between the two backends for
// large integer literals), `node_id` excluded (assignment order isn't
// guaranteed to match across backends and isn't part of AST correctness).
//
// This mirrors target_wasm/cmd.js's own astJSON()/resultEnvelope() - that
// function is this same normalization, done once already for Potch. The
// difference here: flags. astJSON can't reach a node's private #flags field
// (it walks Object.entries(), which can't see JS private fields), so it
// silently drops them; we call each node's public isXxx() flag-check
// methods instead (these *are* real public methods, generated one per flag
// bit - see javascript/src/nodes.js), to get real flag coverage.

import { loadPrism } from "@ruby/prism";

let cachedParse = null;

async function getParse() {
  if (cachedParse === null) cachedParse = await loadPrism();
  return cachedParse;
}

// decamelize("isForcedUtf8Encoding".slice(2)) -> "forced_utf8_encoding",
// matching target_js_uni's own flagDisplayName() (src/index.js) output for
// the same config.yml-declared flag. Two flag names don't survive this
// mechanical decamelization because the generated method name doesn't put a
// capital after the digit run (isAscii8bit, isWindows31j) - fixed up by hand,
// verified empirically against the full fixture corpus.
const FLAG_NAME_FIXUPS = { ascii8bit: "ascii_8bit", windows31j: "windows_31j" };

// "arguments" collides with the implicit per-function `arguments` object as
// a *constructor parameter* name (not as a plain property key, where it
// would be fine) - the nodes.js generator dodges that by naming the
// instance field `arguments_` wherever config.yml calls the field
// "arguments" (CallNode, ArgumentsNode, ...). Its own toJSON() undoes this
// (see `arguments: this.arguments_` in nodes.js) but we walk the raw
// instance instead (to reach fields toJSON doesn't re-expose, like flags),
// so undo it here too.
const KEY_RENAMES = { arguments_: "arguments" };

function decamelize(key) {
  const snake = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  return KEY_RENAMES[snake] ?? snake;
}

function flagNamesFor(node) {
  const names = [];
  for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(node))) {
    if (!/^is[A-Z]/.test(key) || typeof node[key] !== "function") continue;
    let on;
    try {
      on = node[key]();
    } catch {
      continue;
    }
    if (on !== true) continue;
    const name = decamelize(key.slice(2));
    names.push(FLAG_NAME_FIXUPS[name] ?? name);
  }
  return names.sort();
}

function isRubyString(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.value === "string" &&
    typeof value.encoding === "string" &&
    typeof value.validEncoding === "boolean"
  );
}

function isLocation(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.startOffset === "number" &&
    typeof value.length === "number" &&
    Object.keys(value).length === 2
  );
}

function toComparable(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value !== "object") return value;
  if (isRubyString(value)) return value.value;
  if (isLocation(value)) {
    return { start: String(value.startOffset), end: String(value.startOffset + value.length) };
  }
  if (Array.isArray(value)) return value.map((v) => toComparable(v, seen));
  if (seen.has(value)) return null;
  seen.add(value);

  const out = {};
  const ctorName = value.constructor?.name;
  if (ctorName && ctorName.endsWith("Node")) {
    out.type = ctorName;
    const flags = flagNamesFor(value);
    if (flags.length > 0) out.flags = flags;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "nodeID") continue;
    out[decamelize(key)] = toComparable(child, seen);
  }
  return out;
}

function diagnosticToComparable(diag) {
  const loc = diag.location;
  return {
    type: diag.type,
    message: diag.message,
    level: diag.level,
    start: loc ? String(loc.startOffset) : null,
    end: loc ? String(loc.startOffset + loc.length) : null,
  };
}

/**
 * @param {string} source
 * @param {object} [options] passed straight to @ruby/prism's parse() -
 *   { filepath?, line?, version?, scopes?: ... } - see parsePrism.js.
 */
export async function refEnvelope(source, options = {}) {
  const parse = await getParse();
  const result = parse(source, options);
  return {
    ast: toComparable(result.value),
    errors: result.errors.map(diagnosticToComparable),
    warnings: result.warnings.map(diagnosticToComparable),
  };
}

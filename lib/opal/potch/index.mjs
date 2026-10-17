// index.js (uni) - public API of the UTF-16 string build.
//
//   import { parse } from "./index.mjs";
//   const result = parse('puts "hello"');
//   result.value;     // POJO AST (plain objects, JSON-safe)
//   result.errors;    // [{ message, location: { start, end } }]
//   result.warnings;  // same shape
//
// All offsets are UTF-16 code-unit indices into the input string, so
// code.slice(loc.start, loc.end) yields the exact source text.

import * as ast from "./ast.mjs";
import { PM_NODE_FLAG_NEWLINE, PM_NODE_FLAG_STATIC_LITERAL } from "./ast.mjs";
import {
  pm_parser_init,
  pm_parse,
  pm_version,
} from "./potch.mjs";
import { pm_constant_pool_id_to_constant } from "./util/pm_constant_pool.mjs";
import * as diagNs from "./diagnostic.mjs";
import { NODE_FIELD_ORDER } from "./field_order.mjs";
import { nodeConverters } from "./convert.mjs";
// ---------------------------------------------------------------------------
// Flag names, resolved per node type against the correct flag family
// ---------------------------------------------------------------------------

const FAMILY_CONSTS = new Map(); // prefix -> [[constName, value], ...]
for (const [name, value] of Object.entries(ast)) {
  const m = name.match(/^PM_(.+?)_FLAGS_([A-Z0-9_]+)$/);
  if (!m || typeof value !== "number") continue;
  const prefix = m[1];
  if (!FAMILY_CONSTS.has(prefix)) FAMILY_CONSTS.set(prefix, []);
  FAMILY_CONSTS.get(prefix).push([name, value]);
}

// singular/plural and special families
const FAMILY_PREFIX_ALIASES = {
  WhileNode: ["LOOP"],
  UntilNode: ["LOOP"],
  ForNode: ["LOOP"],
  ParametersNode: ["PARAMETER"],
  RequiredParameterNode: ["PARAMETER"],
  OptionalParameterNode: ["PARAMETER"],
  RestParameterNode: ["PARAMETER"],
  BlockParameterNode: ["PARAMETER"],
  KeywordRestParameterNode: ["PARAMETER"],
  NoKeywordsParameterNode: ["PARAMETER"],
  BlockLocalVariableNode: ["PARAMETER"],
  OptionalKeywordParameterNode: ["PARAMETER"],
  RequiredKeywordParameterNode: ["PARAMETER"],
  RegularExpressionNode: ["REGULAR_EXPRESSION"],
  InterpolatedRegularExpressionNode: ["REGULAR_EXPRESSION"],
  MatchLastLineNode: ["REGULAR_EXPRESSION"],
  InterpolatedMatchLastLineNode: ["REGULAR_EXPRESSION"],
  StringNode: ["STRING"],
  SourceFileNode: ["STRING"],
  XStringNode: ["ENCODING"],
  SymbolNode: ["SYMBOL"],
  InterpolatedStringNode: ["INTERPOLATED_STRING"],
  IntegerNode: ["INTEGER_BASE"],
  FloatNode: ["INTEGER_BASE"],
  RationalNode: ["INTEGER_BASE"],
  ImaginaryNode: ["INTEGER_BASE"],
  NumberedParametersNode: [],
  ShareableConstantNode: ["SHAREABLE_CONSTANT"],
  CallNode: ["CALL"],
  CallAndWriteNode: ["CALL_NODE"],
  CallOperatorWriteNode: ["CALL_NODE"],
  CallOrWriteNode: ["CALL_NODE"],
  CallTargetNode: ["CALL_NODE"],
  IndexAndWriteNode: ["CALL_NODE"],
  IndexOperatorWriteNode: ["CALL_NODE"],
  IndexOrWriteNode: ["CALL_NODE"],
  IndexTargetNode: ["CALL_NODE"],
  ArgumentsNode: ["ARGUMENTS_NODE"],
  ArrayNode: ["ARRAY_NODE"],
  RangeNode: ["RANGE"],
  FlipFlopNode: ["RANGE"],
};

// familyPrefixesFor's answer depends only on typeName, and there are only
// ~100 distinct node type names - cache it instead of recomputing the same
// regex replace + Set for every node in the tree that carries any flag
// (which is most nodes, since NEWLINE/STATIC_LITERAL are common). Callers
// only ever iterate the returned array, never mutate it, so sharing the
// cached array across calls is safe.
const FAMILY_PREFIXES_CACHE = new Map();
function familyPrefixesFor(typeName) {
  let cached = FAMILY_PREFIXES_CACHE.get(typeName);
  if (cached !== undefined) return cached;

  const upper = typeName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
  const out = new Set();
  if (FAMILY_CONSTS.has(upper)) out.add(upper);
  const extra = FAMILY_PREFIX_ALIASES[typeName];
  if (extra) for (const e of extra) {
    if (FAMILY_CONSTS.has(e)) out.add(e);
  }

  cached = [...out];
  FAMILY_PREFIXES_CACHE.set(typeName, cached);
  return cached;
}

const COMMON_FLAGS = [
  [PM_NODE_FLAG_NEWLINE, "newline"],
  [PM_NODE_FLAG_STATIC_LITERAL, "static_literal"],
];

// INTEGER_BASE is an enum, not a bitmask.
const INTEGER_BASE_NAMES = new Map();
for (const [n, v] of Object.entries(ast)) {
  const m = n.match(/^PM_INTEGER_BASE_FLAGS_([A-Z0-9_]+)$/);
  if (m) INTEGER_BASE_NAMES.set(v, m[1].toLowerCase());
}
INTEGER_BASE_NAMES.delete(0);

// flagsToArray's answer depends only on the (typeName, flags) pair, and the
// number of distinct pairs that actually occur across one file's tree is
// small and bounded - unlike a node's offsets, which are all different
// numbers, a `flags` value is one of a handful of small bitmasks shared by
// many nodes of the same type. Memoize the whole result, the same way
// familyPrefixesFor already is one level down.
//
// This also folds in the IntegerNode/FloatNode/RationalNode/ImaginaryNode
// numeric-base name convertNode used to append to flagsToArray's result
// afterward (see the git history for the pre-memoization shape): that name
// is itself a pure function of (typeName, flags) too, and folding it in
// here - instead of leaving convertNode to mutate the array this function
// returns - is what makes it safe to hand the same cached array out to
// every node that shares a (typeName, flags) pair; nothing mutates it after
// the fact anymore.
const EMPTY_FLAGS_ARRAY = [];
// type name -> Map of flags -> array (no key string to build per node)
const FLAGS_ARRAY_CACHE = new Map();
function flagsToArray(typeName, flags) {
  if (!flags) return EMPTY_FLAGS_ARRAY;

  let cache = FLAGS_ARRAY_CACHE.get(typeName);
  if (cache === undefined) FLAGS_ARRAY_CACHE.set(typeName, (cache = new Map()));
  let result = cache.get(flags);
  if (result !== undefined) return result;

  const out = [];
  for (const [bit, nm] of COMMON_FLAGS) {
    if ((flags & bit) !== 0) out.push(nm);
  }
  for (const prefix of familyPrefixesFor(typeName)) {
    const entries = FAMILY_CONSTS.get(prefix);
    if (prefix === "INTEGER_BASE") continue;
    for (const [constName, value] of entries) {
      if (constName.endsWith("_LAST")) continue;
      if ((flags & value) !== 0 && (value & (value - 1)) === 0) {
        out.push(flagDisplayName(constName));
      }
    }
  }
  result = [...new Set(out)];

  if (typeName === "IntegerNode") {
    const bn = baseFlagToName(flags & ~PM_NODE_FLAG_NEWLINE & ~PM_NODE_FLAG_STATIC_LITERAL);
    // Insert after common flags so ordering matches C serialization output.
    if (bn && !result.includes(bn)) result.push(bn);
  } else if (typeName === "FloatNode" || typeName === "RationalNode" || typeName === "ImaginaryNode") {
    const bn = baseFlagToName(flags & ~(PM_NODE_FLAG_NEWLINE | PM_NODE_FLAG_STATIC_LITERAL));
    if (bn) result.push(bn);
  }

  cache.set(flags, result);
  return result;
}

function baseFlagToName(flags) {
  return INTEGER_BASE_NAMES.get(flags) ?? null;
}

function flagDisplayName(constName) {
  const m = constName.match(/^PM_(?:.+?)_FLAGS_([A-Z0-9_]+)$/);
  if (!m) return constName.toLowerCase();
  return m[1].toLowerCase();
}

// ---------------------------------------------------------------------------
// Node type names (numeric value -> "ProgramNode" style name)
// ---------------------------------------------------------------------------

const NODE_TYPE_NAMES = {};
for (const [name, value] of Object.entries(ast)) {
  if (/^PM_[A-Z0-9_]+_NODE$/.test(name) && typeof value === "number" && !name.startsWith("PM_NODE_TYPE")) {
    NODE_TYPE_NAMES[value] = name
      .slice(3)                      // strip leading "PM_"
      .toLowerCase()
      .split("_")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join("");                     // PROGRAM_NODE -> ProgramNode
  }
}

// Comment/token type names (numeric value -> display name). Built once here
// rather than rescanned from every export of `ast.js` on every single
// parseWithMetadata()/lexWithMetadata() call - the same one-time-at-load
// treatment NODE_TYPE_NAMES above already gets.
const COMMENT_NAMES = {};
for (const [name, value] of Object.entries(ast)) {
  if (/^PM_COMMENT_[A-Z]+$/.test(name) && typeof value === "number") {
    COMMENT_NAMES[value] = name.slice("PM_COMMENT_".length).toLowerCase();
  }
}

const TOKEN_NAMES = {};
for (const [name, value] of Object.entries(ast)) {
  if (name.startsWith("PM_TOKEN_") && typeof value === "number") TOKEN_NAMES[value] = name;
}

function convertLocation(node) {
  if (node == null) return null;
  const loc = node.location ?? node;
  if (!loc || typeof loc !== "object") return null;
  if (loc.start == null || loc.end == null) return null; // optional-location sentinel
  return { start: loc.start, end: loc.end };
}

function convertInteger(integer) {
  if (integer == null) return null;
  return integer <= Number.MAX_SAFE_INTEGER && integer >= Number.MIN_SAFE_INTEGER ? Number(integer) : integer;
}

function isNodeLike(obj) {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof obj.type === "number" &&
    NODE_TYPE_NAMES[obj.type] !== undefined &&
    obj.location !== undefined
  );
}

function convertStringField(str) {
  return str ?? "";
}

const CONVERT_PLANS = new Map();

/**
 * How a field is converted, decided from its name. `locals` is deliberately not
 * special-cased here: it is a constant-id list on the scope-bearing types and a
 * `node[]` on BlockParametersNode, so it stays generic and convertFieldValue
 * decides from the value.
 */
function fieldKind(key) {
  if (key.endsWith("_loc")) return 1;
  if (key === "unescaped") return 2;
  if (key === "name" || key === "binary_operator" || key === "read_name" || key === "write_name") return 3;
  if (key === "constant_ids") return 4;
  return 0;
}

// The generated converters (convert.mjs), indexed by node type number. Their
// helpers work with the parser of the conversion in progress.
let currentParser = null;
const CONVERTERS = [];
{
  const converters = nodeConverters({
    // a location: the parser's own { start, end } (an optional location
    // without a start is null)
    loc: (loc) => (loc == null || loc.start == null || loc.end == null ? null : loc),
    node: (node) => (node == null ? null : convertNode(node, currentParser)),
    nodes(list) {
      if (list == null) return null;
      const out = [];
      for (let i = 0; i < list.length; i++) out.push(convertNode(list[i], currentParser));
      return out;
    },
    // a constant field ("name", ...): its constant pool id resolved
    constant(id, key) {
      if (id == null) return null;
      if (typeof id !== "number") return convertFieldValue(key, id, currentParser);
      const constant = pm_constant_pool_id_to_constant(currentParser.constant_pool, id);
      return constant ? constant.start : null;
    },
    ids: (list) => (list == null ? null : localsToNames(currentParser, list)),
    int: convertInteger,
    value: (value, key) => (value == null ? null : convertFieldValue(key, value, currentParser)),
    flags: (typeName, flags) => flagsToArray(typeName, flags ?? 0),
  });
  for (const [value, name] of Object.entries(NODE_TYPE_NAMES)) {
    if (converters[name]) CONVERTERS[value] = converters[name];
  }
}

// Converts the tree of a parse into plain objects.
function convertTree(node, parser) {
  if (node == null) return null;
  const previous = currentParser;
  currentParser = parser;
  try {
    return convertNode(node, parser);
  } finally {
    currentParser = previous;
  }
}

function convertNode(node, parser) {
  if (node == null) return null;

  const converter = CONVERTERS[node.type];
  if (converter !== undefined && parser === currentParser) return converter(node);
  return convertNodeGeneric(node, parser);
}

// The conversion of a node by the field table (for node types without a
// generated converter, and the reference of the generated ones).
function convertNodeGeneric(node, parser) {
  const pojo = {};
  pojo.type = NODE_TYPE_NAMES[node.type] ?? `Unknown(${node.type})`;
  pojo.location = convertLocation(node);
  pojo.node_id = node.node_id ?? null;

  // flagsToArray already folds in the IntegerNode/FloatNode/RationalNode/
  // ImaginaryNode numeric-base name (see its own comment) - its result is
  // cached and shared across nodes with the same (type, flags) pair, so
  // nothing here may mutate it.
  const flags = flagsToArray(pojo.type, node.flags ?? 0);
  if (flags.length > 0) pojo.flags = flags;

  switch (pojo.type) {
    case "SourceFileNode":
      pojo.filepath = typeof node.filepath === "string" ? node.filepath : String(node.filepath ?? "");
      break;
    case "ProgramNode":
    case "ClassNode":
    case "ModuleNode":
    case "SingletonClassNode":
    case "BlockNode":
    case "LambdaNode":
      // These are the scope-bearing types whose config.yml field order puts
      // `locals` first, so writing it here matches the emitted order. DefNode
      // is deliberately not in this group: its config.yml order puts `locals`
      // after `body`, so its `locals` goes through the generic walk instead
      // (see convertFieldValue).
      if (node.locals !== undefined) {
        pojo.locals = localsToNames(parser, node.locals);
      }
      break;
    case "IntegerNode":
      pojo.value = convertInteger(node.value);
      break;
    case "FloatNode":
      pojo.value = node.value ?? null;
      break;
    case "RationalNode":
      pojo.numerator = convertInteger(node.numerator);
      pojo.denominator = convertInteger(node.denominator);
      break;
    default:
      break;
  }

  // Field walk in config.yml order (the order C's serializer is generated from).
  // The first node of a type records which of those fields it actually carries
  // and what each one is; later nodes of that type replay that plan instead of
  // re-deriving both the key list and the per-field classification.
  //
  // The plan's order comes from config.yml, not from the observed node, so it is
  // a property of the node type. It is complete as long as every node of a type
  // carries the same set of fields - which is what the creators guarantee (each
  // literal declares every field) and what test_order_key_sets / qw_order_check.py
  // verify against the corpus. A type whose fields are not all in config.yml
  // falls through to the generic walk below.
  const order = NODE_FIELD_ORDER[pojo.type];

  if (order !== undefined) {
    let plan = CONVERT_PLANS.get(node.type);

    if (plan === undefined) {
      const keys = [];
      const kinds = [];

      const fields = order.split(" ");

      for (let index = 0; index < fields.length; index++) {
        const key = fields[index];
        if (pojo[key] !== undefined) continue; // already handled specially
        const value = node[key];
        if (value === undefined) continue;
        keys.push(key);
        kinds.push(fieldKind(key));
      }

      plan = [keys, kinds];
      CONVERT_PLANS.set(node.type, plan);
    }

    const keys = plan[0];
    const kinds = plan[1];

    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const value = node[key];
      const kind = kinds[index];

      if (value === null || value === undefined) {
        pojo[key] = null;
      } else if (kind === 1) {
        pojo[key] = convertLocation(value);
      } else if (kind === 2) {
        pojo[key] = convertStringField(value);
      } else if (kind === 3) {
        if (typeof value === "number" && Number.isInteger(value)) {
          const constant = pm_constant_pool_id_to_constant(parser.constant_pool, value);
          pojo[key] = constant ? constant.start : null;
        } else {
          pojo[key] = convertFieldValue(key, value, parser);
        }
      } else if (kind === 4) {
        pojo[key] = localsToNames(parser, value);
      } else {
        pojo[key] = convertFieldValue(key, value, parser);
      }
    }

    return pojo;
  }

  // Generic field walk in insertion order, for node types not in the table.
  for (const key of Object.keys(node)) {
    // `unescaped_shared` is the lexer's stand-in for C's pm_string_t tag
    // (PM_STRING_SHARED), recorded on a RegularExpressionNode so
    // parse_regular_expression_errors/named-captures can tell whether
    // `unescaped` is a shared lexer buffer. It is internal plumbing, not a
    // config.yml field, so it must not reach the public AST.
    if (key === "type" || key === "base" || key === "location" || key === "flags" || key === "node_id" || key === "unescaped_shared") continue;
    if (pojo[key] !== undefined) continue; // already handled specially
    const value = node[key];
    pojo[key] = convertFieldValue(key, value, parser);
  }

  return pojo;
}

function convertFieldValue(key, value, parser) {
  if (value === null || value === undefined) return null;

  // locations
  if (key.endsWith("_loc")) {
    return convertLocation(value);
  }

  // unescaped / string payloads
  if (key === "unescaped") {
    return convertStringField(value);
  }

  // constant-id fields ("name" on ConstantRead/ConstantPath/Call/local
  // variable nodes and friends, plus "binary_operator"/"read_name"/
  // "write_name" on the OperatorWriteNode family) resolve through the
  // constant pool. Per config.yml these 4 field names (plus "locals",
  // handled separately below) are the exhaustive set of type: constant
  // fields.
  if (
    (key === "name" || key === "binary_operator" || key === "read_name" || key === "write_name") &&
    typeof value === "number" && Number.isInteger(value)
  ) {
    const constant = pm_constant_pool_id_to_constant(parser.constant_pool, value);
    return constant ? constant.start : null;
  }

  // constant-id lists. `locals` is a constant-id list on the scope-bearing types
  // (ProgramNode, ClassNode, DefNode, ...) and a `node[]` (of
  // BlockLocalVariableNode) on BlockParametersNode; only the integer-list case
  // resolves through the pool, the node array falls through to the node-array
  // path below.
  if (key === "locals" && Array.isArray(value) && ((value.length === 0) || (typeof value[0] === "number"))) {
    return localsToNames(parser, value);
  }

  if (key === "constant_ids") {
    return localsToNames(parser, value);
  }

  // integers stored inline on numeric nodes handled above; generic fallback
  // for any other bigint-valued field:
  if (typeof value === "bigint") {
    return convertInteger(value);
  }

  // node lists (StatementsNode.body, ArrayNode.elements, etc.) are plain
  // arrays of nodes.
  if (Array.isArray(value)) {
    return value.map((child) => convertNode(child, parser));
  }

  if (isNodeLike(value)) {
    return convertNode(value, parser);
  }

  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return value;
  }


  // opaque leftovers (should not happen) - keep raw but JSON-safe-ish
  return String(value);
}

function localsToNames(parser, list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const constant = pm_constant_pool_id_to_constant(parser.constant_pool, list[i]);
    out.push(constant ? constant.start : null);
  }
  return out;
}

// Duration (ms) of the most recent pm_parse call — used by the --time flag.
let lastParseMs = null;

/** Milliseconds spent inside pm_parse on the last parse/lex call, or null. */
export function getLastParseMs() {
  return lastParseMs;
}

function collectNewlineOffsets(parser) {
  const list = parser.newline_list;
  if (!list || !list.offsets) return [0];
  return list.offsets.slice(0, list.size);
}

// Real Prism's public API identifies each error/warning by a lowercase
// snake_case symbol (e.g. `:regexp_encoding_option_mismatch`, see
// lib/prism/serialize.rb's DIAGNOSTIC_TYPES, indexed by the same diag_id
// this port uses) - not by the internal PM_ERR_.../PM_WARN_... constant
// name. Every one of this project's diagnostic constants follows that
// name exactly once its PM_ERR_/PM_WARN_ prefix is stripped and
// lowercased (verified against all 324 constants), so no separate lookup
// table is needed.
let diagIdMap = null;
function getDiagIdMap() {
  if (diagIdMap === null) {
    diagIdMap = {};
    for (const [name, val] of Object.entries(diagNs)) {
      if (name.startsWith("PM_ERR_") && typeof val === "number") {
        diagIdMap[val] = name.slice("PM_ERR_".length).toLowerCase();
      } else if (name.startsWith("PM_WARN_") && typeof val === "number") {
        diagIdMap[val] = name.slice("PM_WARN_".length).toLowerCase();
      }
    }
  }
  return diagIdMap;
}

function collectDiagnostics(list, kind) {
  const out = [];
  const levelNames = kind === "errors" ? ["syntax", "argument", "load"] : ["default", "verbose"];
  const idMap = getDiagIdMap();
  for (const d of list) {
    const typeName = typeof d.diag_id === "number" ? (idMap[d.diag_id] ?? null) : null;
    out.push({
      type: typeName ?? `Unknown(${d.diag_id})`,
      message: d.message,
      level: levelNames[d.level] ?? (kind === "errors" ? "syntax" : "default"),
      start: d.location.start,
      end: d.location.end,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse Ruby source given as a JavaScript string.
 *
 * Offsets in every location are UTF-16 code-unit indices into `code`.
 */
export function parse(code) {
  if (typeof code !== "string") {
    throw new TypeError("parse() expects a string");
  }

  const parser = { source: code };
  pm_parser_init(parser, code, code.length, null);
  const __t0 = performance.now();
  const node = pm_parse(parser);
  lastParseMs = performance.now() - __t0;

  const value = convertTree(node, parser);

  const errors = collectDiagnostics(parser.error_list, "errors");
  const warnings = collectDiagnostics(parser.warning_list, "warnings");


  return { value, errors, warnings };
}

/**
 * Parse Ruby source and return the full metadata envelope used by the potch
 * bridge: AST plus comments, magic comments, diagnostics, data_loc, tokens.
 *
 * Offsets are UTF-16 code-unit indices into `code`.
 *
 * options: { filepath?: string, line?: number }
 */
export function parseWithMetadata(code, options = null, wantTokens = false) {
  if (typeof code !== "string") {
    throw new TypeError("parseWithMetadata() expects a string");
  }

  const jsOptions = options ? { ...options } : null;

  const parser = { source: code };
  pm_parser_init(parser, code, code.length, jsOptions);

  const tokens = [];
  if (wantTokens) {
    parser.lex_callback = {
      data: tokens,
      callback: (data, p, token) => {
        data.push({ type: token.type, start: token.start, end: token.end });
      },
    };
  }

  const __t0 = performance.now();
  const node = pm_parse(parser);
  lastParseMs = performance.now() - __t0;

  const value = convertTree(node, parser);

  // Comments
  const comments = [];
  for (const c of parser.comment_list) {
    comments.push({
      type: COMMENT_NAMES[c.type] ?? `Unknown(${c.type})`,
      start: c.location.start,
      end: c.location.end,
    });
  }

  // Magic comments — resolve key/value from source offsets.
  const magic_comments = [];
  for (const m of parser.magic_comment_list) {
    magic_comments.push({
      key: code.slice(m.key_start, m.key_start + m.key_length),
      value: code.slice(m.value_start, m.value_start + m.value_length),
      key_start: m.key_start,
      key_end: m.key_start + m.key_length,
      value_start: m.value_start,
      value_end: m.value_start + m.value_length,
    });
  }

  // data_loc
  const data_loc =
    parser.data_loc && parser.data_loc.start !== null && parser.data_loc.start !== undefined
      ? { start: parser.data_loc.start, end: parser.data_loc.end }
      : null;

  // Tokens
  let outTokens = null;
  if (wantTokens) {
    outTokens = tokens.map((tok) => ({
      type: TOKEN_NAMES[tok.type] ?? `Unknown(${tok.type})`,
      value: code.slice(tok.start, tok.end),
      start: tok.start,
      end: tok.end,
    }));
  }

  const envelope = {
    ast: value,
    comments,
    magic_comments,
    errors: collectDiagnostics(parser.error_list, "errors"),
    warnings: collectDiagnostics(parser.warning_list, "warnings"),
    data_loc,
    offsets: collectNewlineOffsets(parser),
    start_line: parser.start_line ?? 1,
    encoding: parser.encoding_comment_name ?? "UTF-8",
  };
  if (outTokens !== null) envelope.tokens = outTokens;


  return envelope;
}

/** Lex-only mode: returns {tokens, errors, warnings} without building an AST. */
export function lexWithMetadata(code, options = null) {
  if (typeof code !== "string") {
    throw new TypeError("lexWithMetadata() expects a string");
  }

  const jsOptions = options ? { ...options } : null;
  const parser = { source: code };
  pm_parser_init(parser, code, code.length, jsOptions);

  const tokens = [];
  parser.lex_callback = {
    data: tokens,
    callback: (data, p, token) => {
      // Capture parser.lex_state at token-emission time, exactly as C prism's
      // serialize_token does (src/serialize.c). Prism.lex_compat / LexCompat
      // needs this per-token state to compare against Ripper.lex.
      data.push({ type: token.type, start: token.start, end: token.end, lex_state: p.lex_state });
    },
  };

  pm_parse(parser);

  const result = {
    tokens: tokens.map((tok) => ({
      type: TOKEN_NAMES[tok.type] ?? `Unknown(${tok.type})`,
      value: code.slice(tok.start, tok.end),
      start: tok.start,
      end: tok.end,
      lex_state: tok.lex_state,
    })),
    errors: collectDiagnostics(parser.error_list, "errors"),
    warnings: collectDiagnostics(parser.warning_list, "warnings"),
    offsets: collectNewlineOffsets(parser),
    start_line: parser.start_line ?? 1,
    encoding: parser.encoding_comment_name ?? "UTF-8",
  };


  return result;
}

// ---------------------------------------------------------------------------
// Wire-envelope preparation: UTF-16 code units -> UTF-8 bytes, and
// BigInt/FloatNode#value -> JSON-number sentinel strings
// ---------------------------------------------------------------------------
//
// parse()/parseWithMetadata()/lexWithMetadata() all report offsets as
// UTF-16 code-unit indices into `code` - that's the whole point of this
// "uni" build for real JS consumers, who can slice `code` directly with
// them - and keep BigInt/float fields as real JS values, for the same
// reason. Every *other* potch backend (target_c, target_go, byte target_js,
// target_wasm) reports UTF-8 byte offsets instead, and lib/potch.rb's
// location reconstruction (Prism::Location#slice -> String#byteslice)
// universally assumes byte semantics - a wire-format contract cmd.js
// alone wasn't honoring. Only cmd.js calls envelopeOffsetsToBytes(), right
// before writing its JSON envelope, so parse()/parseWithMetadata()'s own
// return values (and anyone else importing this module directly) keep
// reporting UTF-16 offsets and real BigInt/Number values, unchanged.
//
// envelopeOffsetsToBytes() also pre-renders every BigInt and FloatNode#value
// field into the "@@...@@" sentinel string cmd.js's post-stringify regex
// strips back into a raw JSON number literal (a FloatNode's value is a
// `double`, and every other backend emits it as a JSON float - `1.0`, not
// `1` - so it round-trips back to a Ruby Float; JS has one number type, so
// `JSON.stringify(1.0)` is `"1"`, indistinguishable from an integer).
// Folding that in here, in the one full-tree walk this function already has
// to do for the offset conversion, means cmd.js's JSON.stringify call needs
// no replacer function - which would otherwise force V8 off its fast
// native stringify path for every single key in the tree, not just the
// handful that actually need it.
//
// This function mutates `envelope` in place and returns it (it used to
// return a deep copy) - safe because cmd.js, its only caller, never looks
// at the pre-conversion envelope again afterward, and doing this by
// mutating already-shaped objects instead of building a second full copy
// of the AST roughly halves this pipeline's allocation.

// Keys whose numeric value is a UTF-16 code-unit offset into the source,
// wherever they appear in an envelope (a node's `location`, `opening_loc`,
// etc.; a comment/error/warning/token's flat `start`/`end`; a magic
// comment's `key_start`/`key_end`/`value_start`/`value_end`).
const OFFSET_KEYS = new Set(["start", "end", "key_start", "key_end", "value_start", "value_end"]);

// Any code unit that is not ASCII. Used to detect the case where the byte
// offset table below would be the identity function (see envelopeOffsetsToBytes).
const NON_ASCII = /[\u0080-\uFFFF]/;

/**
 * Build a lookup table from UTF-16 code-unit offset to UTF-8 byte offset:
 * table[i] is the UTF-8 byte length of source.slice(0, i). O(n) to build,
 * O(1) per lookup afterwards - offsets in one envelope can number in the
 * thousands, so this avoids a naive re-encode-the-prefix-every-time cost.
 *
 * Handles surrogate pairs (astral characters - 2 UTF-16 code units, 4
 * UTF-8 bytes) by attributing the full 4-byte jump to the low surrogate.
 * Prism never produces a location boundary splitting a surrogate pair
 * (every codepoint is read as a whole unit), so the mid-pair table entry
 * this leaves behind is never actually looked up in practice, but is
 * still filled in with a safe, monotonically-increasing value.
 */
function computeByteOffsetTable(source) {
  const table = new Uint32Array(source.length + 1);
  let byteOffset = 0;
  for (let i = 0; i < source.length; i++) {
    table[i] = byteOffset;
    const code = source.charCodeAt(i);
    if (code >= 0xdc00 && code <= 0xdfff) {
      const high = i > 0 ? source.charCodeAt(i - 1) : 0;
      if (high >= 0xd800 && high <= 0xdbff) {
        byteOffset += 4; // low surrogate: the pair together is 4 UTF-8 bytes
        continue;
      }
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const low = i + 1 < source.length ? source.charCodeAt(i + 1) : 0;
      if (low >= 0xdc00 && low <= 0xdfff) continue; // high surrogate: counted with its low half above
    }
    if (code < 0x80) byteOffset += 1;
    else if (code < 0x800) byteOffset += 2;
    else byteOffset += 3;
  }
  table[source.length] = byteOffset;
  return table;
}

// Render a FloatNode#value as the JSON number literal text that round-trips
// back to the exact same Ruby Float - see the section comment above.
function floatWireLiteral(val) {
  if (val === Infinity) return "1e400";        // Ruby JSON.parse -> Float::INFINITY
  if (val === -Infinity) return "-1e400";
  if (Number.isNaN(val)) return "null";        // unreachable from a Ruby float literal
  if (Object.is(val, -0)) return "-0.0";       // String(-0) is "0", losing the sign
  const s = String(val);
  return /[.eE]/.test(s) ? s : s + ".0";
}

// `table` may be null, meaning "offsets are already byte offsets" (the
// pure-ASCII case in envelopeOffsetsToBytes) - the offset lookups are then
// identity operations and are skipped entirely. `seen` holds the objects
// already converted: the AST's locations are the parser's own objects, so a
// location could appear twice (not seen so far), and must not be converted
// twice.
function prepareWireEnvelope(value, table, keyHint, seen = new Set()) {
  if (Array.isArray(value)) {
    if (keyHint === "offsets") {
      if (table !== null) {
        for (let i = 0; i < value.length; i++) {
          const n = value[i];
          if (typeof n === "number") value[i] = table[n] ?? n;
        }
      }
    } else {
      for (let i = 0; i < value.length; i++) prepareWireEnvelope(value[i], table, undefined, seen);
    }
    return;
  }
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  for (const key of Object.keys(value)) {
    const val = value[key];
    if (typeof val === "bigint") {
      // BigInt values (integers beyond Number.MAX_SAFE_INTEGER) are emitted
      // as raw JSON numbers with their exact digits, matching target_c's
      // envelope.
      value[key] = `@@${val}@@`;
    } else if (key === "value" && value.type === "FloatNode" && typeof val === "number") {
      value[key] = `@@F:${floatWireLiteral(val)}@@`;
    } else if (table !== null && typeof val === "number" && OFFSET_KEYS.has(key)) {
      value[key] = table[val] ?? val;
    } else {
      prepareWireEnvelope(val, table, key, seen);
    }
  }
}

/**
 * Mutate a parseWithMetadata()/lexWithMetadata() envelope in place, making
 * it ready to write as this bridge's JSON wire format: see the section
 * comment above. Returns `envelope`.
 */
export function envelopeOffsetsToBytes(envelope, source) {
  // A pure-ASCII source has one UTF-8 byte per UTF-16 code unit, so the table
  // would be the identity function: building it (a Uint32Array of
  // source.length + 1 plus a walk of every character) and looking every offset
  // up in it is pure cost. Skip it and leave the offsets as they are.
  const table = NON_ASCII.test(source) ? computeByteOffsetTable(source) : null;
  prepareWireEnvelope(envelope, table);
  return envelope;
}

/** Pretty tree dump in text form (handy for debugging/tests). */
export function inspect(code) {
  const { value } = parse(code);
  return JSON.stringify(value, (key, val) => (typeof val === "bigint" ? `${val}n` : val), 2);
}

export { pm_version as version };

// Low-level parser surface (curated). Deeper internals remain importable
// directly via the "./src/*.js" package subpaths.
export {
  pm_version,
  pm_parser_init,
  pm_parser_register_encoding_changed_callback,
  pm_parse,
  pm_slice_type,
  pm_string_query_local,
  pm_string_query_constant,
  pm_string_query_method_name,
} from "./potch.mjs";

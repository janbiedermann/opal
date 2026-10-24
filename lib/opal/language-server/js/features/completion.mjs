// textDocument/completion + completionItem/resolve (port of
// ../../features/completion.rb), index-driven: after `.` a receiver types
// through the same heuristic as definition and answers the linearized
// method names; after `::` the names under that scope; bare capitalized
// words the top-level constants; bare lowercase words the implicit-self
// methods (inside a class) plus keywords; `@` the instance variables of
// the current document (not indexed - ivars are document-local);
// `require "` the require names of the real stdlib from the baked digest
// keys. Items carry a small data tag; resolve fills the doc comment from
// the record (the bake embedded it).
import * as NavigationTarget from "./navigation_target.mjs";
import bakedIndex from "../../baked_index.mjs";

const KIND_METHOD = 2;
const KIND_VARIABLE = 6;
const KIND_CLASS = 7;
const KIND_MODULE = 9;
const KIND_KEYWORD = 14;
const KIND_FILE = 17;
const KIND_CONSTANT = 21;
const MAX_ITEMS = 100;

const KEYWORDS = [
  "alias", "and", "begin", "break", "case", "class", "def", "do", "else", "elsif", "end", "ensure",
  "false", "for", "if", "in", "module", "next", "nil", "not", "or", "redo", "rescue", "retry", "return",
  "self", "super", "then", "true", "undef", "unless", "until", "when", "while", "yield",
];

const CONSTANT_TYPES = ["ConstantReadNode", "ConstantPathNode"];

export function perform(state, document, position) {
  const parseResult = document.parse();
  const offset = parseResult.offsetFor(position.line, position.character);
  const { ancestors } = document.locateNode(position.line, position.character);
  const nesting = NavigationTarget.nestingNames(ancestors);

  const items =
    requireItems(document, ancestors, offset) ??
    methodItems(state, document, ancestors, offset) ??
    constantItems(state, document, ancestors, offset) ??
    ivarItems(document, offset) ??
    wordItems(state, document, offset, nesting);
  return (items ?? []).slice(0, MAX_ITEMS);
}

// completionItem/resolve: the item comes back with our data tag;
// the documentation is the record's baked comment.
export function resolve(state, item) {
  const data = item?.data;
  if (data == null) return item;
  let record;
  if (data.kind === "method") {
    record = state.index.resolveMethod(data.name, data.module, data.singleton);
  } else {
    record = state.index.moduleRecords(data.name)[0] ?? null;
  }
  if (record == null) return item;
  const comments = record.comments ?? null;
  if (comments != null) item.documentation = { kind: "markdown", value: comments };
  const params = record.parameters ?? null;
  if (params != null) {
    item.detail = `${data.module}${data.singleton ? "." : "#"}${data.name}${params}`;
  }
  return item;
}

// `require "js|` / `require_relative` - the StringNode whose parent
// call is a require. Features come from the baked file set once.
function requireItems(document, ancestors, offset) {
  const index = ancestors.findIndex((n) => n.type === "StringNode");
  if (index < 0) return null;
  // an unterminated "jso is wrapped in an InterpolatedStringNode, so
  // the require call may not be the direct parent: take the nearest
  // CallNode ancestor.
  const parent = ancestors.slice(index + 1).find((n) => n.type === "CallNode");
  if (parent == null || !["require", "require_relative"].includes(parent.name)) return null;
  const node = ancestors[index];
  if (offset <= node.location.start) return null;
  const prefix = document.source.slice(node.location.start + 1, offset);
  return requireFeatures()
    .filter((feature) => feature.startsWith(prefix))
    .map((feature) => ({ label: feature, kind: KIND_FILE }));
}

// `recv.pr|efix` where the cursor sits in the message span.
function methodItems(state, document, ancestors, offset) {
  const call = ancestors.find((n) => {
    const message = n.message_loc;
    return n.type === "CallNode" && message != null && covers(n, offset) &&
      offset >= message.start && offset <= message.end;
  });
  if (call == null || call.receiver == null) return null;
  const [fqcn, singleton] = NavigationTarget.receiverClass(state, call.receiver, NavigationTarget.nestingNames(ancestors)) ?? [];
  if (fqcn == null) return []; // typed dot but nothing resolved: answer nothing, not constants
  const prefix = document.source.slice(call.message_loc.start, offset);
  return state.index.visibleMethodNames(fqcn, singleton)
    .filter((name) => name.startsWith(prefix))
    .map((name) => ({
      label: name, kind: KIND_METHOD,
      data: { kind: "method", name, module: fqcn, singleton },
    }));
}

// A constant read/path node covering the cursor: `Comp|`, `Mod::Pi|`.
function constantItems(state, document, ancestors, offset) {
  const node = ancestors.find((n) => CONSTANT_TYPES.includes(n.type) && covers(n, offset));
  if (node == null) return null;
  let start;
  if (node.type === "ConstantPathNode") {
    start = node.name_loc == null ? node.location.start : node.name_loc.start;
  } else {
    start = node.location.start;
  }
  const prefix = document.source.slice(start, offset);

  let scope = null;
  if (node.type === "ConstantPathNode") {
    const full = NavigationTarget.fullPathComponent(node);
    scope = full.includes("::") ? full.split("::").slice(0, -1).join("::") : "";
  }
  const names = scope === null
    ? state.index.topLevelConstantNames()
    : state.index.constantNamesUnder(scope);
  return names
    .filter((name) => name.split("::").at(-1).startsWith(prefix))
    .map((name) => constantItem(state, name));
}

function constantItem(state, name) {
  const records = state.index.moduleRecords(name);
  const kind = records.length === 0
    ? KIND_CONSTANT
    : (records[0].kind === "module" ? KIND_MODULE : KIND_CLASS);
  return { label: name.split("::").at(-1), kind, detail: name, data: { kind: "constant", name } };
}

// `@cou|`: the instance variables mentioned anywhere in this
// document (v1 scope: a document-local concern, not indexed).
function ivarItems(document, offset) {
  if (!/@([A-Za-z_][A-Za-z0-9_]*)?$/.test(document.source.slice(0, offset))) return null;
  const seen = new Set();
  const out = [];
  for (const m of document.source.matchAll(/@[A-Za-z_][A-Za-z0-9_]*/g)) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push({ label: m[0], kind: KIND_VARIABLE });
      if (out.length >= MAX_ITEMS) break;
    }
  }
  return out;
}

// A bare word: capitalized -> top-level constants; lowercase ->
// implicit-self methods inside a class body, plus keywords.
function wordItems(state, document, offset, nesting) {
  const match = /[A-Za-z_][A-Za-z0-9_?!]*$/.exec(document.source.slice(0, offset));
  if (match === null) return [];
  const prefix = match[0];
  if (/[A-Z]/.test(prefix[0])) {
    return state.index.topLevelConstantNames()
      .filter((n) => n.startsWith(prefix))
      .map((n) => constantItem(state, n))
      .slice(0, MAX_ITEMS);
  }
  const items = KEYWORDS
    .filter((k) => k.startsWith(prefix))
    .map((k) => ({ label: k, kind: KIND_KEYWORD }));
  if (nesting.length > 0) {
    const names = state.index.visibleMethodNames(nesting[nesting.length - 1], false);
    items.push(...names
      .filter((m) => m.startsWith(prefix) && !m.endsWith("="))
      .map((m) => ({
        label: m, kind: KIND_METHOD,
        data: { kind: "method", name: m, module: nesting[nesting.length - 1], singleton: false },
      })));
  }
  return items.slice(0, MAX_ITEMS);
}

function covers(node, offset) {
  return node.location.start <= offset && offset <= node.location.end;
}

// The requireable names: top-level stdlib files plus the opal
// entrypoints (derived once from the baked digest keys).
let cachedRequireFeatures = null;
function requireFeatures() {
  cachedRequireFeatures ??= (() => {
    const digests = bakedDigests();
    if (digests == null) return [];
    const features = new Set();
    for (const key of Object.keys(digests)) {
      if (key.startsWith("stdlib/")) {
        const feature = key.slice("stdlib/".length, -3);
        if (!feature.includes("/")) features.add(feature);
      } else if (key.startsWith("opal/opal/")) {
        features.add(key.slice("opal/".length, -3));
      }
    }
    return [...features].sort();
  })();
  return cachedRequireFeatures;
}

// The bake is already a static module, so the only branch left is a
// server started without the payload.
function bakedDigests() {
  return bakedIndex?.digests ?? null;
}

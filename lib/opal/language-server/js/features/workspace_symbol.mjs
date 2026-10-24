// The workspace/symbol request (port of
// ../../features/workspace_symbol.rb): fuzzy-ish name search across the
// index (baked corelib/stdlib + workspace + open documents), capped at
// 100 by Index#search. Module/class hits point at the name segment of
// the declaration; method hits point at a definition record.
import * as FileResolver from "../indexer/file_resolver.mjs";

const KIND_MODULE = 2;
const KIND_CLASS = 5;
const KIND_METHOD = 6;

export function perform(state, query) {
  return state.index.search(query ?? "").map((hit) => toInformation(state, hit)).filter((h) => h !== null);
}

function toInformation(state, hit) {
  const [name, kind] = hit;
  if (kind === "module") {
    const record = state.index.moduleRecords(name)[0] ?? null;
    if (record == null) return null;
    const range = record.name_range ?? record.range ?? null;
    const uri = FileResolver.uriFor(record.file, state.opalHome);
    if (range == null || uri == null) return null;
    const lspKind = record.kind === "module" ? KIND_MODULE : KIND_CLASS;
    return { name, kind: lspKind, location: { uri, range } };
  }
  const moduleName = hit[2];
  let definition = null;
  for (const record of state.index.moduleRecords(moduleName)) {
    const defs = (record.methods ?? {})[name] ?? [];
    const singles = (record.singleton_methods ?? {})[name] ?? [];
    if (defs.length > 0 || singles.length > 0) {
      definition = defs[0] ?? singles[0];
      break;
    }
  }
  if (definition == null) return null;
  const uri = FileResolver.uriFor(definition.file, state.opalHome);
  if (uri == null) return null;
  const label = moduleName == null ? name : `${moduleName}.${name}`;
  return { name: label, kind: KIND_METHOD, location: { uri, range: definition.range } };
}

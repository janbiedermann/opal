// The textDocument/references request (port of
// ../../features/references.rb). Constants search the reference map
// (baked + live) and collect their definitions; methods search the live
// method-reference records (the bake skips call sites - LSP.md §5) and
// the definition records across the index. Every hit carries a real
// range from the index, so no re-parse of other files is needed.
import * as NavigationTarget from "./navigation_target.mjs";
import * as FileResolver from "../indexer/file_resolver.mjs";

export function perform(state, document, position, includeDeclaration) {
  const target = NavigationTarget.locate(document, position);
  if (target === null) return [];

  let records;
  if (target.kind === "constant") {
    const refs = state.index.constantReferences(target.base_name);
    const defs = state.index.resolveConstant(target);
    records = includeDeclaration ? refs.concat(defs) : refs;
  } else {
    const refs = state.index.liveMethodReferences(target.name);
    const defs = state.index.methodDefinitionsAll(target.name);
    records = includeDeclaration ? refs.concat(defs) : refs;
  }

  const locations = [];
  const seen = new Set();
  for (const record of records) {
    const range = record.name_range ?? record.range ?? null;
    const uri = FileResolver.uriFor(record.file, state.opalHome);
    if (range == null || uri == null) continue;
    const key = `${uri}:${JSON.stringify(range)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push({ uri, range });
  }
  return locations;
}

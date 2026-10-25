// textDocument/prepareRename + textDocument/rename (port of
// ../../features/rename.rb). Renames edit the live scope only - the
// current document, the open documents and the workspace files (their
// record files are uris); the baked corelib/stdlib records are reported
// by references but never edited from the editor, with one exception:
// records indexed from an opalHome checkout carry checkout-relative keys
// and do get edits, since the developer asked for that checkout to be
// authoritative by setting opalHome.
import * as NavigationTarget from "./navigation_target.mjs";
import * as FileResolver from "../indexer/file_resolver.mjs";

// prepareRename: null refuses the rename at this position (the
// editor then says "cannot rename"), otherwise the exact range and
// the name to prefill.
export function prepare(state, document, position) {
  const target = NavigationTarget.locate(document, position);
  if (target === null) return null;
  return { range: target.range, placeholder: target.base_name };
}

export function perform(state, document, position, newName) {
  const target = NavigationTarget.locate(document, position);
  if (target === null) return null;
  if (newName == null || newName === "") return null;

  let records;
  if (target.kind === "constant") {
    records = state.index.constantReferences(target.base_name)
      .concat(state.index.resolveConstant(target));
  } else {
    records = state.index.liveMethodReferences(target.name)
      .concat(state.index.methodDefinitionsAll(target.name));
  }

  const changes = {};
  const seen = new Set();
  for (const record of records) {
    const file = record.file;
    if (!editable(file, state)) continue;
    const range = record.name_range ?? record.range ?? null;
    const uri = FileResolver.uriFor(file, state.opalHome);
    if (range == null || uri == null) continue;
    const key = `${uri}:${JSON.stringify(range)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (changes[uri] ??= []).push({ range, newText: newName });
  }

  return Object.keys(changes).length === 0 ? null : { changes };
}

// Live records key by uri; records re-indexed from an opalHome
// checkout carry their baked-relative key (a developer editing
// corelib in a checkout is the LSP.md §5 dev flow).
function editable(file, state) {
  if (file.startsWith("file://")) return true;
  return state.opalHome != null;
}

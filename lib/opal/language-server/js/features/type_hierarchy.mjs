// The 3.17 type hierarchy requests (port of
// ../../features/type_hierarchy.rb). prepareTypeHierarchy anchors on the
// constant under the cursor; supertypes reads the record's superclass
// and the recorded include/prepend/extend names, subtypes scans the
// index for modules declaring that superclass or including that name
// (matched both fully qualified and bare, since the listener records the
// name as written).
import * as NavigationTarget from "./navigation_target.mjs";
import * as FileResolver from "../indexer/file_resolver.mjs";

const KIND_MODULE = 2;
const KIND_CLASS = 5;

// TypeHierarchyItem[] - an array even for one hit, per the spec.
export function prepare(state, document, position) {
  const target = NavigationTarget.locate(document, position);
  if (target === null || target.kind !== "constant") return null;
  const records = state.index.resolveConstant(target);
  if (records.length === 0) return null;
  const item = itemFor(state, records[0].name, records[0]);
  return item === null ? [] : [item];
}

export function supertypes(state, item) {
  const fqcn = item == null ? null : item.data;
  if (fqcn == null) return [];
  const found = new Map();
  for (const record of state.index.moduleRecords(fqcn)) {
    if (record.superclass != null) add(found, state, record.superclass);
    for (const name of [...(record.includes ?? []), ...(record.prepends ?? []), ...(record.extends ?? [])]) {
      add(found, state, name);
    }
  }
  return [...found.values()].filter((v) => v !== null);
}

export function subtypes(state, item) {
  const fqcn = item == null ? null : item.data;
  if (fqcn == null) return [];
  const last = fqcn.split("::").at(-1);
  const out = [];
  for (const name of state.index.moduleNames()) {
    if (name === fqcn) continue;
    const records = state.index.moduleRecords(name);
    const matched = records.some((record) => {
      const sup = record.superclass ?? null;
      return sup === fqcn || sup === last ||
        [...(record.includes ?? []), ...(record.prepends ?? []), ...(record.extends ?? [])]
          .some((n) => n === fqcn || n === last);
    });
    if (matched) {
      const item2 = itemFor(state, name, records[0]);
      if (item2 !== null) out.push(item2);
    }
  }
  return out;
}

function add(found, state, name) {
  if (name == null || found.has(name)) return;
  const records = state.index.moduleRecords(name);
  found.set(name, records.length === 0 ? null : itemFor(state, name, records[0]));
}

function itemFor(state, name, record) {
  const uri = FileResolver.uriFor(record.file, state.opalHome);
  if (uri == null) return null;
  const range = record.name_range ?? record.range;
  return {
    name,
    kind: record.kind === "module" ? KIND_MODULE : KIND_CLASS,
    uri,
    range,
    selectionRange: range,
    data: name,
  };
}

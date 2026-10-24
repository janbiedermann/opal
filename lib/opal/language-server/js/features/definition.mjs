// The textDocument/definition request (port of
// ../../features/definition.rb). The name under the cursor comes from
// navigation_target; resolution is nesting-aware for constants (inner
// scope first, Ruby lookup order) and receiver-based for methods: a
// literal receiver types the call (a String literal answers String's
// ancestor chain - the LSP.md §2 heuristic, no inference engine), a
// constant receiver looks on the singleton side, `Klass.new.m` looks on
// the instance side, and a receiverless call inside a class looks in the
// enclosing module. Locations of baked records resolve through
// file_resolver: the checkout with opalHome, else a dumped copy.
import * as NavigationTarget from "./navigation_target.mjs";
import * as FileResolver from "../indexer/file_resolver.mjs";

export function perform(state, document, position) {
  const target = NavigationTarget.locate(document, position);
  if (target === null) return null;

  let locations;
  switch (target.kind) {
    case "constant":
      locations = constantLocations(state, target);
      break;
    default:
      locations = methodLocations(state, target);
      break;
  }
  return locations.length === 0 ? null : locations;
}

function constantLocations(state, target) {
  const found = [];
  for (const record of state.index.resolveConstant(target)) {
    const range = record.name_range ?? record.range ?? null;
    if (range == null) continue;
    const loc = location(record.file, range, state.opalHome);
    if (loc !== null) found.push(loc);
  }
  return found;
}

function methodLocations(state, target) {
  if (target.definition) return []; // F12 on a def lands on itself: the editor is there already
  const [fqcn, singleton] = NavigationTarget.methodOwner(state, target);
  if (fqcn == null) return [];
  const definition = state.index.resolveMethod(target.name, fqcn, singleton);
  if (definition == null) return [];
  return [location(definition.file, definition.range, state.opalHome)].filter((l) => l !== null);
}

function location(file, range, opalHome) {
  const uri = FileResolver.uriFor(file, opalHome);
  if (uri == null) return null;
  return { uri, range };
}

// The textDocument/hover request (port of ../../features/hover.rb):
// constants render their declaration line (kind, name, superclass, the
// includes recorded by the index) plus the doc comment the bake embedded;
// methods render `def name(params)` under an `Owner#name` / `Owner.name`
// heading. Comments come straight from the records - no re-parsing of
// corelib at run time (LSP.md §5).
import * as NavigationTarget from "./navigation_target.mjs";

export function perform(state, document, position) {
  const target = NavigationTarget.locate(document, position);
  if (target === null) return null;

  const value = target.kind === "constant"
    ? constantHover(state.index, target)
    : methodHover(state, target);
  if (value == null) return null;
  return { contents: { kind: "markdown", value } };
}

function constantHover(index, target) {
  const records = index.resolveConstant(target);
  if (records.length === 0) return null;
  const record = records[0];
  const word = record.kind === "module" ? "module" : "class";
  let superclass = null;
  const includes = [];
  for (const mod of records) {
    superclass ??= mod.superclass ?? null;
    for (const [wordKey, list] of [["include", mod.includes ?? []], ["prepend", mod.prepends ?? []], ["extend", mod.extends ?? []]]) {
      for (const name of list) {
        const line = `  ${wordKey} ${name}`;
        if (!includes.includes(line)) includes.push(line);
      }
    }
  }
  const head = superclass == null ? `${word} ${record.name}` : `${word} ${record.name} < ${superclass}`;
  return markdown([head, ...includes, "end"].join("\n"), record.comments ?? null);
}

function methodHover(state, target) {
  const [fqcn, singleton] = NavigationTarget.methodOwner(state, target);
  if (fqcn == null) return null;
  const definition = state.index.resolveMethod(target.name, fqcn, singleton);
  if (definition == null) return null;
  let owner = definition.module ?? null;
  if (owner == null) owner = fqcn;
  let params = definition.parameters ?? null;
  if (params == null) params = "()";
  const sep = singleton ? "." : "#";
  const body = `${singleton ? "def self." : "def "}${target.name}${params}`;
  return `### ${owner}${sep}${target.name}\n\n${markdown(body, definition.comments ?? null)}`;
}

function markdown(body, comments) {
  let out = "```ruby\n" + body + "\n```";
  if (comments != null) out += `\n\n${comments}`;
  return out;
}

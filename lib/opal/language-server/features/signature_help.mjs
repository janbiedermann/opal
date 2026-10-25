// The textDocument/signatureHelp request (port of
// ../../features/signature_help.rb): find the innermost call whose
// argument list contains the cursor, type the receiver exactly as the
// other navigation features do, and answer the definition's recorded
// parameter list. activeParameter counts the top-level commas already
// typed (string scan: strings and nested brackets skipped).
import * as NavigationTarget from "./navigation_target.mjs";

export function perform(state, document, position) {
  const parseResult = document.parse();
  const offset = parseResult.offsetFor(position.line, position.character);
  const { ancestors } = document.locateNode(position.line, position.character);

  const call = ancestors.find((n) => n.type === "CallNode" && insideArguments(n, offset));
  if (call == null) return null;
  const name = call.name;
  if (name == null) return null;

  const target = { name, receiver: call.receiver ?? null, nesting: NavigationTarget.nestingNames(ancestors) };
  const [fqcn, singleton] = NavigationTarget.methodOwner(state, target);
  if (fqcn == null) return null;
  const definition = state.index.resolveMethod(name, fqcn, singleton);
  if (definition == null) return null;

  let params = definition.parameters ?? null;
  if (params == null) params = "()";
  const labels = parameterLabels(params);
  const open = call.opening_loc;
  const active = countTopLevelCommas(document.source, open.end, offset);

  return {
    signatures: [{
      label: `${name}${params}`,
      parameters: labels.map((label) => ({ label })),
    }],
    activeSignature: 0,
    activeParameter: active > labels.length ? labels.length : active,
  };
}

// The cursor sits in the call's argument span: after the '(' and
// before its ')' (an unclosed call is still "inside").
function insideArguments(call, offset) {
  const open = call.opening_loc;
  if (open == null) return false;
  if (offset < open.end) return false;
  const close = call.closing_loc;
  if (close == null) return true;
  return offset <= close.start;
}

// "(a, b = …, *rest, key:, **opts, &block)" -> the label parts; the
// recorded string splits on ", " (parametersOf never emits a comma
// inside a part).
function parameterLabels(params) {
  const inner = params.slice(1, -1); // drop the "(" and ")"
  if (inner.length === 0) return [];
  return inner.split(", ");
}

function countTopLevelCommas(source, from, to) {
  let d = 0;
  let n = 0;
  let q = null;
  for (let i = from; i < to; i++) {
    const c = source[i];
    if (q !== null) {
      if (c === "\\") i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === "\"" || c === "'" || c.charCodeAt(0) === 96) { q = c; continue; }
    if (c === "(" || c === "[" || c === "{") d++;
    else if (c === ")" || c === "]" || c === "}") d--;
    else if (c === "," && d === 0) n++;
  }
  return n;
}

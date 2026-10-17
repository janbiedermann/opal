// BEGIN { } and END { }.
//
// BEGIN blocks (only allowed at the top level) run before the rest of the
// file, in the top-level scope: their bodies move to the start of the file.
// END { body } registers `at_exit { body }` the first time it runs
// (OpalEndOnce adds the "once").
import { mapChildren } from "./walk.mjs";

export function prePostExecution(compiler, root) {
  const s = (origin, type, props) => ({ type, location: origin.location, ...props });

  function process(node) {
    if (!node || typeof node !== "object") return node;
    if (node.type === "PostExecutionNode") {
      const call = s(node, "CallNode", {
        receiver: null,
        name: "at_exit",
        arguments: null,
        flags: [],
        block: s(node, "BlockNode", { locals: [], parameters: null, body: process(node.statements) }),
      });
      return s(node, "OpalEndOnce", { call });
    }
    return mapChildren(node, process);
  }

  const body = root.body;
  if (body?.body?.some((n) => n.type === "PreExecutionNode")) {
    const begins = [];
    const rest = [];
    for (const n of body.body) {
      if (n.type === "PreExecutionNode") {
        if (n.statements) begins.push(...n.statements.body);
      } else {
        rest.push(n);
      }
    }
    root = { ...root, body: { ...body, body: [...begins, ...rest] } };
  }
  return process(root);
}

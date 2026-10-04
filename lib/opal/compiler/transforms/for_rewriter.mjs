// for loops. Port of lib/opal/rewriters/for_rewriter.rb.
//
//   for i in 0..3; j = i + 1; end
//
// In Ruby the loop variable and all locals of the body stay visible after
// the loop, so this becomes:
//
//   j = nil
//   i = nil
//   (0..3).each { |$for_tmp1| i = $for_tmp1; j = i + 1 }
//
// and multiple loop variables (for i, j in ...) use a multiple assignment.
import { mapChildren, eachChild, bodyOf } from "./walk.mjs";
import { prependToBody } from "../nodes/args.mjs";
import { assignmentTo } from "../nodes/masgn.mjs";

const LVASGN_TYPES = new Set([
  "LocalVariableWriteNode", "LocalVariableTargetNode", "LocalVariableOperatorWriteNode",
  "LocalVariableOrWriteNode", "LocalVariableAndWriteNode",
]);

// Names of all local variables assigned in a tree, in order
// (LocalVariableAssigns).
function localVariableAssigns(node, out = new Set()) {
  if (!node) return out;
  if (LVASGN_TYPES.has(node.type)) out.add(node.name);
  eachChild(node, (child) => localVariableAssigns(child, out));
  return out;
}

export function forRewriter(compiler, root) {
  let counter = 0;

  function process(node) {
    if (node.type !== "ForNode") return mapChildren(node, process);

    const s = (type, props) => ({ type, location: node.location, ...props });
    const loopVariable = node.index;
    const loopBody = bodyOf(node.statements);

    // Declare local variables used in the loop and the loop body at the outer scope
    // (two lists, so a name in both is declared twice, as in the Ruby compiler)
    const names = [...localVariableAssigns(loopVariable), ...localVariableAssigns(loopBody)];
    const outerAssignments = names.map((name) => s("OpalLvdeclare", { name }));

    // Generate temporary loop variable
    const tmp = `$for_tmp${++counter}`;
    const getTmp = s("OpalJsTmp", { value: tmp });

    // Assign the loop variables in the loop body
    const assign = loopVariable.type === "MultiTargetNode"
      ? s("MultiWriteNode", { lefts: loopVariable.lefts, rest: loopVariable.rest, rights: loopVariable.rights, value: getTmp })
      : assignmentTo(loopVariable, getTmp);
    const body = prependToBody(node, loopBody, [assign]);

    // Transform the for-loop into each-loop with updated loop body
    const each = s("CallNode", {
      receiver: node.collection,
      name: "each",
      arguments: null,
      flags: [],
      block: s("BlockNode", {
        locals: [tmp],
        parameters: s("BlockParametersNode", {
          parameters: s("ParametersNode", {
            requireds: [s("RequiredParameterNode", { name: tmp })],
            optionals: [], rest: null, posts: [], keywords: [], keyword_rest: null, block: null,
          }),
          locals: [],
        }),
        body: body && process(body),
      }),
    });

    return s("OpalBegin", { body: [...outerAssignments, each] });
  }

  return process(root);
}

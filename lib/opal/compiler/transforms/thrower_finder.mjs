// Tracks the presence of throwers, like break, redo, so we can make an
// informed guess in the early compilation phase before traversing other
// nodes whether we want to track a closure. Tracking a closure is often a
// deoptimizing step, so we want to get that knowledge earlier.
// Port of the former Ruby lib/opal/rewriters/thrower_finder.rb.
import { eachChild } from "./walk.mjs";

const LOOPS = new Set(["WhileNode", "UntilNode", "ForNode"]);
const ITERS = new Set(["BlockNode", "LambdaNode"]);

export function throwerFinder(compiler, root) {
  const breakStack = [];
  const redoStack = [];
  const retryStack = [];
  const rescueElseStack = [];

  const tracking = (flag, stack) => {
    const last = stack[stack.length - 1];
    if (last) last[flag] = true;
  };

  const pushing = (pairs, fn) => {
    for (const [stack, node] of pairs) stack.push(node);
    fn();
    for (const [stack] of pairs) stack.pop();
  };

  function visit(node) {
    switch (node.type) {
      case "BreakNode":
        tracking("hasBreak", breakStack);
        break;
      case "RedoNode":
        tracking("hasRedo", redoStack);
        break;
      case "RetryNode":
        tracking("hasRetry", retryStack);
        break;
    }

    if (ITERS.has(node.type)) {
      pushing([[breakStack, node]], () => eachChild(node, visit));
    } else if (LOOPS.has(node.type)) {
      pushing([[redoStack, node], [breakStack, null]], () => eachChild(node, visit));
    } else if (node.type === "DefinedNode") {
      // ignore throwers inside defined
      pushing([[redoStack, null], [breakStack, null], [retryStack, null]], () => eachChild(node, visit));
    } else if (node.type === "OpalEnsure") {
      // In Opal we handle rescue-else either in ensure or in
      // rescue. If ensure is present, we handle it in ensure.
      // Otherwise we handle it in rescue. ensure is always
      // above a rescue. This logic is about tracking if a given
      // ensure node should expect a rescue-else inside a
      // rescue node.
      pushing([[rescueElseStack, node]], () => eachChild(node, visit));
    } else if (node.type === "OpalRescue") {
      if (node.elseBody) tracking("hasRescueElse", rescueElseStack);
      pushing([[rescueElseStack, null], [retryStack, node]], () => eachChild(node, visit));
    } else {
      eachChild(node, visit);
    }
  }

  visit(root);
  return root;
}

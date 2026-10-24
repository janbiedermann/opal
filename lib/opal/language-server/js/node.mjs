// Thin helpers over the raw Prism POJO tree (the walk layer of
// ../prism/node.rb and ../prism/dispatcher.rb, without the wrapper class:
// in JS the POJO *is* the node).

// Every child node of a node, in field order. POJO field names differ per
// node type (statements/body, body, arguments, elements...), so the walk
// is structural: object-valued fields with a `type` key are child nodes;
// locs ({start, end}, no type), nulls and scalars are skipped; arrays are
// one level deep. (Verbatim semantics of $prismChildNodes.)
export function childNodes(n) {
  const out = [];
  for (const k in n) {
    const v = n[k];
    if (v === null || typeof v !== "object") continue;
    if (Array.isArray(v)) {
      for (const el of v) {
        if (el !== null && typeof el === "object" && el.type) out.push(el);
      }
    } else if (v.type) {
      out.push(v);
    }
  }
  return out;
}

// Depth-first, children in source order (the Prism Dispatcher's order:
// it recurses children forward, so the first child is visited first);
// enter(node) may return false to skip the node's children. Iterative
// (the corpus nests deeper than the JS stack would like): children are
// pushed reversed so they pop in source order. With a leave callback
// the walk also answers leave(node) after a node's subtree, in
// enter/leave pairs like the Prism Dispatcher - the indexer's nesting
// needs that.
export function walk(root, enter, leave) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null) {
      leave(stack.pop());
      continue;
    }
    if (enter(node) === false) continue;
    if (leave) stack.push(node, null); // null is the leave marker for the node under it
    const children = childNodes(node);
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
}

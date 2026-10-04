// Generic traversal of potch (Prism) trees and compiler-made nodes: any
// object with a string `type` is a node, and a node's children are the
// node-valued properties and the nodes inside array-valued properties.
// Locations ({start, end}) and other plain values are skipped.

export function isNode(value) {
  return value !== null && typeof value === "object" && typeof value.type === "string";
}

// Calls fn(child) for every child node.
export function eachChild(node, fn) {
  for (const key in node) {
    if (key === "location") continue;
    const value = node[key];
    if (isNode(value)) {
      fn(value);
    } else if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) fn(item);
    }
  }
}

// Replaces every child node with fn(child), in place, and returns the node.
export function mapChildren(node, fn) {
  for (const key in node) {
    if (key === "location") continue;
    const value = node[key];
    if (isNode(value)) {
      node[key] = fn(value);
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (isNode(value[i])) value[i] = fn(value[i]);
      }
    }
  }
  return node;
}

// The body of a node as the parser gem had it: null when empty, the single
// statement, or the StatementsNode itself for several statements.
export function bodyOf(statements) {
  if (!statements) return null;
  if (statements.type !== "StatementsNode") return statements;
  if (statements.body.length === 0) return null;
  if (statements.body.length === 1) return statements.body[0];
  return statements;
}

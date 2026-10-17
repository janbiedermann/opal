// Generic traversal of the parser's (Prism) trees and compiler-made nodes: any
// object with a string `type` is a node, and a node's children are the
// node-valued properties and the nodes inside array-valued properties.
// Locations ({start, end}) and other plain values are skipped.
import { NODE_FIELD_ORDER } from "../../parser/field_order.mjs";

export function isNode(value) {
  return value !== null && typeof value === "object" && typeof value.type === "string";
}

// The fields of a Prism node type that can hold nodes (or arrays of nodes),
// from the parser's field table; null for compiler-made types (Opal*), whose
// properties are all looked at.
const NON_NODE_FIELDS = new Set(["flags", "locals", "name", "unescaped", "depth", "number", "maximum", "operator", "binary_operator"]);
const childFieldsCache = new Map();

function childFields(type) {
  let fields = childFieldsCache.get(type);
  if (fields === undefined) {
    const order = type.startsWith("Opal") ? null : NODE_FIELD_ORDER[type];
    fields = order ? order.split(" ").filter((f) => !f.endsWith("_loc") && !NON_NODE_FIELDS.has(f)) : null;
    childFieldsCache.set(type, fields);
  }
  return fields;
}

// Calls fn(child) for every child node.
export function eachChild(node, fn) {
  const fields = childFields(node.type);
  if (fields === null) {
    for (const key in node) {
      if (key === "location") continue;
      const value = node[key];
      if (isNode(value)) {
        fn(value);
      } else if (Array.isArray(value)) {
        for (const item of value) if (isNode(item)) fn(item);
      }
    }
    return;
  }
  for (let f = 0; f < fields.length; f++) {
    const value = node[fields[f]];
    if (value === null || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) if (isNode(value[i])) fn(value[i]);
    } else if (typeof value.type === "string") {
      fn(value);
    }
  }
}

// Replaces every child node with fn(child), in place, and returns the node.
export function mapChildren(node, fn) {
  const fields = childFields(node.type);
  if (fields === null) {
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
  for (let f = 0; f < fields.length; f++) {
    const key = fields[f];
    const value = node[key];
    if (value === null || typeof value !== "object") continue;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) if (isNode(value[i])) value[i] = fn(value[i]);
    } else if (typeof value.type === "string") {
      node[key] = fn(value);
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

// Ruby-free port of test/prism/result/constant_path_node_test.rb — see
// UNI.md. `ConstantPathNode#full_name`/`ConstantPathTargetNode#full_name`
// (lib/prism/node_ext.rb) are pure AST-walking algorithms (no CRuby
// dependency), ported directly below.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWithMetadata } from "../../../lib/opal/parser/index.mjs";

class DynamicPartsInConstantPathError extends Error {}
class MissingNodesInConstantPathError extends Error {}

function fullNameParts(node) {
  if (node.type === "ConstantReadNode" || node.type === "ConstantTargetNode") {
    return [node.name];
  }

  if (node.type === "ConstantPathNode") {
    const parts = [];
    let current = node;
    while (current && current.type === "ConstantPathNode") {
      if (current.name == null) throw new MissingNodesInConstantPathError();
      parts.unshift(current.name);
      current = current.parent;
    }
    if (current !== null && current.type !== "ConstantReadNode") {
      throw new DynamicPartsInConstantPathError();
    }
    parts.unshift(current?.name ?? "");
    return parts;
  }

  if (node.type === "ConstantPathTargetNode") {
    let parts;
    if (node.parent == null) {
      parts = [""];
    } else if (node.parent.type === "ConstantPathNode" || node.parent.type === "ConstantReadNode") {
      parts = fullNameParts(node.parent);
    } else {
      throw new DynamicPartsInConstantPathError();
    }
    if (node.name == null) throw new MissingNodesInConstantPathError();
    return [...parts, node.name];
  }

  throw new TypeError(`fullNameParts: unsupported node type ${node.type}`);
}

function fullName(node) {
  return fullNameParts(node).join("::");
}

function statement(source) {
  return parseWithMetadata(source).ast.statements.body[0];
}

test("full name for a constant path", () => {
  const node = statement("Foo:: # comment\n  Bar::Baz::\n    Qux\n");
  assert.equal(fullName(node), "Foo::Bar::Baz::Qux");
});

test("full name for a constant path with self raises", () => {
  const node = statement("self:: # comment\n  Bar::Baz::\n    Qux\n");
  assert.throws(() => fullName(node), DynamicPartsInConstantPathError);
});

test("full name for a constant path with a variable raises", () => {
  const node = statement("foo:: # comment\n  Bar::Baz::\n    Qux\n");
  assert.throws(() => fullName(node), DynamicPartsInConstantPathError);
});

test("full name for a constant path target", () => {
  const node = statement("Foo:: # comment\n  Bar::Baz::\n    Qux, Something = [1, 2]\n");
  assert.equal(fullName(node.lefts[0]), "Foo::Bar::Baz::Qux");
});

test("full name for a constant path target with a top-level start", () => {
  const node = statement("::Foo:: # comment\n  Bar::Baz::\n    Qux, Something = [1, 2]\n");
  assert.equal(fullName(node.lefts[0]), "::Foo::Bar::Baz::Qux");
});

test("full name for a constant path target with a non-constant parent", () => {
  const node = statement("self::Foo, Bar = [1, 2]\n");
  const [dynamic, static_] = node.lefts;
  assert.throws(() => fullName(dynamic), DynamicPartsInConstantPathError);
  assert.equal(fullName(static_), "Bar");
});

test("full name for a bare constant read", () => {
  assert.equal(fullName(statement("Bar\n")), "Bar");
});

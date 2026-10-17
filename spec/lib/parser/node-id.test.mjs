// Ruby-free port of test/prism/result/node_id_test.rb — see UNI.md. Checks
// target_js_uni's own node_id bookkeeping is internally consistent (no
// zero id, no duplicates) across the fixture corpus - a self-consistency
// check, not a cross-backend comparison (node_id isn't part of the
// envelope diff against @ruby/prism - see uni-envelope.js - since
// assignment order isn't guaranteed to match across backends).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { rawEnvelope } from "./support/uni-envelope.mjs";

const FIXTURES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "fixtures", "parser");

function collectFixtures(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFixtures(full, base));
    else if (entry.endsWith(".txt")) out.push(relative(base, full).split("\\").join("/"));
  }
  return out;
}

function collectNodeIds(root) {
  const ids = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node == null || typeof node !== "object") continue;
    if ("node_id" in node) ids.push(node.node_id);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) queue.push(...value);
      else if (value && typeof value === "object") queue.push(value);
    }
  }
  return ids;
}

for (const relPath of collectFixtures(FIXTURES_DIR)) {
  test(`node ids: ${relPath}`, () => {
    const source = readFileSync(join(FIXTURES_DIR, relPath), "utf8");
    const ids = collectNodeIds(rawEnvelope(source).ast);

    assert.ok(!ids.includes(0), "node_id 0 should never be assigned");
    assert.deepStrictEqual([...ids].sort(), [...new Set(ids)].sort(), "node_ids should be unique");
  });
}

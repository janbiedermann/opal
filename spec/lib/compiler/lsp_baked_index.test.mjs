// The freshness gate for the two committed generated modules of P3
// (LSP.md §5): lib/opal/language-server/baked_index.mjs and
// corelib_sources.mjs. They are rebuilt by
// node tasks/language-server/update_baked_index.mjs; this spec catches a
// checkout where corelib/stdlib changed but the bake was not re-run, in
// well under a second (no Opal build: it recomputes the bake's own FNV-1a
// digests over the same file set and compares).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const INDEX = (await import(join(OPAL_ROOT, "lib/opal/language-server/baked_index.mjs"))).default;
const SOURCES = (await import(join(OPAL_ROOT, "lib/opal/language-server/corelib_sources.mjs"))).default;

// The roots the bake driver indexes (indexer/driver.rb ROOTS, mirrored).
const ROOTS = [
  ["opal/corelib", "**"],
  ["opal/opal", "*"],
  ["stdlib", "**"],
];

function collectFiles() {
  const out = new Set();
  const walk = (rel) => {
    for (const entry of readdirSync(join(OPAL_ROOT, rel), { withFileTypes: true })) {
      const full = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".rb")) out.add(full);
    }
  };
  for (const [dir, depth] of ROOTS) {
    if (depth === "**") walk(dir);
    else for (const e of readdirSync(join(OPAL_ROOT, dir))) if (e.endsWith(".rb")) out.add(`${dir}/${e}`);
  }
  return [...out].sort();
}

// The bake's digest function (indexer/driver.rb #digest): FNV-1a over the
// UTF-16 units plus the length, hex prefix.
function digest(source) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16) + "-" + source.length;
}

describe("the baked corelib index", () => {
  test("is fresh: every indexed file matches its baked digest", () => {
    const files = collectFiles();
    assert.ok(files.length > 150, `expected the whole corelib/stdlib, found ${files.length} files`);
    for (const file of files) {
      const source = readFileSync(join(OPAL_ROOT, file), "utf8");
      assert.equal(
        INDEX.digests[file],
        digest(source),
        `${file} changed (or joined the tree) since the bake: re-run node tasks/language-server/update_baked_index.mjs and commit the result`,
      );
    }
    const extra = Object.keys(INDEX.digests).filter((f) => !files.includes(f));
    assert.deepEqual(extra, [], `baked digests for files that no longer exist: re-run the bake`);
  });

  test("the sources map covers exactly the digested files", () => {
    assert.deepEqual(Object.keys(SOURCES).sort(), Object.keys(INDEX.digests).sort());
    for (const [file, source] of Object.entries(SOURCES)) {
      assert.equal(source.length, Number(file && INDEX.digests[file].split("-")[1]), `dumped source length diverged for ${file}`);
    }
  });

  test("module records carry the shape the features read", () => {
    const records = INDEX.modules["String"];
    assert.ok(Array.isArray(records) && records.length > 0, "String has records");
    const defining = records.find((r) => r.methods.gsub);
    assert.ok(defining.methods.gsub[0].range.start.line > 0);
    for (const record of records) {
      for (const key of ["name", "kind", "file", "range", "name_range", "methods", "singleton_methods"]) {
        assert.ok(key in record, `String record lacks ${key}`);
      }
      assert.match(record.file, /\w/); // checkout-relative path
    }
    // the reopen list includes the stdlib extensions the runtime adds
    assert.ok(records.some((r) => r.file === "opal/corelib/string.rb"));
    assert.ok(records.some((r) => r.file.startsWith("stdlib/")));
  });

  test("the walk found the same file set the bake indexes", () => {
    // guards the mirror between ROOTS here and indexer/driver.rb: an entry
    // that one side misses shows up as a digest count difference
    assert.equal(Object.keys(INDEX.digests).length, collectFiles().length);
    assert.ok(statSync(join(OPAL_ROOT, "lib/opal/language-server/baked_index.mjs")).size > 1000000);
  });
});

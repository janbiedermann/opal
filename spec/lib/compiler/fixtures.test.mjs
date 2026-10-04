// Compiles every fixture in spec/lib/fixtures/compiler and compares the
// result with the expected output: <name>.potch.js where the JS compiler
// deliberately differs from the Ruby compiler, otherwise <name>.js (the
// Ruby compiler's output, regenerated with
// `node tasks/compiler/compare.mjs --update-fixtures`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Compiler } from "../../../lib/opal/compiler/index.mjs";

const FIXTURES = join(fileURLToPath(new URL(".", import.meta.url)), "..", "fixtures", "compiler");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith(".rb")) out.push(path);
  }
  return out;
}

function fixtureOptions(source) {
  const m = /^# opal-options: (\{.*\})\s*$/.exec(source.split("\n")[0]);
  return m ? JSON.parse(m[1]) : {};
}

for (const file of walk(FIXTURES)) {
  const name = relative(FIXTURES, file);
  const intended = file.replace(/\.rb$/, ".potch.js");
  const expectedPath = existsSync(intended) ? intended : file.replace(/\.rb$/, ".js");

  test(name, () => {
    const source = readFileSync(file, "utf8");
    const expected = readFileSync(expectedPath, "utf8");
    const options = { file: name, warning: () => {}, ...fixtureOptions(source) };

    if (expected.startsWith("// error:")) {
      assert.throws(() => new Compiler(source, options).compile());
    } else {
      assert.equal(new Compiler(source, options).compile(), expected);
    }
  });
}

// The source-to-source examples of the Ruby compiler's rewriter specs
// (spec/lib/rewriters/*_spec.rb, extracted to
// spec/lib/fixtures/compiler_rewrites.json): a construct and its rewritten
// form must compile to the same JS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Compiler } from "../../../lib/opal/compiler/index.mjs";

const pairs = JSON.parse(readFileSync(new URL("../fixtures/compiler_rewrites.json", import.meta.url), "utf8"));
const compile = (code) => new Compiler(code, { file: "rewrite.rb", warning() {} }).compile();

for (const { file, from, to } of pairs) {
  test(`${file}: ${from}  =>  ${to}`, () => {
    assert.equal(compile(from), compile(to));
  });
}

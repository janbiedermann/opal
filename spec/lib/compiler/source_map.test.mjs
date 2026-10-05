// Source maps of the compiler and the builder. Ported from
// spec/lib/source_map/file_spec.rb and index_spec.rb.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Compiler } from "../../../lib/opal/compiler/compiler.mjs";
import { Builder } from "../../../lib/opal/compiler/builder/builder.mjs";
import { NullCache } from "../../../lib/opal/compiler/builder/cache.mjs";
import { encode, decode, decodeMappings } from "../../../lib/opal/compiler/source_map/vlq.mjs";

// 0-based line and column of the first occurrence of needle in source.
function positionOf(needle, source) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${needle} not found`);
  const before = source.slice(0, index);
  const line = before.split("\n").length - 1;
  return { line, column: index - (before.lastIndexOf("\n") + 1) };
}

// The original [source, line, column] a generated position maps to, in a
// plain map: the last segment at or before the column on that line.
function lookup(map, { line, column }) {
  const lines = decodeMappings(map.mappings);
  let source = 0, origLine = 0, origColumn = 0;
  let found = null;
  lines.forEach((segments, l) => {
    let generatedColumn = 0;
    for (const segment of segments) {
      generatedColumn += segment[0];
      if (segment.length >= 4) {
        source += segment[1];
        origLine += segment[2];
        origColumn += segment[3];
      }
      if (l === line && generatedColumn <= column && segment.length >= 4) found = [map.sources[source], origLine, origColumn];
    }
  });
  return found;
}

// The same for an index map (sections with offsets).
function lookupIndex(index, position) {
  const sections = index.sections.filter((s) => s.offset.line < position.line || (s.offset.line === position.line && s.offset.column <= position.column));
  const section = sections[sections.length - 1];
  const line = position.line - section.offset.line;
  const column = line === 0 ? position.column - section.offset.column : position.column;
  return lookup(section.map, { line, column });
}

describe("VLQ", () => {
  test("encodes and decodes", () => {
    assert.equal(encode([0]), "A");
    for (const values of [[0], [1, -1, 16, -17], [123456, -654321]]) assert.deepEqual(decode(encode(values)), values);
  });
});

describe("compiled file", () => {
  const compiler = new Compiler("puts 5\n\nputs 6", { file: "foo.rb" });
  const code = compiler.compile();
  const map = compiler.sourceMap.map();

  test("has the file's source and names", () => {
    assert.equal(map.version, 3);
    assert.deepEqual(map.sources, ["foo.rb"]);
    assert.deepEqual(map.sourcesContent, ["puts 5\n\nputs 6"]);
    assert.ok(map.names.includes("puts"));
  });

  test("maps generated code to the original positions", () => {
    assert.deepEqual(lookup(map, positionOf("puts(5)", code)), ["foo.rb", 0, 0]);
    assert.deepEqual(lookup(map, positionOf("5);", code)), ["foo.rb", 0, 5]);
    assert.deepEqual(lookup(map, positionOf("puts(6)", code)), ["foo.rb", 2, 0]);
    assert.deepEqual(lookup(map, positionOf("6);", code)), ["foo.rb", 2, 5]);
  });

  test("ends with a data URI comment", () => {
    const comment = compiler.sourceMap.toDataUriComment();
    assert.deepEqual(JSON.parse(Buffer.from(comment.split("base64,")[1], "base64").toString("utf8")), map);
  });
});

describe("builder index map", () => {
  const builder = new Builder({ cache: new NullCache() });
  builder.buildStr("    jsline1();\n    jsline2();\n    jsline3();", "js_file.js");
  builder.buildStr("  rbline1\n  rbline2\n  rbline3", "rb_file.rb");
  builder.buildStr("\n\n\n    jsline4();\n    jsline5();\n    jsline6();", "js2_file.js");
  builder.buildStr("\n\n\n  rbline4\n  rbline5\n  rbline6", "rb2_file.rb");
  const compiled = builder.toString();
  const index = builder.sourceMap.map();

  test("points to the correct source lines", () => {
    const expect = (needle, file, line, column) => assert.deepEqual(lookupIndex(index, positionOf(needle, compiled)), [file, line, column], needle);
    expect("jsline1(", "js_file.js", 0, 4);
    expect("jsline2(", "js_file.js", 1, 4);
    expect("jsline3(", "js_file.js", 2, 4);
    expect("$rbline1(", "rb_file.rb", 0, 2);
    expect("$rbline2(", "rb_file.rb", 1, 2);
    expect("$rbline3(", "rb_file.rb", 2, 2);
    expect("jsline4(", "js2_file.js", 3, 4);
    expect("jsline5(", "js2_file.js", 4, 4);
    expect("jsline6(", "js2_file.js", 5, 4);
    expect("$rbline4(", "rb2_file.rb", 3, 2);
    expect("$rbline5(", "rb2_file.rb", 4, 2);
    expect("$rbline6(", "rb2_file.rb", 5, 2);
  });
});

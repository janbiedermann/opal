#!/usr/bin/env node
// Compiles Ruby sources with the JS compiler for the Ruby-driven builder
// while the Ruby tooling still exists (POTCH.md, phase 2; used by
// lib/opal/js_compiler_bridge.rb when OPAL_JS_COMPILER=1).
//
// Protocol: one JSON request per line on stdin,
//   {"source": "...", "options": {"file": "...", ...}}
// answered by one JSON line on stdout,
//   {"code", "requires", "required_trees", "autoloads", "source_map", "dynamic_cache_result"}
// or {"error", "line", "file", "source_line"}.
import { createInterface } from "node:readline";
import { Compiler } from "../../lib/opal/compiler/index.mjs";

const out = (obj) => process.stdout.write(JSON.stringify(obj) + "\n");

createInterface({ input: process.stdin }).on("line", (line) => {
  const { source, options } = JSON.parse(line);
  const warnings = [];
  try {
    const compiler = new Compiler(source, { ...options, warning: (text) => warnings.push(text) });
    const code = compiler.compile();
    out({
      code,
      requires: compiler.requires,
      required_trees: compiler.requiredTrees,
      autoloads: compiler.autoloads,
      source_map: compiler.sourceMap.map(),
      dynamic_cache_result: compiler.dynamicCacheResult,
      warnings,
    });
  } catch (error) {
    out({ error: error.message, line: error.line || null, file: error.file || null, source_line: error.sourceLine || null, warnings });
  }
});

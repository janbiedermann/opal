// Builder processors: turn a source file into compiled JS. Port of
// lib/opal/builder/processor.rb. (The .rb.erb and .js.erb processors are
// not ported: they evaluate Ruby at build time, see POTCH.md.)
import { Compiler } from "../compiler.mjs";
import { SourceMapFile } from "../source_map/file.mjs";
import { prepareErb } from "../erb.mjs";
import { rubyInspect } from "../helpers.mjs";
import { extname } from "node:path";
import { link, hasModuleSyntax } from "./esm_linker.mjs";

// A source map from a cached compile result.
class CachedSourceMap {
  constructor(map, generatedCode) {
    this.mapValue = map;
    this.generatedCode = generatedCode;
  }

  map() {
    return this.mapValue;
  }
}

export class Processor {
  // extensions this processor handles, e.g. ["rb", "opal"]
  static extensions = [];

  static match(path) {
    if (typeof path !== "string") return false;
    return this.extensions.some((ext) => path.endsWith(`.${ext}`));
  }

  constructor(source, filename, absPath = null, options = {}) {
    if (!source.endsWith("\n")) source += "\n";
    this.originalSourceValue = source;
    this.sourceValue = source;
    this.filename = filename;
    this.absPath = absPath;
    this.options = { ...options };
    this.cache = this.options.cache;
    delete this.options.cache;
    this.requires = [];
    this.requiredTrees = [];
    this.autoloads = [];
  }

  get originalSource() {
    return this.originalSourceValue;
  }

  get source() {
    return this.sourceValue;
  }

  toString() {
    return this.source;
  }

  markAsRequired(filename) {
    return `Opal.loaded([${rubyInspect(filename)}]);`;
  }
}

export class JsProcessor extends Processor {
  static extensions = ["js", "mjs"];

  constructor(...args) {
    super(...args);
    // An ES module is linked with its imports into a script; its exports
    // end up in Opal.esm["<name without .mjs>"].
    if (this.absPath && this.absPath.endsWith(".mjs") && hasModuleSyntax(this.sourceValue)) {
      const name = this.filename.replace(/^\.\//, "").replace(/\.mjs$/, "");
      this.sourceValue = `(Opal.esm || (Opal.esm = {}))[${JSON.stringify(name)}] = ${link(this.absPath)};\n`;
    }
  }

  get sourceMap() {
    if (!this.sourceMapValue) {
      // one segment per line, at its first non-space character
      const source = this.source;
      const lines = source.split(/(?<=\n)/);
      const fragments = lines.map((code, index) => {
        const column = code.search(/\S/);
        return { code, line: index + 1, column: column === -1 ? null : column, sourceMapName: null, node: null };
      });
      this.sourceMapValue = new SourceMapFile(fragments, this.filename, source);
    }
    return this.sourceMapValue;
  }

  get source() {
    return this.sourceValue + this.markAsRequired(this.filename);
  }
}

export class RubyProcessor extends Processor {
  static extensions = ["rb", "opal"];

  // Also catches files with missing extensions.
  static match(path) {
    return super.match(path) || extname(path == null ? "" : String(path)) === "";
  }

  get compiled() {
    if (!this.compiledValue) {
      const compile = () => {
        const compiler = new Compiler(this.sourceValue, { ...this.options, file: this.filename });
        compiler.compile();
        return this.resultOf(compiler);
      };
      if (this.options.cache_fragments) {
        // post-processing (DCE) needs the compiler's fragments: no cache
        this.compiler = new Compiler(this.sourceValue, { ...this.options, file: this.filename });
        this.compiler.compile();
        this.compiledValue = this.resultOf(this.compiler);
      } else {
        const key = [this.constructor.name, this.filename, this.sourceValue, this.options];
        this.compiledValue = this.cache ? this.cache.fetch(key, compile) : compile();
      }
    }
    return this.compiledValue;
  }

  resultOf(compiler) {
    return {
      code: compiler.compile(),
      requires: compiler.requires,
      requiredTrees: compiler.requiredTrees,
      autoloads: compiler.autoloads,
      sourceMap: compiler.sourceMap.map(),
      dynamicCacheResult: compiler.dynamicCacheResult,
    };
  }

  // Post-processors replacing the compiler's fragments (needs the
  // cache_fragments option).
  replaceFragments(fragments) {
    this.compiler.fragments = fragments;
    this.compiledValue = this.resultOf(this.compiler);
  }

  get source() {
    return this.compiled.code;
  }

  get sourceMap() {
    return new CachedSourceMap(this.compiled.sourceMap, this.compiled.code);
  }

  get requires() {
    return this.compiled.requires;
  }

  set requires(_value) {}

  get requiredTrees() {
    return this.compiled.requiredTrees;
  }

  set requiredTrees(_value) {}

  get autoloads() {
    return this.compiled.autoloads;
  }

  set autoloads(_value) {}
}

// .opalerb: a template compiled to Ruby code, then with Opal.
export class OpalERBProcessor extends RubyProcessor {
  static extensions = ["opalerb"];

  constructor(...args) {
    super(...args);
    this.sourceValue = prepareErb(this.sourceValue, this.filename);
  }

  get requires() {
    return ["erb", ...super.requires];
  }

  set requires(_value) {}
}

// In the order of lib/opal/builder/processor.rb.
export const PROCESSORS = [JsProcessor, RubyProcessor, OpalERBProcessor];

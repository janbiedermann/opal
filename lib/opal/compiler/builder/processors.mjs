// Builder processors: turn a source file into compiled JS. Port of
// lib/opal/builder/processor.rb. (The .rb.erb and .js.erb processors are
// not ported: they evaluate Ruby at build time, see POTCH.md.)
import { Compiler } from "../compiler.mjs";
import { SourceMapFile } from "../source_map/file.mjs";
import { prepareErb, renderErb } from "../erb.mjs";
import { rubyInspect } from "../helpers.mjs";
import { extname } from "node:path";
import { linkModules, assembleLinked, hasModuleSyntax } from "./esm_linker.mjs";
import { OPAL_ROOT } from "../paths.mjs";

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
    // a run(js) function for renderErb, for ERB templates (see builder.mjs)
    this.erbRunner = this.options.erbRunner;
    delete this.options.erbRunner;
    // the ES modules linked so far in this build (see JsProcessor)
    this.esmLinked = this.options.esmLinked;
    delete this.options.esmLinked;
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
      // The modules are kept in Opal.$$esm_registry (ids relative to
      // Opal's root), so a module that an earlier .mjs file of the build
      // has linked (the compiler of opal-parser in opal-builder) is shared,
      // not included again.
      this.esmName = this.filename.replace(/^\.\//, "").replace(/\.mjs$/, "");
      this.esmGraph = linkModules(this.absPath, { root: OPAL_ROOT, registry: "Opal.$$esm_registry", linked: this.esmLinked || null });
      this.assembleEsm();
    }
  }

  // The script of the linked ES modules; with `used` (see usedExports in
  // esm_linker.mjs) the modules only export what is used (Builder's
  // esmPrune).
  assembleEsm(used = null, idSuffix = "") {
    const linked = assembleLinked(this.esmGraph, { used, idSuffix });
    this.sourceValue = `(Opal.esm || (Opal.esm = {}))[${JSON.stringify(this.esmName)}] = ${linked};\n`;
    this.sourceMapValue = null;
  }

  get sourceMap() {
    if (!this.sourceMapValue) this.sourceMapValue = this.lineSourceMap(this.source);
    return this.sourceMapValue;
  }

  // A source map with one segment per line, at its first non-space character.
  lineSourceMap(source) {
    const lines = source.split(/(?<=\n)/);
    const fragments = lines.map((code, index) => {
      const column = code.search(/\S/);
      return { code, line: index + 1, column: column === -1 ? null : column, sourceMapName: null, node: null };
    });
    return new SourceMapFile(fragments, this.filename, source);
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

// Renders a Ruby ERB template at build time with the builder's ERB runner.
function renderTemplate(processor) {
  const run = processor.erbRunner;
  if (!run) throw new Error(`no ERB runner to render ${processor.filename}`);
  return renderErb(processor.sourceValue, { file: processor.absPath || processor.filename, run });
}

// .rb.erb: a Ruby ERB template, rendered at build time, whose result is
// compiled with Opal. Not cached (the template may read files, ENV, ...).
export class RubyERBProcessor extends RubyProcessor {
  static extensions = ["rb.erb"];

  get compiled() {
    if (!this.compiledValue) {
      const result = renderTemplate(this);
      this.sourceValue = result.endsWith("\n") ? result : result + "\n";
      this.originalSourceValue = this.sourceValue;
      const compiler = new Compiler(this.sourceValue, { ...this.options, file: this.filename });
      compiler.compile();
      if (this.options.cache_fragments) this.compiler = compiler;
      this.compiledValue = this.resultOf(compiler);
    }
    return this.compiledValue;
  }
}

// .js.erb (any .erb): a Ruby ERB template, rendered at build time, whose
// result is JavaScript, loaded as the module of the file.
export class ERBProcessor extends Processor {
  static extensions = ["erb"];

  get source() {
    if (this.renderedValue === undefined) {
      const result = renderTemplate(this);
      const moduleName = Compiler.moduleName(this.filename);
      this.renderedValue = `Opal.modules[${rubyInspect(moduleName)}] = function() {${result}};`;
    }
    return this.renderedValue;
  }

  // one segment per line, as for JS files
  get sourceMap() {
    return JsProcessor.prototype.lineSourceMap.call(this, this.source);
  }
}

// In the order of lib/opal/builder/processor.rb.
export const PROCESSORS = [JsProcessor, RubyProcessor, OpalERBProcessor, RubyERBProcessor, ERBProcessor];

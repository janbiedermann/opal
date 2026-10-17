// Builds an Opal program: compiles a file and everything it requires into
// one JS file (or a directory of files). Port of the former Ruby
// lib/opal/builder.rb, builder/directory.rb and the sequential scheduler; it
// runs in Node.js.
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, basename, join, relative, isAbsolute } from "node:path";
import { PathReader } from "./path_reader.mjs";
import { PROCESSORS } from "./processors.mjs";
import { ProjectCollection } from "./project.mjs";
import { FileCache, NullCache } from "./cache.mjs";
import { SourceMapIndex } from "../source_map/index.mjs";
import { DCE } from "./dce.mjs";
import { usedExports } from "./esm_linker.mjs";
import { nodeErbRunner } from "./erb_runner.mjs";
import { opalErbRunner } from "../erb.mjs";
import { Compiler, cleanpath } from "../compiler.mjs";
import { OPAL_ROOT } from "../paths.mjs";
import { VERSION } from "../version.mjs";

export class MissingRequire extends Error {
  constructor(message) {
    super(message);
    this.name = "MissingRequire";
  }
}

export class ProcessorNotFound extends Error {}

// Opal::Config.compiler_options defaults
export const DEFAULT_COMPILER_OPTIONS = {
  method_missing: true,
  arity_check: false,
  freezing: true,
  esm: false,
  directory: false,
  dynamic_require_severity: "warning",
  irb: false,
  inline_operators: true,
  enable_source_location: false,
  enable_file_source_embed: false,
};

function defaultCache() {
  if (process.env.OPAL_CACHE_DISABLE) return new NullCache();
  try {
    return new FileCache();
  } catch {
    return new NullCache();
  }
}

export class Builder {
  static extensions(processors = PROCESSORS) {
    return processors.flatMap((p) => p.extensions);
  }

  constructor({
    stubs = [],
    processors = PROCESSORS,
    paths = null,
    compilerOptions = {},
    missingRequireSeverity = "error",
    cache = null,
    dce = false,
    postProcessors = null,
    erbRunner = null,
    esmPrune = false,
    warn = (msg) => console.warn(msg),
  } = {}) {
    this.stubs = [...stubs];
    this.processors = processors;
    this.compilerOptions = { ...DEFAULT_COMPILER_OPTIONS, ...compilerOptions };
    this.missingRequireSeverity = missingRequireSeverity;
    this.cache = cache || defaultCache();
    this.dce = dce;
    if (dce) {
      this.compilerOptions.cache_fragments = true;
      // The compiler only emits the directives DCE reads when DCE will run.
      this.compilerOptions.dce = dce;
    }
    // Runs .rb.erb/.js.erb templates at build time: in the running Opal
    // when the builder runs inside one (opal-builder), else in a vm context
    // (see renderErb in ../erb.mjs).
    this.erbRunner = erbRunner || (globalThis.Opal && globalThis.Opal.top ? opalErbRunner(globalThis.Opal) : nodeErbRunner(Builder));
    // Functions (processed, builder) => processed run on the processed
    // files before output (lib/opal/builder/post_processor.rb); DCE by
    // default. A post-processor replacing fragments needs the
    // cache_fragments compiler option (see RubyProcessor#replaceFragments).
    this.postProcessors = postProcessors || [(processed, builder) => (builder.dce ? builder.dceProcess(processed) : processed)];
    this.warn = warn;
    // ES modules linked into the build export only what the build's
    // modules use (for standalone bundles, see pruneEsmExports)
    this.esmPrune = esmPrune;
    const extensions = Builder.extensions(processors).flatMap((e) => [`.${e}`, `.js.${e}`]);
    this.pathReader = new PathReader([], extensions);
    this.projects = new ProjectCollection((...p) => this.pathReader.appendPaths(...p), warn);
    // Opal's own project (its Opalfile adds opal/, stdlib/ and lib/), as
    // Opal.paths, unless the paths are given
    if (paths) this.projects.appendPaths(...paths);
    else this.projects.setupProject(OPAL_ROOT);
    this.processed = [];
    this.alreadyProcessed = new Set();
    // ES modules linked into .mjs files of this build (each only once)
    this.esmLinked = new Set();
  }

  build(path, options = {}) {
    return this.buildStr(this.sourceFor(path), path, options);
  }

  // The source for a path, read the same way #build does.
  sourceFor(path) {
    return this.read(path, false);
  }

  buildStr(source, relPath, options = {}) {
    if (source == null) return this;
    const absPath = this.expandPath(relPath);
    if (absPath) this.projects.setupProject(absPath);
    relPath = this.expandExt(relPath);
    const asset = this.processorFor(source, relPath, absPath, false, options);
    const requires = [...asset.requires, ...this.treeRequires(asset, absPath)];
    // Don't automatically load modules required by the module
    this.processRequires(relPath, requires, asset.autoloads, { ...options, load: false });
    this.processed.push(asset);
    return this;
  }

  buildRequire(path, options = {}) {
    this.processRequire(path, [], options);
    return this;
  }

  appendPaths(...paths) {
    this.projects.appendPaths(...paths);
  }

  processRequire(relPath, autoloads, options) {
    if (this.alreadyProcessed.has(relPath)) return;
    this.alreadyProcessed.add(relPath);

    const autoload = autoloads.includes(relPath);
    const source = this.isStub(relPath) ? "" : this.read(relPath, autoload);
    // The handling is delegated to the runtime
    if (source == null) return;

    const absPath = this.expandPath(relPath);
    relPath = this.expandExt(relPath);
    const asset = this.processorFor(source, relPath, absPath, autoload, { ...options, requirable: true });
    this.processRequires(relPath, [...asset.requires, ...this.treeRequires(asset, absPath)], asset.autoloads, options);
    this.processed.push(asset);
  }

  processRequires(relPath, requires, autoloads, options) {
    try {
      for (const r of requires) this.processRequire(r, autoloads, options);
    } catch (error) {
      if (error instanceof MissingRequire && !error.annotated) {
        error.message = `A file required by ${JSON.stringify(relPath)} wasn't found.\n${error.message}`;
        error.annotated = true;
      }
      throw error;
    }
  }

  get postprocessed() {
    if (!this.postprocessedValue) {
      if (this.esmPrune) this.pruneEsmExports(this.processed);
      this.postprocessedValue = this.postProcessors.reduce((processed, fn) => fn(processed, this), this.processed);
    }
    return this.postprocessedValue;
  }

  // The ES modules linked into the build export only the names the
  // build's modules import (so that a minifier can drop the unused code).
  // Their ids in Opal.$$esm_registry get a suffix from what they keep,
  // so other scripts on the page share them only if they keep the same.
  pruneEsmExports(processed) {
    const linked = processed.filter((p) => p.esmGraph);
    if (linked.length === 0) return;
    const used = usedExports(linked.map((p) => p.esmGraph));
    const key = JSON.stringify([...used].sort().map(([id, names]) => [id, names === "*" ? "*" : [...names].sort()]));
    let hash = 0x811c9dc5; // FNV-1a
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
    for (const p of linked) p.assembleEsm(used, `#${hash.toString(16)}`);
  }

  // EXPERIMENTAL dead code elimination; `dce` is a list of types
  // ("method", "const") and needs the cache_fragments compiler option.
  dceProcess(processed) {
    const status = process.stderr.isTTY ? (message, idx, len) => {
      if (message === "finished") return process.stderr.write("\r\x1b[K\r");
      if (idx !== undefined) message = `(${Math.round(1000 * idx / len) / 10}%) ${message}`;
      process.stderr.write(`\r\x1b[K[opal/dce] ${message}\r`);
    } : null;
    return new DCE(processed, this.dce, { status }).call();
  }

  toString() {
    return this.postprocessed.map((p) => p.toString()).join("\n");
  }

  get sourceMap() {
    return new SourceMapIndex(this.postprocessed.map((p) => p.sourceMap), { join: "\n" });
  }

  compiledSource({ withSourceMap = true } = {}) {
    let code = this.toString();
    if (withSourceMap) code += "\n" + this.sourceMap.toDataUriComment();
    return code;
  }

  get isEsm() {
    return !!this.compilerOptions.esm;
  }

  // Output extension, to be used by runners. At least Node.JS switches
  // to ESM mode only if the extension is "mjs"
  get outputExtension() {
    return this.isEsm ? "mjs" : "js";
  }

  // A list of dependent files, for watching purposes
  get dependentFiles() {
    return this.processed.map((p) => p.absPath).filter((f) => f && existsSync(f));
  }

  expandExt(path) {
    const absPath = this.pathReader.expand(path);
    if (absPath) {
      // like Ruby's File.join, which keeps a leading "./"
      const dir = dirname(path);
      return `${dir.endsWith("/") ? dir.slice(0, -1) : dir}/${basename(absPath)}`;
    }
    return path;
  }

  // Files of the trees required by an asset (require_tree), relative to the
  // load path they are in.
  treeRequires(asset, assetPath) {
    const dir = assetPath ? dirname(resolve(assetPath)) : process.cwd();
    const basePaths = this.pathReader.paths.map((p) => resolve(p));
    const extensions = Builder.extensions(this.processors);
    return asset.requiredTrees.flatMap((tree) => {
      const treePath = resolve(dir, tree);
      const basePath = basePaths.find((p) => treePath.startsWith(p));
      if (!basePath) return [];
      const out = [];
      const walk = (d) => {
        let entries;
        try {
          entries = readdirSync(d).sort();
        } catch {
          return;
        }
        for (const entry of entries) {
          const path = join(d, entry);
          if (statSync(path).isDirectory()) walk(path);
          else if (extensions.some((e) => entry.endsWith(`.${e}`))) out.push(relative(basePath, path));
        }
      };
      walk(treePath);
      return out.sort();
    });
  }

  processorFor(source, relPath, absPath, autoload, options) {
    const Processor = this.processors.find((p) => p.match(absPath));
    if (!Processor) {
      if (autoload) return null;
      throw new ProcessorNotFound(`can't find processor for rel_path: ${JSON.stringify(relPath)}, abs_path: ${JSON.stringify(absPath)}`);
    }
    return new Processor(source, relPath, absPath, { ...this.compilerOptions, ...options, cache: this.cache, erbRunner: this.erbRunner, esmLinked: this.esmLinked });
  }

  read(path, autoload) {
    const source = this.pathReader.read(path);
    if (source != null) return source;

    const list = (items) => `- ${items.join("\n- ")}\n`;
    const message = `can't find file: ${JSON.stringify(path)} in:\n` + list(this.pathReader.paths) +
      "\nWith the following projects loaded:\n" + list(this.projects.rootDirs) +
      "\nWith the following extensions:\n" + list(this.pathReader.extensions) +
      "\nAnd the following processors:\n" + list(this.processors.map((p) => p.name));

    if (!autoload) {
      if (this.missingRequireSeverity === "error") throw new MissingRequire(message);
      if (this.missingRequireSeverity === "warning") this.warn("Warning: " + message);
    }
    return null;
  }

  expandPath(path) {
    if (this.isStub(path)) return null;
    const expanded = this.pathReader.expand(path) || resolve(path);
    try {
      return isAbsolute(expanded) ? expanded : resolve(expanded);
    } catch {
      return expanded;
    }
  }

  isStub(path) {
    return this.stubs.includes(path);
  }

  // builder/directory.rb

  get versionPrefix() {
    return `opal/${VERSION.split(".").slice(0, 2).join(".")}`;
  }

  get sourcePrefix() {
    return "opal/src";
  }

  // Writes the program as a directory of files (with the `directory`
  // compiler option, so that imports are generated correctly).
  //
  // With singleFile (a path inside the directory), nothing is written and
  // the content of that file is returned instead (or undefined).
  compileToDirectory(dir = null, { withSourceMap = true, singleFile = null } = {}) {
    if (dir == null && singleFile == null) throw new Error("no directory provided");
    const FOUND = {};
    const write = (file, content) => {
      if (singleFile == null) {
        mkdirSync(dirname(join(dir, file)), { recursive: true });
        writeFileSync(join(dir, file), typeof content === "function" ? content() : content);
      } else if (singleFile === file) {
        FOUND.content = typeof content === "function" ? content() : content;
        throw FOUND;
      }
    };
    try {
      this.writeDirectory(write, withSourceMap);
    } catch (e) {
      if (e === FOUND) return FOUND.content;
      throw e;
    }
    return undefined;
  }

  writeDirectory(write, withSourceMap) {
    const index = [];

    for (const file of this.postprocessed) {
      const moduleName = Compiler.moduleName(file.filename);
      const lastSegmentName = basename(moduleName);
      const depth = moduleName.split("/").length - 1;
      const fileName = cleanpath(file.filename);

      if (file.options.load || !file.options.requirable) index.push(moduleName);

      write(`${this.versionPrefix}/${moduleName}.${this.outputExtension}`, () => {
        let compiled = file.toString();
        if (withSourceMap) compiled += `\n//# sourceMappingURL=./${lastSegmentName}.map`;
        return compiled;
      });

      if (withSourceMap) {
        write(`${this.versionPrefix}/${moduleName}.map`, () => {
          // Correct the map to point to source files and remove embedded source
          const map = { ...file.sourceMap.map() };
          map.sourceRoot = `./${"../".repeat(depth)}../../${this.sourcePrefix}`;
          map.sources = [fileName];
          delete map.sourcesContent;
          return JSON.stringify(map);
        });
        write(`${this.sourcePrefix}/${fileName}`, () => file.originalSource);
      }
    }

    const entries = index.map((i) => `./${this.versionPrefix}/${i}.${this.outputExtension}`);
    if (!this.isEsm) {
      write("index.js", entries.map((i) => `require(${JSON.stringify(i)});`).join("\n") + "\n");
    } else {
      write("index.mjs", entries.map((i) => `import ${JSON.stringify(i)};`).join("\n") + "\n");
      write("index.html", `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Opal application</title>
</head>
<body>
  ${entries.map((i) => `<script type='module' src='${i}'></script>`).join("\n  ")}
</body>
</html>
`);
    }
  }
}


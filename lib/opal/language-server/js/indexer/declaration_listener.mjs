// The indexer's AST listener: the one-pass walker that turns a document's
// tree into index records (port of ../../indexer/declaration_listener.rb).
// Same node events as ruby-lsp's declaration_listener, over this project's
// POJO nodes; records are plain string-keyed objects - live and baked share
// one shape now (LSP.md §13), so nothing branches on storage. Constant
// resolution is nesting-aware for declarations (`class Foo; class Bar`
// records "Foo::Bar") and deliberately simple for references (raw names -
// the references request matches on them).
import { walk } from "../node.mjs";

export class DeclarationListener {
  // file: the record's file key (a document uri for live documents, a
  // checkout-relative path for the bake).
  // Prototype-free objects: corelib calls methods named "constructor" (and
  // friends), and an inherited Object.prototype key would masquerade as a
  // record list (or shadow one). Reads use Object.hasOwn where they might
  // test membership; plain `?? []` guards cover the rest.
  constructor(file, parseResult) {
    this.file = file;
    this.parseResult = parseResult;
    this.modules = Object.create(null);   // fqcn => [module record]
    this.constants = Object.create(null); // CONST => [location] (non-module constant writes)
    this.constantReferences = Object.create(null); // NAME => [location]
    this.methodReferences = Object.create(null);   // name => [location]; live only - the bake
                                   // skips it (corelib call sites would triple
                                   // the payload for a scope the references
                                   // request does not cover)
    this.nesting = [];
    this._commentsByEndLine = null;
    this._sourceLines = null;
  }

  index() {
    walk(this.parseResult.ast, (node) => this.enter(node), (node) => this.leave(node));
    return this;
  }

  // ---- declarations ----

  enter(node) {
    switch (node.type) {
      case "ClassNode":
        this.declareModule(node.name ?? constPathName(node.constant_path), node, this.superclassOf(node), "class");
        break;
      case "ModuleNode":
        this.declareModule(constPathName(node.constant_path), node, null, "module");
        break;
      case "ConstantWriteNode":
        this.addEntry(this.constants, node.name, this.parseResult.rangeForNode(node));
        break;
      case "ConstantReadNode":
        this.addEntry(this.constantReferences, node.name, this.parseResult.rangeForNode(node));
        break;
      case "ConstantPathNode": {
        const name = node.name;
        if (name != null) {
          this.addEntry(this.constantReferences, name,
            this.parseResult.rangeForLoc(node.name_loc) ?? this.parseResult.rangeForNode(node));
        }
        break;
      }
      case "CallNode":
        this.onCallNode(node);
        break;
      case "DefNode":
        this.onDefNode(node);
        break;
      default:
    }
  }

  leave(node) {
    if (node.type === "ClassNode" || node.type === "ModuleNode") this.nesting.pop();
  }

  // ---- module body calls: includes and attribute methods ----

  onCallNode(node) {
    this.addEntry(this.methodReferences, node.name,
      this.parseResult.rangeForLoc(node.message_loc) ?? this.parseResult.rangeForNode(node));
    if (this.nesting.length === 0) return;
    if (node.receiver != null) return; // qualified calls never manage a module
    switch (node.name) {
      case "include":
      case "extend":
      case "prepend": {
        const args = node.arguments;
        if (args == null) return;
        const names = argumentNames(args);
        const target = this.currentModule();
        // Buckets on the module record: the bake payload has no
        // "constructor"-named module/class, so plain literals are safe
        // there; the name->key map is the only prototype hazard.
        const key = { include: "includes", extend: "extends", prepend: "prepends" }[node.name];
        for (const name of names) (target[key] ??= []).push(name);
        break;
      }
      case "attr_accessor":
      case "attr_reader":
      case "attr_writer":
        this.addAttributeMethods(node);
        break;
      default:
    }
  }

  // ---- methods ----

  onDefNode(node) {
    if (this.nesting.length === 0) return;
    const singleton = node.receiver != null;
    const record = this.currentModule();
    // null-prototype buckets: a `def constructor` (or toString) would
    // otherwise meet Object.prototype through `??=` on a plain literal.
    const bucket = singleton
      ? (record.singleton_methods ??= Object.create(null))
      : (record.methods ??= Object.create(null));
    (bucket[node.name] ??= []).push({
      file: this.file,
      range: this.parseResult.rangeForLoc(node.name_loc) ?? this.parseResult.rangeForNode(node),
      full_range: this.parseResult.rangeForNode(node),
      comments: this.commentsAbove(node),
      parameters: this.parametersOf(node),
      module: record.name,
    });
  }

  declareModule(rawName, node, superclass, kind) {
    if (rawName == null) return;
    const fqcn = this.qualify(rawName);
    const path = node.constant_path;
    const record = {
      name: fqcn,
      kind,
      file: this.file,
      range: this.parseResult.rangeForNode(node),
      // the name segment alone: definition/rename edits target it,
      // not the whole class body
      name_range: path ? this.parseResult.rangeForNode(path) : this.parseResult.rangeForNode(node),
      comments: this.commentsAbove(node),
      superclass,
      includes: [],
      prepends: [],
      extends: [],
      // null-prototype method tables (see onDefNode): prototype key names
      // like "constructor" are ordinary Ruby methods in the ported gems.
      methods: Object.create(null),
      singleton_methods: Object.create(null),
    };
    (this.modules[fqcn] ??= []).push(record);
    this.nesting.push(fqcn);
  }

  currentModule() {
    return this.modules[this.nesting[this.nesting.length - 1]].at(-1);
  }

  // "Bar" under nesting ["Foo"] => "Foo::Bar"; absolute names pass
  // through, and the common top-level case is just the name.
  qualify(name) {
    if (name.startsWith("::")) return name.replace(/^::/, "");
    if (this.nesting.length === 0) return name;
    return `${this.nesting[this.nesting.length - 1]}::${name}`;
  }

  superclassOf(node) {
    const sup = node.superclass;
    if (sup == null) return null;
    const name = sup.name;
    if (name == null) return null; // a non-constant superclass (Struct.new(...)...)
    return this.qualify(name);
  }

  addAttributeMethods(node) {
    const record = this.currentModule();
    const args = node.arguments;
    if (args == null) return;
    const names = argumentUnescaped(args);
    switch (node.name) {
      case "attr_reader":
        for (const n of names) addGeneratedMethod(record, n, node, this);
        break;
      case "attr_writer":
        for (const n of names) addGeneratedMethod(record, `${n}=`, node, this);
        break;
      case "attr_accessor":
        for (const n of names) {
          addGeneratedMethod(record, n, node, this);
          addGeneratedMethod(record, `${n}=`, node, this);
        }
        break;
      default:
    }
  }

  addEntry(map, name, range) {
    if (name == null) return;
    (map[name] ??= []).push({ file: this.file, range });
  }

  // RDoc-style doc: the run of comments ending just above the node's
  // line, joined back into one string (the baked records carry these,
  // so hover never re-parses corelib comments at run time).
  commentsAbove(node) {
    if (!this._commentsByEndLine) this.buildCommentIndex();
    let [line] = this.parseResult.positionAt(node.location.start);
    const found = [];
    for (;;) {
      const comment = this._commentsByEndLine.get(line - 1);
      if (comment === undefined) break;
      found.unshift(comment.text);
      line = comment.line;
    }
    return found.length === 0 ? null : found.join("\n");
  }

  buildCommentIndex() {
    this._commentsByEndLine = new Map();
    const textOf = this.sourceLines();
    for (const comment of this.parseResult.comments) {
      const [sLine] = this.parseResult.positionAt(comment.start);
      const [eLine] = this.parseResult.positionAt(comment.end);
      const lines = [];
      for (let l = sLine; l <= eLine; l++) lines.push((textOf[l] ?? "").trimEnd());
      this._commentsByEndLine.set(eLine, { line: sLine, text: lines.join("\n") });
    }
  }

  sourceLines() {
    this._sourceLines ??= this.parseResult.source.split("\n");
    return this._sourceLines;
  }

  // "(a, b = 1, *rest, key:, **opts, &blk)" - enough for signature help
  // and hover; the details matter less than presence.
  parametersOf(node) {
    const params = node.parameters;
    if (params == null) return "()";
    const parts = [];
    parts.push(...namesOf(params.requireds));
    for (const p of params.optionals ?? []) parts.push(`${p.name} = …`);
    if (params.rest != null) parts.push(`*${params.rest.name ?? ""}`);
    parts.push(...namesOf(params.posts));
    for (const k of params.keywords ?? []) parts.push(`${k.name}:`);
    if (params.keyword_rest != null) parts.push(`**${params.keyword_rest.name ?? ""}`);
    if (params.block != null) parts.push(`&${params.block.name ?? "block"}`);
    return `(${parts.join(", ")})`;
  }
}

function constPathName(path) {
  return path == null ? null : path.name ?? null;
}

function namesOf(list) {
  return (list ?? []).map((n) => n.name).filter((n) => n != null);
}

function argumentNames(args) {
  return (args.arguments ?? []).map((a) => a.name).filter((n) => n != null);
}

function argumentUnescaped(args) {
  return (args.arguments ?? []).map((a) => a.unescaped).filter((n) => n != null);
}

function addGeneratedMethod(record, name, node, listener) {
  const range = listener.parseResult.rangeForNode(node);
  (record.methods[name] ??= []).push({
    file: listener.file,
    range,
    full_range: range,
    comments: null,
    parameters: "(*)",
    module: record.name,
    generated: true,
  });
}

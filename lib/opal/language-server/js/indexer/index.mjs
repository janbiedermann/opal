// The Index: the queryable view over the two record stores - the baked
// corelib/stdlib payload (immutable JS POJO graph from
// lib/opal/language-server/baked_index.mjs, grabbed at startup, §5) and the
// live per-file records of workspace/open documents (DeclarationListener).
// Port of ../../indexer/index.rb; the Record accessor layer that bridged
// Ruby Hashes to POJOs is gone - both stores answer the same plain shape
// (LSP.md §13). Method resolution walks Opal's ancestor linearization
// (prepends, includes, the implicit Object<:BasicObject / Object.include
// Kernel that the runtime gives every core class).
import { ParseResult } from "../parse_result.mjs";
import { DeclarationListener } from "./declaration_listener.mjs";

export class Index {
  constructor(baked = null) {
    this.baked = baked;
    this.bakedModules = baked ? baked.modules : null;
    this.bakedConstants = baked ? baked.constants : null;
    this.bakedReferences = baked ? baked.constant_references : null;
    // uri => DeclarationListener; re-indexing replaces the entry whole,
    // so stale records never survive a didChange.
    this.files = new Map();
  }

  indexDocument(document) {
    this.files.set(document.uri, new DeclarationListener(document.uri, document.parse()).index());
  }

  // Index raw source under a file key (a uri for workspace files, a
  // checkout-relative path when re-indexing a stale baked file).
  indexSource(file, source) {
    this.files.set(file, new DeclarationListener(file, new ParseResult(source)).index());
  }

  removeDocument(uri) {
    this.files.delete(uri);
  }

  indexed(uri) {
    return this.files.has(uri);
  }

  // ---- modules ----

  moduleRecords(name) {
    const records = [];
    for (const listener of this.files.values()) {
      for (const raw of listener.modules[name] ?? []) records.push(raw);
    }
    if (!this.bakedAbsent(this.bakedModules)) {
      for (const raw of this.bakedModules[name] ?? []) records.push(raw);
    }
    return records;
  }

  moduleNames() {
    const names = [];
    for (const listener of this.files.values()) names.push(...Object.keys(listener.modules));
    if (!this.bakedAbsent(this.bakedModules)) names.push(...Object.keys(this.bakedModules));
    return [...new Set(names)];
  }

  module(name) {
    for (const listener of this.files.values()) {
      if (Object.hasOwn(listener.modules, name)) return true;
    }
    if (this.bakedAbsent(this.bakedModules)) return false;
    return this.bakedModules[name] != null;
  }

  // Ruby's lookup order, specialized to Opal's runtime core:
  // [prepends reversed, self, includes reversed, superclass chain];
  // Object gains Kernel implicitly and BasicObject is its parent (the
  // corelib files themselves say `class Object` bare - the runtime adds
  // this, so the index must know it).
  linearize(fqcn, seen = []) {
    if (seen.includes(fqcn)) return [];
    seen.push(fqcn);

    const records = this.moduleRecords(fqcn);
    const prepends = [];
    const includes = [];
    let superclass = null;
    for (const record of records) {
      prepends.push(...(record.prepends ?? []));
      includes.push(...(record.includes ?? []));
      superclass ??= record.superclass ?? null;
    }

    if (fqcn === "Object") {
      if (!includes.includes("Kernel")) includes.push("Kernel");
      superclass ??= "BasicObject";
    } else if (superclass == null && fqcn !== "BasicObject") {
      superclass = "Object";
    }

    const order = [...prepends.reverse(), fqcn, ...includes.reverse()];
    if (superclass != null) order.push(...this.linearize(superclass, seen));
    return [...new Set(order)];
  }

  // First definition found in linearization order; live records win
  // (an edited workspace copy of a corelib file shadows the bake).
  resolveMethod(name, fqcn, singleton = false) {
    for (const mod of this.linearize(fqcn)) {
      const records = this.moduleRecords(mod);
      if (records.length === 0) continue;
      for (const record of records) {
        const defs = methodDefinitions(record, name, singleton);
        if (defs.length > 0) return defs[0];
      }
    }
    return null;
  }

  // All method names defined across the linearization (completion and
  // the API gate's "is this name known" check, §2 gate 3).
  visibleMethodNames(fqcn, singleton = false) {
    const names = [];
    for (const mod of this.linearize(fqcn)) {
      for (const record of this.moduleRecords(mod)) {
        names.push(...Object.keys(record[singleton ? "singleton_methods" : "methods"] ?? {}));
      }
    }
    return [...new Set(names)];
  }

  // ---- constants and references ----

  constantDefinitions(name) {
    const found = [];
    for (const listener of this.files.values()) {
      for (const raw of listener.constants[name] ?? []) found.push(raw);
    }
    if (!this.bakedAbsent(this.bakedConstants)) {
      for (const raw of this.bakedConstants[name] ?? []) found.push(raw);
    }
    return found;
  }

  // Resolve a NavigationTarget constant to its definition records,
  // nesting-aware: classes/modules win over same-named constants, and
  // inner scopes win over outer ones (Ruby's lookup).
  resolveConstant(target) {
    const name = target.name;
    const base = target.base_name ?? name;
    let candidates = [];
    for (const outer of (target.nesting ?? []).slice().reverse()) {
      candidates.push(`${outer}::${name}`);
      if (base !== name) candidates.push(`${outer}::${base}`);
    }
    candidates.push(name);
    candidates.push(base);
    candidates = [...new Set(candidates)];

    for (const cand of candidates) {
      const records = this.moduleRecords(cand);
      if (records.length > 0) return records;
    }
    for (const cand of candidates) {
      const consts = this.constantDefinitions(cand);
      if (consts.length > 0) return consts;
    }
    return [];
  }

  // Definitions of a bare method name across every indexed module
  // (instances and singletons) - the references/rename sweep.
  methodDefinitionsAll(name) {
    const out = [];
    for (const mod of this.moduleNames()) {
      for (const record of this.moduleRecords(mod)) {
        out.push(...methodDefinitions(record, name, false));
        out.push(...methodDefinitions(record, name, true));
      }
    }
    return out;
  }

  // Live method-reference records (the bake skips these).
  liveMethodReferences(name) {
    const found = [];
    for (const listener of this.files.values()) {
      for (const raw of listener.methodReferences[name] ?? []) found.push(raw);
    }
    return found;
  }

  constantReferences(name) {
    const found = [];
    for (const listener of this.files.values()) {
      for (const raw of listener.constantReferences[name] ?? []) found.push(raw);
    }
    if (!this.bakedAbsent(this.bakedReferences)) {
      for (const raw of this.bakedReferences[name] ?? []) found.push(raw);
    }
    return found;
  }

  // ---- name search (workspaceSymbol) ----

  // Names a bare word can complete to at top level: unqualified
  // module/class names plus non-module constant writes (live + baked).
  topLevelConstantNames() {
    const names = [];
    for (const listener of this.files.values()) {
      for (const n of Object.keys(listener.modules)) if (!n.includes("::")) names.push(n);
      names.push(...Object.keys(listener.constants));
    }
    if (!this.bakedAbsent(this.bakedModules)) {
      for (const n of Object.keys(this.bakedModules)) if (!n.includes("::")) names.push(n);
    }
    if (!this.bakedAbsent(this.bakedConstants)) {
      names.push(...Object.keys(this.bakedConstants));
    }
    return [...new Set(names)];
  }

  // Direct children (last segment) of a scope: `String::` completes
  // names whose qualified form starts with "String::".
  constantNamesUnder(scope) {
    const prefix = `${scope}::`;
    return this.moduleNames().filter(
      (n) => n.startsWith(prefix) && !n.slice(prefix.length).includes("::"),
    );
  }

  search(query, limit = 100) {
    const needle = query.toLowerCase();
    const hits = [];
    for (const name of this.moduleNames()) {
      if (name.toLowerCase().includes(needle)) hits.push([name, "module"]);
    }
    // method names across both stores, deduplicated
    const seenMethods = new Map();
    this.eachMethodName((name, moduleName) => {
      if (seenMethods.has(name)) return;
      if (!name.toLowerCase().includes(needle)) return;
      seenMethods.set(name, moduleName);
      hits.push([name, "method", moduleName]);
    });
    return hits.slice(0, limit);
  }

  // The baked stores are POJOs that may be absent entirely (a server
  // without the bake payload answers live records only).
  bakedAbsent(store) {
    return store == null;
  }

  eachMethodName(fn) {
    for (const listener of this.files.values()) {
      for (const records of Object.values(listener.modules)) {
        for (const raw of records) {
          for (const m of Object.keys(raw.methods ?? {})) fn(m, raw.name);
        }
      }
    }
    if (!this.bakedAbsent(this.bakedModules)) {
      for (const mod of Object.keys(this.bakedModules)) {
        for (const record of this.bakedModules[mod] ?? []) {
          for (const m of Object.keys(record.methods ?? {})) fn(m, mod);
        }
      }
    }
  }
}

// {method_name => [record, ...]} bucket lookup: one list per name,
// multiple definitions (corelib reopens classes across files) all listed.
function methodDefinitions(record, name, singleton) {
  return (record[singleton ? "singleton_methods" : "methods"] ?? {})[name] ?? [];
}

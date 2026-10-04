// Array and hash literals. Port of lib/opal/nodes/array.rb and
// lib/opal/nodes/hash.rb.
import { Base } from "./base.mjs";
import { rubyInspect } from "../helpers.mjs";

export class ArrayNode extends Base {
  static {
    this.handle("ArrayNode");
  }

  compile() {
    const children = this.node.elements;
    if (children.length === 0) return this.push("[]");

    let code = [];
    let work = [];

    for (const child of children) {
      const splat = child.type === "SplatNode";
      const part = this.expr(child);

      if (splat) {
        if (work.length === 0) {
          if (code.length === 0) {
            code.push(this.fragment("[].concat("), part, this.fragment(")"));
          } else {
            code.push(this.fragment(".concat("), part, this.fragment(")"));
          }
        } else {
          if (code.length === 0) {
            code.push(this.fragment("["), work, this.fragment("]"));
          } else {
            code.push(this.fragment(".concat(["), work, this.fragment("])"));
          }
          code.push(this.fragment(".concat("), part, this.fragment(")"));
        }
        work = [];
      } else {
        if (work.length > 0) work.push(this.fragment(", "));
        work.push(part);
      }
    }

    if (work.length > 0) {
      const join = [this.fragment("["), work, this.fragment("]")];
      if (code.length === 0) {
        code = join;
      } else {
        code.push([this.fragment(".concat("), join, this.fragment(")")]);
      }
    }

    this.push(code);
  }
}

const SIMPLE_KEY_TYPES = new Set(["SymbolNode", "StringNode", "IntegerNode"]);

// Hash literals and keyword arguments (KeywordHashNode). Elements are
// AssocNode (key => value) and AssocSplatNode (**hash).
export class HashNode extends Base {
  static {
    this.handle("HashNode", "KeywordHashNode", "OpalHash");
  }

  get elements() {
    return this.node.elements;
  }

  compile() {
    if (this.elements.some((e) => e.type === "AssocSplatNode")) {
      this.compileMerge();
    } else {
      this.compileHash();
    }
  }

  // Compiles hashes containing kwsplats inside.
  // hash like { **{ nested: 1 }, a: 1, **{ nested: 2} }
  // should be compiled to
  // { nested: 1}.merge(a: 1).merge(nested: 2)
  // Each kwsplat overrides previosly defined keys
  // Hash k/v pairs override previously defined kwsplat values
  compileMerge() {
    const result = [];
    let seq = [];

    for (const child of this.elements) {
      if (child.type === "AssocSplatNode") {
        if (seq.length > 0) result.push(this.expr(this.s("OpalHash", { elements: seq })));
        result.push(this.expr(child));
        seq = [];
      } else {
        seq.push(child);
      }
    }
    if (seq.length > 0) result.push(this.expr(this.s("OpalHash", { elements: seq })));

    result.forEach((fragment, idx) => {
      if (idx === 0) this.push(fragment);
      else this.push(".$merge(", fragment, ")");
    });
  }

  // Compiles a hash without kwsplats
  // with simple or complex keys.
  compileHash() {
    const elements = this.elements;
    elements.forEach((pair, idx) => {
      const { key, value } = pair;
      if (idx !== 0) this.push(", ");
      if (key.type === "SymbolNode" || key.type === "StringNode") {
        this.push(rubyInspect(key.unescaped), ", ", this.expr(value));
      } else {
        this.push(this.expr(key), ", ", this.expr(value));
      }
    });

    if (elements.length === 0) {
      this.push("(new Map())");
    } else if (elements.every((pair) => SIMPLE_KEY_TYPES.has(pair.key.type))) {
      this.helper("hash_new");
      this.wrap("$hash_new(", ")");
    } else {
      this.helper("hash_new2");
      this.wrap("$hash_new2(", ")");
    }
  }
}

// **hash
export class KwSplatNode extends Base {
  static {
    this.handle("AssocSplatNode");
  }

  compile() {
    const value = this.node.value || this.s("OpalLvar", { name: "$fwd_kwrest" });
    this.helper("to_hash");
    this.push("$to_hash(", this.expr(value), ")");
  }
}

// The value of a shorthand hash pair, e.g. `x` in `{x:}`.
export class ImplicitNode extends Base {
  static {
    this.handle("ImplicitNode");
  }

  compileToFragments() {
    return this.process(this.node.value, this.level);
  }
}

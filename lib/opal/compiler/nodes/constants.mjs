// Constants. Port of lib/opal/nodes/constants.rb.
//
// In Prism a bare constant is a ConstantReadNode, `A::B` a ConstantPathNode
// with a parent and `::B` a ConstantPathNode without one (s(:cbase)).
import { Base } from "./base.mjs";

const OPTIMIZED_ACCESS_CONSTS = new Set(["BasicObject", "Object", "Module", "Class", "Kernel", "NilClass"]);

export class ConstNode extends Base {
  static {
    this.handle("ConstantReadNode", "ConstantPathNode");
  }

  get name() {
    return this.node.name;
  }

  // null for a bare constant, "cbase" for ::Const, or the parent node.
  get constScope() {
    if (this.type === "ConstantReadNode") return null;
    return this.node.parent || "cbase";
  }

  compile() {
    const { name, constScope } = this;
    this.push(this.dceUse(name, { type: "const" }));

    if (this.isMagicalDataConst()) {
      this.push("$__END__");
    } else if (constScope === "cbase" && OPTIMIZED_ACCESS_CONSTS.has(name)) {
      // For a certain case of calls like `::Opal.coerce_to?` we can
      // optimize the calls. We can be sure they are defined from the
      // beginning.
      this.helper(name);
      this.push(`$${name}`);
    } else if (constScope === "cbase" && name === "Opal") {
      this.push("Opal");
    } else if (constScope === "cbase") {
      this.push(`${this.topScope.absoluteConst()}('${name}')`);
    } else if (constScope) {
      this.push(`${this.topScope.absoluteConst()}(`, this.recv(constScope), `, '${name}')`);
    } else {
      this.push(`${this.scope.relativeAccess()}('${name}')`);
    }
  }

  // Ruby has a magical const DATA
  // that should be processed in a different way:
  // 1. When current file contains __END__ in the end of the file
  //    DATA const should be resolved to the string located after __END__
  // 2. When current file doesn't have __END__ section
  //    DATA const should be resolved to a regular ::DATA constant
  isMagicalDataConst() {
    return this.constScope === null && this.name === "DATA" && this.compiler.eofContent != null;
  }
}

export class ConstAssignNode extends Base {
  static {
    this.handle("ConstantWriteNode", "ConstantPathWriteNode");
  }

  compile() {
    const node = this.node;
    let name;
    let base = null;
    if (this.type === "ConstantWriteNode") {
      name = node.name;
    } else {
      name = node.target.name;
      base = node.target.parent || this.cbaseFragment(node.target);
    }
    const value = node.value;
    const chained = value.type === "ConstantWriteNode" || value.type === "ConstantPathWriteNode";

    this.helper("const_set");

    // Constant definitions like: Separator = SEPARATOR = "/"
    // can be unwittingly removed.
    if (!chained) this.push(this.dceDefBegin(name, { type: "const" }));
    if (base) {
      this.push("$const_set(", base.type ? this.expr(base) : base, `, '${name}', `, this.expr(value), ")");
    } else {
      this.push(`$const_set(${this.scope.getNesting()}[0], '${name}', `, this.expr(value), ")");
    }
    if (!chained) this.push(this.dceDefEnd(name, { type: "const" }));
  }
}

// A constant write under a `# shareable_constant_value:` magic comment
export class ShareableConstantNode extends Base {
  static {
    this.handle("ShareableConstantNode");
  }

  compileToFragments() {
    return this.process(this.node.write, this.level);
  }
}

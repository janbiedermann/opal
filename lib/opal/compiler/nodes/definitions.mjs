// undef and alias. Port of UndefNode and AliasNode from
// lib/opal/nodes/definitions.rb.
import { Base } from "./base.mjs";
import { rubyInspect } from "../helpers.mjs";

export class UndefNode extends Base {
  static {
    this.handle("UndefNode");
  }

  compile() {
    this.helper("udef");

    for (const child of this.node.names) {
      const sym = child.type === "SymbolNode";
      if (sym) this.push(this.dceDefBegin(child.unescaped));
      this.line(`$udef(${this.scope.getSelf()}, '$' + `, this.expr(child), ");");
      if (sym) this.push(this.dceDefEnd(child.unescaped));
    }
  }
}

// alias a b
export class AliasMethodNode extends Base {
  static {
    this.handle("AliasMethodNode");
  }

  compile() {
    const { new_name: newName, old_name: oldName } = this.node;
    this.helper("alias");
    if (oldName.type === "SymbolNode") {
      this.compiler.recordMethodCall(oldName.unescaped);
      if (newName.type === "SymbolNode") this.push(this.dceDefBegin(newName.unescaped));
      this.push(this.dceUse(oldName.unescaped));
    }
    this.push(`$alias(${this.scope.getSelf()}, `, this.expr(newName), ", ", this.expr(oldName), ")");
    if (oldName.type === "SymbolNode" && newName.type === "SymbolNode") {
      this.push(this.dceDefEnd(newName.unescaped));
    }
  }
}

// alias $a $b
export class AliasGlobalVariableNode extends Base {
  static {
    this.handle("AliasGlobalVariableNode");
  }

  compile() {
    const name = (node) => {
      if (node.type === "NumberedReferenceReadNode") return String(node.number);
      return node.name.slice(1);
    };
    this.helper("alias_gvar");
    this.push("$alias_gvar(", rubyInspect(name(this.node.new_name)), ", ", rubyInspect(name(this.node.old_name)), ")");
  }
}

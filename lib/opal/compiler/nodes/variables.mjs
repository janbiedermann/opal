// Variables. Port of the former Ruby lib/opal/nodes/variables.rb.
//
// Local and instance variable names that clash with JS get a trailing `$`
// (the JsReservedWords rewriter in the Ruby compiler).
import { Base } from "./base.mjs";
import { fixVarName, fixIvarName } from "../helpers.mjs";

export class LocalVariableNode extends Base {
  static {
    this.handle("LocalVariableReadNode", "ItLocalVariableReadNode", "OpalLvar");
  }

  usingIrb() {
    return this.compiler.isIrb && this.scope.isTop();
  }

  get varName() {
    // compiler-internal temps ($ret_or_1, $mlhs_tmp1, ...) are used as is
    if (this.type === "OpalLvar") return this.node.name;
    // `it`, the implicit block parameter (Ruby 3.4)
    if (this.type === "ItLocalVariableReadNode") return "it";
    return fixVarName(this.node.name);
  }

  compile() {
    if (!this.usingIrb()) return this.push(this.varName);

    this.withTemp((tmp) => {
      this.push(this.property(this.varName));
      this.wrap(`((${tmp} = Opal.irb_vars`, `) == null ? nil : ${tmp})`);
    });
  }
}

export class LocalAssignNode extends Base {
  static {
    this.handle("LocalVariableWriteNode", "OpalLvasgn");
  }

  usingIrb() {
    return this.compiler.isIrb && this.scope.isTop();
  }

  get varName() {
    return this.type === "OpalLvasgn" ? this.node.name : fixVarName(this.node.name);
  }

  compile() {
    const value = this.node.value;
    if (this.usingIrb()) {
      this.push(`Opal.irb_vars${this.property(this.varName)} = `);
    } else {
      this.addLocal(this.varName);
      this.push(`${this.varName} = `);
    }

    this.push(this.expr(value));

    if ((this.isRecv() || this.isExpr()) && value) this.wrap("(", ")");
  }
}

// Declares a local without assigning it (s(:lvdeclare) in the Ruby compiler).
export class LocalDeclareNode extends Base {
  static {
    this.handle("OpalLvdeclare");
  }

  compile() {
    this.addLocal(this.node.name);
  }
}

export class InstanceVariableNode extends Base {
  static {
    this.handle("InstanceVariableReadNode");
  }

  compile() {
    const name = this.property(fixIvarName(this.node.name).slice(1));
    this.addIvar(name);
    this.push(`${this.scope.getSelf()}${name}`);
  }
}

export class InstanceAssignNode extends Base {
  static {
    this.handle("InstanceVariableWriteNode");
  }

  compile() {
    const value = this.node.value;
    const name = this.property(fixIvarName(this.node.name).slice(1));
    this.push(`${this.scope.getSelf()}${name} = `);
    this.push(this.expr(value));

    if ((this.isRecv() || this.isExpr()) && value) this.wrap("(", ")");
  }
}

export class GlobalVariableNode extends Base {
  static {
    this.handle("GlobalVariableReadNode");
  }

  get varName() {
    return this.node.name.slice(1);
  }

  compile() {
    this.helper("gvars");

    const name = this.property(this.varName);
    this.addGvar(name);
    this.push(`$gvars${name}`);
  }
}

// back_ref can be:
// $`
// $'
// $&
// $+
export class BackRefNode extends GlobalVariableNode {
  static {
    this.handle("BackReferenceReadNode");
  }

  compile() {
    this.helper("gvars");

    switch (this.varName) {
      case "&":
        this.withTemp((tmp) => this.push(`((${tmp} = $gvars['~']) === nil ? nil : ${tmp}['$[]'](0))`));
        break;
      case "'":
        this.withTemp((tmp) => this.push(`((${tmp} = $gvars['~']) === nil ? nil : ${tmp}.$post_match())`));
        break;
      case "`":
        this.withTemp((tmp) => this.push(`((${tmp} = $gvars['~']) === nil ? nil : ${tmp}.$pre_match())`));
        break;
      case "+":
        this.helper("last_match_ref");
        this.withTemp((tmp) => this.push(`((${tmp} = $gvars['~']) === nil ? nil : $last_match_ref(${tmp}))`));
        break;
      default:
        throw new Error(`unsupported back reference ${this.node.name}`);
    }
  }
}

export class GlobalAssignNode extends Base {
  static {
    this.handle("GlobalVariableWriteNode");
  }

  compile() {
    const value = this.node.value;
    this.helper("gvars");
    const name = this.property(this.node.name.slice(1));
    this.push(`$gvars${name} = `);
    this.push(this.expr(value));

    if ((this.isRecv() || this.isExpr()) && value) this.wrap("(", ")");
  }
}

// $1
export class NthrefNode extends Base {
  static {
    this.handle("NumberedReferenceReadNode");
  }

  compile() {
    this.helper("gvars");

    this.withTemp((tmp) => {
      this.push(`((${tmp} = $gvars['~']) === nil ? nil : ${tmp}['$[]'](${this.node.number}))`);
    });
  }
}

export class ClassVariableNode extends Base {
  static {
    this.handle("ClassVariableReadNode");
  }

  compile() {
    this.helper("class_variable_get");

    // We should be tolerant of expressions like: def x; @@notexist; 0; end
    // (NB: Shouldn't we actually optimize them out?)
    const tolerant = this.isStmt();

    this.push(`$class_variable_get(${this.classVariableOwner()}, '${this.node.name}', ${tolerant})`);
  }
}

export class ClassVarAssignNode extends Base {
  static {
    this.handle("ClassVariableWriteNode");
  }

  compile() {
    this.helper("class_variable_set");

    this.push(`$class_variable_set(${this.classVariableOwner()}, '${this.node.name}', `, this.expr(this.node.value), ")");
  }
}

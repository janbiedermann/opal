// Classes, modules and singleton classes. Port of lib/opal/nodes/module.rb,
// class.rb and singleton_class.rb.
import { ScopeNode } from "./scope.mjs";
import { MODULE, JS_FUNCTION } from "../closure.mjs";
import { bodyOf } from "../transforms/walk.mjs";

export class ModuleNode extends ScopeNode {
  static {
    this.handle("ModuleNode");
  }

  get scopeType() {
    return "module";
  }

  get body() {
    return bodyOf(this.node.body);
  }

  compile() {
    if (this.compiler.isRuntimeMode) {
      // Skip class/module generation
      this.line(this.stmt(this.body));
      return;
    }

    const [name, base] = this.nameAndBase();
    this.helper("module_def");

    if (!this.body) {
      // Empty body: runtime $module_def without a callback returns nil
      this.unshift("$module_def(", base, `, '${name}')`);
    } else {
      this.inScope(() => {
        this.name = name;
        this.inClosure(MODULE | JS_FUNCTION, () => this.compileBody());
      });

      const [awaitBegin, awaitEnd, async] = this.awaitParts();

      // Emit a direct runtime call with an inline body function.
      this.unshift(`${awaitBegin}$module_def(`, base, `, '${name}', ${async}function(self${this.defineNesting ? ", $nesting" : ""}) {`);
      this.line(`}${this.defineNesting ? `, ${this.scope.getNesting()}` : ""})${awaitEnd}`);
    }

    this.markDce(name);
  }

  awaitParts() {
    if (!this.awaitEncountered) return ["", "", ""];
    this.parent.awaitEncountered = true;
    return ["(await ", ")", "async "];
  }

  // The constant is a ConstantReadNode (no base), or a ConstantPathNode
  // with a parent or without one (::Name).
  nameAndBase() {
    const cpath = this.node.constant_path;
    const name = cpath.name;
    let base;
    if (cpath.type === "ConstantReadNode") {
      base = this.scope instanceof ModuleNode ? this.scope.getSelf() : `${this.scope.getNesting()}[0]`;
    } else if (!cpath.parent) {
      base = this.cbaseFragment(cpath);
    } else {
      base = this.expr(cpath.parent);
    }
    return [name, base];
  }

  compileBody() {
    const bodyCode = this.stmt(this.compiler.returns(this.body));
    this.emptyLine();

    // $nesting is now provided as a parameter to the body callback by
    // $klass_def/$module_def. Just setup relative access when needed.
    if (this.defineRelativeAccess) this.addTemp("$$ = Opal.$r($nesting)");

    this.line(this.toVars());
    this.line(bodyCode);
  }

  markDce(name) {
    this.unshift(this.dceDefBegin(name, { type: "const" }));
    this.push(this.dceDefEnd(name, { type: "const" }));
  }
}

export class ClassNode extends ModuleNode {
  static {
    this.handle("ClassNode");
  }

  get scopeType() {
    return "class";
  }

  compile() {
    const [name, base] = this.nameAndBase();
    this.helper("klass_def");

    if (!this.body) {
      // Empty body: rely on runtime $klass_def (no callback) to return nil
      this.unshift("$klass_def(", base, ", ", this.superCode(), `, '${name}')`);
    } else {
      this.inScope(() => {
        this.name = name;
        this.inClosure(MODULE | JS_FUNCTION, () => this.compileBody());
      });

      const [awaitBegin, awaitEnd, async] = this.awaitParts();

      // Emit a direct runtime call with an inline body function.
      this.unshift(`${awaitBegin}$klass_def(`, base, ", ", this.superCode(), `, '${name}', ${async}function(self${this.defineNesting ? ", $nesting" : ""}) {`);
      this.line(`}${this.defineNesting ? `, ${this.scope.getNesting()}` : ""})${awaitEnd}`);
    }

    // a bridged class can't be removed
    const sup = this.node.superclass;
    if (sup && (sup.type === "XStringNode" || sup.type === "InterpolatedXStringNode")) {
      this.push(this.dceUse(name, { type: "*", force: true }));
    }
    this.markDce(name);
  }

  superCode() {
    return this.node.superclass ? this.expr(this.node.superclass) : "null";
  }
}

// class << object
export class SingletonClassNode extends ScopeNode {
  static {
    this.handle("SingletonClassNode");
  }

  get scopeType() {
    return "sclass";
  }

  compile() {
    this.push("(function(self, $parent_nesting) {");

    this.inScope(() => {
      const bodyStmt = this.stmt(this.compiler.returns(bodyOf(this.node.body)));

      if (this.defineNesting) this.addTemp("$nesting = [self].concat($parent_nesting)");
      if (this.defineRelativeAccess) this.addTemp("$$ = Opal.$r($nesting)");

      this.line(this.toVars());
      this.line(bodyStmt);
    });

    this.helper("get_singleton_class");
    this.line("})($get_singleton_class(", this.recv(this.node.expression), `), ${this.scope.getNesting()})`);
  }
}

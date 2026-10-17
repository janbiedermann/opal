// Calls compiled specially. Port of the former Ruby
// lib/opal/nodes/call/reflection.rb, eval.rb, require.rb and dce.rb.
import { addSpecial } from "./call.mjs";
import { rubyInspect, inspectStringArray, cleanpath } from "../helpers.mjs";

const isSelfOrNil = (node) => !node || node.type === "SelfNode";
const isSym = (node) => node.type === "SymbolNode";

function dirname(path) {
  const slash = path.lastIndexOf("/");
  if (slash === -1) return ".";
  return slash === 0 ? "/" : path.slice(0, slash);
}

// reflection.rb

for (const name of ["__callee__", "__method__"]) {
  addSpecial(name, function () {
    if (this.scope.isDef()) {
      this.push(this.fragment(rubyInspect(String(this.scope.mid))));
    } else {
      this.push(this.fragment("nil"));
    }
  });
}

addSpecial("__dir__", function () {
  this.push(rubyInspect(dirname(this.compiler.constructor.moduleName(this.compiler.file))));
});

addSpecial("__OPAL_COMPILER_CONFIG__", function () {
  this.push(this.fragment(`(new Map([['arity_check', ${this.compiler.isArityCheck}]]))`));
});

for (const name of ["nesting", "constants"]) {
  addSpecial(name, function (compileDefault) {
    const pushNesting = this.isPushNesting();
    if (pushNesting) this.push(`(Opal.Module.$$nesting = ${this.scope.getNesting()}, `);
    compileDefault();
    if (pushNesting) this.push(")");
  });
}

addSpecial("local_variables", function (compileDefault) {
  if (!isSelfOrNil(this.recvr)) return compileDefault();
  this.push(inspectStringArray(this.scope.scopeLocals().map(String)));
});

// eval.rb

addSpecial("eval", function (compileDefault) {
  // Catch the return throw coming from eval
  this.thrower("eval_return");

  if (this.arglist.length !== 1 || !isSelfOrNil(this.recvr)) return compileDefault();

  this.helper("compile");

  this.scope.getNesting();
  const temp = this.scope.newTemp();
  const scopeVariables = inspectStringArray(this.scope.scopeLocals().map(String));
  this.push(`(${temp} = `, this.expr(this.arglistNode()));
  this.push(`, typeof Opal.compile === 'function' ? eval($compile(${temp}`);
  this.push(", {scope_variables: ", scopeVariables);
  this.push(`, arity_check: ${this.compiler.isArityCheck}, file: '(eval)', eval: true})) : `);
  this.push(`${this.scope.getSelf()}.$eval(${temp}))`);
});

// obj.instance_eval(string [, file [, line]]) and mod.module_eval/
// class_eval(string ...): like eval, the code is compiled at runtime and
// run with a direct JS eval in this scope, so it sees and assigns the
// caller's local variables; an inner function makes the receiver its self.
// Other arguments (and calls this can't see, e.g. through send) go to the
// methods in corelib.
for (const name of ["instance_eval", "module_eval", "class_eval"]) {
  addSpecial(name, function (compileDefault) {
    const args = this.arglist;
    if (this.iter || args.length < 1 || args.length > 3 || args.some((a) => a.type === "SplatNode" || a.type === "BlockArgumentNode" || a.type === "KeywordHashNode")) {
      return compileDefault();
    }

    this.helper("compile");
    this.scope.getNesting();
    const recv = this.scope.newTemp();
    const temps = args.map(() => this.scope.newTemp());
    const scopeVariables = inspectStringArray(this.scope.scopeLocals().map(String));
    const moduleCheck = name === "instance_eval" ? "" : ` && ${recv}.$$is_a_module`;

    this.push(`(${recv} = `, this.recvr ? this.recv(this.recvr) : this.scope.getSelf());
    args.forEach((arg, i) => this.push(`, ${temps[i]} = `, this.expr(arg)));
    this.push(`, (typeof Opal.compile === 'function' && ${temps[0]}.$$is_string${moduleCheck}`);
    if (temps[1]) this.push(` && ${temps[1]}.$$is_string`);
    this.push(`) ? (function(self) { return eval($compile(${temps[0]}, {scope_variables: ${scopeVariables}`);
    this.push(`, arity_check: ${this.compiler.isArityCheck}, file: ${temps[1] || "'(eval)'"}, eval: true})) })(${recv}) : `);
    this.helper("send");
    this.push(`$send(${recv}, '${name}', [${temps.join(", ")}]))`);
  });
}

addSpecial("binding", function (compileDefault) {
  if (this.recvr) return compileDefault();

  this.scope.getNesting();
  this.push("Opal.Binding.$new(");
  this.push("  function($code) {");
  this.push("    return eval($code);");
  this.push("  },");
  this.push("  ", inspectStringArray(this.scope.scopeLocals().map(String)), ",");
  this.push("  ", this.scope.getSelf(), ",");
  this.push("  ", this.sourceLocation());
  this.push(")");
});

// require.rb

// Resolves the path of a require from its argument node, as far as it can
// be known at compile time.
class DependencyResolver {
  constructor(compiler, node, missingDynamicRequire = null) {
    this.compiler = compiler;
    this.node = node;
    this.missingDynamicRequire = missingDynamicRequire || compiler.dynamicRequireSeverity;
  }

  resolve() {
    return this.handlePart(this.node);
  }

  handlePart(node, missingDynamicRequire = this.missingDynamicRequire) {
    if (node) {
      switch (node.type) {
        case "StringNode":
          return node.unescaped;
        case "OpalStr":
          return node.value;
        case "InterpolatedStringNode": {
          const parts = node.parts.map((i) => this.handlePart(i));
          return parts.join("");
        }
        case "EmbeddedStatementsNode":
        case "ParenthesesNode": {
          const holder = node.type === "EmbeddedStatementsNode" ? node.statements : node.body;
          const stmts = holder && holder.type === "StatementsNode" ? holder.body : [];
          if (stmts.length === 1) return this.handlePart(stmts[0]);
          break;
        }
        case "CallNode": {
          const recv = node.receiver;
          const meth = node.name;
          const args = node.arguments ? node.arguments.arguments : [];
          const parts = args.map((s) => this.handlePart(s, "ignore"));

          if (parts.includes(null) || parts.includes(undefined)) return null;

          if (recv && (recv.type === "ConstantReadNode" || recv.type === "ConstantPathNode") && recv.name === "File") {
            switch (meth) {
              case "expand_path":
                return this.expandPath(...parts);
              case "join":
                return this.expandPath(parts.join("/"));
              case "dirname":
                return this.expandPath(parts[0].split("/").slice(0, -1).join("/"));
            }
          } else if (meth === "__dir__") {
            return dirname(this.compiler.constructor.moduleName(this.compiler.file));
          }
          break;
        }
      }
    }

    const line = this.compiler.lineOf(this.node);
    if (missingDynamicRequire === "error") {
      this.compiler.error("Cannot handle dynamic require", line);
    } else if (missingDynamicRequire === "warning") {
      this.compiler.warning("Cannot handle dynamic require", line);
    }
    return null;
  }

  expandPath(path, base = "") {
    const out = [];
    for (const part of `${base}/${path}`.split("/")) {
      if (part === "") {
        // we had '//', so ignore
      } else if (part === "..") {
        out.pop();
      } else {
        out.push(part);
      }
    }
    return out.join("/");
  }
}

// The path of a require from its argument node, or null.
export function resolveRequire(compiler, node, missingDynamicRequire = null) {
  return new DependencyResolver(compiler, node, missingDynamicRequire).resolve();
}

addSpecial("require", function (compileDefault) {
  const str = new DependencyResolver(this.compiler, this.arglist[0]).resolve();
  if (str != null) this.compiler.trackRequire(str);
  compileDefault();
});

addSpecial("require_relative", function () {
  const arg = this.arglist[0];
  const file = this.compiler.file;
  if (arg && arg.type === "StringNode") {
    this.compiler.trackRequire(cleanpath(arg.unescaped.startsWith("/") ? arg.unescaped : `${dirname(file)}/${arg.unescaped}`));
  }
  this.push(this.fragment(`${this.scope.getSelf()}.$require(${rubyInspect(file)}+ '/../' + `));
  this.push(this.process(this.arglistNode()));
  this.push(this.fragment(")"));
});

addSpecial("autoload", function (compileDefault) {
  const args = this.arglist;
  if (args.length === 2 && isSym(args[0])) {
    const str = new DependencyResolver(this.compiler, args[1], "ignore").resolve();
    if (str == null) {
      this.compiler.warning(`File for autoload of constant '${args[0].unescaped}' could not be bundled!`);
    } else {
      this.compiler.trackRequire(str);
      this.compiler.autoloads.push(str);
    }
  }
  compileDefault();
});

addSpecial("require_tree", function (compileDefault) {
  const [firstArg, ...rest] = this.arglist;
  if (firstArg && firstArg.type === "StringNode") {
    const relativePath = firstArg.unescaped;
    this.compiler.requiredTrees.push(relativePath);

    const fullPath = cleanpath(relativePath.startsWith("/") ? relativePath : `${dirname(this.compiler.file)}/${relativePath}`);
    this.arglist = [{ ...firstArg, unescaped: fullPath }, ...rest];
  }
  compileDefault();
});

// dce.rb: additional awareness for the dead code eliminator

function dceMatcher(methods) {
  if (methods.length === 0) return null;
  if (methods.length === 1) return methods[0];
  return methods;
}

function dceSymbolArgumentsMatcher(node, transform = (m) => m) {
  if (!node.arglist.every(isSym)) return [null, null];
  const methods = transform(node.arglist.map((c) => c.unescaped));
  const matcher = dceMatcher(methods);
  const placeholder = node.isStmt() ? null : JSON.stringify(methods);
  return [matcher, placeholder];
}

function dceAttr(transform) {
  return function (compileDefault) {
    if (this.compiler.isDce) {
      const [matcher, placeholder] = dceSymbolArgumentsMatcher(this, transform);
      if (matcher) this.push(this.dceDefBegin(matcher, { placeholder }));
      compileDefault();
      if (matcher) this.push(this.dceDefEnd(matcher));
    } else {
      compileDefault();
    }
  };
}

addSpecial("attr_reader", dceAttr());
addSpecial("attr_writer", dceAttr((ary) => ary.map((i) => `${i}=`)));
addSpecial("attr_accessor", dceAttr((ary) => ary.flatMap((i) => [i, `${i}=`])));

addSpecial("alias_method", function (compileDefault) {
  if (this.arglist.every(isSym) && this.arglist.length === 2) {
    const [newFunc, oldFunc] = this.arglist.map((c) => c.unescaped);
    const placeholder = this.isStmt() ? null : JSON.stringify(newFunc);

    if (this.compiler.isDce) {
      this.push(this.dceDefBegin(newFunc, { placeholder }));
      this.push(this.dceUse(oldFunc));
      compileDefault();
      this.push(this.dceDefEnd(newFunc));
    } else {
      compileDefault();
    }
  } else {
    compileDefault();
  }
});

function dceMakeConstantDefinition(node, compileDefault, name) {
  if (name != null) {
    node.push(node.dceDefBegin(name, { placeholder: "false", type: "const" }));
    compileDefault();
    node.push(node.dceDefEnd(name, { type: "const" }));
  } else {
    compileDefault();
  }
}

// In const mode, calls like: `::Rational === string` can be
// marked as definition.
// This is to allow stripping of such calls if there's no
// class to begin with.
addSpecial("===", function (compileDefault) {
  const recv = this.recvr;
  const isConst = recv && (recv.type === "ConstantReadNode" || recv.type === "ConstantPathNode");
  if (this.compiler.isDce) dceMakeConstantDefinition(this, compileDefault, isConst ? recv.name : null);
  else compileDefault();
});

addSpecial("autoload", function (compileDefault) {
  const first = this.arglist[0];
  if (this.compiler.isDce) dceMakeConstantDefinition(this, compileDefault, first && isSym(first) ? first.unescaped : null);
  else compileDefault();
});

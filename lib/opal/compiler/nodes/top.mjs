// Generates code for an entire file. Port of lib/opal/nodes/top.rb.
import { ScopeNode } from "./scope.mjs";
import { JS_FUNCTION, TOP } from "../closure.mjs";
import { VERSION } from "../version.mjs";
import { rubyInspect } from "../helpers.mjs";

export class TopNode extends ScopeNode {
  static {
    this.handle("OpalTop");
  }

  get scopeType() {
    return "top";
  }

  // The file body: null, a single statement or a StatementsNode.
  get body() {
    const stmts = this.node.body.body;
    if (stmts.length === 0) return null;
    if (stmts.length === 1) return stmts[0];
    return this.node.body;
  }

  compile() {
    const compiler = this.compiler;
    compiler.topScope = this;
    if (this.node.dynamicCacheResult) compiler.dynamicCacheResult = true;

    this.push(this.versionComment());

    if (compiler.eofContent != null) this.helper("return_val");

    const body = this.body;
    if (!body || body.type === "NilNode") {
      // A shortpath for empty (stub?) modules.
      if (compiler.isRequirable || compiler.isEsm || compiler.isEval) {
        this.unshift("Opal.return_val(Opal.nil); ");
        this.definition();
      } else {
        this.unshift("Opal.nil; ");
      }
    } else {
      this.inScope(() => {
        if (compiler.isUseStrict) this.line('"use strict";');

        const bodyCode = this.inClosure(JS_FUNCTION | TOP, () => this.stmt(compiler.returns(body)));

        if (compiler.isEval) {
          if (this.defineNesting) this.addTemp("$nesting = self.$$is_a_module ? [self] : [self.$$class]");
        } else {
          if (this.defineSelf) this.addTemp("self = Opal.top");
          if (this.defineNesting) this.addTemp("$nesting = []");
        }
        if (this.defineRelativeAccess) this.addTemp("$$ = Opal.$r($nesting)");

        this.addTemp("nil = Opal.nil");
        if (this.defineAbsoluteConst) this.addTemp("$$$ = Opal.$$$");

        this.addUsedHelpers();
        this.line(this.scope.toVars());

        this.compileMethodStubs();
        this.compileIrbVars();
        this.compileEndConstruct();

        this.line(bodyCode);
      });

      this.opening();
      this.definition();
      this.closing();
    }

    if (compiler.isEnableFileSourceEmbed) this.addFileSourceEmbed();
  }

  get moduleName() {
    return this.compiler.constructor.moduleName(this.compiler.file);
  }

  definition() {
    const compiler = this.compiler;
    if (compiler.isRequirable) {
      this.unshift(`Opal.modules[${rubyInspect(this.moduleName)}] = `);
    } else if (compiler.isEsm && !compiler.isNoExport && !compiler.isDirectory) {
      this.unshift("export default ");
    }

    if (compiler.isDirectory) this.imports();
  }

  opening() {
    const compiler = this.compiler;
    const asyncPrefix = this.awaitEncountered ? "async " : "";

    if (compiler.isRequirable) {
      this.unshift(`${asyncPrefix}function(Opal) {`);
    } else if (compiler.isEval || compiler.isIrb) {
      this.unshift(`(${asyncPrefix}function(Opal, self) {`);
    } else {
      this.unshift(`Opal.queue(${asyncPrefix}function(Opal) {`);
    }
  }

  closing() {
    const compiler = this.compiler;
    if (compiler.isRequirable) {
      this.line("};\n");

      if (compiler.isLoad) {
        // Opal.load normalizes the path, so that we can't
        // require absolute paths from CLI. For other cases
        // we can expect the module names to be normalized
        // already.
        this.line(`Opal.queue(()=>{ Opal.load_normalized(${rubyInspect(this.moduleName)}) });`);
      } else if (compiler.isRuntimeMode) {
        this.line(`Opal.load_normalized(${rubyInspect(this.moduleName)});`);
      }
    } else if (compiler.isEval || compiler.isIrb) {
      this.line("})(Opal, self);");
    } else {
      this.line("});\n");
    }
  }

  // Generate import/require statements
  imports() {
    const compiler = this.compiler;
    const imports = compiler.requires;

    if (imports.length > 0) this.unshift("\n");

    // Check how many directories we have to go up
    const name = this.moduleName.startsWith("./") ? this.moduleName.slice(2) : this.moduleName;
    const depth = (name.match(/\//g) || []).length;

    for (let i = imports.length - 1; i >= 0; i--) {
      const ref = depth === 0 ? "./" : "../".repeat(depth);
      const mod = `${ref}${this.compiler.constructor.moduleName(imports[i])}.${compiler.isEsm ? "mjs" : "js"}`;

      if (compiler.isEsm) {
        this.unshift(`import ${rubyInspect(mod)};\n`);
      } else {
        this.unshift(`require(${rubyInspect(mod)});\n`);
      }
    }
  }

  // Returns '$$$', but also ensures that the '$$$' variable is set
  absoluteConst() {
    this.defineAbsoluteConst = true;
    return "$$$";
  }

  compileIrbVars() {
    if (this.compiler.isIrb) this.line("if (!Opal.irb_vars) { Opal.irb_vars = {}; }");
  }

  addUsedHelpers() {
    const helpers = [...this.compiler.helpers];
    for (let i = helpers.length - 1; i >= 0; i--) {
      this.prependScopeTemp(`$${helpers[i]} = Opal.${helpers[i]}`);
    }
  }

  compileMethodStubs() {
    if (this.compiler.isMethodMissing) {
      const stubs = [...this.compiler.methodCalls].join(",");
      if (stubs !== "") this.line(`Opal.add_stubs('${stubs}');`);
    }
  }

  // Any special __END__ content in code
  compileEndConstruct() {
    const content = this.compiler.eofContent;
    if (content != null) {
      this.line("var $__END__ = Opal.Object.$new();");
      this.line(`$__END__.$read = $return_val(${rubyInspect(content)});`);
    }
  }

  versionComment() {
    return `/* Generated by Opal ${VERSION} */`;
  }

  addFileSourceEmbed() {
    const { file, source } = this.compiler;
    this.unshift(`Opal.file_sources[${JSON.stringify(file)}] = ${JSON.stringify(source)};\n`);
  }
}

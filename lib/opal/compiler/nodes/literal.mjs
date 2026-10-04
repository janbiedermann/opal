// Literal values. Port of lib/opal/nodes/literal.rb (regular expressions
// live in regexp.mjs).
import { Base } from "./base.mjs";
import { jsStringLiteral, rubyInspect, rubyFloatToS } from "../helpers.mjs";

export class ValueNode extends Base {
  static {
    this.handle("TrueNode", "FalseNode", "NilNode");
  }

  static truthyOptimize() {
    return true;
  }

  compile() {
    this.push({ TrueNode: "true", FalseNode: "false", NilNode: "nil" }[this.type]);
  }
}

export class SelfNode extends Base {
  static {
    this.handle("SelfNode");
  }

  compile() {
    this.push(this.scope.getSelf());
  }
}

export class NumericNode extends Base {
  static {
    this.handle("IntegerNode", "FloatNode", "SourceLineNode");
  }

  static truthyOptimize() {
    return true;
  }

  compile() {
    if (this.type === "FloatNode") this.push(rubyFloatToS(this.node.value));
    else if (this.type === "SourceLineNode") this.push(String(this.compiler.lineOf(this.node)));
    else this.push(String(this.node.value));
    if (this.isRecv()) this.wrap("(", ")");
  }
}

export class StringNode extends Base {
  static {
    this.handle("StringNode", "SourceFileNode", "OpalStr");
  }

  get value() {
    if (this.type === "SourceFileNode") return this.compiler.file;
    if (this.type === "OpalStr") return this.node.value;
    return this.node.unescaped;
  }

  compile() {
    this.push(jsStringLiteral(this.value));
  }
}

export class SymbolNode extends Base {
  static {
    this.handle("SymbolNode", "OpalSym");
  }

  compile() {
    this.push(rubyInspect(this.type === "OpalSym" ? this.node.value : this.node.unescaped));
  }
}

// The parts of a string/symbol with interpolation: plain strings stay as
// they are, `#{...}` and `#@var` are converted with $to_s().
export class DynamicStringNode extends Base {
  static {
    this.handle("InterpolatedStringNode", "InterpolatedSymbolNode", "OpalDstr");
  }

  compile() {
    const parts = this.node.parts;
    if (parts.length === 0) {
      this.push('""');
      return;
    }

    this.helper("dstr");
    this.helper("to_s");
    const lastIndex = parts.length - 1;

    this.push("$dstr(");
    parts.forEach((part, index) => {
      const plain = isPlainString(part);
      if (!plain) this.push("$to_s(");
      this.push(this.expr(part.type === "EmbeddedVariableNode" ? part.variable : part));
      if (!plain) this.push(")");
      if (index !== lastIndex) this.push(",");
    });
    this.push(")");
    if (this.isRecv()) this.wrap("(", ")");
  }
}

export function isPlainString(node) {
  return node.type === "StringNode" || node.type === "OpalStr";
}

// __ENCODING__ is Encoding::UTF_8
export class SourceEncodingNode extends Base {
  static {
    this.handle("SourceEncodingNode");
  }

  compile() {
    this.push(`${this.topScope.absoluteConst()}(${this.scope.relativeAccess()}('Encoding'), 'UTF_8')`);
  }
}

const SIMPLE_RANGE_TYPES = new Set(["IntegerNode", "FloatNode", "StringNode", "SymbolNode"]);

export class RangeNode extends Base {
  static {
    this.handle("RangeNode");
  }

  compile() {
    const { left, right } = this.node;
    const exclusive = this.node.flags && this.node.flags.includes("exclude_end");
    const simple = (n) => !n || SIMPLE_RANGE_TYPES.has(n.type);

    if (simple(left) && simple(right)) {
      this.helper("range");
      this.push("$range(", this.exprOrNil(left), ", ", this.exprOrNil(right), exclusive ? ", true)" : ", false)");
    } else if (exclusive) {
      this.push("Opal.Range.$new(", this.exprOrNil(left), ",", this.exprOrNil(right), ", true)");
    } else {
      this.push("Opal.Range.$new(", this.exprOrNil(left), ", ", this.exprOrNil(right), ", false)");
    }
  }
}

// 0b1111r -> Rational(15, 1)
export class RationalNode extends Base {
  static {
    this.handle("RationalNode");
  }

  compile() {
    const { numerator, denominator } = this.node;
    this.push(`${this.topScope.absoluteConst()}('Rational').$new(${numerator}, ${denominator})`);
  }
}

// 0b1110i -> Complex(0, 14)
export class ImaginaryNode extends Base {
  static {
    this.handle("ImaginaryNode");
  }

  compile() {
    const numeric = this.node.numeric;
    let imag;
    switch (numeric.type) {
      case "FloatNode":
        imag = rubyFloatToS(numeric.value);
        break;
      case "RationalNode":
        imag = `${numeric.numerator}/${numeric.denominator}`;
        break;
      default:
        imag = String(numeric.value);
    }
    this.push(`${this.topScope.absoluteConst()}('Complex').$new(0, ${imag})`);
  }
}

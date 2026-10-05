// Literal values. Port of the former Ruby lib/opal/nodes/literal.rb (regular
// expressions live in regexp.mjs).
import { Base } from "./base.mjs";
import { jsStringLiteral, jsifyInspected, rubyInspect, rubyFloatToS } from "../helpers.mjs";
import { literalKind, literalSegments, latin1Bytes, decodeUtf8, inspectBinary, inspectBrokenUtf8 } from "../string_literal.mjs";

// Source encodings whose string literals keep the source encoding (the
// ones Opal's corelib has besides UTF-8); literals in other sources are
// UTF-8 strings of the decoded text.
const LITERAL_ENCODINGS = new Set(["ASCII-8BIT", "ISO-8859-1", "US-ASCII"]);

// The encoding of a string literal, as in CRuby: a \u escape forces UTF-8,
// a \x escape of a byte above 0x7F in a US-ASCII source ASCII-8BIT,
// otherwise the source's encoding (when Opal has it).
function literalEncoding(compiler, node) {
  const flags = node.flags || [];
  if (flags.includes("forced_utf8_encoding")) return "UTF-8";
  if (flags.includes("forced_binary_encoding")) return "ASCII-8BIT";
  const encoding = compiler.envelope.encoding;
  return LITERAL_ENCODINGS.has(encoding) ? encoding : "UTF-8";
}

// The bytes of a literal's source characters: Latin-1 for an ISO-8859-1
// or US-ASCII source (decoded one byte per character), else UTF-8.
function charEncoder(compiler) {
  const encoding = compiler.envelope.encoding;
  return encoding === "ISO-8859-1" || encoding === "US-ASCII" ? latin1Bytes : undefined;
}

// The pieces of a string literal as the parser gem had them: one per
// source line, each as { value } (a JS string) or { bytes, encoding }
// when the value isn't representable as UTF-8 text. `opening` is the
// literal's opening delimiter (of the enclosing literal for parts).
export function stringPieces(compiler, node, opening) {
  const value = { value: node.unescaped };
  const loc = node.content_loc || node.location;
  const kind = literalKind(opening);
  if (!loc || kind === null || node.synthetic) return [value];

  const encoding = literalEncoding(compiler, node);
  const raw = compiler.source.slice(loc.start, loc.end);
  const broken = node.unescaped.includes("\uFFFD");
  // potch already splits the lines of squiggly heredocs (their raw lines
  // still carry the removed indentation)
  const squiggly = opening && opening.startsWith("<<~");
  const multiLine = !squiggly && raw.indexOf("\n") !== -1 && raw.indexOf("\n") !== raw.length - 1;
  if (!broken && encoding === "UTF-8" && !multiLine) return [value];
  if (squiggly && !broken && encoding === "UTF-8") return [value];

  const chars = charEncoder(compiler);
  const segments = squiggly ? [dedentedBytes(raw, node.unescaped, kind, opening, chars)] : literalSegments(raw, kind, opening, chars);
  const decoded = segments.map(decodeUtf8);
  if (!broken && encoding === "UTF-8" && decoded.join("") !== node.unescaped) return [value]; // be safe

  return segments.map((bytes, i) => {
    if (encoding === "UTF-8" && decoded[i] !== null) return { value: decoded[i] };
    return { bytes, encoding };
  });
}

// The bytes of a line of a squiggly heredoc: its raw source without the
// indentation the heredoc removed.
function dedentedBytes(raw, unescaped, kind, opening, chars) {
  const rawIndent = /^[ \t]*/.exec(raw)[0].length;
  const indent = /^[ \t]*/.exec(unescaped)[0].length;
  return literalSegments(raw.slice(Math.max(0, rawIndent - indent)), kind, opening, chars).flat();
}

// The JS code of a string piece, using $str() for non UTF-8 strings.
function pieceCode(node, piece) {
  if (piece.value !== undefined) return jsStringLiteral(piece.value);

  const { bytes, encoding } = piece;
  if (encoding === "UTF-8") {
    node.helper("str");
    return `$str(${jsifyInspected(inspectBrokenUtf8(bytes))},"BINARY")`;
  }
  node.helper("str");
  let code = `$str(${jsifyInspected(inspectBinary(bytes))},"${encoding}")`;
  if (encoding === "US-ASCII" && bytes.some((b) => b > 0x7f)) code = `$str(${code},"BINARY")`;
  return code;
}

// Is the node a string literal the parser gem gave as s(:str)? (A
// multi-line literal was a s(:dstr) of its lines.)
export function isPlainStringLiteral(compiler, node) {
  if (node.type !== "StringNode") return false;
  if (isEmptyHeredoc(compiler, node)) return false;
  if (node.pieceCount === undefined) node.pieceCount = stringPieces(compiler, node, openingOf(compiler, node)).length;
  return node.pieceCount === 1;
}

// An empty heredoc was an empty s(:dstr).
function isEmptyHeredoc(compiler, node) {
  if (node.unescaped !== "") return false;
  const opening = openingOf(compiler, node);
  return !!opening && opening.startsWith("<<");
}

// The literal delimiter that opens a node, e.g. '"', "%Q{", "<<~EOS".
export function openingOf(compiler, node) {
  return node.opening_loc ? compiler.source.slice(node.opening_loc.start, node.opening_loc.end) : null;
}

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
    this.handle("StringNode", "SourceFileNode", "OpalStr", "OpalStrPiece");
  }

  get value() {
    if (this.type === "SourceFileNode") return this.compiler.file;
    if (this.type === "OpalStr") return this.node.value;
    return this.node.unescaped;
  }

  compile() {
    if (this.type === "OpalStrPiece") return this.push(pieceCode(this, this.node.piece));
    // (a regexp part in a binary source)
    if (this.type === "OpalStr" && this.node.binary) {
      return this.push(pieceCode(this, { bytes: [...utf8Encoder.encode(this.value)], encoding: "ASCII-8BIT" }));
    }
    if (this.type !== "StringNode") return this.push(jsStringLiteral(this.value));

    if (isEmptyHeredoc(this.compiler, this.node)) return this.push(this.process(this.s("OpalDstr", { parts: [] }), this.level));

    const pieces = stringPieces(this.compiler, this.node, openingOf(this.compiler, this.node));
    if (pieces.length === 1) return this.push(pieceCode(this, pieces[0]));

    // a multi-line literal was a s(:dstr) of its lines
    const parts = pieces.map((piece) => this.s("OpalStrPiece", { piece }));
    this.push(this.process(this.s("OpalDstr", { parts }), this.level));
  }
}

function isAscii(str) {
  for (let i = 0; i < str.length; i++) if (str.charCodeAt(i) > 0x7f) return false;
  return true;
}

export class SymbolNode extends Base {
  static {
    this.handle("SymbolNode", "OpalSym");
  }

  compile() {
    const value = this.type === "OpalSym" ? this.node.value : this.node.unescaped;
    // an ASCII-only symbol is a US-ASCII string, a symbol in a binary
    // source a binary string (as Symbol#to_s in the Ruby compiler)
    const flags = this.node.flags || [];
    const binary = this.type === "SymbolNode" && this.compiler.envelope.encoding === "ASCII-8BIT" && !flags.includes("forced_utf8_encoding");
    if (binary || isAscii(value)) return this.push(inspectedBytes(value));
    this.push(rubyInspect(value));
  }
}

// inspectBinary of a string's UTF-8 bytes, cached (symbols repeat a lot).
const utf8Encoder = new TextEncoder();
const inspectedBytesCache = new Map();
function inspectedBytes(value) {
  let code = inspectedBytesCache.get(value);
  if (code === undefined) {
    code = inspectBinary(utf8Encoder.encode(value));
    if (inspectedBytesCache.size > 10000) inspectedBytesCache.clear();
    inspectedBytesCache.set(value, code);
  }
  return code;
}

// The parts of a string/symbol with interpolation: plain strings stay as
// they are, `#{...}` and `#@var` are converted with $to_s().
export class DynamicStringNode extends Base {
  static {
    this.handle("InterpolatedStringNode", "InterpolatedSymbolNode", "OpalDstr");
  }

  // The parts, with string parts split into their lines.
  get parts() {
    const opening = openingOf(this.compiler, this.node);
    const parts = [];
    for (const part of this.node.parts) {
      if (part.type === "StringNode") {
        for (const piece of stringPieces(this.compiler, part, opening)) parts.push({ type: "OpalStrPiece", location: part.location, piece });
      } else {
        parts.push(part);
      }
    }
    return parts;
  }

  compile() {
    const parts = this.type === "OpalDstr" ? this.node.parts : this.parts;
    if (parts.length === 0) {
      this.push('""');
      return;
    }

    this.helper("dstr");
    this.helper("to_s");
    const lastIndex = parts.length - 1;

    // In a source whose literals keep its encoding (ISO-8859-1, ...), the
    // literal parts are byte strings and the result gets the encoding
    // (ASCII-8BIT with a \x escape of a high byte in a US-ASCII source).
    const encoding = this.byteEncoding(parts);

    this.push("$dstr(");
    parts.forEach((part, index) => {
      const plain = isPlainString(part);
      if (!plain) this.push("$to_s(");
      if (encoding && part.type === "OpalStrPiece" && part.piece.bytes) this.push(jsifyInspected(inspectBinary(part.piece.bytes)));
      else this.push(this.expr(part.type === "EmbeddedVariableNode" ? embeddedVariable(part.variable) : part));
      if (!plain) this.push(")");
      if (index !== lastIndex) this.push(",");
    });
    this.push(")");
    if (encoding) {
      this.helper("str");
      this.wrap("$str(", `,"${encoding}")`);
    }
    if (this.isRecv()) this.wrap("(", ")");
  }

  // The encoding of an interpolated string whose literal parts are bytes
  // in a non-UTF-8 encoding, else null.
  byteEncoding(parts) {
    if (this.type !== "InterpolatedStringNode") return null;
    const encodings = parts.filter((p) => p.type === "OpalStrPiece").map((p) => p.piece.encoding).filter(Boolean);
    if (encodings.length === 0 || encodings.includes("UTF-8")) return null;
    return encodings.includes("ASCII-8BIT") ? "ASCII-8BIT" : encodings[0];
  }
}

// In "#$&" a back reference was a plain global variable (s(:gvar)).
export function embeddedVariable(node) {
  if (node.type === "BackReferenceReadNode") return { ...node, type: "GlobalVariableReadNode" };
  return node;
}

export function isPlainString(node) {
  return node.type === "StringNode" || node.type === "OpalStr" || node.type === "OpalStrPiece";
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

const SIMPLE_RANGE_TYPES = new Set(["IntegerNode", "FloatNode", "SymbolNode"]);

export class RangeNode extends Base {
  static {
    this.handle("RangeNode");
  }

  compile() {
    const { left, right } = this.node;
    const exclusive = this.node.flags && this.node.flags.includes("exclude_end");
    const simple = (n) => !n || SIMPLE_RANGE_TYPES.has(n.type) || isPlainStringLiteral(this.compiler, n);

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

function gcd(a, b) {
  while (b !== 0n) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}

// A rational literal in lowest terms (as Ruby's Rational value).
export function reducedRational(node) {
  const numerator = BigInt(node.numerator);
  const denominator = BigInt(node.denominator);
  const divisor = gcd(numerator, denominator) || 1n;
  return [numerator / divisor, denominator / divisor];
}

// 0b1111r -> Rational(15, 1)
export class RationalNode extends Base {
  static {
    this.handle("RationalNode");
  }

  compile() {
    const [numerator, denominator] = reducedRational(this.node);
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
      case "RationalNode": {
        const [numerator, denominator] = reducedRational(numeric);
        imag = `${numerator}/${denominator}`;
        break;
      }
      default:
        imag = String(numeric.value);
    }
    this.push(`${this.topScope.absoluteConst()}('Complex').$new(0, ${imag})`);
  }
}

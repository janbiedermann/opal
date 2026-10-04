// Regular expressions. Port of RegexpNode, MatchCurrentLineNode
// (lib/opal/nodes/literal.rb) and Match3Node (lib/opal/nodes/call/match3.rb).
//
// The parser gem gave a regexp's literal text as raw source, one part per
// line, with the flags sorted; regexpParts()/regexpFlags() rebuild that
// from Prism's (Interpolated)RegularExpressionNode.
import { Base } from "./base.mjs";
import { transformRegexp, regexpInspectSource } from "../regexp_transpiler.mjs";
import { rubyInspect } from "../helpers.mjs";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
const SUPPORTED_FLAGS = /[gimuy]/;

const FLAG_LETTERS = {
  ignore_case: "i", multi_line: "m", extended: "x", once: "o",
  ascii_8bit: "n", euc_jp: "e", windows_31j: "s", utf_8: "u",
};

// The flag letters, unique and sorted as the parser gem gave them (from
// the source: Prism keeps only one encoding flag of /x/ens).
export function regexpFlags(node, source = null) {
  if (source && node.closing_loc) {
    const letters = source.slice(node.closing_loc.start + 1, node.closing_loc.end);
    return [...new Set(letters)].sort();
  }
  return (node.flags || []).map((f) => FLAG_LETTERS[f]).filter(Boolean).sort();
}

const CLOSING = { "(": ")", "[": "]", "{": "}", "<": ">" };

// Removes the backslash of an escaped delimiter, as the parser gem did,
// unless the delimiters are brackets or a regexp metacharacter
// (%r<\<> and %r+\++ keep it).
const METACHARACTERS = ".*+?^$|()[]{}\\";
function unescapeDelimiters(text, opening) {
  if (CLOSING[opening] || METACHARACTERS.includes(opening) || opening === ">") return text;
  const delimiters = [opening];
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && i + 1 < text.length) {
      out += delimiters.includes(text[i + 1]) ? text[i + 1] : text[i] + text[i + 1];
      i++;
    } else {
      out += text[i];
    }
  }
  return out;
}

// Control escapes (\cX, \C-X) become the control character itself, as the
// parser gem did (regexp engines don't know them).
function rawControlEscapes(text) {
  return text.replace(/\\(\\*)(c|C-)(\\?.)/gs, (match, slashes, prefix, char) => {
    if (slashes.length % 2 === 1) return match; // an escaped backslash
    const c = char.length === 2 ? char[1] : char;
    return slashes + String.fromCharCode(c === "?" ? 0x7f : c.charCodeAt(0) & 0x9f);
  });
}

// The literal parts (OpalStr with the raw source of each line) and
// interpolated parts of a regexp. In a binary source the parts are binary
// strings.
export function regexpParts(node, source, binary = false) {
  const parts = [];
  const openingText = node.opening_loc ? source.slice(node.opening_loc.start, node.opening_loc.end) : "/";
  const opening = openingText[openingText.length - 1];
  const pushRaw = (loc) => {
    // one part per source line (control escapes can make more newlines)
    const text = unescapeDelimiters(source.slice(loc.start, loc.end), opening);
    for (const line of text.split(/(?<=\n)/)) {
      if (line !== "") parts.push({ type: "OpalStr", location: loc, value: rawControlEscapes(line), binary });
    }
  };

  if (node.type === "RegularExpressionNode" || node.type === "MatchLastLineNode") {
    pushRaw(node.content_loc);
  } else {
    for (const part of node.parts) {
      if (part.type === "StringNode") pushRaw(part.content_loc || part.location);
      else if (part.type === "EmbeddedVariableNode") parts.push(part.variable);
      else parts.push(part);
    }
  }
  return parts;
}

export class RegexpNode extends Base {
  static {
    this.handle("RegularExpressionNode", "InterpolatedRegularExpressionNode", "OpalRegexp");
  }

  constructor(node, level, compiler) {
    super(node, level, compiler);
    this.extractFlagsAndValue();
  }

  compile() {
    this.flags = this.flags.filter((flag) => {
      if (SUPPORTED_FLAGS.test(flag)) return true;
      this.compiler.warning(`Skipping the '${flag}' Regexp flag as it's not widely supported by JavaScript vendors.`, this.compiler.lineOf(this.node));
      return false;
    });

    if (this.value.type === "OpalStr") {
      this.compileStaticRegexp();
    } else {
      this.compileDynamicRegexp();
    }
  }

  compileDynamicRegexp() {
    this.helper("regexp");

    // the parts of an interpolated regexp; a single interpolation was a
    // s(:begin) whose children are the parts
    const value = this.value;
    let parts;
    if (value.type === "OpalDstr") parts = value.parts;
    else if (value.type === "EmbeddedStatementsNode") parts = value.statements ? value.statements.body : [];
    else parts = [value];

    this.push("$regexp([");
    parts.forEach((v, index) => {
      if (index !== 0) this.push(", ");
      this.push(this.expr(v));
    });
    this.push("]");
    if (this.flags.length > 0) this.push(`, '${this.flags.join("")}'`);
    this.push(")");
  }

  compileStaticRegexp() {
    const value = this.value.value;
    if (value === "") {
      this.helper("empty_regexp");
      this.push(`$empty_regexp(${rubyInspect(this.flags.join(""))})`);
    } else if (/\(\?[(<>#]|[*+?]\+|\\G/.test(value)) {
      // Safari/WebKit will not execute javascript code if it contains a lookbehind literal RegExp
      // and they fail with "Syntax Error". This tricks their parser by disguising the literal RegExp
      // as string for the dynamic $regexp helper. Safari/Webkit will still fail to execute the RegExp,
      // but at least they will parse and run everything else.
      //
      // Also, let's compile a couple of more patterns into $regexp calls, as there are many syntax
      // errors in RubySpec when ran in reverse, while there shouldn't be (they should be catchable
      // errors) - at least since Node 17.
      this.staticAsDynamic(value);
    } else {
      const regexpContent = regexpInspectSource(value);
      const oldFlags = this.flags.join("");
      const [newRegexp, newFlags] = transformRegexp(regexpContent, oldFlags, (msg) => this.compiler.warning(msg));
      this.push(`/${newRegexp}/${newFlags}`);

      // Annotate the source regexp and flags, so it can be used to redo transforming while doing
      // unions etc.
      if (regexpContent !== newRegexp || oldFlags !== newFlags) {
        this.helper("annotate_regexp");
        const content = regexpContent !== newRegexp ? rubyInspect(regexpContent) : "null";
        const flags = oldFlags !== newFlags ? `, ${rubyInspect(oldFlags)}` : "";
        this.wrap("$annotate_regexp(", `, ${content}${flags})`);
      }
    }
  }

  staticAsDynamic(value) {
    this.helper("regexp");

    this.push('$regexp(["');
    this.push(value.replaceAll("\\", "\\\\").replaceAll('"', '\\"'));
    this.push('"]');
    if (this.flags.length > 0) this.push(`, '${this.flags.join("")}'`);
    this.push(")");
  }

  extractFlagsAndValue() {
    const node = this.node;
    const binary = this.compiler.envelope.encoding === "ASCII-8BIT";
    const values = node.type === "OpalRegexp" ? node.parts : regexpParts(node, this.compiler.source, binary);
    this.flags = node.type === "OpalRegexp" ? [...node.regexpFlags] : regexpFlags(node, this.compiler.source);

    if (values.length === 0) {
      // empty regexp, we can process it inline
      this.value = this.s("OpalStr", { value: "" });
    } else if (values.length === 1 && (values[0].type !== "OpalStr" || !values[0].value.includes("\n"))) {
      // simple plain regexp, we can put it inline
      this.value = values[0];
    } else {
      this.value = this.s("OpalDstr", { parts: values });
    }

    // trimming when //x provided
    // required by parser gem, but JS doesn't support 'x' flag
    if (this.flags.includes("x")) {
      // (the Ruby compiler only trims the parts of a regexp with several parts)
      if (this.value.type === "OpalDstr") {
        const parts = this.value.parts.map((part) => {
          if (part.type !== "OpalStr") return part;
          const trimmed = part.value.replace(/^\s*#.*/, "").replace(/\s/g, "");
          return { ...part, value: trimmed };
        });
        this.value = { ...this.value, parts };
      }
      this.flags = this.flags.filter((f) => f !== "x");
    }
  }
}

// $_ = 'foo'; call if /foo/  ->  ($_ =~ regexp)
export class MatchCurrentLineNode extends Base {
  static {
    this.handle("MatchLastLineNode", "InterpolatedMatchLastLineNode");
  }

  compile() {
    const regexp = { ...this.node, type: this.type === "MatchLastLineNode" ? "RegularExpressionNode" : "InterpolatedRegularExpressionNode" };
    const call = this.s("OpalCall", {
      receiver: this.s("GlobalVariableReadNode", { name: "$_" }),
      name: "=~",
      arguments: { type: "ArgumentsNode", location: this.node.location, arguments: [regexp] },
      block: null,
    });
    this.push(this.expr(call));
  }
}

// /(?<name>...)/ =~ string assigns the named captures to locals
export class Match3Node extends Base {
  static {
    this.handle("MatchWriteNode");
  }

  compile() {
    const node = this.node;
    let result = node.call;
    const lhs = node.call.receiver;

    // Handle named matches like: /(?<abc>b)/ =~ 'b'
    // (the Ruby compiler looked at the first part, i.e. the first line)
    if (lhs.type === "RegularExpressionNode") {
      const first = regexpParts(lhs, this.compiler.source)[0];
      const source = first && first.type === "OpalStr" ? first.value : "";
      const names = [...source.matchAll(/\(\?<([^>]*)>/g)].map((m) => m[1]);

      if (names.length > 0) {
        const s = (type, props) => this.s(type, props);
        const gvar = s("GlobalVariableReadNode", { name: "$~" });
        const namesDef = s("OpalLvasgn", {
          name: "$m3names",
          value: s("OpalIf", {
            test: gvar,
            trueBody: s("OpalCall", { receiver: gvar, name: "named_captures", arguments: null, block: null }),
            falseBody: s("HashNode", { elements: [] }),
          }),
        });
        const assignments = names.map((name) => s("LocalVariableWriteNode", {
          name,
          value: s("OpalCall", {
            receiver: s("OpalLvar", { name: "$m3names" }),
            name: "[]",
            arguments: { type: "ArgumentsNode", location: node.location, arguments: [s("SymbolNode", { unescaped: name })] },
            block: null,
          }),
        }));

        if (this.isStmt()) {
          // We don't care about a return value of this one, so we
          // ignore it and just assign the local variables.
          result = s("OpalBegin", { body: [result, namesDef, ...assignments] });
        } else {
          // We actually do care about a return value, so we must
          // keep it saved.
          result = s("OpalBegin", {
            body: [s("OpalLvasgn", { name: "$m3tmp", value: result }), namesDef, ...assignments, s("OpalLvar", { name: "$m3tmp" })],
          });
        }
      }
    }

    this.push(this.process(result, this.level));
  }
}

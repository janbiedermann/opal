// Helpers shared by the code generators: Ruby-compatible literal formatting
// (String#inspect, Float#to_s) and JS identifier/property handling.
//
// The Ruby compiler (lib/opal/nodes/helpers.rb, lib/opal/rewriters/
// js_reserved_words.rb) relies on Ruby's own String#inspect and Float#to_s
// to print literals; these are faithful JS re-implementations so the JS
// compiler emits the same code.

// Code points String#inspect prints as an escape: control characters,
// unassigned code points and the line/paragraph separators. Everything else
// (including format characters like U+200B) is printed as is.
const NON_PRINTABLE = /[\p{Cc}\p{Cn}\p{Zl}\p{Zp}]/u;

const SIMPLE_ESCAPES = {
  "\n": "\\n",
  "\t": "\\t",
  "\r": "\\r",
  "\f": "\\f",
  "\v": "\\v",
  "\b": "\\b",
  "\x07": "\\a",
  "\x1b": "\\e",
  '"': '\\"',
  "\\": "\\\\",
};

function hex(cp, width) {
  return cp.toString(16).toUpperCase().padStart(width, "0");
}

// Ruby's String#inspect for a UTF-8 string, including the surrounding
// double quotes.
export function rubyInspect(str) {
  let out = '"';
  const chars = [...str];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const simple = SIMPLE_ESCAPES[ch];
    if (simple !== undefined) {
      out += simple;
    } else if (ch === "#") {
      const next = chars[i + 1];
      out += next === "{" || next === "$" || next === "@" ? "\\#" : "#";
    } else if (NON_PRINTABLE.test(ch)) {
      const cp = ch.codePointAt(0);
      out += cp > 0xffff ? `\\u{${hex(cp, 1)}}` : `\\u${hex(cp, 4)}`;
    } else {
      out += ch;
    }
  }
  return out + '"';
}

// Opal::Nodes::StringNode#sanitize_utf16 + #translate_escape_chars applied
// to a string: JS has no \a or \e escapes, and \u{...} escapes that fit in
// UTF-16 are written as \uXXXX.
export function jsStringLiteral(str) {
  return jsifyInspected(rubyInspect(str));
}

// The same for an already inspected string.
export function jsifyInspected(inspected) {
  return inspected
    .replace(/\\u\{([0-9a-f]+)\}/g, (match, digits) => {
      const cp = parseInt(digits, 16);
      return cp <= 0xffff ? "\\u" + cp.toString(16).toUpperCase() : match;
    })
    .replace(/(\\+)([ae])/g, (match, slashes, letter) => {
      if (slashes.length % 2 === 0) return match;
      return slashes.slice(0, -1) + (letter === "a" ? "\\u0007" : "\\u001b");
    });
}

// Ruby's Float#to_s.
export function rubyFloatToS(value) {
  if (Number.isNaN(value)) return "NaN";
  if (value === Infinity) return "Infinity";
  if (value === -Infinity) return "-Infinity";
  if (value === 0) return Object.is(value, -0) ? "-0.0" : "0.0";

  const sign = value < 0 ? "-" : "";
  const [mantissa, expPart] = Math.abs(value).toExponential().split("e");
  const digits = mantissa.replace(".", "");
  const exp = Number(expPart);
  // Position of the decimal point relative to the digits (numeric.c flo_to_s)
  const decpt = exp + 1;

  if (decpt > 0) {
    if (decpt < digits.length) return `${sign}${digits.slice(0, decpt)}.${digits.slice(decpt)}`;
    if (decpt <= 15) return `${sign}${digits}${"0".repeat(decpt - digits.length)}.0`;
  } else if (decpt > -4) {
    return `${sign}0.${"0".repeat(-decpt)}${digits}`;
  }

  const rest = digits.slice(1) || "0";
  const expSign = exp < 0 ? "-" : "+";
  return `${sign}${digits[0]}.${rest}e${expSign}${String(Math.abs(exp)).padStart(2, "0")}`;
}

// Reserved javascript keywords - we cannot create variables with the
// same name (ref: http://stackoverflow.com/a/9337272/601782)
const ES51_RESERVED_WORD = /^(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/;

// ES3 reserved words that aren't ES5.1 reserved words
const ES3_RESERVED_WORD_EXCLUSIVE = /^(?:int|byte|char|goto|long|final|float|short|double|native|throws|boolean|abstract|volatile|transient|synchronized)$/;

// Prototype special properties.
const PROTO_SPECIAL_PROPS = /^(?:constructor|displayName|__proto__|__parent__|__noSuchMethod__|__count__)$/;

// Prototype special methods.
const PROTO_SPECIAL_METHODS = /^(?:hasOwnProperty|valueOf)$/;

// Immutable properties of the global object
const IMMUTABLE_PROPS = /^(?:NaN|Infinity|undefined)$/;

// Doesn't take in account utf8
const BASIC_IDENTIFIER_RULES = /^[$_a-z][$_a-z\d]*$/i;

export function isValidName(name) {
  return BASIC_IDENTIFIER_RULES.test(name) &&
    !(ES51_RESERVED_WORD.test(name) || ES3_RESERVED_WORD_EXCLUSIVE.test(name) || IMMUTABLE_PROPS.test(name));
}

export function isValidIvarName(name) {
  return !(PROTO_SPECIAL_PROPS.test(name) || PROTO_SPECIAL_METHODS.test(name));
}

// Local variable names that clash with JS get a trailing `$`.
export function fixVarName(name) {
  return isValidName(name) ? name : `${name}$`;
}

// Instance variable names (with the leading @) that clash with prototype
// properties get a trailing `$`.
export function fixIvarName(name) {
  return isValidIvarName(name.slice(1)) ? name : `${name}$`;
}

// `.name` when name is a valid JS identifier, `["name"]` otherwise.
export function property(name) {
  return isValidName(name) ? `.${name}` : `[${rubyInspect(name)}]`;
}

// Converts a ruby method name into its javascript equivalent for
// a method/function call. All ruby method names get prefixed with
// a '$', and if the name is a valid javascript identifier, it will
// have a '.' prefix (for dot-calling), otherwise it will be
// wrapped in brackets to use reference notation calling.
export function midToJsid(mid) {
  if (/[=+\-*/!?<>&|^%~[`]/.test(mid)) return `['$${mid}']`;
  return ".$" + mid;
}

// Ruby's Array#inspect for an array of strings, e.g. ["a", "b"].
export function inspectStringArray(strings) {
  return "[" + strings.map(rubyInspect).join(", ") + "]";
}

// Pathname#cleanpath for relative or absolute "/"-separated paths.
export function cleanpath(path) {
  const absolute = path.startsWith("/");
  const out = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..") out.pop();
      else if (!absolute) out.push("..");
    } else {
      out.push(part);
    }
  }
  const joined = out.join("/");
  if (absolute) return "/" + joined;
  return joined === "" ? "." : joined;
}

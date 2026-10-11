// Transforms a regular expression from Ruby syntax to JS syntax, as much
// as possible. Used by the compiler at compile time (nodes/regexp.mjs) and
// by the runtime (Opal.transform_regexp in runtime/regexp.rb).

// A map of some Ruby regexp patterns to their JS representations
const REGEXP_EQUIVALENTS = new Map(Object.entries({
  "\\h": "[\\dA-Fa-f]",
  "\\H": "[^\\dA-Fa-f]",
  "\\e": "\\x1b",

  // Invalid cases in JS Unicode mode
  "\\_": "_",
  "\\~": "~",
  "\\#": "#",
  "\\'": "'",
  '\\"': '"',
  "\\ ": " ",
  "\\=": "=",
  "\\!": "!",
  "\\%": "%",
  "\\&": "&",
  "\\<": "<",
  "\\>": ">",
  "\\@": "@",
  "\\:": ":",
  "\\`": "`",

  // POSIX classes
  "[:alnum:]": "\\p{Alphabetic}\\p{Number}", // Alphanumeric characters
  "[:alpha:]": "\\p{Alphabetic}", // Alphabetic characters
  "[:blank:]": "\\p{Space_Separator}\\t", // Space and tab
  "[:cntrl:]": "\\p{Control}", // Control characters
  "[:digit:]": "\\d", // Digits
  "[:graph:]": "\\p{Alphabetic}\\p{Number}\\p{Punctuation}\\p{Symbol}", // Visible characters
  "[:lower:]": "\\p{Lowercase_Letter}", // Lowercase letters
  "[:print:]": "\\p{Alphabetic}\\p{Number}\\p{Punctuation}\\p{Symbol}\\p{Space_Separator}", // Visible characters and spaces
  "[:punct:]": "\\p{Punctuation}", // Punctuation characters
  "[:space:]": "\\p{White_Space}", // Whitespace characters
  "[:upper:]": "\\p{Uppercase_Letter}", // Uppercase letters
  "[:xdigit:]": "\\dA-Fa-f", // Hexadecimal digits
}));

// A map of some Ruby regexp patterns to their JS representations, but this set of
// representations is only applied outside of `[` and `]`.
const REGEXP_EQUIVALENTS_OUTSIDE = new Map(Object.entries({
  "\\A": "^",
  "\\z": "$",
  "\\Z": "(?:\\n?$)",
  "\\-": "-",
  "\\R": "(?:\\r|\\n|\\r\\n|\\f|\\u0085|\\u2028|\\u2029)",
}));

const ESCAPES_REGEXP = /(\\.|\[:[a-z]*:\])/g;
const OUTSIDE_ESCAPES_REGEXP = /(\\.)/g;

function transformByReAndHash(regexp, transformer, hash) {
  return regexp.replace(transformer, (i) => hash.get(i) || i);
}

// Ruby writes hex escapes with one or two digits (\x0, \x1F) and allows
// \x{...}; JS only knows \xHH (exactly two digits) and \u{...}.
function fixHexEscapes(regexp) {
  if (regexp.indexOf("\\x") === -1) return regexp;
  return regexp
    .replace(/(?<!\\)((?:\\\\)*)\\x\{([0-9A-Fa-f]+)\}/g, "$1\\u{$2}")
    .replace(/(?<!\\)((?:\\\\)*)\\x([0-9A-Fa-f])(?![0-9A-Fa-f])/g, "$1\\x0$2");
}

// The \p{...} properties JS accepts with the u flag: the general categories,
// their long names and the binary properties.
const JS_UNICODE_PROPERTIES = new Set(Object.keys({
  L: 1, Lu: 1, Ll: 1, Lt: 1, Lm: 1, Lo: 1, M: 1, Mn: 1, Mc: 1, Me: 1, N: 1, Nd: 1, Nl: 1, No: 1,
  P: 1, Pc: 1, Pd: 1, Ps: 1, Pe: 1, Pi: 1, Pf: 1, Po: 1, S: 1, Sm: 1, Sc: 1, Sk: 1, So: 1,
  Z: 1, Zs: 1, Zl: 1, Zp: 1, C: 1, Cc: 1, Cf: 1, Co: 1, Cs: 1, Cn: 1,
  Cased_Letter: 1, Control: 1, Currency_Symbol: 1, Dash_Punctuation: 1, Decimal_Number: 1,
  Enclosing_Mark: 1, Final_Punctuation: 1, Format: 1, Initial_Punctuation: 1, Letter: 1,
  Letter_Number: 1, Line_Separator: 1, Lowercase_Letter: 1, Mark: 1, Math_Symbol: 1,
  Modifier_Letter: 1, Modifier_Symbol: 1, Nonspacing_Mark: 1, Number: 1, Open_Punctuation: 1,
  Other: 1, Other_Letter: 1, Other_Number: 1, Other_Punctuation: 1, Other_Symbol: 1,
  Paragraph_Separator: 1, Private_Use: 1, Punctuation: 1, Separator: 1, Space_Separator: 1,
  Spacing_Mark: 1, Surrogate: 1, Symbol: 1, Titlecase_Letter: 1, Unassigned: 1,
  Uppercase_Letter: 1,
  Alphabetic: 1, Any: 1, ASCII: 1, Assigned: 1, Bidi_Control: 1, Bidi_Mirrored: 1,
  Case_Ignorable: 1, Cased: 1, Changes_When_Casefolded: 1, Changes_When_Casemapped: 1,
  Changes_When_Lowercased: 1, Changes_When_NFKC_Casefolded: 1, Changes_When_Titlecased: 1,
  Changes_When_Uppercased: 1, Default_Ignorable_Code_Point: 1, Deprecated: 1, Diacritic: 1,
  Emoji: 1, Emoji_Component: 1, Emoji_Modifier: 1, Emoji_Modifier_Base: 1, Emoji_Presentation: 1,
  Extended_Pictographic: 1, Hyphen: 1, ID_Continue: 1, ID_Start: 1, Ideographic: 1,
  Join_Control: 1, Logical_Order_Exception: 1, Lowercase: 1, Math: 1,
  Noncharacter_Code_Point: 1, Pattern_Syntax: 1, Pattern_White_Space: 1, Quotation_Mark: 1,
  Radical: 1, Regional_Indicator: 1, Sentence_Break: 1, Soft_Dotted: 1,
  Terminal_Punctuation: 1, Unified_Ideograph: 1, Uppercase: 1, Variation_Selector: 1,
  White_Space: 1, Word: 1,
}));

// The POSIX class names Ruby accepts in \p{...} but JS doesn't; they stay as
// they were (they were never supported).
const RUBY_ONLY_PROPERTIES = new Set(["Alnum", "Alpha", "Blank", "Cntrl", "Digit", "Graph", "Lower", "Print", "Punct", "Space", "Upper", "XDigit"]);

// Ruby writes a script name bare (\p{Han}); JS only accepts bare script names
// with the v flag, so they become \p{Script=Han}. \p{^Han} is \P{Script=Han}.
function fixUnicodeProperties(regexp) {
  if (regexp.indexOf("\\p") === -1 && regexp.indexOf("\\P") === -1) return regexp;
  return regexp.replace(/(?<!\\)((?:\\\\)*)\\([pP])\{(\^)?([A-Za-z_]+)\}/g, (all, backslashes, letter, negated, name) => {
    if (JS_UNICODE_PROPERTIES.has(name) || RUBY_ONLY_PROPERTIES.has(name)) return all;
    const out = negated ? (letter === "p" ? "P" : "p") : letter;
    return `${backslashes}\\${out}{Script=${name}}`;
  });
}

function addFlag(flags, flag) {
  return flags.includes(flag) ? flags : flags + flag;
}

// Removes the whitespace and comments of an extended (x) regexp, except in
// character classes and escapes.
export function stripExtended(regexp) {
  const length = regexp.length;
  let out = "", i = 0, depth = 0, c;
  while (i < length) {
    c = regexp[i];
    if (c === "\\") {
      out += regexp.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (depth > 0) {
      if (c === "[") depth++;
      else if (c === "]") depth--;
      out += c;
      i++;
      continue;
    }
    if (c === "[") {
      depth = 1;
      out += c;
      i++;
      // a "]" right after "[" or "[^" is a literal
      if (regexp[i] === "^") out += regexp[i++];
      if (regexp[i] === "]") out += regexp[i++];
      continue;
    }
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v") {
      i++;
      continue;
    }
    if (c === "#") {
      // a comment, to the end of the line
      while (i < length && regexp[i] !== "\n") i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Returns [jsRegexpSource, jsFlags]. `warn` receives a warning message.
export function transformRegexp(originalRegexp, flags, warn = () => {}) {
  flags = flags || "";

  // JS has no extended mode
  if (flags.includes("x")) {
    originalRegexp = stripExtended(originalRegexp);
    flags = flags.replace("x", "");
  }

  let rubyMultiline = false;
  if (flags.includes("m")) {
    rubyMultiline = true;
    flags = flags.replace("m", "");
  }

  flags = addFlag(flags, "u"); // always be unicode aware to handle surrogates correctly

  originalRegexp = fixUnicodeProperties(fixHexEscapes(originalRegexp));

  // First step - easy replacements
  const regexp = transformByReAndHash(originalRegexp, ESCAPES_REGEXP, REGEXP_EQUIVALENTS);

  // Tokenize the regexp into tokens of `[]` and anything else.
  let escaping = false;
  let str = "";
  let depth = 0;
  let inside = false;
  let currInside = false;
  let newRegexp = "";
  let lineBasedRegexp = false;
  let stringBasedRegexp = false;
  let unicodeCharacterClass = false;
  let quantifier = false;

  const applyOutsideTransform = () => {
    if (!currInside) str = transformByReAndHash(str, OUTSIDE_ESCAPES_REGEXP, REGEXP_EQUIVALENTS_OUTSIDE);
    newRegexp += str;
  };

  for (let i = 0; i < regexp.length; i++) {
    let char = regexp[i];
    let capture = true;

    if (escaping) {
      escaping = false;
      if (char === "A" || char === "z") {
        stringBasedRegexp = true;
      } else if (char === "p" || char === "P" || char === "u") {
        unicodeCharacterClass = 1;
      }
    } else if (char === "\\") {
      escaping = true;
    } else if (depth === 0 && char === "." && rubyMultiline) {
      // If user has specified //m modifier, it means it's expected for '.' to match
      // any character, including newlines
      char = "[\\s\\S]";
    } else if (depth === 0 && (char === "^" || char === "$")) {
      // Line based regexp
      lineBasedRegexp = true;
    } else if (char === "[") {
      depth += 1;
      // Skip additional ['s. This is important for expressions, that are valid in Ruby
      // like [[[:alnum:]]_]
      if (depth > 1) capture = false;
    } else if (char === "]") {
      // Skip additional ]'s
      if (depth > 1) capture = false;
      if (depth <= 0) {
        // Re-add a [, since it is possible for that to happen.
        str = "[" + str;
        depth = 0;
      }
      depth -= 1;
    } else if (char === "{") {
      // escape { to \\{ unless it belongs to
      // a unicode escape \p{...}, \P{...} or \u{...} or
      // a quantifier x{1}, x{1,} or x{1,2}
      if (unicodeCharacterClass === 1) {
        // look behind
        const prevChars = regexp.slice(i - 2, i);
        if (prevChars === "\\p" || prevChars === "\\P" || prevChars === "\\u") {
          unicodeCharacterClass = 2;
        } else {
          unicodeCharacterClass = false;
          char = "\\{";
        }
      } else if (i > 0) {
        // look forward
        if (/^\d+(,|)\d*}/.test(regexp.slice(i + 1))) {
          quantifier = true;
        } else {
          char = "\\{";
        }
      } else {
        unicodeCharacterClass = false;
        quantifier = false;
        char = "\\{";
      }
    } else if (char === "}") {
      // escape } to \\} unless it belongs to
      // a unicode escape \p{...}, \P{...} or \u{...} or
      // a quantifier x{1}, x{1,} or x{1,2}
      if (unicodeCharacterClass === 2) {
        unicodeCharacterClass = false;
      } else if (quantifier) {
        quantifier = false;
      } else {
        unicodeCharacterClass = false;
        quantifier = false;
        char = "\\}";
      }
    }

    if (capture) str += char;

    currInside = inside;
    inside = depth > 0;

    // Switching a token
    if (currInside !== inside) {
      // Since we are outside, let's apply a transformation
      applyOutsideTransform();
      str = "";
    }
  }

  applyOutsideTransform();

  // Set multiline flag to denote that ^ and $ should match both at borders of file
  // and at the borders of line. This will break if both \A and ^ are used in a single
  // regexp.
  if (lineBasedRegexp) flags = addFlag(flags, "m");

  // Let's check for this case and warn appropriately
  if (lineBasedRegexp && stringBasedRegexp) {
    warn(`warning: Both \\A or \\z and ^ or $ used in a regexp /${originalRegexp}/. In Opal this will cause undefined behavior.`);
  }

  return [newRegexp, flags];
}

// Control characters other than whitespace.
function isControl(c) {
  const code = c.charCodeAt(0);
  return code <= 0x08 || (code >= 0x0e && code <= 0x1f) || code === 0x7f;
}

// The regexp source as Ruby's Regexp#inspect prints it (without the
// slashes): escape sequences are kept, unescaped slashes get escaped and
// non-printable characters are written as \xHH.
export function regexpInspectSource(source) {
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "\\" && i + 1 < source.length) {
      out += c + source[i + 1];
      i++;
    } else if (c === "/") {
      out += "\\/";
    } else if (isControl(c)) {
      out += "\\x" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
    } else {
      out += c;
    }
  }
  return out;
}

// Transforms a regular expression from Ruby syntax to JS syntax, as much
// as possible. Port of lib/opal/regexp_transpiler.rb and the regexp tables
// of lib/opal/regexp_anchors.rb.

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

function addFlag(flags, flag) {
  return flags.includes(flag) ? flags : flags + flag;
}

// Returns [jsRegexpSource, jsFlags]. `warn` receives a warning message.
export function transformRegexp(originalRegexp, flags, warn = () => {}) {
  flags = flags || "";

  let rubyMultiline = false;
  if (flags.includes("m")) {
    rubyMultiline = true;
    flags = flags.replace("m", "");
  }

  flags = addFlag(flags, "u"); // always be unicode aware to handle surrogates correctly

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
      } else if (char === "p" || char === "P") {
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
      // a unicode character class \p{...} or \P{...} or
      // a quantifier x{1}, x{1,} or x{1,2}
      if (unicodeCharacterClass === 1) {
        // look behind
        const prevChars = regexp.slice(i - 2, i);
        if (prevChars === "\\p" || prevChars === "\\P") {
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
      // a unicode character class \p{...} or \P{...} or
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
  return code <= 0x08 || code === 0x0b || (code >= 0x0e && code <= 0x1f) || code === 0x7f;
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

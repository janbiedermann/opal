// String literals at the byte level.
//
// potch gives a string literal's value as a JS string, which cannot hold
// bytes that aren't valid UTF-8 (they come back as U+FFFD), and it keeps
// multi-line literals in one piece, while the parser gem split them into
// one part per line. This module re-reads a literal's raw source text:
// literalSegments() unescapes it into the exact bytes, one segment per
// source line, and the inspect functions print byte strings the way
// Ruby's String#inspect does.
import { rubyInspect } from "./helpers.mjs";

const CLOSING = { "(": ")", "[": "]", "{": "}", "<": ">" };

// The kind of a literal from its opening delimiter: "double" (escapes),
// "single" ('...' and %q), "words" (%w, %i), "raw" (<<'EOS') or null for
// literals handled elsewhere (regexps, x-strings).
export function literalKind(opening) {
  if (!opening) return "double";
  if (opening.startsWith("<<")) {
    const rest = opening.replace(/^<<[~-]?/, "");
    return rest.startsWith("'") ? "raw" : "double";
  }
  if (opening.startsWith("%")) {
    const type = opening[1];
    if (type === "q" || type === "s") return "single";
    if (type === "w" || type === "i") return "words";
    if (type === "r" || type === "x") return null;
    return "double";
  }
  if (opening === "'" || opening === ":'") return "single";
  return "double";
}

// The delimiters that can be escaped in a literal opened with `opening`.
function delimiters(opening) {
  if (!opening) return [];
  const last = opening[opening.length - 1];
  if (CLOSING[last]) return [last, CLOSING[last]];
  return [last];
}

function utf8Bytes(str, out) {
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return out;
}

const SIMPLE = { n: 0x0a, t: 0x09, s: 0x20, r: 0x0d, a: 0x07, b: 0x08, e: 0x1b, f: 0x0c, v: 0x0b };

// Reads the escape sequence starting after a backslash at text[i]; returns
// [bytes, nextIndex]. `meta`/`control` modify a single-byte result.
function readEscape(text, i) {
  const c = text[i];
  if (c === undefined) return [[0x5c], i];

  if (SIMPLE[c] !== undefined) return [[SIMPLE[c]], i + 1];

  if (c >= "0" && c <= "7") {
    let j = i;
    let value = 0;
    while (j < text.length && j < i + 3 && text[j] >= "0" && text[j] <= "7") value = value * 8 + Number(text[j++]);
    return [[value & 0xff], j];
  }

  if (c === "x") {
    let j = i + 1;
    let digits = "";
    while (j < text.length && digits.length < 2 && /[0-9a-fA-F]/.test(text[j])) digits += text[j++];
    if (digits === "") return [[0x78], i + 1];
    return [[parseInt(digits, 16)], j];
  }

  if (c === "u") {
    if (text[i + 1] === "{") {
      const close = text.indexOf("}", i + 2);
      const body = text.slice(i + 2, close === -1 ? text.length : close);
      const bytes = [];
      for (const hex of body.trim().split(/\s+/)) {
        if (hex !== "") utf8Bytes(String.fromCodePoint(parseInt(hex, 16)), bytes);
      }
      return [bytes, close === -1 ? text.length : close + 1];
    }
    const hex = text.slice(i + 1, i + 5);
    return [utf8Bytes(String.fromCodePoint(parseInt(hex, 16)), []), i + 5];
  }

  if (c === "c" || (c === "C" && text[i + 1] === "-")) {
    let j = c === "c" ? i + 1 : i + 2;
    let byte;
    if (text[j] === "\\") {
      const [bytes, next] = readEscape(text, j + 1);
      byte = bytes[0];
      j = next;
    } else if (text[j] === "?") {
      return [[0x7f], j + 1];
    } else {
      byte = text.codePointAt(j);
      j += byte > 0xffff ? 2 : 1;
    }
    return [[byte & 0x9f], j];
  }

  if (c === "M" && text[i + 1] === "-") {
    let j = i + 2;
    let byte;
    if (text[j] === "\\") {
      const [bytes, next] = readEscape(text, j + 1);
      byte = bytes[0];
      j = next;
    } else {
      byte = text.codePointAt(j);
      j += byte > 0xffff ? 2 : 1;
    }
    return [[(byte & 0xff) | 0x80], j];
  }

  // any other escaped character is the character itself
  const cp = text.codePointAt(i);
  return [utf8Bytes(String.fromCodePoint(cp), []), i + (cp > 0xffff ? 2 : 1)];
}

// The bytes of a literal's raw source text, one segment per line as the
// parser gem split it: a segment ends after each newline that is part of
// the value (a backslash-newline continuation in a double-quoted literal
// joins two lines without a split).
export function literalSegments(raw, kind, opening = null) {
  const segments = [];
  let current = [];
  const delims = delimiters(opening);
  const endSegment = () => {
    segments.push(current);
    current = [];
  };

  for (let i = 0; i < raw.length;) {
    const ch = raw[i];

    if (ch === "\\" && kind !== "raw") {
      const next = raw[i + 1];
      if (kind === "double") {
        if (next === "\n") {
          i += 2;
          continue;
        }
        const [bytes, j] = readEscape(raw, i + 1);
        current.push(...bytes);
        i = j;
        continue;
      }
      // single-quoted and word lists: only \\, the delimiters (and
      // whitespace in word lists) can be escaped
      if (next === "\\" || delims.includes(next) || (kind === "words" && /\s/.test(next || ""))) {
        utf8Bytes(next, current);
        i += 2;
        if (next === "\n") endSegment();
        continue;
      }
      current.push(0x5c);
      i += 1;
      continue;
    }

    const cp = raw.codePointAt(i);
    const char = String.fromCodePoint(cp);
    utf8Bytes(char, current);
    i += char.length;
    if (char === "\n") endSegment();
  }

  if (current.length > 0 || segments.length === 0) endSegment();
  return segments;
}

// Decodes bytes as UTF-8; returns null if they are not valid UTF-8.
const decoder = new TextDecoder("utf-8", { fatal: true });
export function decodeUtf8(bytes) {
  try {
    return decoder.decode(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}

const BYTE_ESCAPES = { 0x0a: "\\n", 0x09: "\\t", 0x0d: "\\r", 0x0c: "\\f", 0x0b: "\\v", 0x08: "\\b", 0x07: "\\a", 0x1b: "\\e", 0x22: '\\"', 0x5c: "\\\\" };

function hexByte(b) {
  return "\\x" + b.toString(16).toUpperCase().padStart(2, "0");
}

// String#inspect of a binary (ASCII-8BIT) or US-ASCII string.
export function inspectBinary(bytes) {
  let out = '"';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (BYTE_ESCAPES[b]) out += BYTE_ESCAPES[b];
    else if (b === 0x23) {
      const next = bytes[i + 1];
      out += next === 0x7b || next === 0x24 || next === 0x40 ? "\\#" : "#";
    } else if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
    else out += hexByte(b);
  }
  return out + '"';
}

// Length of the valid UTF-8 sequence at bytes[i], or 0 if invalid.
function utf8SequenceLength(bytes, i) {
  const b = bytes[i];
  let len;
  if (b < 0x80) return 1;
  if (b >= 0xc2 && b <= 0xdf) len = 2;
  else if (b >= 0xe0 && b <= 0xef) len = 3;
  else if (b >= 0xf0 && b <= 0xf4) len = 4;
  else return 0;
  if (i + len > bytes.length) return 0;
  return decodeUtf8(bytes.slice(i, i + len)) === null ? 0 : len;
}

// String#inspect of a UTF-8 string with invalid bytes: valid characters as
// usual, invalid bytes as \xHH.
export function inspectBrokenUtf8(bytes) {
  let out = '"';
  for (let i = 0; i < bytes.length;) {
    const len = utf8SequenceLength(bytes, i);
    if (len === 0) {
      out += hexByte(bytes[i]);
      i += 1;
    } else if (bytes[i] === 0x23) {
      const next = bytes[i + 1];
      out += next === 0x7b || next === 0x24 || next === 0x40 ? "\\#" : "#";
      i += 1;
    } else {
      out += rubyInspect(decodeUtf8(bytes.slice(i, i + len))).slice(1, -1);
      i += len;
    }
  }
  return out + '"';
}

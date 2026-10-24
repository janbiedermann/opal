// A text document the client has open: source, version, incremental edits
// and the memoized parse (port of ../document.rb plus the RubyDocument half
// of ../ruby_document.rb - in JS one class covers both).
//
// Positions are LSP {line, character} with character in UTF-16 code units -
// the unit JS strings are measured in - so an edit splices the source with
// plain slice arithmetic. Only utf-16 exists here: it is what initialize
// offers (LSP.md §1/§3).
import { ParseResult } from "./parse_result.mjs";
import { childNodes } from "./node.mjs";

// Line start offsets (UTF-16 units) for a source string, splitting on
// \r\n, \r and \n as LSP line semantics require.
function lineOffsets(s) {
  const offs = [0];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 10) {
      offs.push(i + 1);
    } else if (c === 13) {
      offs.push(i + 1);
      if (s.charCodeAt(i + 1) === 10) i++;
    }
  }
  return offs;
}

// An LSP {line, character} position to a UTF-16 offset, clamped so a
// client racing its own edits cannot slice outside the source.
function offsetFor(offs, length, line, character) {
  if (line >= offs.length) return length;
  const lineStart = offs[line];
  const nextStart = line + 1 < offs.length ? offs[line + 1] : length + 1;
  let off = lineStart + character;
  if (off > nextStart - 1) off = nextStart - 1; // end of line, before the newline
  return off > length ? length : off;
}

export class Document {
  constructor({ uri, source, version = 0, languageId = "ruby" }) {
    this.uri = uri;
    this.source = source;
    this.version = version;
    this.languageId = languageId;
    this.needsParsing = true;
    this.parseResult = null;
  }

  // Reparse when the source changed; the parse is one pass of Opal's
  // parser and stays on the keystroke path (the compile gate of LSP.md §2
  // does not - it runs on save, P5).
  parse() {
    if (this.needsParsing) {
      this.parseResult = new ParseResult(this.source);
      this.needsParsing = false;
    }
    return this.parseResult;
  }

  get syntaxError() {
    return this.parse().syntaxError;
  }

  get diagnostics() {
    return this.parse().diagnostics();
  }

  // LSP TextDocumentContentChangeEvent[]: each change replaces a range
  // with its text, in order. A change without a range replaces the whole
  // source (sync kind Full, kept for robustness).
  pushEdits(changes) {
    for (const change of changes) {
      const range = change.range;
      if (range == null) {
        this.source = change.text ?? "";
        continue;
      }
      const text = change.text ?? "";
      const offs = lineOffsets(this.source);
      const a = offsetFor(offs, this.source.length, range.start.line, range.start.character);
      const b = offsetFor(offs, this.source.length, range.end.line, range.end.character);
      this.source = this.source.slice(0, a) + text + this.source.slice(b);
    }
    this.needsParsing = true;
  }

  // The innermost node containing an LSP {line, character} position (and
  // the chain of nodes containing it, innermost first): the shape
  // ruby-lsp's locate_node answers, used by selectionRange and by the
  // on-type-formatting `end` auto-indent.
  locateNode(line, character) {
    const result = this.parse();
    const offset = result.offsetFor(line, character);
    const containing = [];
    const stack = [result.ast];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!(node.location.start <= offset && offset <= node.location.end)) continue;
      containing.push(node);
      stack.push(...childNodes(node));
    }
    containing.sort((a, b) => a.location.end - a.location.start - (b.location.end - b.location.start));
    return { node: containing[0] ?? null, ancestors: containing };
  }
}

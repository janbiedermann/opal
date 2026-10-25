// One parse of a document through Opal's own parser (lib/opal/parser, the
// Prism 1.9 port): the parse gate of LSP.md §2. Port of the JS-facing half
// of ../prism/parser.rb - and unlike the Ruby original this is a plain JS
// class over the envelope, no bridge anywhere.
//
// The envelope ({ast, comments, magic_comments, errors, warnings, offsets,
// ...}) carries UTF-16 code-unit offsets - LSP's default position unit,
// since JS strings are UTF-16 - so offset -> Position is a binary search
// over the envelope's own line table and Position -> offset is
// line_start + character. No code-unit conversion anywhere.
import { parseWithMetadata } from "../../parser/index.mjs";

export class ParseResult {
  constructor(source) {
    this.source = source;
    this.envelope = parseWithMetadata(source);
    this.offsets = this.envelope.offsets;
    this.lineCount = this.offsets.length;
  }

  get syntaxError() {
    return this.envelope.errors.length > 0;
  }

  get errorCount() {
    return this.envelope.errors.length;
  }

  get warningCount() {
    return this.envelope.warnings.length;
  }

  // The parse tree root: the raw Prism POJO. Features visit POJOs
  // directly (js/node.mjs supplies the generic child walk).
  get ast() {
    return this.envelope.ast;
  }

  // The envelope's comments: {type: "inline"|"embdoc", start:, end:} -
  // raw UTF-16 offsets, not location objects (they are not AST nodes).
  get comments() {
    return this.envelope.comments;
  }

  // [line, character] (both 0-based, both UTF-16 units) for a UTF-16
  // offset into the parsed source.
  positionAt(offset) {
    let lo = 0;
    let hi = this.lineCount - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.offsets[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return [lo, offset - this.offsets[lo]];
  }

  // The inverse: an LSP {line, character} to a UTF-16 offset, clamped to
  // the line end and the source (the same defense Document#pushEdits
  // uses against a client racing its own edits).
  offsetFor(line, character) {
    if (line >= this.lineCount) return this.source.length;
    let off = this.offsets[line] + character;
    const lineEnd = (line + 1 < this.lineCount ? this.offsets[line + 1] : this.source.length + 1) - 1;
    if (off > lineEnd) off = lineEnd;
    return off > this.source.length ? this.source.length : off;
  }

  // An LSP Range for a Prism loc POJO ({start, end} UTF-16 offsets, the
  // optional *_loc fields), or null when the loc is absent.
  rangeForLoc(loc) {
    if (loc === null || loc === undefined) return null;
    return {
      start: this.position(loc.start),
      end: this.position(loc.end),
    };
  }

  // An LSP Range for an AST node's own location.
  rangeForNode(node) {
    if (node === null || node === undefined) return null;
    return {
      start: this.position(node.location.start),
      end: this.position(node.location.end),
    };
  }

  // A whole source line as an LSP Range: wide enough that a position
  // inside the line overlaps it, which is what makes a line-level warning
  // associable with code actions.
  lineRange(line) {
    if (line < 0) line = 0;
    if (line >= this.lineCount) line = this.lineCount - 1;
    const endAt = line + 1 < this.lineCount ? this.offsets[line + 1] - 1 : this.source.length;
    return { start: { line, character: 0 }, end: this.position(endAt) };
  }

  position(offset) {
    const [line, character] = this.positionAt(offset);
    return { line, character };
  }

  // The parse gate as LSP Diagnostics: errors as severity 1, parser
    // warnings as severity 2, carrying the Prism diagnostic id as code.
  diagnostics() {
    return [...this.diagnosticsFrom("errors", 1), ...this.diagnosticsFrom("warnings", 2)];
  }

  diagnosticsFrom(key, severity) {
    const list = [];
    for (const d of this.envelope[key]) {
      const start = this.position(d.start);
      const end = this.position(d.end);
      list.push({ range: { start, end }, message: d.message, severity, source: "opal", code: d.type });
    }
    return list;
  }
}

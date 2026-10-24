// The textDocument/onTypeFormatting request (port of
// ../../features/on_type_formatting.rb): edits applied as the user
// types (trigger characters "{", "\n", "|", "d"). A direct port of
// ruby-lsp's request - its logic is lines and regexes, not AST, except
// the `end` auto-indent which uses Document#locateNode.
// $0 snippet anchors to move the cursor are only emitted for clients
// that implement snippets (VS Code, Cursor, VSCodium, Windsurf).

const END_REGEXES = [
  /\b(if|unless|for|while|until)\b($|\s|\()/,
  /\b(class|module|def|case)\b($|\s)/,
  /.*\s\bdo\b($|\s)/,
];

const SNIPPET_CLIENTS = /^(Visual Studio Code|Cursor|VSCodium|Windsurf)$/;

export function perform(document, params, clientName) {
  document.parse();
  return new OnTypeFormatter(document.source.split(/(?<=\n)/), document,
    params.position, params.ch, clientName ?? "").perform();
}

class OnTypeFormatter {
  constructor(lines, document, position, triggerCharacter, clientName) {
    this.lines = lines;
    this.document = document;
    const line = lines[Math.max(position.line - 1, 0)];
    this.indentation = line === undefined ? 0 : findIndentation(line);
    this.previousLine = line === undefined ? "" : line.trim();
    this.position = position;
    this.edits = [];
    this.triggerCharacter = triggerCharacter;
    this.clientName = clientName;
  }

  perform() {
    switch (this.triggerCharacter) {
      case "{":
        if (this.document.syntaxError) this.handleCurlyBrace();
        break;
      case "|":
        if (this.document.syntaxError) this.handlePipe();
        break;
      case "\n": {
        const commentMatch = /^#(?!:)(\s*)/.exec(this.previousLine);
        if (commentMatch !== null) {
          this.handleCommentLine(commentMatch[1]);
        } else if (this.document.syntaxError) {
          const match = /<<(-?~?)(['"`]?)(\w+)\2/.exec(this.previousLine);
          if (match !== null) this.handleHeredocEnd(match[3]);
          else this.handleStatementEnd();
        }
        break;
      }
      case "d":
        this.autoIndentAfterEndKeyword();
        break;
      default:
    }
    return this.edits;
  }

  handlePipe() {
    const currentLine = this.lines[this.position.line];
    if (!/((?<=do)|(?<={))\s+\|/.test(currentLine)) return;

    const line = currentLine;
    // The user closed the parameter list manually: drop the extra pipe
    // the completion added, instead of adding another.
    if (/(do|{)\s+\|[^|]*\|\|$/.test(line.slice(0, this.position.character + 1))) {
      // end_character 1 is what the Ruby original passes (kept verbatim:
      // the tests pin the resulting edit).
      this.addEdit("", this.position.line, this.position.character, 1);
    } else {
      this.addEdit("|", this.position.line, this.position.character);
    }
    this.moveCursor(this.position.line, this.position.character);
  }

  handleCurlyBrace() {
    if (!/".*#\{/.test(this.previousLine)) return;
    this.addEdit("}", this.position.line, this.position.character);
    this.moveCursor(this.position.line, this.position.character);
  }

  handleStatementEnd() {
    // A keyword inside a comment or string literal may be coincidental.
    if (/^["'#]/.test(this.previousLine)) return;
    if (!END_REGEXES.some((regex) => regex.test(this.previousLine))) return;
    // Endless methods (`def foo = 42`) are already complete.
    if (/\bdef\s+[\w.]+[!?=]?(\([^)]*\))?\s*=[^=~>]/.test(this.previousLine)) return;

    const indents = " ".repeat(this.indentation);
    const currentLine = this.lines[this.position.line];
    const nextLine = this.lines[this.position.line + 1];

    if (currentLine === undefined || currentLine.trim() === "" || currentLine.includes(")") || currentLine.includes("]")) {
      this.addEdit(`\n${indents}end`, this.position.line, this.position.character);
      this.moveCursor(this.position.line, this.indentation + 2);
    } else if (nextLine === undefined || nextLine.trim() === "") {
      this.addEdit(`${indents}end\n`, this.position.line + 1, 0);
      this.moveCursor(this.position.line - 1, this.indentation + this.previousLine.length + 1);
    }
  }

  handleHeredocEnd(delimiter) {
    const indents = " ".repeat(this.indentation);
    this.addEdit(`\n${indents}${delimiter}`, this.position.line, this.position.character);
    this.moveCursor(this.position.line, this.indentation + 2);
  }

  handleCommentLine(spaces) {
    this.addEdit(`#${spaces}`, this.position.line, this.position.character);
  }

  autoIndentAfterEndKeyword() {
    const currentLine = this.lines[this.position.line];
    if (currentLine === undefined || currentLine.trim() !== "end") return;

    const context = this.document.locateNode(this.position.line, this.position.character - 1);
    const target = context.node;
    if (target == null || !["IfNode", "UnlessNode", "ForNode", "WhileNode", "UntilNode"].includes(target.type)) return;

    const statements = target.statements;
    if (statements == null) return;

    const currentIndentation = findIndentation(currentLine);
    const parseResult = this.document.parse();
    for (const node of statements.body ?? []) {
      const [lineStart, columnStart] = parseResult.positionAt(node.location.start);
      const [lineEnd] = parseResult.positionAt(node.location.end);
      if (columnStart !== currentIndentation) continue;
      for (let line = lineStart; line <= lineEnd; line++) {
        this.addEdit("  ", line, 0);
      }
    }
    this.moveCursor(this.position.line, this.position.character);
  }

  addEdit(text, line, character, endCharacter = character) {
    const point = { line, character };
    this.edits.push({
      range: { start: point, end: { line, character: endCharacter } },
      newText: text,
    });
  }

  moveCursor(line, character) {
    if (!SNIPPET_CLIENTS.test(this.clientName)) return;
    // $0 is the snippet anchor VS Code moves the caret to after the
    // edit applies (the other clients ignore snippet syntax).
    this.addEdit("$0", line, character);
  }
}

function findIndentation(line) {
  let count = 0;
  while (line[count] === " ") count++;
  return count;
}

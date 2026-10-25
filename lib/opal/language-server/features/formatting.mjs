// textDocument/formatting (LSP.md §9 P7; port of
// ../../features/formatting.rb): the server never formats. It delegates
// to an external formatter command configured through
// initializationOptions.formatter or OPAL_LSP_FORMATTER (a full shell
// command line like `st --baseline`), fed the document source on stdin,
// answering the formatted text on stdout. Formatting is whitespace, not
// a language claim, so an outside tool bends nothing; the command is
// whatever the user configured, and an absent or failing one answers
// null - the client simply keeps the buffer (degrading silently, as the
// plan asks).
import { spawnSync } from "node:child_process";

export function perform(document, command) {
  if (command == null) return null;
  let out;
  try {
    const r = spawnSync(String(command), {
      shell: true, input: String(document.source),
      encoding: "utf8", timeout: 10_000, maxBuffer: 33554432,
    });
    out = r.status === 0 && typeof r.stdout === "string" ? r.stdout : null;
  } catch {
    out = null;
  }
  if (out === null) return null;
  const [line, character] = document.parse().positionAt(document.source.length);
  return [{
    range: {
      start: { line: 0, character: 0 },
      end: { line, character },
    },
    newText: out,
  }];
}

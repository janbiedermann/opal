// Batch mode: run the parse gate over a tree and answer a process exit
// status - CI's way to ask "does everything here parse under Opal?" with no
// protocol involved (LSP.md §6; port of ../check.rb).
import fs from "node:fs";
import path from "node:path";
import { ParseResult } from "./parse_result.mjs";

const SEVERITIES = { 1: "error", 2: "warning", 3: "information", 4: "hint" };

function rubyFiles(dir) {
  // Dir.glob(File.join(dir, "**", "*.rb")).sort: recursive, *.rb only, and
  // glob does not descend into dot-directories or match dotfiles.
  const found = [];
  const walk = (current) => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".rb")) found.push(full);
    }
  };
  walk(dir);
  found.sort();
  return found;
}

export function run(dir) {
  const files = rubyFiles(dir);
  let errors = 0;
  let warnings = 0;

  for (const file of files) {
    const result = new ParseResult(fs.readFileSync(file, "utf8"));
    for (const diagnostic of result.diagnostics()) {
      const severity = diagnostic.severity;
      if (severity === 1) errors++;
      if (severity === 2) warnings++;
      const start = diagnostic.range.start;
      // human output is 1-based, LSP positions are 0-based
      console.log(`${file}:${start.line + 1}:${start.character + 1}: ` +
                  `${SEVERITIES[severity]}: ${diagnostic.message} [${diagnostic.code}]`);
    }
  }

  console.log(`opal-lsp: ${files.length} files, ${errors} errors, ${warnings} warnings`);
  return errors === 0 ? 0 : 1;
}

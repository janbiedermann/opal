// Reads files from Opal's load paths. Port of lib/opal/path_reader.rb.
import { readFileSync, existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { FileFinder } from "./file_finder.mjs";

export const DEFAULT_EXTENSIONS = [".js", ".js.rb", ".rb", ".opalerb"];
const RELATIVE_PATH = /^\.?\.\//;

export class PathReader {
  constructor(paths = [], extensions = DEFAULT_EXTENSIONS) {
    this.fileFinder = new FileFinder();
    this.fileFinder.appendPaths(...paths);
    this.fileFinder.appendExtensions(...extensions);
  }

  // The file's source as UTF-8 text, or null if it isn't found.
  read(path) {
    const fullPath = this.expand(path);
    if (fullPath == null || !existsSync(fullPath)) return null;
    return decodeSource(readFileSync(fullPath));
  }

  expand(path) {
    if (isAbsolute(path) || RELATIVE_PATH.test(path)) return path;
    return this.fileFinder.find(path);
  }

  get paths() {
    return this.fileFinder.paths;
  }

  get extensions() {
    return this.fileFinder.extensions;
  }

  appendPaths(...paths) {
    this.fileFinder.appendPaths(...paths);
  }
}

// Decodes a source file: UTF-8 unless an encoding magic comment on the first
// two lines names another encoding TextDecoder knows (potch works on UTF-8
// text, see POTCH.md).
export function decodeSource(buffer) {
  const head = buffer.subarray(0, 400).toString("latin1");
  const m = /^(?:#![^\n]*\n)?#.*(?:en)?coding[:=]\s*([\w.-]+)/m.exec(head.split("\n").slice(0, 2).join("\n"));
  const encoding = m && m[1].toLowerCase();
  if (encoding && !["utf-8", "utf8", "binary", "ascii-8bit", "us-ascii"].includes(encoding)) {
    try {
      return new TextDecoder(encoding).decode(buffer);
    } catch {
      // unknown to TextDecoder: read as UTF-8
    }
  }
  return new TextDecoder("utf-8").decode(buffer);
}

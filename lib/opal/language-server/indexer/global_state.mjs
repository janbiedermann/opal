// The server's long-lived state (LSP.md §5; full port of
// ../../indexer/global_state.rb): the Index with the baked corelib/stdlib
// payload loaded at startup, the live records of open and workspace
// documents, and the client info the features read (opalHome from
// initializationOptions decides whether navigation into corelib lands
// in the checkout or on a dumped copy).
import { readFileSync, readdirSync } from "node:fs";
import bakedIndex from "../baked_index.mjs";
import { Index } from "./index.mjs";
import * as FileResolver from "./file_resolver.mjs";

export class GlobalState {
  static WORKSPACE_FILE_LIMIT = 300;

  constructor() {
    this.clientCapabilities = {};
    this.clientName = "";
    this.opalHome = null;
    this.formatter = null;
    this.index = new Index(bakedIndex ?? null);
  }

  // Answered from initialize: client info, the optional opalHome, and
  // the workspace index of the client's folders. Answers a summary
  // string for the logMessage.
  clientInitialized(params) {
    this.clientCapabilities = params.capabilities ?? {};
    this.clientName = params.clientInfo?.name ?? "";
    const init = params.initializationOptions ?? {};
    this.opalHome = init.opalHome ?? null;
    // External formatter command (LSP.md §9 P7): none configured, none
    // advertised. The environment is the fallback for clients that
    // cannot send initializationOptions.
    this.formatter = init.formatter ?? process.env.OPAL_LSP_FORMATTER ?? null;

    const summary = [];
    const stale = this.opalHome != null ? this.reindexStaleCorelib() : 0;
    // Only a notable outcome gets a logMessage: an empty or all-quiet
    // summary sends no notification at all (a stray message would shift
    // the publish/response sequence for clients and tests).
    if (stale > 0) summary.push(`${stale} stale corelib files re-indexed`);
    const [count, skipped] = this.indexWorkspaceFolders(params.workspaceFolders);
    if (count != null && count > 0) {
      // The "(limit hit)" flag mirrors the Ruby original, where the
      // workspace walk stops indexing at the limit but never sets the
      // flag - parity first, the cosmetic fix is a separate change.
      summary.push(`${count} workspace files indexed${skipped ? " (limit hit)" : ""}`);
    }
    return summary.join("; ");
  }

  // A checkout beside the exe beats the bake when files moved: the
  // digest of every baked file is recomputed and changed files are
  // indexed live under their checkout-relative key (live records
  // shadow baked ones in every query).
  reindexStaleCorelib() {
    const digests = this.index.baked ? this.index.baked.digests : null;
    if (digests == null) return 0;
    let count = 0;
    for (const rel of Object.keys(digests)) {
      const path = FileResolver.joinPaths(this.opalHome, rel);
      let source;
      try {
        source = readFileSync(path, "utf8");
      } catch {
        continue;
      }
      if (digest(source) === digests[rel]) continue;
      this.index.indexSource(rel, source);
      count++;
    }
    return count;
  }

  // The client's workspaceFolders: every *.rb under them (bounded) joins
  // the live index keyed by its uri, so references/rename see closed
  // files too.
  indexWorkspaceFolders(folders) {
    if (folders == null || folders.length === 0) return [null, false];
    let indexed = 0;
    for (const folder of folders) {
      const uri = folder.uri;
      if (typeof uri !== "string" || !uri.startsWith("file://")) continue;
      const root = decodeURIComponent(uri.slice(7));
      walkRuby(root, 0, (absPath, fileUri) => {
        if (indexed >= GlobalState.WORKSPACE_FILE_LIMIT) return;
        let source;
        try {
          source = readFileSync(absPath, "utf8");
        } catch {
          return;
        }
        this.index.indexSource(fileUri, source);
        indexed++;
      });
    }
    return [indexed, false];
  }

  // One workspace file from disk (workspace/didChangeWatchedFiles):
  // indexSource replaces its live records whole. Answers whether the
  // file was readable (a Created event can race a file that is already
  // gone again).
  indexWorkspaceFile(uri) {
    if (typeof uri !== "string" || !uri.startsWith("file://")) return false;
    const path = decodeURIComponent(uri.slice(7));
    let source;
    try {
      source = readFileSync(path, "utf8");
    } catch {
      return false;
    }
    this.index.indexSource(uri, source);
    return true;
  }
}

// depth-bounded so a workspace never drags in node_modules-scale
// trees; .rb only, hidden dirs skipped.
function walkRuby(dir, depth, onFile) {
  if (depth > 6) return;
  let list;
  try {
    list = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of list) {
    if (entry.name.startsWith(".")) continue;
    const full = dir + "/" + entry.name;
    if (entry.isDirectory()) walkRuby(full, depth + 1, onFile);
    else if (entry.name.endsWith(".rb")) onFile(full, "file://" + full);
  }
}

// Keep digest in sync with indexer/driver.rb's (the bake wrote the
// other half of these digests).
function digest(source) {
  const s = String(source);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16) + "-" + s.length;
}

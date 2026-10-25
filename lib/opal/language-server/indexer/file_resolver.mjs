// Resolving an index record's file key to a uri the editor can open
// (LSP.md §5; port of ../../indexer/file_resolver.rb). Baked records carry
// checkout-relative paths ("opal/corelib/string.rb"), live records carry
// document uris. With opalHome (the initialization option pointing at an
// Opal checkout) relative paths resolve into the checkout; without one the
// file is dumped once from the baked corelib_sources.mjs into
// ~/.cache/opal-lsp/sources, so a bare exe still has something for F12 to
// open.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import corelibSources from "../corelib_sources.mjs";

export function uriFor(file, opalHome) {
  if (file.startsWith("file://")) return file;
  if (opalHome != null) return "file://" + joinPaths(opalHome, file);
  return "file://" + dump(file);
}

export function joinPaths(home, rel) {
  if (home.endsWith("/")) home = home.slice(0, -1);
  return home + "/" + rel;
}

// The cached copy of one baked file; writes it on first use.
// Returns the absolute path, or null when the bake has no such file.
export function dump(file) {
  const src = corelibSources[file];
  if (src == null) return null;
  const cache = String(process.env.HOME || process.env.USERPROFILE || process.env.TMPDIR || "/tmp");
  const path = cache + "/.cache/opal-lsp/sources/" + file;
  if (!existsSync(path)) {
    mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
    writeFileSync(path, src);
  }
  return path;
}

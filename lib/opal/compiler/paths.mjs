// Opal's own location and default load paths (lib/opal/paths.rb).
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { realpathSync } from "node:fs";

// The root of the Opal checkout (Opal.gem_dir).
export const OPAL_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");

// Opal's default load paths: its own opal/, stdlib/ and lib/ directories.
export function defaultPaths() {
  return ["opal", "stdlib", "lib"].map((dir) => {
    const path = resolve(OPAL_ROOT, dir);
    try {
      return realpathSync(path);
    } catch {
      return path;
    }
  });
}

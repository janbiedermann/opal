// Opal's own location and default load paths (lib/opal/paths.rb).
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { evaluateOpalfile } from "./builder/project.mjs";
import { readFileSync } from "node:fs";

// The root of the Opal checkout (Opal.gem_dir).
export const OPAL_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");

// Opal's default load paths (opal/, stdlib/, lib/), from its Opalfile.
export function defaultPaths() {
  const paths = [];
  evaluateOpalfile(readFileSync(resolve(OPAL_ROOT, "Opalfile"), "utf8"), OPAL_ROOT, {
    appendPaths: (...p) => paths.push(...p),
  }, () => {});
  return paths;
}

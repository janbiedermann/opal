// Runs the program with Node.js (lib/opal/cli_runners/nodejs.rb).
import { delimiter, join } from "node:path";
import { OPAL_ROOT } from "../../paths.mjs";
import { systemRunner, shellwords } from "./system.mjs";

export const NODE_PATH = join(OPAL_ROOT, "stdlib", "nodejs", "node_modules");
const DIR = join(OPAL_ROOT, "lib", "opal", "dependencies");

// NODE_PATH with stdlib's node_modules in it
export function nodeModules() {
  const paths = (process.env.NODE_PATH || "").split(delimiter).filter(Boolean);
  if (!paths.includes(NODE_PATH)) paths.push(NODE_PATH);
  return paths.join(delimiter);
}

export function nodejs(data) {
  data.options = { ...(data.options || {}), env: { NODE_PATH: nodeModules() } };
  const argv = [...(data.argv || [])];
  if (argv.length) argv.unshift("--");
  const opts = shellwords(process.env.NODE_OPTS);
  const exe = process.env.NODE_EXE || "node";
  return systemRunner(data, (path) => {
    const args = [exe, "--require", `${DIR}/source-map-support-node`, ...opts, path, ...argv];
    if (process.env.NODE_FLAME) args.unshift("0x", "--");
    return args;
  }, { missing: process.env.NODE_EXE ? `${process.env.NODE_EXE} (from NODE_EXE) not found` : "Please install Node.js to be able to run Opal scripts." });
}

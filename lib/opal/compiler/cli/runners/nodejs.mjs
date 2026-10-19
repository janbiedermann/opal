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
  // OPAL_HOME names this checkout to the program that runs, the same constant
  // tasks/ruby/bundle.mjs bakes into exe/ruby: the gem port reaches its HTTP
  // transport (lib/opal/gems/http.mjs) through it, because a file that was
  // compiled into the program has no directory of its own any more.
  data.options = { ...(data.options || {}), env: { NODE_PATH: nodeModules(), OPAL_HOME: OPAL_ROOT } };
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

// Runs the program with Node.js (lib/opal/cli_runners/nodejs.rb).
import { delimiter, join } from "node:path";
import { systemRunner, shellwords } from "./system.mjs";
import { drillHome } from "../paths.mjs";

// NODE_PATH with stdlib's node_modules in it - the npm packages a program
// may require. Without a tree (a standalone exe/drill.exe) the program
// answers its npm requires from its own cwd and the inherited NODE_PATH.
export function nodeModules() {
  const paths = (process.env.NODE_PATH || "").split(delimiter).filter(Boolean);
  const home = drillHome();
  if (home) {
    const stdlibModules = join(home, "stdlib", "nodejs", "node_modules");
    if (!paths.includes(stdlibModules)) paths.push(stdlibModules);
  }
  return paths.join(delimiter);
}

export function nodejs(data) {
  const home = drillHome();
  // OPAL_HOME names the checkout to the program that runs: the gem port reads
  // its HTTP transport (lib/opal/gems/http.cjs) from the tree through it -
  // compiled bundles embed the transport instead and ignore this. NODE_PATH
  // and the source-map shim go the same way: both come from the tree, and
  // node --require fails hard on a path a standalone exe can't have.
  const env = {};
  if (home) {
    env.NODE_PATH = nodeModules();
    env.OPAL_HOME = home;
  }
  data.options = { ...(data.options || {}), env };
  const argv = [...(data.argv || [])];
  if (argv.length) argv.unshift("--");
  const opts = shellwords(process.env.NODE_OPTS);
  const exe = process.env.NODE_EXE || "node";
  return systemRunner(data, (path) => {
    const args = [exe];
    if (home) args.push("--require", join(home, "lib", "opal", "dependencies", "source-map-support-node"));
    args.push(...opts, path, ...argv);
    if (process.env.NODE_FLAME) args.unshift("0x", "--");
    return args;
  }, { missing: process.env.NODE_EXE ? `${process.env.NODE_EXE} (from NODE_EXE) not found` : "Please install Node.js to be able to run Opal scripts." });
}

// Transitional re-export, until the opal/drill split is complete: `exe/opal`
// still runs programs, so its CLI keeps the whole registry — the runtime
// runners now in lib/opal/drill/runners/ plus the compile runner here. When
// opal becomes compiler-only, this file goes away and options.mjs stops
// naming runners.
import { platform } from "node:os";
import { RUNNERS as DRILL_RUNNERS } from "../../../drill/runners/index.mjs";
import { compiler } from "./compiler.mjs";

const isWindows = platform() === "win32";
const isMacos = platform() === "darwin";

export const RUNNERS = {
  chrome: DRILL_RUNNERS.chrome,
  compiler,
  firefox: DRILL_RUNNERS.firefox,
  nodejs: DRILL_RUNNERS.nodejs,
  server: DRILL_RUNNERS.server,
  node: DRILL_RUNNERS.node,
};
if (DRILL_RUNNERS.gjs) RUNNERS.gjs = DRILL_RUNNERS.gjs;
if (DRILL_RUNNERS.applescript) RUNNERS.applescript = DRILL_RUNNERS.applescript;
if (DRILL_RUNNERS.safari) RUNNERS.safari = DRILL_RUNNERS.safari;
if (DRILL_RUNNERS.osascript) RUNNERS.osascript = DRILL_RUNNERS.osascript;

// Runtimes for --compile-to-exe
export const EXE_RUNTIMES = ["node", ...(isMacos ? ["osascript"] : [])];

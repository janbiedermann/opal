// The runners `drill -R` can use (lib/opal/cli_runners.rb). A runner gets
// { options, output, argv, builder } (builder: a function returning a new
// builder) and returns (or resolves to) an exit status. The compile runner
// (compiler.mjs) is the `opal` CLI's own and stays in lib/opal/compiler.
import { platform } from "node:os";
import { nodejs } from "./nodejs.mjs";
import { server } from "./server.mjs";
import { gjs, applescript } from "./others.mjs";
import { chrome, firefox, safari } from "./browsers.mjs";

const isWindows = platform() === "win32";
const isMacos = platform() === "darwin";

export const RUNNERS = {
  chrome,
  firefox,
  nodejs,
  server,
  node: nodejs,
};
if (!isWindows && !isMacos) RUNNERS.gjs = gjs;
if (isMacos) {
  RUNNERS.applescript = applescript;
  RUNNERS.safari = safari;
  RUNNERS.osascript = applescript;
}

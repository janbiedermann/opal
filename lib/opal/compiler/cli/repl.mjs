// The Opal REPL (opal --repl, exe/opal-repl). Port of lib/opal/repl.rb:
// a runner process evaluates the compiled code (stdlib opal/repl_js.rb),
// this process reads lines and compiles them.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Builder } from "../builder/builder.mjs";
import { parseWithMetadata } from "../../potch/index.mjs";

const HISTORY_PATH = join(homedir(), ".opal-repl-history");
const OPAL_EXE = fileURLToPath(new URL("../../../../exe/opal", import.meta.url));

// Whether a syntax error only means the input isn't finished yet.
export function isIncomplete(code) {
  const { errors } = parseWithMetadata(code);
  return errors.some((e) =>
    (/end-of-input/.test(e.message) && !/expecting end-of-input/.test(e.message)) ||
    /_term(_end)?$|_eof$/.test(e.type) || /before EOF|meets end of file/.test(e.message));
}

export class REPL {
  constructor(runnerType = "nodejs") {
    this.runnerType = runnerType;
    this.colorize = true;
    this.incomplete = null;
    this.alreadyProcessed = new Set();
  }

  async run(argv = []) {
    this.loadOpal(argv);
    const history = existsSync(HISTORY_PATH) ? readFileSync(HISTORY_PATH, "utf8").split("\n").filter(Boolean).reverse() : [];
    const rl = createInterface({ input: process.stdin, output: process.stdout, history, historySize: 1000, terminal: process.stdin.isTTY });
    const prompt = () => rl.setPrompt(this.incomplete ? ".. " : ">> ") || rl.prompt();
    rl.on("SIGINT", () => {
      this.incomplete = null;
      process.stdout.write("\n");
      prompt();
    });
    prompt();
    for await (const line of rl) {
      rl.pause();
      await this.evalRuby(line);
      if (this.exited) break;
      rl.resume();
      prompt();
    }
    try {
      writeFileSync(HISTORY_PATH, [...rl.history].reverse().slice(-1000).join("\n"));
    } catch {
      // no history then
    }
    rl.close();
    this.pipe.stdin.end();
    return this.exitStatus || 0;
  }

  loadOpal(argv) {
    const args = [...argv.filter((a) => a !== "--repl"), "-R", this.runnerType, "--await", "-e", 'require "opal/repl_js"'];
    this.pipe = spawn(process.execPath, [OPAL_EXE, ...args], { stdio: ["pipe", "pipe", "inherit"] });
    this.pipe.stdin.on("error", () => {}); // the runner exited (see "exit")
    this.lines = createInterface({ input: this.pipe.stdout })[Symbol.asyncIterator]();
    this.pipe.on("exit", (code) => {
      this.exited = true;
      this.exitStatus = code;
    });
  }

  async evalRuby(input) {
    const code = `${this.incomplete || ""}${input}`;
    let mode = "inspect";
    let evalCode = code;
    if (code.startsWith("ls ")) {
      evalCode = code.slice(3);
      mode = "ls";
    } else if (code === "ls") {
      evalCode = "self";
      mode = "ls";
    } else if (code.startsWith("show ")) {
      evalCode = code.slice(5);
      mode = "show";
    }

    if (isIncomplete(evalCode)) {
      this.incomplete = `${code}\n`;
      return;
    }
    this.incomplete = null;

    let builder;
    try {
      builder = new Builder({ warn: () => {} });
      builder.alreadyProcessed = this.alreadyProcessed;
      builder.buildStr(evalCode, "(irb)", { irb: true, const_missing: true, await: true });
    } catch (e) {
      process.stderr.write(`${e.message}\n`);
      return;
    }

    try {
      for (const file of builder.processed.slice(0, -1)) await this.evalJs("silent", file.toString());
      const last = builder.processed[builder.processed.length - 1].toString();
      if (mode === "show") {
        process.stdout.write(last + "\n");
        return;
      }
      await this.evalJs(mode, last);
    } catch (e) {
      process.stdout.write(`${e.stack || e}\n`);
    }
  }

  async evalJs(mode, code) {
    if (this.exited) return;
    this.pipe.stdin.write(JSON.stringify({ mode, code, colors: this.colorize }) + "\n");
    for (;;) {
      const { value, done } = await this.lines.next();
      if (done || value === "<<<ready>>>") return;
      process.stdout.write(value + "\n");
    }
  }
}

// The compiler runner: writes the compiled JavaScript (or a directory of
// files) instead of running it. Port of lib/opal/cli_runners/compiler.rb;
// --watch uses fs.watch.
import { writeFileSync, watch, openSync, ftruncateSync, writeSync, closeSync, fstatSync } from "node:fs";
import { dirname } from "node:path";

export function compiler(data) {
  return new CompilerRunner(data).start();
}

class CompilerRunner {
  constructor(data) {
    this.options = data.options || {};
    this.builderFactory = data.builder;
    this.mapFile = this.options.map_file;
    this.output = data.output;
    this.watch = this.options.watch;
    this.directory = this.options.directory;
    this.err = data.err || ((s) => process.stderr.write(s));
  }

  compile() {
    const builder = this.builderFactory();
    if (this.directory) {
      builder.compileToDirectory(this.output, { withSourceMap: !this.options.no_source_map });
    } else {
      let code = builder.compiledSource({ withSourceMap: !this.options.no_source_map });
      if (!code.endsWith("\n")) code += "\n"; // like IO#puts
      if (typeof this.output === "string") {
        // a file: rewritten on every (re)compile
        const fd = openSync(this.output, "w");
        ftruncateSync(fd);
        writeSync(fd, code);
        closeSync(fd);
      } else {
        if (this.watch) this.failUnrewindable();
        this.output.write(code);
      }
      if (this.mapFile) writeFileSync(this.mapFile, JSON.stringify(builder.sourceMap.map()));
    }
    return builder;
  }

  compileNoraise() {
    try {
      return this.compile();
    } catch (e) {
      this.err(`* Compilation failed: ${e.message}\n`);
      return null;
    }
  }

  failUnrewindable() {
    this.err("You have specified --watch, but for watch to work, you must specify an\n--output file.\n");
    process.exit(1);
  }

  start() {
    if (!this.watch) {
      this.compile();
      return 0;
    }
    if (typeof this.output !== "string" || isTTY(this.output)) this.failUnrewindable();
    return this.watchCompile();
  }

  // Recompiles on changes of the files the program depends on; resolves
  // (never, until interrupted) to an exit status.
  watchCompile() {
    const builder = this.compile();
    let watchers = [];
    const rewatch = (files) => {
      for (const w of watchers) w.close();
      const directories = topmostDirectories(files.map((f) => dirname(f)));
      let timer = null;
      watchers = directories.map((dir) => watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.err(`* Modified code: ${filename}; rebuilding\n`);
          const rebuilt = this.compileNoraise();
          // Ignore the bad compilation
          if (rebuilt) rewatch(rebuilt.dependentFiles);
        }, 50);
      }));
    };
    rewatch(builder.dependentFiles);
    this.err("* Opal successfully compiled your program in --watch mode\n");
    return new Promise((resolve) => {
      process.on("SIGINT", () => {
        this.err("* Stopping watcher...\n");
        for (const w of watchers) w.close();
        resolve(0);
      });
    });
  }
}

function isTTY(path) {
  try {
    const fd = openSync(path, "r");
    const tty = fstatSync(fd).isCharacterDevice();
    closeSync(fd);
    return tty;
  } catch {
    return false;
  }
}

// Only the topmost directories
function topmostDirectories(dirs) {
  const out = [];
  for (const dir of [...new Set(dirs)].sort()) {
    if (out.length && (dir === out[out.length - 1] || dir.startsWith(out[out.length - 1] + "/"))) continue;
    out.push(dir);
  }
  return out;
}

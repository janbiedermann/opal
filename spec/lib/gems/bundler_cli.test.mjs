// The `bundle` command over the port's own repository (M8.2): exe/bundler
// locks, installs (--local, the remote sources wait for M8.4), lists and
// checks a fixture application against the gems exe/gem installed in a
// temporary repository, with a path gem beside the Gemfile. The runs stay
// hermetic: a private HOME, GEM_HOME and GEM_SPEC_CACHE, GEM_SOURCES empty,
// and every run gets its own application directory so a written
// Gemfile.lock never leaks between tests.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const GEM = join(OPAL_ROOT, "exe", "gem");
const RUBY = join(OPAL_ROOT, "exe", "ruby");
const BUNDLE = join(OPAL_ROOT, "exe", "bundler");
const DIR = mkdtempSync(join(tmpdir(), "opal-bundler-cli-"));

function env(extra = {}) {
  return {
    ...process.env,
    HOME: join(DIR, "home"),
    GEM_HOME: join(DIR, "repo"),
    GEM_PATH: join(DIR, "repo"),
    GEM_SPEC_CACHE: join(DIR, "specs"),
    GEM_SOURCES: "",
    ...extra,
  };
}

function run(command, cwd, extra, args) {
  const started = spawnSync(process.execPath, [command, ...args], { cwd, env: env(extra), encoding: "utf8" });
  return { out: started.stdout, err: started.stderr, status: started.status };
}

// The same run without blocking the event loop: a test that answers the
// command's own requests from this process needs it, or the child waits for
// an answer that cannot arrive (cli.test.mjs says the same for exe/gem).
function runAsync(command, cwd, extra, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: env(extra) });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ out, err, status }));
  });
}

function bundle(cwd, ...args) {
  return run(BUNDLE, cwd, {}, args);
}

// A gem source tree like bundler_local.test.mjs builds them, with optional
// runtime dependencies spliced into the gemspec.
function gemTree(name, version, dependencies = []) {
  const dir = join(DIR, `build-${name}`);
  mkdirSync(join(dir, "lib"), { recursive: true });
  const module = name[0].toUpperCase() + name.slice(1);
  writeFileSync(join(dir, "lib", `${name}.rb`), `module ${module}\nend\n`);
  const deps = dependencies.map(([dep, req]) => `  s.add_dependency ${JSON.stringify(dep)}, ${JSON.stringify(req)}`).join("\n");
  writeFileSync(join(dir, `${name}.gemspec`), `Gem::Specification.new do |s|
  s.name = ${JSON.stringify(name)}
  s.version = ${JSON.stringify(version)}
  s.summary = "the ${name} gem"
  s.authors = ["Opal"]
  s.licenses = ["MIT"]
  s.homepage = "https://example.com/${name}"
  s.files = ["lib/${name}.rb"]
  s.require_paths = ["lib"]
${deps}
end
`);
  return dir;
}

function builtGem(name, version, dependencies) {
  const dir = gemTree(name, version, dependencies);
  const built = run(RUBY, dir, {}, ["-e", "puts Gem::Package.build(Gem::Specification.load(ARGV[0]))", `${name}.gemspec`]);
  assert.equal(built.status, 0, built.err);
  return join(dir, built.out.trim().split("\n").pop());
}

// A path gem next to the application, declaring an executable so the
// install slice has a binstub to generate.
const PATHGEM = `Gem::Specification.new do |s|
  s.name = "pathgem"
  s.version = "0.1"
  s.summary = "the pathgem gem"
  s.authors = ["Opal"]
  s.licenses = ["MIT"]
  s.homepage = "https://example.com/pathgem"
  s.files = ["lib/pathgem.rb", "bin/pathgem-bin"]
  s.executables = ["pathgem-bin"]
  s.require_paths = ["lib"]
  s.add_dependency "hello", ">= 1.0"
end
`;

const GEMFILE = "source 'https://rubygems.org'\n\ngem 'hello', '~> 1.0'\ngem 'world'\ngem 'pathgem', path: 'pathgem'\n";

// every run gets its own application directory: the Gemfile.lock one test
// writes must not satisfy or shadow the next test's
let appCount = 0;
function app() {
  const dir = join(DIR, `app${appCount++}`);
  mkdirSync(join(dir, "pathgem", "lib"), { recursive: true });
  mkdirSync(join(dir, "pathgem", "bin"), { recursive: true });
  writeFileSync(join(dir, "Gemfile"), GEMFILE);
  writeFileSync(join(dir, "pathgem", "pathgem.gemspec"), PATHGEM);
  writeFileSync(join(dir, "pathgem", "lib", "pathgem.rb"), "module Pathgem\nend\n");
  writeFileSync(join(dir, "pathgem", "bin", "pathgem-bin"), "puts :pathgem\n");
  return dir;
}

describe("bundle command over a local repository", () => {
  before(() => {
    mkdirSync(join(DIR, "home"), { recursive: true });
    for (const gem of [builtGem("hello", "1.0.0"), builtGem("world", "0.5", [["hello", "~> 1.0"]])]) {
      const install = run(GEM, DIR, {}, ["install", "--local", "--no-document", gem]);
      assert.equal(install.status, 0, install.err + install.out);
    }
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  test("--version and version answer the port's version", () => {
    const dir = app();
    for (const args of [["--version"], ["-v"], ["version"]]) {
      const r = bundle(dir, ...args);
      assert.equal(r.status, 0, r.err);
      assert.equal(r.out.trim(), "4.1.0.opal");
    }
  });

  test("lock --local writes a readable lockfile", () => {
    const dir = app();
    const r = bundle(dir, "lock", "--local");
    assert.equal(r.status, 0, r.err);
    assert.match(r.out, /Writing lockfile to/);
    const lock = readFileSync(join(dir, "Gemfile.lock"), "utf8");
    assert.match(lock, /pathgem \(0\.1\)/);
    assert.match(lock, /hello \(1\.0\.0\)/);
    assert.match(lock, /world \(0\.5\)/);
    assert.match(lock, /BUNDLED WITH\n\s+4\.1\.0\.opal/);
    // the lock reads back: check finds everything installed
    const check = bundle(dir, "check");
    assert.equal(check.status, 0, check.err);
    assert.match(check.out, /The Gemfile's dependencies are satisfied/);
  });

  test("install --local resolves, installs the path gem and writes the lock", () => {
    const dir = app();
    const r = bundle(dir, "install", "--local");
    assert.equal(r.status, 0, r.err);
    assert.match(r.out, /Bundle complete! 3 Gemfile dependencies, 3 gems now installed/);
    assert.ok(existsSync(join(dir, "Gemfile.lock")), "install wrote the lockfile");
    // the path source's executable got its binstub in the repository's bin
    assert.ok(existsSync(join(DIR, "repo", "bin", "pathgem-bin")), "the path gem got its binstub");
    // the lockfile check and list read the install back
    const check = bundle(dir, "check");
    assert.equal(check.status, 0, check.err);
    assert.match(check.out, /dependencies are satisfied/);
  });

  test("list answers the bundle in human and json form", () => {
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);

    const r = bundle(dir, "list");
    assert.equal(r.status, 0, r.err);
    assert.match(r.out, /Gems included by the bundle:/);
    assert.match(r.out, /\* hello \(1\.0\.0\)/);
    assert.match(r.out, /\* pathgem \(0\.1\)/);

    const json = bundle(dir, "ls", "--format", "json", "--name-only");
    assert.equal(json.status, 0, json.err);
    const answer = JSON.parse(json.out.split("\n").filter((line) => line.startsWith("{")).pop());
    assert.deepEqual(answer.gems.map((g) => g.name), ["hello", "pathgem", "world"]);

    const only = bundle(dir, "list", "--name-only");
    assert.equal(only.status, 0, only.err);
    assert.deepEqual(only.out.trim().split("\n"), ["hello", "pathgem", "world"]);
  });

  test("aliases and global flags answer the same commands", () => {
    const dir = app();
    const install = bundle(dir, "i", "-j", "2", "--local", "--no-color");
    assert.equal(install.status, 0, install.err);
    assert.match(install.out, /Bundle complete!/);

    const check = bundle(dir, "c");
    assert.equal(check.status, 0, check.err);
    assert.match(check.out, /dependencies are satisfied/);
  });

  test("an unknown command and an unknown option answer exit 15", () => {
    const dir = app();
    const unknown = bundle(dir, "frobnicate");
    assert.equal(unknown.status, 15);
    assert.match(unknown.err, /Could not find command "frobnicate"\./);

    const option = bundle(dir, "install", "--frobnicate");
    assert.equal(option.status, 15);
    assert.match(option.err, /Could not find command-line option --frobnicate/);
  });

  test("removed remembered flags are rejected with their config replacement", () => {
    const dir = app();
    const r = bundle(dir, "install", "--deployment");
    assert.equal(r.status, 15);
    assert.match(r.err, /The `--deployment` flag has been removed/);
    assert.match(r.err, /bundle config set deployment true/);
  });

  test("help prints the ported command tables", () => {
    const dir = app();
    const r = bundle(dir, "help", "install");
    assert.equal(r.status, 0, r.err);
    assert.match(r.out, /bundle install \[options\]/);
    assert.match(r.out, /--local Do not attempt to fetch gems remotely/);

    const bare = bundle(dir, "-h");
    assert.equal(bare.status, 0, bare.err);
    assert.match(bare.out, /4\.1\.0\.opal/);
    assert.match(bare.out, /Bundler commands:/);
  });

  test("bundle exec loads the bundle's binstub in-process", () => {
    // set_bundle_environment puts the repository's bin on PATH, the
    // ruby-shebang binstub goes through the load path, and the gem's bin
    // file compiles in this process and runs with the bundle activated.
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);

    const r = bundle(dir, "exec", "pathgem-bin");
    assert.equal(r.status, 0, r.err);
    assert.equal(r.out.trim(), "pathgem");
  });

  test("bundle exec answers missing commands like Kernel.exec reports", () => {
    const dir = app();

    const spawned = bundle(dir, "exec", "cat", "Gemfile");
    assert.equal(spawned.status, 0, spawned.err);
    assert.match(spawned.out, /gem 'hello'/);

    const none = bundle(dir, "exec");
    assert.equal(none.status, 128);
    assert.match(none.err, /exec needs a command to run/);

    const r = bundle(dir, "exec", "nope-xyz");
    assert.equal(r.status, 127);
    assert.match(r.err, /bundler: command not found: nope-xyz/);
    assert.match(r.err, /Install missing gem executables/);

    const removed = bundle(dir, "exec", "--no-keep-file-descriptors", "cat", "Gemfile");
    assert.equal(removed.status, 15);
    assert.match(removed.err, /--no-keep-file-descriptors.*has been removed/);
  });

  test("a source that refuses connection is reported as a network failure", () => {
    // the remote story's offline answer: the transport's failed fetch becomes
    // a NetworkDownError, an HTTPError subclass, so the run ends with its
    // friendly report (status 17) rather than a lockfile or a crash.
    const dir = join(DIR, `unreach${appCount++}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "Gemfile"), "source 'http://127.0.0.1:1/ci/'\ngem 'tiny'\n");
    const r = run(BUNDLE, dir, { BUNDLE_RETRY: "0" }, ["lock"]);
    assert.equal(r.status, 17);
    // which of the three fetch probes dies first is the transport's choice,
    // so either the compact-index/dependency HTTPError or the full-index one
    // answers; both spellings pin the same failed loop.
    assert.match(r.err, /Could not fetch specs from|Could not reach host/);
    assert.ok(!existsSync(join(dir, "Gemfile.lock")), "no lockfile was written");
  });

  test("show, info and platform read the installed bundle", () => {
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);

    const show = bundle(dir, "show");
    assert.equal(show.status, 0, show.err);
    assert.match(show.out, /Gems included by the bundle:/);
    assert.match(show.out, /\* hello \(1\.0\.0\)/);

    const path = bundle(dir, "show", "pathgem");
    assert.equal(path.status, 0, path.err);
    assert.equal(path.out.trim(), join(dir, "pathgem"));

    const info = bundle(dir, "info", "world");
    assert.equal(info.status, 0, info.err);
    assert.match(info.out, /world \(0\.5\)/);
    assert.match(info.out, /Summary: the world gem/);

    const depended = bundle(dir, "info", "hello");
    assert.equal(depended.status, 0, depended.err);
    assert.match(depended.out, /world \(0\.5\) depends on hello/);

    const version = bundle(dir, "info", "world", "--version");
    assert.equal(version.status, 0, version.err);
    assert.equal(version.out.trim(), "0.5");

    const plat = bundle(dir, "platform");
    assert.equal(plat.status, 0, plat.err);
    assert.match(plat.out, /Your platform is:/);

    const ruby = bundle(dir, "platform", "--ruby");
    assert.equal(ruby.status, 0, ruby.err);
    assert.equal(ruby.out.trim(), "No ruby version specified");
  });

  test("show bundler names the executable that answers", () => {
    // A compiled bundle carries bundler inside it and names no checkout:
    // the program is the answer (SharedHelpers#program_path).
    const dir = app();
    const r = bundle(dir, "show", "bundler");
    assert.equal(r.status, 0, r.err);
    assert.equal(r.out.trim(), BUNDLE);
  });

  test("the bundle carries bundler and the stdlib, not a path to the checkout", () => {
    // The exe must run with nothing beside it: every require a loaded
    // binstub asks answers from inside, and nothing names the build tree.
    const bundleJs = readFileSync(BUNDLE, "utf8");
    assert.match(bundleJs, /OPAL_COMPILED_BUNDLE/);
    assert.ok(!bundleJs.includes(OPAL_ROOT), "the bundle must not name the checkout it was built in");
  });

  test("clean --dry-run has nothing to remove after a fresh install", () => {
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);
    const r = bundle(dir, "clean", "--dry-run");
    assert.equal(r.status, 0, r.err);
    assert.doesNotMatch(r.out, /Removing/);
  });

  test("bundler/setup activates the bundle for exe/ruby", () => {
    // the exit test of the M8.3a setup half: exe/ruby finds -r
    // bundler/setup inside its own bundle (the lib/ sweep compiled it in,
    // OPAL_HOME is gone), Bundler.setup resolves the lockfile and puts the
    // bundle's load paths on $LOAD_PATH, and the script's requires answer
    // from the gems.
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);
    const r = run(RUBY, dir, {}, ["-r", "bundler/setup", "-e",
      'require "hello"; require "world"; require "pathgem"; puts "activated"']);
    assert.equal(r.status, 0, r.err);
    assert.match(r.out, /activated/);
  });

  test("bundler/setup reports a missing bundle and exits with its status", () => {
    const dir = app();
    const empty = join(DIR, "empty-repo");
    mkdirSync(empty, { recursive: true });
    const r = run(RUBY, dir, { GEM_HOME: empty, GEM_PATH: empty },
      ["-r", "bundler/setup", "-e", 'puts "unreachable"']);
    assert.notEqual(r.status, 0);
    assert.match(r.err, /Could not find|install missing gems/);
    assert.match(r.err, /exe\/bundler install|bundle install/);
    assert.doesNotMatch(r.out, /unreachable/);
  });

  test("config set, get, list and unset round-trip the settings files", () => {
    const dir = app();

    const set = bundle(dir, "config", "set", "--local", "path", "vendor/bundle");
    assert.equal(set.status, 0, set.err);
    assert.match(readFileSync(join(dir, ".bundle", "config"), "utf8"), /BUNDLE_PATH.*vendor\/bundle/);

    const get = bundle(dir, "config", "get", "path");
    assert.equal(get.status, 0, get.err);
    assert.match(get.out, /Settings for `path` in order of priority/);
    assert.match(get.out, /vendor\/bundle/);

    const list = bundle(dir, "config", "list", "--parseable");
    assert.equal(list.status, 0, list.err);
    assert.match(list.out, /path=vendor\/bundle/);

    const global = bundle(dir, "config", "set", "--global", "dry_run", "true");
    assert.equal(global.status, 0, global.err);

    const unset = bundle(dir, "config", "unset", "--local", "path");
    assert.equal(unset.status, 0, unset.err);
    const gone = bundle(dir, "config", "get", "path");
    assert.equal(gone.status, 1);
    assert.match(gone.out, /You have not configured a value/);

    const unsetGlobal = bundle(dir, "config", "unset", "--global", "dry_run");
    assert.equal(unsetGlobal.status, 0, unsetGlobal.err);

    const both = bundle(dir, "config", "set", "--global", "--local", "x", "y");
    assert.equal(both.status, 15);
    assert.match(both.err, /only use one of the switches/);
  });

  test("the Bundler 1 config interface answers with its deprecation", () => {
    // the translation of upstream's hidden Thor default task `base`:
    // `bundle config NAME VALUE` sets, with the message pointing at the
    // subcommand form.
    const dir = app();
    const r = bundle(dir, "config", "without", "test");
    assert.equal(r.status, 0, r.err);
    assert.match(r.err, /\[DEPRECATED\].*bundle config set without test/);
    assert.match(readFileSync(join(dir, ".bundle", "config"), "utf8"), /BUNDLE_WITHOUT.*test/);

    const bare = bundle(dir, "config");
    assert.equal(bare.status, 0, bare.err);
    assert.match(bare.err, /\[DEPRECATED\].*bundle config list/);
    assert.match(bare.out, /Settings are listed in order of priority/);
  });

  test("bundle update --local re-resolves against the repository", () => {
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);

    const r = bundle(dir, "update", "--local");
    assert.equal(r.status, 0, r.err);
    assert.match(r.out, /Bundle updated!/);
    assert.match(readFileSync(join(dir, "Gemfile.lock"), "utf8"), /hello \(1\.0\.0\)/);
  });

  test("bundle update NAME reports a version that could not move", () => {
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);

    const r = bundle(dir, "update", "world", "--local");
    assert.equal(r.status, 0, r.err);
    assert.match(r.err, /Bundler attempted to update world but its version stayed the same/);
    assert.match(r.out, /Bundle updated!/);

    const conflict = bundle(dir, "update", "world", "--all", "--local");
    assert.equal(conflict.status, 15);
    assert.match(conflict.err, /Cannot specify --all along with specific options/);
  });

  test("lock, install and setup ride the fetcher over a compact index", async () => {
    // M8.4's exit loop: bare (non-local) resolution reaches Bundler::Fetcher
    // and Gem::CompactIndexClient over the port's own transport, answered by
    // the fixture server of the M5 specs; install then downloads the .gem and
    // bundler/setup activates what the loop put in the repository.
    const gemBytes = readFileSync(builtGem("tiny", "0.1.0"));
    const info = "0.1.0 \n";
    const routes = new Map([
      ["/ci/names", [Buffer.from("tiny\n"), "text/plain"]],
      ["/ci/versions", [Buffer.from(`tiny 0.1.0 ${createHash("md5").update(info).digest("hex")}\n`), "text/plain"]],
      ["/ci/info/tiny", [Buffer.from(info), "text/plain"]],
      ["/ci/gems/tiny-0.1.0.gem", [gemBytes, "application/octet-stream"]],
    ]);
    const server = createServer((req, res) => {
      const route = routes.get(req.url);
      if (!route) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("no such route");
        return;
      }
      const [body, contentType] = route;
      res.writeHead(200, { "content-type": contentType });
      res.end(body);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const dir = join(DIR, `remote${appCount++}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "Gemfile"), `source 'http://127.0.0.1:${port}/ci/'\ngem 'tiny'\n`);
    const remoteEnv = { no_proxy: "127.0.0.1,localhost" };

    try {
      const lock = await runAsync(BUNDLE, dir, remoteEnv, ["lock"]);
      assert.equal(lock.status, 0, `${lock.out}${lock.err}`);
      assert.match(lock.out, /Writing lockfile/);
      const lockfile = readFileSync(join(dir, "Gemfile.lock"), "utf8");
      assert.match(lockfile, new RegExp(`remote: http://127\\.0\\.0\\.1:${port}/ci/`));
      assert.match(lockfile, /tiny \(0\.1\.0\)/);

      const install = await runAsync(BUNDLE, dir, remoteEnv, ["install"]);
      assert.equal(install.status, 0, `${install.out}${install.err}`);
      assert.match(install.out, /Installing tiny 0\.1\.0/);
      assert.match(install.out, /Bundle complete!/);
      assert.ok(existsSync(join(DIR, "repo", "gems", "tiny-0.1.0", "lib", "tiny.rb")));

      const setup = run(RUBY, dir, remoteEnv,
        ["-r", "bundler/setup", "-e", 'require "tiny"; puts "tiny activated"']);
      assert.equal(setup.status, 0, setup.err);
      assert.match(setup.out, /tiny activated/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("the mirror setting reroutes a remote source and names the origin", async () => {
    // Remote#initialize applies settings.mirror_for, and the Gemfile's own
    // URI travels to the mirror in X-Gemfile-Source. The mirror routes answer
    // only when they see that header, and the Gemfile's path answers nothing,
    // so a successful install pins both halves of the story.
    const gemBytes = readFileSync(builtGem("tiny", "0.1.0"));
    const info = "0.1.0 \n";
    const files = new Map([
      ["/names", Buffer.from("tiny\n")],
      ["/versions", Buffer.from(`tiny 0.1.0 ${createHash("md5").update(info).digest("hex")}\n`)],
      ["/info/tiny", Buffer.from(info)],
      ["/gems/tiny-0.1.0.gem", gemBytes],
    ]);
    let originSeen = null;
    const server = createServer((req, res) => {
      const path = req.url.replace(/^\/mirror/, "");
      const body = files.get(path);
      const origin = req.headers["x-gemfile-source"];
      if (!body || !origin) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("no such route");
        return;
      }
      originSeen = origin;
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(body);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const dir = join(DIR, `mirror${appCount++}`);
    mkdirSync(dir, { recursive: true });
    const ciUrl = `http://127.0.0.1:${port}/ci/`;
    writeFileSync(join(dir, "Gemfile"), `source '${ciUrl}'\ngem 'tiny'\n`);
    const remoteEnv = { no_proxy: "127.0.0.1,localhost" };

    try {
      const mirror = bundle(dir, "config", "set", "--local", `mirror.${ciUrl}`, `http://127.0.0.1:${port}/mirror/`);
      assert.equal(mirror.status, 0, mirror.err);

      const install = await runAsync(BUNDLE, dir, remoteEnv, ["install"]);
      assert.equal(install.status, 0, `${install.out}${install.err}`);
      assert.match(install.out, /Bundle complete!/);
      assert.equal(originSeen, ciUrl);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("add resolves remotely and injects, and remove takes it back out", async () => {
    // the Injector half of M8.4b: `bundle add` evaluates the current Gemfile,
    // resolves the new dependency through the fetcher, appends the gem line
    // with its conservative requirement and writes the lockfile; `bundle
    // remove` then edits the Gemfile back and reinstalls. The -r spelling
    // doubles as the pin that a command option wins the switch clash with
    // the global retry, and renders as require: false in the Gemfile.
    const gemBytes = readFileSync(builtGem("tiny", "0.1.0"));
    const info = "0.1.0 \n";
    const routes = new Map([
      ["/ci/names", [Buffer.from("tiny\n"), "text/plain"]],
      ["/ci/versions", [Buffer.from(`tiny 0.1.0 ${createHash("md5").update(info).digest("hex")}\n`), "text/plain"]],
      ["/ci/info/tiny", [Buffer.from(info), "text/plain"]],
      ["/ci/gems/tiny-0.1.0.gem", [gemBytes, "application/octet-stream"]],
    ]);
    const server = createServer((req, res) => {
      const route = routes.get(req.url);
      if (!route) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("no such route");
        return;
      }
      const [body, contentType] = route;
      res.writeHead(200, { "content-type": contentType });
      res.end(body);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const dir = join(DIR, `inject${appCount++}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "Gemfile"), `source 'http://127.0.0.1:${port}/ci/'\n`);
    const remoteEnv = { no_proxy: "127.0.0.1,localhost" };

    try {
      const add = await runAsync(BUNDLE, dir, remoteEnv, ["add", "tiny", "-r", "false"]);
      assert.equal(add.status, 0, `${add.out}${add.err}`);
      const gemfile = readFileSync(join(dir, "Gemfile"), "utf8");
      assert.match(gemfile, /gem "tiny", ">= 0\.1\.0", require: false/);
      assert.match(readFileSync(join(dir, "Gemfile.lock"), "utf8"), /tiny \(0\.1\.0\)/);
      assert.ok(existsSync(join(DIR, "repo", "gems", "tiny-0.1.0", "lib", "tiny.rb")));

      const remove = await runAsync(BUNDLE, dir, remoteEnv, ["remove", "tiny"]);
      assert.equal(remove.status, 0, `${remove.out}${remove.err}`);
      assert.match(remove.out, /was removed/);
      assert.ok(!/gem "tiny"/.test(readFileSync(join(dir, "Gemfile"), "utf8")));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("add's option validation answers before the Gemfile is read", () => {
    const dir = app();
    const none = bundle(dir, "add");
    assert.equal(none.status, 15);
    assert.match(none.err, /Please specify gems to add/);

    const pattern = bundle(dir, "add", "tiny", "--version", "bad pattern");
    assert.equal(pattern.status, 15);
    assert.match(pattern.err, /Invalid gem requirement pattern/);

    const branch = bundle(dir, "add", "tiny", "--branch", "x");
    assert.equal(branch.status, 15);
    assert.match(branch.err, /cannot specify/);
  });

  test("remove rejects its remembered --install flag and unknown gems", () => {
    const dir = app();
    const flag = bundle(dir, "remove", "--install", "pathgem");
    assert.equal(flag.status, 15);
    assert.match(flag.err, /`--install` flag has been removed/);

    const missing = bundle(dir, "remove", "nosuchgem");
    assert.equal(missing.status, 4);
    assert.match(missing.err, /not specified in/);
    assert.match(missing.err, /could not be removed/);
  });

  test("binstubs writes the wrapper, runs it, and needs a gem", () => {
    const dir = app();
    const none = bundle(dir, "binstubs");
    assert.equal(none.status, 1);
    assert.match(none.err, /needs at least one gem to run/);

    const remembered = bundle(dir, "binstubs", "--path", "foo", "pathgem");
    assert.equal(remembered.status, 15);
    assert.match(remembered.err, /`--path` flag has been removed/);

    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);
    const made = bundle(dir, "binstubs", "pathgem");
    assert.equal(made.status, 0, made.err);
    const stub = readFileSync(join(dir, "bin", "pathgem-bin"), "utf8");
    assert.match(stub, /ENV\["BUNDLE_GEMFILE"\] \|\|= File\.expand_path\("\.\.\/Gemfile", __dir__\)/);
    assert.match(stub, /load Gem\.bin_path\("pathgem", "pathgem-bin"\)/);

    // the ported rbconfig names this interpreter, so the stub's `#!/usr/bin/env
    // opal` line matches the template while running it straight would need an
    // `opal` on PATH; exe/ruby runs the file under the bundle's own setup.
    const ran = run(RUBY, dir, {}, ["bin/pathgem-bin"]);
    assert.equal(ran.status, 0, ran.err);
    assert.match(ran.out, /pathgem/);
  });

  test("init writes the template once and says so", () => {
    const dir = join(DIR, `init${appCount++}`);
    mkdirSync(dir, { recursive: true });
    const made = bundle(dir, "init");
    assert.equal(made.status, 0, made.err);
    assert.match(made.out, /Writing new Gemfile/);
    const gemfile = readFileSync(join(dir, "Gemfile"), "utf8");
    assert.match(gemfile, /^# frozen_string_literal: true$/m);
    assert.match(gemfile, /^source "https:\/\/rubygems\.org"$/m);
    assert.match(gemfile, /# gem "rails"/);

    const again = bundle(dir, "init");
    assert.equal(again.status, 1);
    assert.match(again.err, /Gemfile already exists/);
  });
});

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
import { spawnSync } from "node:child_process";
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

  test("the unported exec command answers the Thor message", () => {
    // M8.3b's subprocess half takes over `exec`: until then it is an
    // unknown command, the answer Thor gives when no bundler-#{name}
    // executable sits on the PATH either.
    const dir = app();
    const r = bundle(dir, "exec", "echo", "hi");
    assert.equal(r.status, 15);
    assert.match(r.err, /Could not find command "exec"/);
  });

  test("a bare lock walks into the unported remote sources, documented by M8.4", () => {
    // setup_domain! asks the rubygems source to go remote, and the
    // Remote/Fetcher pair is M8.4's; the run ends in the unexpected-error
    // report rather than a lockfile.
    const dir = app();
    const r = bundle(dir, "lock");
    assert.equal(r.status, 1);
    assert.match(r.err, /Bundler::Source::Rubygems::Remote|unexpected error/);
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

  test("show bundler names the checkout the executable came from", () => {
    const dir = app();
    const r = bundle(dir, "show", "bundler");
    assert.equal(r.status, 0, r.err);
    assert.equal(r.out.trim(), OPAL_ROOT);
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
    // the exit test of the M8.3a setup half: exe/ruby finds
    // -r bundler/setup through the OPAL_HOME/lib it puts on $LOAD_PATH,
    // Bundler.setup resolves the lockfile and puts the bundle's load paths
    // on $LOAD_PATH, and the script's requires answer from the gems.
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

  test("a bare bundle update walks into the remote sources of M8.4", () => {
    // like bare `bundle lock`: resolution asks the rubygems source to go
    // remote, and the Remote/Fetcher pair is M8.4's.
    const dir = app();
    const install = bundle(dir, "install", "--local");
    assert.equal(install.status, 0, install.err);
    const r = bundle(dir, "update");
    assert.equal(r.status, 1);
    assert.match(r.err, /Source::Rubygems::Remote|unexpected error/);
  });
});

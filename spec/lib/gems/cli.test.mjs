// The `gem` command (lib/opal/exe/gem.rb, built by tasks/gem.mjs): build the
// bundle once, then run the commands the way a shell would.
//
// The runs stay off the developer's own gem repository: every one gets a
// temporary HOME, GEM_HOME, GEM_PATH and GEM_SPEC_CACHE, and the ones that
// resolve without a network also get GEM_SOURCES empty, which is what keeps
// `install nosuchgem` from reaching rubygems.org.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const GEM = join(OPAL_ROOT, "exe", "gem");
const RUBY = join(OPAL_ROOT, "exe", "ruby");
const FIXTURE_GEM = join(OPAL_ROOT, "spec/opal/gems/fixtures/cruby-tiny-0.1.0.gem");
const DIR = mkdtempSync(join(tmpdir(), "opal-gem-cli-"));

// The environment a run gets: a repository and a home of its own, and no
// sources unless the test hands it one.
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

// Runs the gem command (or another executable) in CWD with EXTRA over the
// standard environment, and answers its output and exit status.
function run(command, cwd, extra, args) {
  const started = spawnSync(process.execPath, [command, ...args], { cwd, env: env(extra), encoding: "utf8" });
  return { out: started.stdout, err: started.stderr, status: started.status };
}

const gem = (...args) => run(GEM, DIR, {}, args);
const gemIn = (cwd, extra, ...args) => run(GEM, cwd, extra, args);

// The same run without blocking the event loop. A test that answers the
// command's own requests from this process needs it: spawnSync stops the test
// process from serving, and the child waits for an answer that cannot come.
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

// The source tree of a gem of the port's own making, in a directory of its own
// (exe/ruby searches the current directory last, and the runs share this tree).
function gemTree(name, version, dirName = `build-${name}`) {
  const dir = join(DIR, dirName);
  mkdirSync(join(dir, "lib"), { recursive: true });
  const module = name[0].toUpperCase() + name.slice(1);
  writeFileSync(join(dir, "lib", `${name}.rb`), `module ${module}\n  def self.hello\n    ${JSON.stringify(name)}\n  end\nend\n`);
  writeFileSync(join(dir, `${name}.gemspec`), `Gem::Specification.new do |s|
  s.name = ${JSON.stringify(name)}
  s.version = ${JSON.stringify(version)}
  s.summary = "the ${name} gem"
  s.authors = ["Opal"]
  s.licenses = ["MIT"]
  s.homepage = "https://example.com/${name}"
  s.files = ["lib/${name}.rb"]
  s.require_paths = ["lib"]
end
`);
  return dir;
}

// The .gem that tree builds through exe/ruby's Gem::Package, so what
// `gem install` unpacks is a package this code wrote through the API.
function buildWithRuby(dir, name) {
  const built = run(RUBY, dir, {}, ["-e", "puts Gem::Package.build(Gem::Specification.load(ARGV[0]))", `${name}.gemspec`]);
  assert.equal(built.status, 0, built.err);
  return join(dir, built.out.trim().split("\n").pop());
}

function builtGem(name, version) {
  const dir = gemTree(name, version);
  return { dir, path: buildWithRuby(dir, name) };
}

// The committed fixture gem, copied under the name its specification uses.
function fixtureGem(dir) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "tiny-0.1.0.gem");
  copyFileSync(FIXTURE_GEM, path);
  return { dir, path };
}

describe("the gem command", () => {
  before(() => {
    const build = spawnSync(process.execPath, [join(OPAL_ROOT, "tasks", "gem.mjs")], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stderr);
    mkdirSync(join(DIR, "home"), { recursive: true });
    mkdirSync(join(DIR, "nowhere"), { recursive: true });
  });
  after(() => rmSync(DIR, { recursive: true, force: true }));

  test("--version answers the version of the port", () => {
    const r = gem("--version");
    assert.match(r.out, /^\d+\.\d+\.\d+/);
    assert.equal(r.status, 0);
  });

  test("the bundle carries its transport, not a path to the checkout", () => {
    // Gem::HTTPTransport runs the embedded source through new Function; the
    // exe must fetch with no tree beside it, so nothing may bake the build
    // checkout's path into the bundle.
    const bundle = readFileSync(GEM, "utf8");
    assert.match(bundle, /OPAL_HTTP_TRANSPORT/);
    assert.ok(!bundle.includes(OPAL_ROOT), "the bundle must not name the checkout it was built in");
  });

  test("with no arguments the usage is printed and the run fails", () => {
    const r = gem();
    assert.match(r.out, /gem \[global options\.\.\.\] command \[arguments\.\.\.\] \[options\.\.\.\]/);
    assert.equal(r.status, 1);
  });

  test("--help and -h print the usage of the command manager", () => {
    for (const args of [["--help"], ["-h"]]) {
      const r = gem(...args);
      assert.match(r.out, /RubyGems is a package manager for Ruby/);
      assert.match(r.out, /gem help commands/);
      assert.equal(r.status, 0);
    }
  });

  test("help commands lists the commands the port registers", () => {
    const r = gem("help", "commands");
    assert.match(r.out, /^ {4}help\s+Provide help on the 'gem' command$/m);
    assert.match(r.out, /^ {4}install\s+Install a gem into the local repository$/m);
    assert.match(r.out, /^ {4}uninstall\s+Uninstall gems from the local repository$/m);
    assert.equal(r.status, 0);
  });

  test("help COMMAND renders that command's own option parser", () => {
    const r = gem("help", "install");
    assert.match(r.out, /Usage: gem install \[options\] GEMNAME/);
    assert.match(r.out, /-i, --install-dir DIR/);
    assert.match(r.out, /Install\/Update Options:/);
    assert.match(r.out, /Local\/Remote Options:/);
    assert.match(r.out, /Common Options:/);
    assert.equal(r.status, 0);
  });

  test("an unknown command fails through the command manager", () => {
    const r = gem("nosuchcommand");
    assert.match(r.err, /ERROR: {2}While executing gem \.\.\. \(Gem::UnknownCommandError\)/);
    assert.match(r.err, /Unknown command nosuchcommand/);
    assert.equal(r.status, 1);
  });

  test("an option the command manager does not know is refused", () => {
    const r = gem("--frobnicate", "install", "rake");
    assert.match(r.err, /ERROR: {2}Invalid option: --frobnicate\. See 'gem --help'\./);
    assert.equal(r.status, 1);
  });

  test("the options read before the command are taken off its arguments", () => {
    // Gem::ConfigFile reads --backtrace, as upstream's handle_arguments does;
    // left in front of the command name, the command manager answers it as an
    // unknown switch instead of running the command.
    const r = gem("--backtrace", "help", "commands");
    assert.match(r.out, /GEM commands are:/);
    assert.doesNotMatch(r.err, /Invalid option/);
    assert.equal(r.status, 0);
  });

  test("a command name may be abbreviated when it is unambiguous", () => {
    const r = gem("help", "uninst");
    assert.match(r.out, /Usage: gem uninstall GEMNAME \[GEMNAME \.\.\.\]/);
    assert.equal(r.status, 0);
    const alias = gem("i", "--help");
    assert.match(alias.out, /Usage: gem install \[options\]/);
    assert.equal(alias.status, 0);
  });

  test("installs a gem the port built, which the ruby command then requires", () => {
    // This is M4's exit test: build, install, and use - all three through the
    // port's own executables.
    const gem1 = builtGem("hello", "1.0.0");
    const r = gemIn(gem1.dir, {}, "install", "./hello-1.0.0.gem", "--no-document");
    assert.match(r.out, /1 gem installed/);
    assert.equal(r.status, 0, r.err);

    assert.ok(existsSync(join(DIR, "repo", "specifications", "hello-1.0.0.gemspec")));
    assert.ok(existsSync(join(DIR, "repo", "gems", "hello-1.0.0", "lib", "hello.rb")));

    // no -I and no require of rubygems: the ruby command's find_feature
    // activates the installed gem
    const required = run(RUBY, join(DIR, "nowhere"), {}, ["-e", "require 'hello'; puts Hello.hello"]);
    assert.equal(required.out.trim(), "hello", `${required.out}${required.err}`);
    assert.equal(required.status, 0, required.err);

    // What the repository now answers to the read-only commands.
    assert.equal(gem("list").out.trim(), "hello (1.0.0)");
    assert.equal(gem("list", "-i", "hello").out.trim(), "true");

    const notInstalled = gem("list", "-i", "nosuchgem");
    assert.equal(notInstalled.out.trim(), "false");
    assert.equal(notInstalled.status, 1);

    const details = gem("list", "--details");
    assert.match(details.out, /^hello \(1\.0\.0\)\n {4}Author: Opal\n {4}Homepage: https:\/\/example\.com\/hello\n {4}License: MIT\n {4}Installed at: /m, details.out);
    assert.match(gem("info", "hello").out, /^hello \(1\.0\.0\)\n {4}Author: Opal\n/m);

    const libFile = join(DIR, "repo", "gems", "hello-1.0.0", "lib", "hello.rb");
    assert.equal(gem("which", "hello").out.trim(), libFile);
    assert.equal(gem("contents", "hello").out.trim(), libFile);
    assert.equal(gem("contents", "--no-prefix", "hello").out.trim(), "lib/hello.rb");

    const specYaml = gem("spec", "hello");
    assert.match(specYaml.out, /^--- !ruby\/object:Gem::Specification\nname: hello\n/, specYaml.out);
    assert.match(gem("spec", "hello", "summary").out.trim(), /^--- the hello gem$/);

    // What the repository answers about the gems it holds and how they relate.
    assert.match(gem("dependency", "hello").out, /^Gem hello-1\.0\.0$/m, gem("dependency", "hello").out);
    // -p is the local/remote options' --http-proxy here, as it is upstream's,
    // so the pipe format is spelled out.
    assert.equal(gem("dependency", "--pipe", "hello").out.trim(), "");
    assert.equal(gem("cleanup").out.trim(), "Cleaning up installed gems...\nClean up complete");
    const stale = gem("outdated");
    assert.equal(stale.out.trim(), "");
    assert.equal(stale.status, 0, stale.err);

    // D7: compiling the gem ahead of time. The output lives under
    // <gem_dir>/compiled/<full_name>/<digest>/ keeping the required paths,
    // and an activated gem is searched from there before its sources.
    const compiledRun = gem("compile", "hello");
    assert.equal(compiledRun.status, 0, compiledRun.err);
    assert.match(compiledRun.out, /^Compiling hello-1\.0\.0\.\.\.\n {2}1 file compiled$/m, compiledRun.out);

    const compiledRoot = join(DIR, "repo", "gems", "hello-1.0.0", "compiled", "hello-1.0.0");
    const digests = readdirSync(compiledRoot);
    assert.equal(digests.length, 1, compiledRoot);
    const jsFile = join(compiledRoot, digests[0], "hello.js");
    assert.ok(existsSync(jsFile), jsFile);

    // the same path search a require does now answers the compiled file.
    assert.equal(gem("which", "hello").out.trim(), jsFile);
    const compiledRequire = run(RUBY, join(DIR, "nowhere"), {}, ["-e", "require 'hello'; puts Hello.hello"]);
    assert.equal(compiledRequire.out.trim(), "hello", `${compiledRequire.out}${compiledRequire.err}`);

    // and a source edited afterwards makes that tree stale - the digest
    // names the sources it was made from - so the loader passes it by and
    // reads the .rb, which is the safety the digest is there for.
    const helloRb = join(DIR, "repo", "gems", "hello-1.0.0", "lib", "hello.rb");
    writeFileSync(helloRb, readFileSync(helloRb, "utf8").replace('"hello"', '"hello edited"'));
    const edited = run(RUBY, join(DIR, "nowhere"), {}, ["-e", "require 'hello'; puts Hello.hello"]);
    assert.equal(edited.out.trim(), "hello edited", `${edited.out}${edited.err}`);
    assert.equal(gem("which", "hello").out.trim(), helloRb);

    // recompiling answers a new digest directory and drops the old one.
    const recompiled = gem("compile", "hello");
    assert.match(recompiled.out, /1 file compiled/, `${recompiled.out}${recompiled.err}`);
    const digestsAgain = readdirSync(compiledRoot);
    assert.equal(digestsAgain.length, 1, "one compiled directory survives per gem");
    assert.notDeepEqual(digestsAgain, digests);

    const compileMissing = gem("compile", "nosuchgem");
    assert.match(compileMissing.err, /Can't compile gem 'nosuchgem', probably not installed\?/, compileMissing.err);
    assert.equal(compileMissing.status, 1);

    // A remote query with no source answers nothing rather than reaching the
    // network or dying on an empty source list.
    const remote = gem("list", "--remote");
    assert.equal(remote.out.trim(), "");
    assert.equal(remote.status, 0, remote.err);

    const off = gemIn(gem1.dir, {}, "uninstall", "hello", "-x", "-I");
    assert.match(off.out, /Successfully uninstalled hello-1.0\.0/);
    assert.equal(off.status, 0, off.err);
    assert.ok(!existsSync(join(DIR, "repo", "specifications", "hello-1.0.0.gemspec")));
  });

  test("--install-dir installs into that repository", () => {
    const gem2 = fixtureGem(join(DIR, "fixture-src"));
    const target = join(DIR, "elsewhere");
    const r = gemIn(gem2.dir, {}, "install", "./tiny-0.1.0.gem", "--no-document", "--install-dir", target);
    assert.match(r.out, /1 gem installed/);
    assert.equal(r.status, 0, r.err);
    assert.ok(existsSync(join(target, "specifications", "tiny-0.1.0.gemspec")));
    assert.ok(!existsSync(join(DIR, "repo", "specifications", "tiny-0.1.0.gemspec")));
  });

  test("-C runs the command in another directory", () => {
    const gem3 = fixtureGem(join(DIR, "moved-src"));
    const r = gem("-C", gem3.dir, "install", "./tiny-0.1.0.gem", "--no-document");
    assert.match(r.out, /1 gem installed/);
    assert.equal(r.status, 0, r.err);
    assert.ok(existsSync(join(DIR, "repo", "gems", "tiny-0.1.0", "lib", "tiny.rb")));

    const missing = gem("-C", join(DIR, "not-a-directory"), "install", "anything");
    assert.match(missing.err, /isn't a directory\./);
    assert.equal(missing.status, 1);
  });

  test("build writes a gem from a gemspec, and unpack takes it apart", () => {
    const tree = gemTree("packed", "2.1.0", "packed-src");

    const built = gemIn(tree, {}, "build", "packed.gemspec");
    assert.match(built.out, /Successfully built RubyGem/, `${built.out}${built.err}`);
    assert.equal(built.status, 0, built.err);
    assert.ok(existsSync(join(tree, "packed-2.1.0.gem")));

    const unpacked = gemIn(tree, {}, "unpack", "packed-2.1.0.gem");
    assert.match(unpacked.out, /^Unpacked gem: /m, unpacked.out);
    assert.equal(unpacked.status, 0, unpacked.err);
    assert.ok(existsSync(join(tree, "packed-2.1.0", "lib", "packed.rb")));

    const dumped = gemIn(tree, {}, "unpack", "--spec", "--target", "dumped", "packed-2.1.0.gem");
    assert.equal(dumped.status, 0, dumped.err);
    assert.ok(existsSync(join(tree, "dumped", "packed-2.1.0.gemspec")));

    const noGemspec = gemIn(join(DIR, "nowhere"), {}, "build", "nosuch");
    assert.match(noGemspec.err, /^ERROR: {2}Couldn't find a gemspec file matching 'nosuch' in /m, noGemspec.err);
    assert.equal(noGemspec.status, 1);
  });

  test("env reports the environment the command reads", () => {
    const r = gemIn(DIR, { GEM_SOURCES: "https://rubygems.org/" }, "env");
    assert.equal(r.status, 0, r.err);
    assert.match(r.out, /^RubyGems Environment:\n {2}- RUBYGEMS VERSION: 4\.1\.0\.opal\n/m, r.out);
    assert.ok(r.out.includes(`  - INSTALLATION DIRECTORY: ${join(DIR, "repo")}`), r.out);
    assert.match(r.out, /^ {2}- REMOTE SOURCES:\n {5}- https:\/\/rubygems\.org\/$/m, r.out);
    // The two lines upstream builds from RbConfig are what this port leaves
    // out, so their absence is part of what the test pins.
    assert.doesNotMatch(r.out, /PREFIX|SYSTEM CONFIGURATION/);

    assert.equal(gem("env", "home").out.trim(), join(DIR, "repo"));
    assert.equal(gem("env", "gemdir").out.trim(), join(DIR, "repo"));
    assert.equal(gem("env", "version").out.trim(), "4.1.0.opal");

    const unknown = gem("env", "frobnicate");
    assert.match(unknown.err, /Gem::CommandLineError/, unknown.err);
    assert.match(unknown.err, /Unknown environment option \[frobnicate\]/, unknown.err);
    assert.notEqual(unknown.status, 0);
  });

  test("sources lists the sources, clears the cache and refuses what is not a source", () => {
    const sources = { GEM_SOURCES: "https://rubygems.org/", GEM_SPEC_CACHE: join(DIR, "sources-specs") };

    const listed = gemIn(DIR, sources, "sources", "-l");
    assert.match(listed.out, /\*\*\* CURRENT SOURCES \*\*\*/, `${listed.out}${listed.err}`);
    assert.match(listed.out, /^https:\/\/rubygems\.org\/$/m, listed.out);
    assert.equal(listed.status, 0, listed.err);

    // The default with no argument is the same listing.
    assert.equal(gemIn(DIR, sources, "sources").out, listed.out);

    const notAUri = gemIn(DIR, sources, "sources", "-a", "not a uri");
    assert.match(notAUri.out, /is not a URI/, notAUri.out);
    assert.notEqual(notAUri.status, 0);

    const missing = gemIn(DIR, sources, "sources", "-a", "http://127.0.0.1:1/ci/");
    assert.match(missing.out, /^Error fetching http:\/\/127\.0\.0\.1:1\/ci\/:/m, missing.out);
    assert.notEqual(missing.status, 0);

    const absent = gemIn(DIR, sources, "sources", "-r", "https://nope.example.com/");
    assert.match(absent.out, /cannot be removed because it's not present in/, absent.out);

    const cleared = gemIn(DIR, sources, "sources", "-c");
    assert.match(cleared.out, /\*\*\* Removed specs cache \*\*\*/, `${cleared.out}${cleared.err}`);
    assert.equal(cleared.status, 0, cleared.err);
  });

  test("a gem no source provides is reported as missing, not as a crash", () => {
    const r = gem("install", "nosuchgem-at-all");
    assert.match(r.err, /ERROR: {2}Could not find a valid gem 'nosuchgem-at-all' \(>= 0\) in any repository/);
    assert.doesNotMatch(r.err, /While executing gem/);
    assert.equal(r.status, 2);
  });

  test("installs from a compact index over HTTP", async () => {
    // M5's exit test at the command line: a source of the port's own, in the
    // compact index shape the M5 specs answer with, serving the fixture gem.
    // It also checks that a bundle reaches the transport, which it carries
    // as embedded source (OPAL_HOME and its lookup are gone).
    const gemBytes = readFileSync(FIXTURE_GEM);
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
      const [body, type] = route;
      res.writeHead(200, { "content-type": type });
      res.end(body);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();

    try {
      const repo = join(DIR, "remote-repo");
      const r = await runAsync(GEM, DIR, {
        GEM_HOME: repo, GEM_PATH: repo, GEM_SPEC_CACHE: join(DIR, "remote-specs"),
        no_proxy: "127.0.0.1,localhost",
      }, ["install", "tiny", "--no-document", "--clear-sources",
        "--source", `http://127.0.0.1:${port}/ci/`]);
      assert.match(r.out, /1 gem installed/);
      assert.equal(r.status, 0, `${r.out}${r.err}`);
      assert.ok(existsSync(join(repo, "gems", "tiny-0.1.0", "lib", "tiny.rb")));

      // The same index answers the query commands, with a spec cache of their
      // own so they have to fetch it rather than read what the install left.
      const queryEnv = { GEM_SPEC_CACHE: join(DIR, "query-specs"), no_proxy: "127.0.0.1,localhost" };
      const listed = await runAsync(GEM, DIR, queryEnv,
        ["list", "--remote", "--clear-sources", "--source", `http://127.0.0.1:${port}/ci/`]);
      assert.match(listed.out, /^tiny \(0\.1\.0\)$/m, `${listed.out}${listed.err}`);
      assert.equal(listed.status, 0, `${listed.out}${listed.err}`);

      const searched = await runAsync(GEM, DIR, queryEnv,
        ["search", "tin", "--clear-sources", "--source", `http://127.0.0.1:${port}/ci/`]);
      assert.match(searched.out, /^tiny \(0\.1\.0\)$/m, `${searched.out}${searched.err}`);
      assert.equal(searched.status, 0, `${searched.out}${searched.err}`);

      // And a name that is not there at all comes back from fetch as a
      // lookup failure rather than as a crash.
      const fetchedCwd = join(DIR, "fetched");
      mkdirSync(fetchedCwd, { recursive: true });
      const fetched = await runAsync(GEM, fetchedCwd, {
        GEM_SPEC_CACHE: join(DIR, "fetch-specs"), no_proxy: "127.0.0.1,localhost",
      }, ["fetch", "nosuchgem-at-all", "--clear-sources", "--source", `http://127.0.0.1:${port}/ci/`]);
      assert.match(fetched.err, /^ERROR: {2}Could not find a valid gem 'nosuchgem-at-all' \(>= 0\)/m, `${fetched.out}${fetched.err}`);
      assert.equal(fetched.status, 2);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("update moves an installed gem to the newest version of the index", async () => {
    // the update command's loop: fetch_remote_gems asks the source for every
    // version above the highest installed one, --explain names what would
    // move, and the update itself leaves the old version in place. The index
    // serves two versions: the committed fixture as 0.1.0 and one built here
    // as 0.2.0.
    const newer = builtGem("tiny", "0.2.0");
    const info = "0.1.0 \n0.2.0 \n";
    const routes = new Map([
      ["/ci/names", [Buffer.from("tiny\n"), "text/plain"]],
      ["/ci/versions", [Buffer.from(`tiny 0.1.0,0.2.0 ${createHash("md5").update(info).digest("hex")}\n`), "text/plain"]],
      ["/ci/info/tiny", [Buffer.from(info), "text/plain"]],
      ["/ci/gems/tiny-0.1.0.gem", [readFileSync(FIXTURE_GEM), "application/octet-stream"]],
      ["/ci/gems/tiny-0.2.0.gem", [readFileSync(newer.path), "application/octet-stream"]],
    ]);

    const server = createServer((req, res) => {
      const route = routes.get(req.url);
      if (!route) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("no such route");
        return;
      }
      const [body, type] = route;
      res.writeHead(200, { "content-type": type });
      res.end(body);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();

    const repo = join(DIR, "update-repo");
    const over = {
      GEM_HOME: repo, GEM_PATH: repo, GEM_SPEC_CACHE: join(DIR, "update-specs"),
      no_proxy: "127.0.0.1,localhost",
    };
    const source = ["--clear-sources", "--source", `http://127.0.0.1:${port}/ci/`];

    try {
      const inst = await runAsync(GEM, DIR, over, ["install", "tiny", "-v", "0.1.0", "--no-document", ...source]);
      assert.equal(inst.status, 0, `${inst.out}${inst.err}`);

      const explain = await runAsync(GEM, DIR, over, ["update", "--explain", ...source]);
      assert.equal(explain.status, 0, `${explain.out}${explain.err}`);
      assert.match(explain.out, /^ {2}tiny-0\.2\.0$/m, explain.out);

      const upd = await runAsync(GEM, DIR, over, ["update", ...source]);
      assert.equal(upd.status, 0, `${upd.out}${upd.err}`);
      assert.match(upd.out, /Updating tiny/);
      assert.match(upd.out, /Gems updated: tiny/);
      assert.ok(existsSync(join(repo, "gems", "tiny-0.2.0", "lib", "tiny.rb")));
      assert.ok(existsSync(join(repo, "gems", "tiny-0.1.0")), "the old version stays installed");

      const again = await runAsync(GEM, DIR, over, ["update", "tiny", ...source]);
      assert.equal(again.status, 0, `${again.out}${again.err}`);
      assert.match(again.out, /Nothing to update/);
      assert.match(again.out, /Gems already up-to-date: tiny/);

      const missing = await runAsync(GEM, DIR, over, ["update", "nosuchgem-at-all", ...source]);
      assert.equal(missing.status, 0, `${missing.out}${missing.err}`);
      assert.match(missing.out, /Gems not currently installed: nosuchgem-at-all/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("update --system answers that this port is current", () => {
    // the self-update arm with no rubygems-update in reach lands on
    // upstream's own check_latest_rubygems answer: the port is the RubyGems
    // installation, and it is already at its own version.
    const r = gem("update", "--system");
    assert.match(r.out, /Latest version already installed\. Done\./);
    assert.equal(r.status, 0, `${r.out}${r.err}`);
  });

  test("the opal command reads installed gems through --gem, compiled tree first", () => {
    const greet = builtGem("greet", "1.0.0");
    const installed = gemIn(greet.dir, {}, "install", "./greet-1.0.0.gem", "--no-document");
    assert.equal(installed.status, 0, `${installed.out}${installed.err}`);

    // exe/opal is compiler-only: --gem joins the *build's* load paths, and
    // the self-contained program then runs on node - the gem paths answer
    // at compile time either way.
    const OPAL = join(OPAL_ROOT, "exe", "opal");
    let probeN = 0;
    const compileAndRun = (gemArgs, source) => {
      const src = join(DIR, `gem_probe_${probeN}.rb`);
      const js = join(DIR, `gem_probe_${probeN}.js`);
      probeN++;
      writeFileSync(src, source);
      const build = spawnSync(process.execPath, [OPAL, ...gemArgs, "-c", "-o", js, src], { cwd: DIR, env: env({}), encoding: "utf8" });
      const program = spawnSync(process.execPath, [js], { cwd: DIR, encoding: "utf8" });
      return { out: program.stdout, err: `${build.stderr}${program.stderr}`, status: program.status, build };
    };
    let r = compileAndRun(["--gem", "greet"], "require 'greet'; puts Greet.hello");
    assert.equal(r.out.trim(), "greet", `${r.out}${r.err}`);
    assert.equal(r.status, 0, r.err);

    // With the source removed, only the compiled tree can answer - the
    // toolchain trusts that tree (its M7 contract: gem_paths.mjs says why),
    // so this also proves --gem put it in front and the require did not
    // quietly find another copy.
    assert.equal(gem("compile", "greet").status, 0);
    rmSync(join(DIR, "repo", "gems", "greet-1.0.0", "lib", "greet.rb"));
    r = compileAndRun(["--gem", "greet"], "require 'greet'; puts Greet.hello");
    assert.equal(r.out.trim(), "greet", `${r.out}${r.err}`);
    assert.equal(r.status, 0, r.err);

    // A name no repository owns warns, and the build runs on.
    const missing = compileAndRun(["--gem", "nosuchgem"], "puts 1");
    assert.match(missing.err, /gem nosuchgem is not installed in the gem repositories/, missing.err);
    assert.equal(missing.out.trim(), "1");
    assert.equal(missing.status, 0, missing.err);
  });

  test("--compile writes the compiled tree while installing", () => {
    const stamp = builtGem("stamp", "0.1.0");
    const installed = gemIn(stamp.dir, {}, "install", "./stamp-0.1.0.gem", "--no-document", "--compile");
    assert.match(installed.out, /1 gem installed/, `${installed.out}${installed.err}`);
    assert.equal(installed.status, 0, installed.err);

    const compiledRoot = join(DIR, "repo", "gems", "stamp-0.1.0", "compiled", "stamp-0.1.0");
    const digests = readdirSync(compiledRoot);
    assert.equal(digests.length, 1, compiledRoot);
    assert.ok(existsSync(join(compiledRoot, digests[0], "stamp.js")), compiledRoot);

    const required = run(RUBY, join(DIR, "nowhere"), {}, ["-e", "require 'stamp'; puts Stamp.hello"]);
    assert.equal(required.out.trim(), "stamp", `${required.out}${required.err}`);
  });
});

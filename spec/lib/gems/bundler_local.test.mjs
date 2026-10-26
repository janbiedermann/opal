// Bundler's local half over the port's own repository (M8.1b, M8.2): an
// exe/ruby run requires "bundler", parses a fixture Gemfile.lock, and resolves
// it against the gems `exe gem` installed in the temporary repository, plus a
// path source whose .gemspec it evaluates - and now a full PubGrub resolution
// of the Gemfile through Bundler::Definition. The run stays hermetic: a
// private HOME, GEM_HOME and GEM_SPEC_CACHE, and GEM_SOURCES empty.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const GEM = join(OPAL_ROOT, "exe", "gem");
const RUBY = join(OPAL_ROOT, "exe", "ruby");
const DIR = mkdtempSync(join(tmpdir(), "opal-bundler-"));

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

// A gem source tree like cli.test.mjs builds them, with optional runtime
// dependencies spliced into the gemspec.
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

const LOCK = `GEM
  remote: https://rubygems.org/
  specs:
    hello (1.0.0)
    world (0.5)
      hello (~> 1.0)

PLATFORMS
  ruby

CHECKSUMS
  hello (1.0.0) sha256=${"ab".repeat(32)}

DEPENDENCIES
  hello (~> 1.0)
  world

BUNDLED WITH
   4.1.0
`;

const PROBE = String.raw`require "json"
require "opal-parser"
require "bundler"

out = {}

parser = Bundler::LockfileParser.new(File.read("Gemfile.lock"))
out["locked"] = parser.specs.map(&:full_name).sort
out["locked_checksums"] = !!parser.checksums
out["bundler_version"] = parser.bundler_version.to_s

sl = Bundler::SourceList.new
src = sl.global_rubygems_source
src.local!
out["installed_index"] = src.specs.each.map(&:full_name).sort

world = src.specs.search(["world", Gem::Version.new("0.5")]).first
out["world_class"] = world.class.name
out["world_deps"] = world.dependencies.map {|d| [d.name, d.requirement.to_s] }

path_source = sl.add_path_source("path" => "pathgem")
out["path_specs"] = path_source.specs.each.map {|s| [s.name, s.version.to_s, s.dependencies.map {|d| d.name } ] }

locked_index = Bundler::Index.build {|i| parser.specs.each {|s| i.add s } }
sm = Bundler::SourceMap.new(sl, parser.dependencies.values, locked_index)
out["all_requirements"] = sm.all_requirements.map {|name, source| [name, source.class.name] }.sort

lock_with_path = "PATH\n  remote: pathgem\n  specs:\n    pathgem (0.1)\n\n" \
  "GEM\n  remote: https://rubygems.org/\n  specs:\n    hello (1.0.0)\n\n" \
  "PLATFORMS\n  ruby\n\nDEPENDENCIES\n  pathgem!\n  hello\n"
parser2 = Bundler::LockfileParser.new(lock_with_path)
path_lock = parser2.sources.find {|s| s.is_a?(Bundler::Source::Path) }
out["path_lock"] = [path_lock.class.name, path_lock.to_lock]

begin
  Bundler::LockfileParser.new(
    "GIT\n  remote: https://github.com/hello/hello\n  revision: 0\n  specs:\n    hello (1.0.0)\n\n" \
    "PLATFORMS\n  ruby\n\nDEPENDENCIES\n  hello\n"
  )
  out["git_error"] = nil
rescue Bundler::GitError => e
  out["git_error"] = e.message.include?("not ported")
end

puts JSON.generate(out)
`;

// A full resolution through Bundler::Definition: PubGrub solves the Gemfile
// against the installed repository and the path gem, to_lock writes the
// result, a Definition built from that lock needs no re-resolve, and an
// unsatisfiable Gemfile reports the GemNotFound Bundler would.
const RESOLVE_PROBE = String.raw`require "json"
require "bundler"

out = {}
Bundler.reset_settings_and_root!

defn = Bundler::Definition.build("Gemfile", "Gemfile.lock", true)
res = defn.resolve
out["resolved"] = res.map {|s| [s.name, s.version.to_s] }.sort

lock = defn.to_lock
File.write("probe.lock", lock)
parsed = Bundler::LockfileParser.new(lock)
out["lock_specs"] = parsed.specs.map(&:full_name).sort
out["lock_sections"] = lock.scan(/^(GEM|PATH|PLATFORMS|DEPENDENCIES|BUNDLED WITH)$/).flatten
defn2 = Bundler::Definition.build("Gemfile", "probe.lock", nil)
out["resolve_needed2"] = !!defn2.resolve_needed?
out["resolved2"] = defn2.resolve.map {|s| [s.name, s.version.to_s] }.sort

bad = Bundler::Definition.build("Gemfile.bad", "probe.lock", true)
begin
  bad.resolve
  out["bad"] = "resolved?!"
rescue Bundler::BundlerError => e
  out["bad"] = [e.class.name, e.message.include?("Could not find gem 'hello (~> 2.0)'")]
end

puts JSON.generate(out)
`;

// `bundle install`'s run, in --local form so the sources stay off the
// fetcher that M8.4 has not ported: the definition installs (the gem-source
// specs are already in the repository, the path source generates its
// binstub), writes the lockfile - here install.lock, so the fixture lock
// stays for the other probes - and that lock reads back with no re-resolve.
const INSTALL_PROBE = String.raw`require "json"
require "bundler"

out = {}
Bundler.reset_settings_and_root!

defn = Bundler::Definition.build("Gemfile", "install.lock", true)
installer = Bundler::Installer.new(Dir.pwd, defn)
installer.run({ local: true })
out["post_install_messages"] = installer.post_install_messages

lock = File.read("install.lock")
parsed = Bundler::LockfileParser.new(lock)
out["installed_lock_specs"] = parsed.specs.map(&:full_name).sort

bin = File.join(Bundler.rubygems.gem_dir, "bin", "pathgem-bin")
out["path_bin"] = File.exist?(bin)
out["path_bin_ruby"] = out["path_bin"] ? File.read(bin).include?("ruby") : false
# the bundle path was created and its bundler.lock is gone with the lock
out["bundle_path"] = Dir.exist?(Bundler.bundle_path.to_s)
out["lock_released"] = !File.exist?(File.join(Bundler.bundle_path.to_s, "bundler.lock"))

defn2 = Bundler::Definition.build("Gemfile", "install.lock", nil)
out["resolve_needed_after"] = !!defn2.resolve_needed?

puts JSON.generate(out)
`;

describe("Bundler over a local repository", () => {
  let app;

  before(() => {
    // A repository of the port's own gems, and an application directory that
    // carries the Gemfile, the Gemfile.lock and the path gem.
    for (const gem of [builtGem("hello", "1.0.0"), builtGem("world", "0.5", [["hello", "~> 1.0"]])]) {
      const install = run(GEM, DIR, {}, ["install", "--local", "--no-document", gem]);
      assert.equal(install.status, 0, install.err + install.out);
    }

    app = join(DIR, "app");
    mkdirSync(app, { recursive: true });
    mkdirSync(join(DIR, "home"), { recursive: true });
    writeFileSync(join(app, "Gemfile"), "source 'https://rubygems.org'\n\ngem 'hello', '~> 1.0'\ngem 'world'\ngem 'pathgem', path: 'pathgem'\n");
    writeFileSync(join(app, "Gemfile.bad"), "source 'https://rubygems.org'\n\ngem 'hello', '~> 2.0'\ngem 'pathgem', path: 'pathgem'\n");
    writeFileSync(join(app, "Gemfile.lock"), LOCK);
    // The path gem next to the application, with a dependency of its own.
    const pathgem = gemTree("pathgem", "0.1", [["hello", ">= 1.0"]]);
    rmSync(join(app, "pathgem"), { recursive: true, force: true });
    mkdirSync(join(app, "pathgem"), { recursive: true });
    for (const f of ["pathgem.gemspec", "lib/pathgem.rb"]) {
      mkdirSync(join(app, "pathgem", "lib"), { recursive: true });
      writeFileSync(join(app, "pathgem", f), readFileSync(join(pathgem, f)));
    }
    writeFileSync(join(app, "pathgem", "pathgem.gemspec"), readFileSync(join(pathgem, "pathgem.gemspec")).toString()
      .replace(
        '  s.files = ["lib/pathgem.rb"]',
        '  s.files = ["lib/pathgem.rb", "bin/pathgem-bin"]\n  s.executables = ["pathgem-bin"]',
      ));
    // An executable for the install slice: Bundler generates a binstub for
    // the path source, so the path gem declares one.
    mkdirSync(join(app, "pathgem", "bin"), { recursive: true });
    writeFileSync(join(app, "pathgem", "bin", "pathgem-bin"), "puts :pathgem\n");
    writeFileSync(join(DIR, "bundler_probe.rb"), PROBE);
    writeFileSync(join(DIR, "bundler_resolve_probe.rb"), RESOLVE_PROBE);
    writeFileSync(join(DIR, "bundler_install_probe.rb"), INSTALL_PROBE);
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  test("the local rubygems source indexes the installed repository", () => {
    const r = run(RUBY, app, {}, [join(DIR, "bundler_probe.rb")]);
    assert.equal(r.status, 0, r.err);
    const answer = JSON.parse(r.out.split("\n").filter((line) => line.startsWith("{")).pop());

    assert.deepEqual(answer.locked, ["hello-1.0.0", "world-0.5"]);
    assert.equal(answer.locked_checksums, true);
    assert.equal(answer.bundler_version, "4.1.0");

    assert.deepEqual(answer.installed_index, ["hello-1.0.0", "world-0.5"]);
    assert.equal(answer.world_class, "Bundler::StubSpecification");
    assert.deepEqual(answer.world_deps, [["hello", "~> 1.0"]]);
  });

  test("the path source loads its gemspec, the SourceMap wires the requirements", () => {
    const r = run(RUBY, app, {}, [join(DIR, "bundler_probe.rb")]);
    assert.equal(r.status, 0, r.err);
    const answer = JSON.parse(r.out.split("\n").filter((line) => line.startsWith("{")).pop());

    assert.deepEqual(answer.path_specs, [["pathgem", "0.1", ["hello"]]]);
    // the path source added above is a non-default explicit source, so its
    // names join the requirements too
    assert.deepEqual(answer.all_requirements, [
      ["hello", "Bundler::Source::Rubygems"],
      ["pathgem", "Bundler::Source::Path"],
      ["world", "Bundler::Source::Rubygems"],
    ]);

    assert.deepEqual(answer.path_lock, ["Bundler::Source::Path", "PATH\n  remote: pathgem\n  specs:\n"]);
    assert.equal(answer.git_error, true, "the git source answers GitError");
  });

  test("PubGrub resolves the Gemfile against the repository, and the lock reads back", () => {
    const r = run(RUBY, app, {}, [join(DIR, "bundler_resolve_probe.rb")]);
    assert.equal(r.status, 0, r.err);
    const answer = JSON.parse(r.out.split("\n").filter((line) => line.startsWith("{")).pop());

    assert.deepEqual(answer.resolved, [["hello", "1.0.0"], ["pathgem", "0.1"], ["world", "0.5"]]);
    assert.deepEqual(answer.lock_specs, ["hello-1.0.0", "pathgem-0.1", "world-0.5"]);
    assert.deepEqual(answer.lock_sections, ["PATH", "GEM", "PLATFORMS", "DEPENDENCIES", "BUNDLED WITH"]);
    // the written lock satisfies the Gemfile: reading it back needs no resolve
    assert.equal(answer.resolve_needed2, false);
    assert.deepEqual(answer.resolved2, answer.resolved);
    // hello (~> 2.0) is not in the repository, and the solver reports it
    assert.deepEqual(answer.bad, ["Bundler::GemNotFound", true]);
  });

  test("the installer installs, binstubs the path gem and writes a readable lock", () => {
    // DEBUG raises the Shell UI level so the debug print_using_message lines
    // are visible, as with upstream's bundle install runs.
    const r = run(RUBY, app, { DEBUG: "1" }, [join(DIR, "bundler_install_probe.rb")]);
    assert.equal(r.status, 0, r.err);
    const answer = JSON.parse(r.out.split("\n").filter((line) => line.startsWith("{")).pop());

    assert.equal(answer.bundle_path, true, "the installer created the bundle path");
    assert.equal(answer.lock_released, true, "the ProcessLock lock file goes when the block ends");
    assert.deepEqual(answer.post_install_messages, {});
    assert.deepEqual(answer.installed_lock_specs, ["hello-1.0.0", "pathgem-0.1", "world-0.5"]);
    assert.equal(answer.path_bin, true, "the path gem got its binstub");
    assert.equal(answer.path_bin_ruby, true, "the binstub runs the port's ruby command");
    // the install wrote a lock the Gemfile reads back with no re-resolve
    assert.equal(answer.resolve_needed_after, false);
    // the Shell UI told what it used
    assert.match(r.out, /Using hello 1\.0\.0/);
    assert.match(r.out, /Using pathgem 0\.1 from/);
  });
});

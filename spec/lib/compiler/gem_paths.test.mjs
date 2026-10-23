// The gem path reader of the builder toolchain
// (lib/opal/compiler/builder/gem_paths.mjs): installed gem stubs read in
// plain Node, newest version first, compiled trees before require paths,
// and the default gem directory agreeing with Gem.user_dir.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareGemVersions, defaultGemDir, gemLoadPaths, gemRepositories } from "../../../lib/opal/compiler/builder/gem_paths.mjs";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const DIR = mkdtempSync(join(tmpdir(), "opal-gem-paths-"));

function write(path, contents = "") {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, contents);
  return path;
}

// A repository as lib/rubygems leaves it: specifications/<full>.gemspec stubs
// and a gems/<full>/ directory each.
function install(repo, name, version, { requirePaths, compiled } = {}) {
  const full = `${name}-${version}`;
  const stub = [
    "# -*- encoding: utf-8 -*-",
    `# stub: ${name} ${version} ruby ${(requirePaths ?? ["lib"]).join(" ")}`,
    "",
    "Gem::Specification.new do |s|",
    `  s.name = "${name}".freeze`,
    `  s.version = "${version}".freeze`,
    ...(requirePaths ? [`  s.require_paths = [${requirePaths.map((p) => `"${p}".freeze`).join(", ")}]`] : []),
    "end",
  ].join("\n");
  write(join(repo, "specifications", `${full}.gemspec`), stub);
  for (const path of requirePaths ?? ["lib"]) write(join(repo, "gems", full, path, `${name}.rb`), `# ${name} ${version}\n`);
  for (const digest of compiled ?? []) write(join(repo, "gems", full, "compiled", full, digest, `${name}.js`), `Opal.modules["${name}"] = function () {};\n`);
  return full;
}

describe("gem paths of installed gems", () => {
  const repo1 = join(DIR, "repo1");
  install(repo1, "greet", "1.0.0");
  install(repo1, "greet", "2.0.0", { compiled: ["oldoldold", "newnewnew"] });
  install(repo1, "plain", "0.1.0", { requirePaths: ["lib", "ext_tools"] });
  // no require_paths line at all: the stub default
  write(join(repo1, "specifications", "bare-0.1.0.gemspec"), 's.name = "bare"\n  s.version = "0.1.0"\n');
  write(join(repo1, "gems", "bare-0.1.0", "lib", "bare.rb"));
  const repo2 = join(DIR, "repo2");
  install(repo2, "greet", "1.0.0");

  // the older compiled tree is made older than the newer one
  utimesSync(join(repo1, "gems", "greet-2.0.0", "compiled", "greet-2.0.0", "oldoldold"), new Date(0), new Date(0));

  test("GEM_HOME finds the installed name, newest version first", () => {
    const paths = gemLoadPaths("greet", { GEM_HOME: repo1 });
    assert.deepEqual(paths, [
      join(repo1, "gems", "greet-2.0.0", "compiled", "greet-2.0.0", "newnewnew"),
      join(repo1, "gems", "greet-2.0.0", "compiled", "greet-2.0.0", "oldoldold"),
      join(repo1, "gems", "greet-2.0.0", "lib"),
      join(repo1, "gems", "greet-1.0.0", "lib"),
    ]);
  });

  test("the compiled trees come before the require paths of their gem", () => {
    const paths = gemLoadPaths("greet", { GEM_HOME: repo1 });
    assert.ok(paths[0].includes("compiled"));
    assert.ok(paths[1].includes("compiled"));
    assert.ok(!paths[2].includes("compiled"));
  });

  test("GEM_PATH searches its directories in order and answers both", () => {
    const paths = gemLoadPaths("greet", { GEM_PATH: [repo2, repo1].join(":") });
    assert.ok(paths.includes(join(repo2, "gems", "greet-1.0.0", "lib")));
    assert.ok(paths.includes(join(repo1, "gems", "greet-2.0.0", "lib")));
    // version decides the order across repositories: the answer is one
    // list, and the newest version is what a require should meet first
    assert.ok(paths.indexOf(join(repo1, "gems", "greet-2.0.0", "lib")) <
      paths.indexOf(join(repo2, "gems", "greet-1.0.0", "lib")));
  });

  test("require paths are the stub's, and a stub without any asks for lib", () => {
    assert.deepEqual(gemLoadPaths("plain", { GEM_HOME: repo1 }), [
      join(repo1, "gems", "plain-0.1.0", "lib"),
      join(repo1, "gems", "plain-0.1.0", "ext_tools"),
    ]);
    assert.deepEqual(gemLoadPaths("bare", { GEM_HOME: repo1 }), [
      join(repo1, "gems", "bare-0.1.0", "lib"),
    ]);
  });

  test("a name nothing installs answers no paths", () => {
    assert.deepEqual(gemLoadPaths("nosuchgem", { GEM_HOME: repo1 }), []);
  });

  test("a stub whose gems directory is missing answers no paths", () => {
    const broken = join(DIR, "broken");
    write(join(broken, "specifications", "gone-1.0.0.gemspec"), 's.name = "gone"\n  s.version = "1.0.0"\n');
    assert.deepEqual(gemLoadPaths("gone", { GEM_HOME: broken }), []);
  });

  test("GEM_PATH of empty entries, and neither variable, keep Gem.path's shape", () => {
    assert.deepEqual(gemRepositories({ GEM_PATH: `:${repo1}:` }), [repo1]);
    assert.deepEqual(gemRepositories({ GEM_HOME: repo1 }), [repo1]);
  });

  test("the default gem directory is Gem.user_dir", () => {
    // the one place the toolchain repeats a Ruby-side default: compare it
    // with what the ported Ruby answers, or the two would drift silently
    const home = join(DIR, "default-home");
    mkdirSync(home, { recursive: true });
    const env = { PATH: process.env.PATH, HOME: home };
    const ruby = spawnSync(process.execPath, [join(OPAL_ROOT, "exe", "ruby"), "-e", "puts Gem.user_dir"], { env, encoding: "utf8" });
    assert.equal(ruby.status, 0, ruby.stderr);
    assert.equal(defaultGemDir(env), ruby.stdout.trim());
  });
});

describe("version order of installed gems", () => {
  test("numbers compare as numbers and a release beats its prerelease", () => {
    assert.ok(compareGemVersions("1.10.0", "1.9.0") > 0);
    assert.ok(compareGemVersions("1.0.0", "1.0.0.pre") > 0);
    assert.equal(compareGemVersions("2.0", "2.0.0"), 0);
    assert.ok(compareGemVersions("1.0.0.rc1", "1.0.0.beta") > 0);
    assert.ok(compareGemVersions("1.0", "1.0.1") < 0);
  });
});

test("clean up", () => {
  rmSync(DIR, { recursive: true, force: true });
});

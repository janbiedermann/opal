// Installed gems as builder load paths (M7, GEMS.md): the part of RubyGems'
// discovery the toolchain needs in plain Node, where no Ruby is running.
// `--gem NAME` and Opalfile's `add_gem_dependency` ask for a name and get
// directories back: the gem's compiled trees (D7) first, then its require
// paths, newest installed version first, so a require meets a compiled .js
// before the .rb it came from.
//
// The repository layout read here is the one lib/rubygems writes: a gem
// directory holds `specifications/<full_name>.gemspec` stubs and a
// `gems/<full_name>/` directory per gem, and the compiled tree sits in that
// directory at `compiled/<full_name>/<digest>/`. The stub carries what a path
// decision needs - name, version, require paths - on its own lines, which is
// what keeps this file a few regular expressions rather than a Marshal reader
// (the stub is text because upstream writes it through to_ruby_for_cache).
//
// What this does *not* do is check the compiled tree's digest: the toolchain
// has no OPAL_COMPILER_KEY baked into it (its own cache key is the builder's
// runtimeKey, mtimes of the compiler files), and keeping the digest rule
// means re-hashing every source per build. The toolchain therefore trusts a
// compiled tree the way the `compiled/` directory asks to be trusted: run
// `gem compile` again after editing a gem's sources, or delete the tree; the
// loader of the shipped executables (exe/ruby) is the one that verifies.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, delimiter } from "node:path";

// The engine name and version that name the default gem directory's last two
// segments. These mirror Gem.ruby_engine and RUBY_VERSION as lib/rubygems/
// defaults.rb uses them (user_dir); spec/lib/gems/gem_paths.test.mjs compares
// the default this answers with the one Gem.user_dir answers, so the two
// cannot drift quietly apart.
const GEM_ENGINE = "opal";
const GEM_VERSION = "3.2.0";

// The default gem directory: the user's own, since Opal has no system one
// (D9), with the upstream ~/.gem layout preferred when it exists and XDG
// otherwise - the same three steps as Gem.user_dir.
export function defaultGemDir(env = process.env) {
  const home = env.HOME || env.USERPROFILE || homedir() || "";
  const legacy = join(home, ".gem");
  const data = env.XDG_DATA_HOME || join(home, ".local", "share");
  const base = existsSync(legacy) ? legacy : join(data, "gem");
  return join(base, GEM_ENGINE, GEM_VERSION);
}

// The gem directories searched, in order: GEM_PATH splits, GEM_HOME stands
// alone, and neither means the default. This is Gem.path's shape; the
// --install-dir option of the gem command only moves where gems are written,
// so a caller that installed elsewhere says GEM_PATH itself.
export function gemRepositories(env = process.env) {
  if (env.GEM_PATH !== undefined) return env.GEM_PATH.split(delimiter).filter((p) => p !== "");
  if (env.GEM_HOME) return [env.GEM_HOME];
  return [defaultGemDir(env)];
}

// [name, version, directory, requirePaths] for every installed gem named
// +name+ in those directories, newest version first.
export function installedSpecifications(name, env = process.env) {
  const found = [];

  for (const repo of gemRepositories(env)) {
    const specsDir = join(repo, "specifications");
    let entries;
    try {
      entries = readdirSync(specsDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith(".gemspec")) continue;
      const stub = readStub(join(specsDir, entry));
      if (!stub || stub.name !== name) continue;

      const dir = join(repo, "gems", entry.slice(0, -".gemspec".length));
      if (!existsSync(dir)) continue;

      found.push({ ...stub, directory: dir, repository: repo });
    }
  }

  found.sort((a, b) => compareGemVersions(b.version, a.version));
  return found;
}

// The load paths for one gem name: compiled trees before require paths, and
// earlier repositories before later ones, as Gem.path searches them.
export function gemLoadPaths(name, env = process.env) {
  const paths = [];

  for (const spec of installedSpecifications(name, env)) {
    paths.push(...compiledPaths(spec));
    for (const path of spec.requirePaths) paths.push(join(spec.directory, path));
  }

  return paths;
}

// The compiled trees of one gem, newest first. `gem compile` keeps exactly
// one per gem - it drops the digest directories its compile does not answer
// for - so this only ever has to order more after a hand-made change; newest
// first is then the best guess a timestamp allows.
function compiledPaths(spec) {
  const base = join(spec.directory, "compiled", spec.directory.split(/[\\/]/).pop());
  let entries;
  try {
    entries = readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs = entries.filter((e) => e.isDirectory()).map((e) => join(base, e.name));
  return dirs.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

// A stub gemspec: the header line and the attribute lines carry everything
// needed. Reading a whole Specification here would mean reading Marshal and
// the Ruby object model on the JS side; the stub was written as text to be
// read as text (upstream's stub readers read these same lines).
function readStub(file) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    return null;
  }

  const name = /s\.name = "([^"]*)"/.exec(source)?.[1];
  const version = /s\.version = "([^"]*)"/.exec(source)?.[1];
  if (name === undefined || version === undefined) return null;

  const list = /s\.require_paths = \[([^\]]*)\]/.exec(source)?.[1] ?? "";
  const requirePaths = [...list.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  if (requirePaths.length === 0) requirePaths.push("lib");

  return { name, version, requirePaths };
}

// Enough of Gem::Version to say which of two installed versions answers a
// plain `--gem NAME`: dot-separated segments, numbers compared as numbers,
// a number beating a letter at the same place (a release over its
// prerelease), missing segments being zero. Prerelease text segments only
// order against each other lexically - good enough to prefer one release.
export function compareGemVersions(a, b) {
  const as = a.split(".");
  const bs = b.split(".");
  const length = Math.max(as.length, bs.length);

  for (let i = 0; i < length; i++) {
    const x = as[i] ?? "0";
    const y = bs[i] ?? "0";
    if (x === y) continue;

    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) return Number(x) - Number(y);
    if (nx !== ny) return nx ? 1 : -1;
    return x < y ? -1 : 1;
  }

  return 0;
}

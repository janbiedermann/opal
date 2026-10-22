# Gem support for Opal — report and implementation plan

Branch: `digging_for_gems` (based on `grinding_platform_foundation`, commit
`6b22c1080`). Reference checkout: `/root/workspace/rubygems` at
`f033df9` — RubyGems/Bundler **4.1.0.beta2**.

This document is the outcome of the survey phase: what RubyGems and Bundler
are made of, how Opal loads code today, what Opal is missing, and the plan to
get a working `gem` and `bundler` on top of Opal. Every claim about what works
or breaks below was measured with throwaway probe scripts under `tmp/gems_probe/`
run through `exe/ruby`; the probes are listed in the appendix. Node-related
findings (the machine has both `/usr/bin/node-22` and nvm Node 26) are in §5;
**the plan targets Node 26 for the executable builds** and keeps Node 22 as the
runtime floor for generated code.

---

## Status

Sections 1–10 are the survey and the plan as they were written, and stay as a
record of them. Progress against §8 is marked on each milestone heading and
summarised here — this section is the one to keep current, and §11 lists the
core files the work has changed so far.

**M0–M5 are done, exit tests included**: the install path works through the API
*and* through the command line — `exe/gem install ./hello-1.0.0.gem` then
`exe/ruby -e "require 'hello'"`, and `exe/gem install tiny --source <fixture
server>` over the compact index (`spec/lib/gems/cli.test.mjs`).
M6 is in with its plumbing and eighteen commands — the runner, the command
manager, `Gem::Command` and its option mixins, and `install`, `uninstall`,
`help`, `list`, `search`, `info`, `contents`, `which`, `spec`, `build`, `fetch`,
`unpack`, `env`, `sources`, `outdated`, `dependency`, `cleanup` and the
Opal-only `compile` (D7). What is left of §8's M6 list is `lock`, out with the
lockfile and gemdeps machinery, and the `update` commands, out with the
dependency resolver's install side (M8); `gem install --compile` is the one
D7 entry point not wired yet. M8 has not been started; M7 is half in, its
`exe/ruby` side came with M0 and M4 and its compiled-gem tree, the loader half
of D7, came with `compile`.

What runs now, with no `-I` and no network beyond a fixture server on
`127.0.0.1` — and every path below except the last works with no `gem` command,
through the library alone:

* the M1 exit test — `Digest::SHA256.hexdigest("a")`,
  `Zlib.gunzip(Zlib.gzip("a"))`, `URI.parse("https://x/y").request_uri`,
  `TSort` on a small graph — and the §4 version/requirement/dependency probe,
  now against `lib/rubygems` rather than the probe's own copies;
* `Gem::Package.build(spec)` writing a `.gem` that our own reader round-trips
  (members, sizes, checksums), and a `.gem` built by real rubygems verifying,
  parsing and extracting correctly through that same reader (M3);
* install → activate → require: `Gem::Installer.at(path).install` into a
  `GEM_HOME`, then `exe/ruby -e "require 'gem_name'"` with no `-I`, the
  wrapper in `<gem_home>/bin` running the gem's executable, and
  `Gem::Uninstaller` taking all of it away again (M4);
* resolve → install offline: `Gem::Resolver` over a directory of `.gem` files
  solves a dependency tree with PubGrub, `ActivationRequest#download` fetches
  each gem from `Gem::Source::Local`, and the set installs in dependency order;
  the same resolver answers against the installed gems with
  `Gem::Resolver.for_current_gems`; and one call —
  `Gem::DependencyInstaller.new(domain: :local).install 'helper'`, which builds a
  `Gem::RequestSet` over a `Gem::Resolver::InstallerSet` — does all of that,
  picks the version the requirement allows rather than the newest, and it works
  inside `exe/ruby` with no `-I`, after which `require 'helper'` activates the
  gem and what it pulled in (M5's offline half);
* a marshalled stream: `Gem::SafeMarshal.safe_load` reads the
  `[name, version, platform]` triples of a `specs.4.8` index, written by real
  CRuby, with their classes and their UTF-8 strings intact, and refuses what it
  should — an unpermitted class, symbol or ivar. A full spec dump written by
  CRuby reads too, its `created_at` Time included, through the packed
  little-endian words of `rb_time_mdump` rather than upstream's
  rebuild-and-`Marshal.load` path (M5);
* install from a source that has to be fetched: the compact index client reads a
  server's `versions`/`info` files with their ETags and grows a partial `info`
  through a `Range` request, `Gem::Resolver::APISet` answers a dependency from
  the information line without a second fetch, and
  `Gem::DependencyInstaller.new(domain: :remote).install 'tiny'` downloads the
  `.gem` into the cache of the `GEM_HOME` and lays the home out — measured
  against a fixture server on `127.0.0.1`, in `spec/opal/gems/remote_source_spec.rb`
  (M5's remote half);
* the `gem` command itself: `gem --version`, `gem help commands`, `gem help
  install`, `gem -C DIR install ./hello-1.0.0.gem`, `gem install --install-dir`,
  `gem uninstall -x -I`, and `gem install tiny --clear-sources --source
  http://127.0.0.1:PORT/ci/` against a compact index the test serves, which is
  also the case that shows a bundle reaches the transport through its
  `OPAL_HOME` (`spec/lib/gems/cli.test.mjs`, M4's and M5's exit tests). The
  same test reads that repository back with `gem list` (`-i`, `--details`),
  `gem info`, `gem which`, `gem contents`, `gem spec` and `gem search`, and
  `gem build` and `gem unpack` take a gem apart and put it back together; the
  fixture index answers a query with its own spec cache, so the fetch cannot be
  the install's.
* the same commands against rubygems.org, run by hand rather than in the
  suite: `gem search rake`, `gem fetch rake`, `gem install rake`, and
  `gem install addressable`, which resolves a real dependency and lays in two
  gems. Reading those two gems is what found the missing `Time.iso8601` and the
  two in-place String mutations (§11's `opal/corelib/time.rb` row and
  `Gem::YAMLSerializer`'s folded scalars). `exe/ruby -e "require
  'public_suffix'"` then works; `require 'addressable/uri'` does not, because
  Opal compiles one of that gem's regexp literals into a JavaScript expression
  JavaScript rejects — a loader problem outside this port, not a gem one.

Where it is tested: the port's own specs are under `spec/opal/gems/`, run
against the fixture HTTP server in `spec/opal/gems/support/http_fixture.rb` when
they read a source (the transport parks the thread a main-thread server would
need, so it is a Worker), the transport itself has a node suite in
`spec/lib/gems/http.test.mjs`, the `gem` command's own cases (which build
`exe/gem` and run it as a child process, with a temporary `GEM_HOME` and a
fixture source of their own) in `spec/lib/gems/cli.test.mjs`, the ruby command's
gem behaviour sits with the rest of its cases in
`spec/lib/compiler/ruby_exe.test.mjs`, and the
URI/digest/zlib parts of ruby/spec run inside the usual `node tasks/test.mjs`
(the URI files are in `spec/selection/common`, its exceptions in
`spec/filters/bugs/uri.rb`).

Things the port did differently than planned, each one inherited by the
milestones after it:

* **`lib/rubygems.rb` requires its files, no `autoload`.** A gem command is
  shipped as one compiled bundle, where a require decided at run time would
  have nothing to load. Cost: everything loads with `require "rubygems"`.
* **`exe/ruby` carries RubyGems** (`tasks/ruby/bundle.mjs` builds
  `lib/rubygems.rb` into the bundle: 1.4MB, 1.9MB with the M4 store, 2.07MB now
  that the resolver, the install driver and the marshal reader are required
  eagerly too), because finding an installed gem is a property of `require`, not
  of a library a script opts into.
* **The transport is one JS file, not a Ruby binding beside it.** D2 planned
  `lib/opal/gems/{http.mjs,http.rb}`; the Ruby side is
  `lib/rubygems/vendored_net_http.rb` instead, where the ported code looks for
  `Gem::Net::HTTP` — it keeps upstream's name for the net/http it vendors and
  holds the stand-in the ported code inspects (the status classes where
  `Net::HTTP` puts them, `body_permitted?` per class, the nil body a 304
  answers) plus `Gem::HTTPTransport`, the seam every remote read goes through.
  Only `lib/opal/gems/http.mjs` sits where D2 put it, and a program that cannot
  reach it — an `exe/ruby` run outside the source tree — says so at the first
  fetch instead of failing inside a `require`.
* **The activation hook is in the loader, not in `Kernel#require`.** Opal
  compiles `require` to a runtime call, so upstream's
  `core_ext/kernel_require.rb` has no Ruby-level method to wrap;
  `find_feature` calls `Gem.try_activate` for a path that is not on
  `$LOAD_PATH` and searches again. That also closed a gap that predated the
  port: a feature nothing could find now raises `LoadError` rather than the
  `ENOENT` the platform loader used to raise.
* **No `flock`, so `Gem.open_file_with_lock` creates `<path>.lock`
  exclusively** and steals a lock older than `Gem::LOCK_TIMEOUT`. This is the
  one lock GEMS.md D13 keeps; the in-process ones stay dropped.
* **A binstub's `#!` names the `ruby` of the PATH** (`$RUBY` overrides it),
  not the absolute path of the running interpreter: there is no RbConfig to
  read that from, and the program installing a gem is not necessarily the one
  that should run it.
* **M1's tests went into ruby/spec's selection rather than new
  `test/opal/test_{digest,zlib,uri}.rb`**, since upstream already had specs
  for those libraries and most of them pass; only the deliberate gaps
  (unported schemes, the RFC 2396 parser) are filtered out.

* **The command line's option parser is the stdlib's, under upstream's name.**
  Upstream vendors its own `Gem::OptionParser` (`lib/rubygems/optparse`); this
  port has no vendored copy and `lib/rubygems/vendored_optparse.rb` aliases
  `Gem::OptionParser` to the stdlib's `::OptionParser`, which understands
  `accept`, `on` and `program_name` as the ported commands use them. Two places
  had to be written differently than upstream, both because of how Opal reads
  Ruby rather than because of the parser:
  `Gem::Command#add_option` cannot ask `Symbol === opts.first` to spot its
  option-group argument (Opal has `Symbol = String`, so that is true of every
  option flag), and `Gem::ConfigFile` reads the few shared options it needs with
  a hand loop, as upstream 4.1 does, rather than with a parser — optparse adds
  its `Officious` `--help`/`--version` to every parser it builds, and it shifts
  an unknown option off the argument list before raising, so a parser here
  either swallows `--version` or dies on it before the command manager can
  answer either.
* **`exe/gem` carries the parser and the compiler as well.** A `.gemspec` is
  Ruby source that `Gem::Specification.load` and
  `Gem::Installer#ensure_loadable_spec` eval, and `Kernel#eval` needs
  opal-parser; since the port's require of it is static, every bundle compiling
  those files carries the whole compiler, which is why `exe/gem` (2.2MB) is the
  size of `exe/ruby` rather than half of it. It is built by `tasks/gem.mjs`
  from `tasks/gem/bundle.mjs`, and `tasks/gem_exe.mjs`/`tasks/sea_exe.mjs` make
  the single-file executable the way `tasks/ruby_exe.mjs` does.

The core files the port had to touch — 24 of them, `opal/` and `lib/opal/`,
every one reached through a failing gem path — are listed with their commits in
§11.

What is still open, in the order that unblocks the rest:

1. **M6 is in** - the Opal-only `compile` command (D7) was its last piece, and
   the loader half of the compiled tree came with it. Next is **M7's other
   half**: `lib/opal/compiler/builder/gem_paths.mjs`, `--gem`/`-g` on the CLI
   and `add_gem_dependency` in the Opalfile, and `gem install --compile`; the
   `exe/ruby` half came with M0 and M4. `lock` and the `update` commands are
   out with the lockfile, the gemdeps machinery and the resolver's install
   side (M8).
2. **Nothing in the suite reads the real index.** `exe/gem install rake` works
   against rubygems.org when run by hand, and the suite keeps to the fixture
   server so it stays offline and deterministic; what no test covers is the
   live server's own behaviour — a `SolveFailure` message read back from it, a
   real ETag negotiation, a 304.
3. **M7**: the builder consulting the gem directories (`--gem`, `Opalfile`'s
   `add_gem_dependency`) and the precompiled `compiled/` tree.
4. **M8, Bundler.**

---

## 1. Scope

Minimal but functional:

* `exe/gem` / `exe/gem.exe` built from `lib/opal/exe/gem.rb`, implementing the
  subset of the RubyGems CLI that projects need.
* `exe/bundler` / `exe/bundler.exe` built from `lib/opal/exe/bundler.rb`, same
  idea for Bundler.
* Dependency resolution **equal to what RubyGems does today** — i.e. the
  PubGrub solver in `lib/rubygems/vendor/pub_grub` plus `Gem::Resolver`'s
  source/strategy layer, not a hand-rolled resolver.
* Repositories and their metadata: the compact index
  (`/names`, `/versions`, `/info/<gem>`), local directories of `.gem` files,
  and installed gems.
* `Gemfile` and `.gemspec` support.
* Gems install into and are looked up in the user's default gem directory.
* `opal` and `ruby` find installed gems.
* Gems may be precompiled to JS for faster loading.

Out of scope (explicitly): native extensions, signing/certificates, MFA and
`gem push`/`yank`/`owner`, `gem server`, `gem generate_index`, `gem pristine`,
`gem exec`, plugins, git/path sources in Bundler (deferred; a git source would
need the `git` binary, which D12 forbids), Windows-specific behaviour, and
anything that needs a real `Thread`. Nothing in the implementation, the build
tasks or the tests may shell out to an external binary (D12): every capability
comes from Node's own standard library.

---

## 2. How RubyGems and Bundler are built (reference map)

RubyGems is ~39k lines in `lib/rubygems` (excluding `vendor/`), Bundler ~32k
lines in `lib/bundler`. The pieces that matter here:

| area | files | lines |
| --- | --- | --- |
| version / requirement / dependency / platform / name tuple | `version.rb`, `requirement.rb`, `dependency.rb`, `platform.rb`, `name_tuple.rb` | 1699 |
| specification | `specification.rb`, `basic_specification.rb`, `specification_policy.rb`, `validator.rb` | 4593 |
| package format (tar + gzip + YAML metadata) | `package.rb`, `package/tar_*.rb`, `package/*_source.rb` | 1911 |
| metadata serialisation | `yaml_serializer.rb`, `safe_yaml.rb` | 942 |
| remote metadata (compact index) | `compact_index_client.rb`, `compact_index_client/*.rb`, `resolver/api_set*.rb`, `spec_fetcher.rb`, `remote_fetcher.rb` | 1408 |
| resolution | `resolver.rb`, `resolver/*.rb`, `vendor/pub_grub` | 2810 + 1983 |
| install / uninstall | `installer.rb`, `uninstaller.rb`, `dependency_installer.rb`, `installer_uninstaller_utils.rb` | 1839 |
| sources / paths / config | `source.rb`, `source/*.rb`, `source_list.rb`, `path_support.rb`, `defaults.rb`, `config_file.rb` | 2213 |
| CLI plumbing | `command.rb`, `command_manager.rb`, `gem_runner.rb`, `user_interaction.rb`, `text.rb`, `*_options.rb`, `query_utils.rb` | 2310 |
| CLI commands | `commands/*.rb` (34 commands) | ~7000 |

Bundler keeps its own copies of most concepts (`Bundler::Dependency`,
`Bundler::LazySpecification`, `Bundler::Source::Rubygems`, …) and delegates
the actual HTTP/compact-index work to `Gem::CompactIndexClient` in 4.x. Its
resolver is also PubGrub (`lib/bundler/resolver/*` + `vendored_pub_grub`).

Two facts that shape the whole design:

1. **The `.gem` file is a tar** containing `data.tar.gz`, `metadata.gz` and
   `checksums.yaml.gz`. In RubyGems 4.x `metadata.gz` is **YAML written by
   `Gem::YAMLSerializer`** (a pure-Ruby YAML reader/writer vendored in
   RubyGems, 880 lines) — not Marshal. Verified against
   `https://rubygems.org/downloads/rake-13.3.1.gem`.
2. **An installed gem is a directory tree plus a Ruby-source gemspec**:
   `<gem_dir>/gems/<full_name>/…` (the unpacked `data.tar.gz`) and
   `<gem_dir>/specifications/<full_name>.gemspec`, which is `s.name = "…"`
   Ruby code produced by `Gem::Specification#to_ruby` and read back with
   `eval` by `Gem::Specification.load`. This is the format both CRuby and our
   port can read, so we keep it byte-compatible.

### Default gem directory

`Gem.user_dir` (RubyGems `defaults.rb`) is

```
$XDG_DATA_HOME/gem/<RUBY_ENGINE>/<ruby_version>      # normally ~/.local/share/gem/…
~/.gem/<RUBY_ENGINE>/<ruby_version>                  # legacy, wins if it exists
```

For Opal that is **`~/.local/share/gem/opal/3.2.0`** (`RUBY_ENGINE` is `opal`,
`RUBY_VERSION` is `3.2.0`), with `~/.gem/opal/3.2.0` as the legacy fallback.
`GEM_HOME`/`GEM_PATH`/`--install-dir` override it. `Gem.default_dir` in CRuby
comes from `RbConfig::CONFIG["rubylibprefix"]`, which Opal's `rbconfig` does
not have, so on Opal the user directory *is* the default — which matches the
requirement that gems live under `$HOME`.

Layout we will produce (identical to RubyGems'):

```
~/.local/share/gem/opal/3.2.0/
  gems/rake-13.4.2/…              # unpacked data.tar.gz
  specifications/rake-13.4.2.gemspec
  cache/rake-13.4.2.gem           # downloaded .gem
  bin/rake                        # binstubs
  doc/rake-13.4.2/                # ri/rdoc placeholders (skipped by default)
```

---

## 3. How Opal loads code today, and where gems hook in

Three separate loading mechanisms, all of which need gem awareness:

1. **The builder** (`lib/opal/compiler/builder/`) — build-time. `Builder`
   owns a `PathReader` (a list of load paths + extensions) and a
   `ProjectCollection` that reads `Opalfile`/`Gemfile`/`*.gemspec`.
   `PathReader`/`FileFinder` are Opal's port of `hike.rb`.
   Hooks: `Builder#appendPaths`, `Builder#stubs`, `--gem`, `add_gem_dependency`.
   Today both are stubbed out with *"gems are not available in Node.js"*
   (`lib/opal/compiler/cli/options.mjs`, `cli.mjs`, `builder/project.mjs`).
2. **`exe/ruby`'s runtime loader** (`lib/opal/exe/ruby.rb#install_loader`) —
   it replaces `Opal.platform.load_file` and searches `$LOAD_PATH` for
   `<path>` / `<path>.rb`, compiles with the in-process compiler and `eval`s.
   Hooks: gem load paths, `.js` (precompiled) files, `Gem` activation.
3. **The runtime require machinery** (`opal/runtime/boot.js`:
   `Opal.require` → `Opal.platform.load_file` → `Opal.load_normalized`) and
   `Kernel#require` (`opal/corelib/kernel.rb:612`), which compiles to a plain
   `$require` send, so **overriding `Kernel#require` works** exactly like
   `lib/rubygems/core_ext/kernel_require.rb` does in CRuby.

`$LOAD_PATH`/`$:` already exist (`opal/corelib/variables.rb`) but nothing in
the runtime consults them; only `exe/ruby`'s loader does.

---

## 4. Feasibility: what already works

Measured by copying upstream RubyGems files into `tmp/gems_probe/` and running
them with `exe/ruby` unmodified (except where noted):

| upstream code | result |
| --- | --- |
| `vendor/pub_grub` (1983 lines, the real solver) | **works** — solves, backtracks (`a 1.5.0 / b 1.2.0` for a case that needs it) and raises `SolveFailure`, after 2 one-line patches in `Gem::Version` |
| `Gem::Version`, `Gem::Requirement`, `Gem::Dependency`, `Gem::Platform`, `Gem::NameTuple` | **work** after the same 2 patches (see §6.1, §6.2) |
| `Gem::YAMLSerializer` + `Gem::SafeYAML` parsing a real `metadata.gz` from rake 13.3.1 | **works** — spec, version, `require_paths`, `executables`, `date` (Time), `metadata` hash all come back |
| `Gem::CompactIndexClient::Parser` + `APISet::GemParser` on live `https://index.rubygems.org/info/rake` | **works** — 96 versions with deps/requirements |
| `Gem::Package::TarReader` / `TarHeader` / `TarReader::Entry` on a real `.gem` | **works** — lists `metadata.gz`, `data.tar.gz`, `checksums.yaml.gz`, after 1 one-line patch (`String#strip!`) |
| `stdlib/optparse` with `--[no-]x`, `Array`-typed args, `-iDIR`, `on_head`, `summarize` | **works** — enough for `Gem::Command` |
| core language: `Struct` (+`keyword_init`), `Set`, `Comparable`, `prepend`, `refine`/`using`, `autoload`, endless/beginless ranges, `Hash` default proc, named captures, `String#%`, `pack`/`unpack` (with `-I opal`), `Time`/`Date`/`DateTime`, `Marshal`, `ObjectSpace`, `File`/`Dir` (incl. `fnmatch`, `readlink`, `chmod`, `utime`, `PATH_SEPARATOR`), `FileUtils`, `Pathname`, `StringIO`, `strscan`, `json`, `erb`, `pp`, `logger`, `ostruct`, `securerandom`, `base64`, backticks, `system`, `$?` | **work** |

So the hard parts — PubGrub, the metadata formats, the package format, the
option parser — are already portable. The work is in the glue: `Gem` itself,
the missing stdlib, and the loader/builder integration.

---

## 5. Node 26 (via nvm) — what it changes

This machine has `/usr/bin/node-22` (v22.23.2, V8 12.4, no SEA fuse) and
`~/.nvm/versions/node/v26.12.0/bin/node` (v26.12.0, V8 14.6, SEA fuse).
Everything below was measured on both. **Decision: Node 26 is the toolchain
for this work** — required for the `.exe` builds, and it removes two of the
plan's risks.

| question | Node 22 | Node 26 | consequence |
| --- | --- | --- | --- |
| regexp atomic groups `(?>…)` | rejected (`Invalid group`) | **still rejected**, with `u`, `v` and `yu` | the `Gem::Version::VERSION_PATTERN` rewrite stays (§6.1) |
| possessive quantifiers `*+`, `?+`, `{n}+` | rejected | **still rejected** | same |
| SEA fuse (`seaUnsupported()`) | *"has no single executable application fuse"* | ok | `.exe` builds need nvm Node 26 (already true for `tasks/ruby_exe.mjs`) |
| one-step SEA build | only `--experimental-sea-config` + copy + `npx postject` + codesign | **`--build-sea=config.json`** produces the executable directly | `exe_compiler.mjs` can drop postject/npx/signing on Node 26 (§8 M6) |
| worker thread + `fetch` inside a **startup-snapshot** SEA | Opal's `exe_compiler.mjs` says Node aborts (`shutdown_wrap_template_.IsEmpty()`) and works around it by re-executing the executable (`HTTP_GET_HELPER`) | **works** (verified: `status 200`, 2.8 MB) — also works in a code-cache SEA | the `HTTP_GET_HELPER` workaround becomes a Node-22 fallback only |
| synchronous HTTP in-process (`Atomics.wait` + `Worker` + `MessagePort`) | works | works | replaces the per-request `execFileSync` design (§6.3) |
| proxy support in `fetch` | none | **`--use-env-proxy` / `NODE_USE_ENV_PROXY=1`** honours `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` | matches RubyGems' `http_proxy` handling for free |
| `node:sqlite` | present, *experimental warning* | present, **stable** (no warning) | optional backend for the compact-index/spec cache; not planned |
| `node:tar` | absent | **absent** | the `Gem::Package::Tar*` port stays |
| `crypto.getHashes()` | sha1/224/256/384/512, md5, sha3, shake | same + `sha-256`-style aliases | the `Digest` port is fine on both |
| `fs.globSync`, `zlib.gunzipSync`, `module.enableCompileCache`, `AbortSignal.timeout`, `Worker`+`MessageChannel` | present | present | no change |
| bare startup (`node -e 1`) | 80 ms | **23 ms** | `tasks/test.mjs` and the CLI spawn node constantly; worth using 26 for the suite too |
| SEA startup (snapshot, trivial main) | n/a | 22 ms — same as plain node | a snapshot `.exe` costs nothing at start |

Measured HTTP numbers — the same 10 compact-index URLs (743 KB total) on live
`index.rubygems.org`, best of a run:

| transport | Node 22 | Node 26 |
| --- | --- | --- |
| one `execFileSync(node, ['-e', fetch])` per request | 2983 ms | 1733 ms |
| **one persistent worker**, `Atomics.wait` per request | 530 ms | **460 ms** |
| the same 10 again, answered with conditional `304`s | 300 ms | 300 ms |

So the worker transport is ~3.8× faster than the process-per-request approach
on Node 26 and ~5.6× on Node 22, and it keeps one process, one connection pool
and one set of conditional-request state — which is what the compact index's
`updater.rb` wants.

---

## 6. Gap analysis: what Opal is missing

### 6.1 Language / corelib gaps

| gap | evidence | impact | fix |
| --- | --- | --- | --- |
| **Regexp atomic groups `(?>…)`** (and possessive quantifiers) | `Gem::Version::VERSION_PATTERN` → `SyntaxError: Invalid group`. V8 rejects `(?>` in Node 22 *and* Node 26 (V8 14.6), with the `u`, `v` and `yu` flags. | 1 occurrence in all of RubyGems | rewrite the pattern in the port (`[0-9]+(?:\.[0-9a-zA-Z]+)*` is equivalent here); document the limitation |
| **mutable `String` methods** (`gsub!`, `sub!`, `strip!`, `slice!`, `delete_prefix!`, …) | `String#gsub! not supported. Mutable String methods are currently not supported in Opal.` Opal strings are JS primitives, so mutating the receiver is impossible. | 10 `gsub!` + 2 `sub!` + 3 `slice!` + 16 other bang calls in RubyGems (4–8 files each) | rewrite at the port sites (all are local-variable rebinding); add a lint probe that greps the ported tree for them |
| **`Array#hash` calls `eql?` across unrelated objects** | `Incompatibility#hash` → `Array#hash` → `Array#eql?` → `undefined method 'cause' for ConflictCause`. `opal/corelib/array.rb:1278-1316` keeps a global `$hash_ids` map for cycle detection and compares `self` against *every* object hashed so far; CRuby's `Array#hash` never calls `eql?`. | breaks PubGrub's failure reporting (and any `hash` of nested structures whose elements have type-assuming `eql?`) | **fix in Opal**: only compare against the current ancestor chain (a stack), not every visited object; add a spec |
| `FileTest` | `uninitialized constant FileTest` | used by RubyGems | build `opal/full` into the bundle — `opal/full` already requires `corelib/file_test` (D11, M0) |
| `caller_locations` | `Kernel#caller_locations` **exists** (`opal/corelib/kernel.rb:328`) but raises `uninitialized constant Thread`: it maps each frame to `::Thread::Backtrace::Location`, which `stdlib/thread.rb` defines. With that loaded, `path`/`lineno`/`label`/`base_label`/`absolute_path` all work. What stays wrong: the frames are JavaScript ones — `exe/ruby` runs the script through `eval`, so a script frame reports the bundle path and a JS label, not the `.rb` file and line. | `bundler/dsl.rb` (finding the Gemfile), `bundler/rubygems_integration.rb`, `bundler/env.rb`, `rubygems/core_ext/kernel_warn.rb` | class fixed in M0 (the bundle loads `thread`); the frame identity needs source-map-aware backtraces — for Bundler it degrades error messages, not resolution |
| `Thread::Mutex`, `Monitor` (locks) | `stdlib/thread.rb` defines top-level `Mutex` but **not** `Thread::Mutex`; `Monitor` does not exist in Opal. 10 `Thread::Mutex` references across 10 files, 2 `Monitor.new`. | **not a gap to fill**: every one is mutual exclusion between real threads, so the port drops the wrapper (D13). Substituting Opal's non-reentrant `Mutex` for `RUBYGEMS_ACTIVATION_MONITOR` would *introduce* a deadlock CRuby does not have |
| `Thread.new` / `Thread.start` | `stdlib/thread.rb` raises `NotImplementedError, 'Thread creation not available'` | only 3 sites in the ported set: `request_set.rb:175` (download pool, over the `Thread::Queue` at `:162`), `bundler/worker.rb:99` (fed by the `Thread::Queue` in `bundler/installer/parallel_installer.rb:182`), `bundler/fetcher/connection_pools.rb` (`Thread::SizedQueue`) | **replace with a Proc at the port site** — an inline call is the same thing as an eagerly-run thread body (D13). `core_ext/tcpsocket_init.rb` and `gemcutter_utilities/webauthn_*` are not ported |
| `IO#flock` | `File::LOCK_EX` exists but `f.flock(File::LOCK_EX)` raises `NotImplementedError`: `opal/corelib/file.rb:1571` only defines `flock` when `platform.flock` exists, and the Node platform never sets it. Node has no `flockSync` and no `LOCK_*` constants either. | `Gem.open_file_with_lock` (rubygems ≥ 3.6) and `Bundler::ProcessLock` | don't emulate `flock`: implement the lock as an exclusive-create marker (`fs.openSync(path, 'wx')`, i.e. `File.open(path, File::CREAT | File::EXCL)`) with the owner's pid inside and stale-lock removal, and make `Gem.open_file_with_lock` use that on Opal |
| `Kernel#pp` | `undefined method 'pp'` unless `require 'pp'` | cosmetic | fine as-is (matches CRuby) |

### 6.2 Missing standard library

RubyGems/Bundler `require`s these; Opal has none of them:

| library | RubyGems uses it for | plan |
| --- | --- | --- |
| `digest` | `checksums.yaml.gz` verification, `Gem::Package::DigestIO`, compact-index checksums | `stdlib/digest.rb`: `Digest::SHA256`/`SHA512`/`MD5`/`SHA1` over `node:crypto` (`Opal.platform.modules`), with `update`/`<<`/`hexdigest`/`base64digest` |
| `zlib` | `Zlib::GzipReader`/`GzipWriter` for every part of a `.gem` | `stdlib/zlib.rb`: whole-buffer `gunzip`/`gzip` over `node:zlib`, plus a `GzipReader` that wraps it and supports `read`/`each`/`close` (gems are small; no streaming needed) |
| `uri` | every remote path (`Gem::URI`, `Source#uri`, `+` on URIs) | `stdlib/uri.rb` is a 54-line stub with only `decode_www_form`. Port the vendored `lib/rubygems/vendor/uri` (4602 lines) trimmed to generic + HTTP(S) (`URI.parse`, `split`, `join`, `+`, `host`/`path`/`request_uri`, `escape`/`unescape`, `InvalidURIError`) — target ~700 lines |
| `tsort` | `Gem::Specification` dependency graph (`strongly_connected_components`, `each_strongly_connected_component`) | port `vendor/tsort` (455 lines) as `stdlib/tsort.rb` |
| `English` | `$ERROR_INFO` etc. | 20-line `stdlib/english.rb` |
| `timeout` | `Timeout.timeout` in fetchers | `stdlib/timeout.rb`: run the block and **ignore the deadline**. The vendored `lib/rubygems/vendor/timeout/lib/timeout.rb:87` implements the alarm as a *watcher thread* that must run while the block runs, so unlike the other thread uses it cannot be replaced by a Proc — a single-threaded `Timeout` can only be a pass-through. Deadlines then live in the fetch worker (§6.3), where `AbortSignal.timeout` is available |
| `monitor` / `mutex_m` | `require "monitor"` in `bundler/rubygems_integration.rb:7`; `Monitor.new` in `core_ext/kernel_require.rb:12` | **not needed**: the port drops the lock wrappers (D13). Opal's only lock, `Mutex` in `stdlib/thread.rb:146`, stays unused by gem code |
| `net/http`, `net/protocol` | all HTTP | **do not port.** Write `Gem::RemoteFetcher` directly on Node (see 5.3) |
| `socket`, `resolv`, `ipaddr`, `open3`, `etc`, `fiddle`, `objspace`, `syslog` | transitive deps of net/http, or unused | skip |
| `yaml` | `require "yaml"` currently **fails at runtime**: `stdlib/yaml.rb` requires `js-yaml-3-6-1` and the loader only finds `.rb` | fix the loader (§6.4) or add a `stdlib/js-yaml-3-6-1.rb` shim; we mostly need `Gem::YAMLSerializer` anyway |
| `tmpdir` | `Dir.mktmpdir` currently dies on `String#unpack1` | fixed by §6.4 (corelib load path) |

### 6.3 Missing platform capability: HTTP

There is no synchronous HTTP in Node, and Opal's Ruby side is synchronous.
Today Opal pays for that twice:

* `stdlib/open-uri.rb` installs an `XMLHttpRequest` global built on
  `child_process.execFileSync(process.execPath, ['-e', request_script])` — one
  Node process per request (measured: 2983 ms for 10 requests on Node 22,
  1733 ms on Node 26).
* `lib/opal/compiler/cli/exe_compiler.mjs#HTTP_GET_HELPER` re-executes the
  executable as an HTTP helper, because *"a worker thread can't load Node's
  net module in a process started from a snapshot (Node aborts:
  `shutdown_wrap_template_.IsEmpty()`)"*. That is Node-22-era behaviour: on
  Node 26 a worker created from a startup-snapshot (and from a code-cache)
  SEA performs `fetch` normally.

**Plan: `lib/opal/gems/http.mjs`, a persistent fetch worker.** The Ruby side
(`Gem::RemoteFetcher`) calls a JS helper that keeps one `Worker` alive, sends
`{url, method, headers}` over a `MessagePort`, blocks the main thread with
`Atomics.wait` on a `SharedArrayBuffer`, and returns
`{status, headers, body: Buffer}` from `receiveMessageOnPort`. No process
spawned per request, one connection pool, and the worker can batch several
URLs per round trip for Bundler. Notes:

* `Atomics.wait` on the main thread is allowed in Node (verified on 22 and 26).
* The worker code must be passed as a string (`new Worker(code, { eval: true })`)
  and the `MessagePort` must be in `transferList` — a `Worker` that loads a
  file from disk is not available inside a SEA.
* Set `NODE_USE_ENV_PROXY=1` (or `--use-env-proxy`) on Node 26 so
  `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` behave like RubyGems' `http_proxy`.
* Keep the `execFileSync` path as the fallback for Node 22 (where the
  snapshot-SEA worker abort is reported), behind the same interface. That
  spawns `process.execPath` — Node itself — not an external tool.
* No `curl`, `wget` or any other external binary; see D12.

### 6.4 Loader / toolchain gaps

* `exe/ruby`'s `find_feature` only tries `<path>` and `<path>.rb`. It must
  also try `.js` (precompiled gems, `js-yaml-*.js`) and `index`-style
  `File.directory?` cases, and `eval` a `.js` file without compiling.
* `exe/ruby`'s `$LOAD_PATH` gets only `$OPAL_HOME/stdlib`. Adding
  `$OPAL_HOME` and `$OPAL_HOME/opal` makes `require 'opal/full'`,
  `require 'corelib/string/unpack'`, `require 'corelib/array/pack'` and the
  `autoload`s registered by `opal/opal.rb`/`full.rb` work at runtime — today
  `Marshal`, `ObjectSpace`, `Struct`, `Set`, `Dir`, `ENV`, `pack`/`unpack`
  are unreachable in `exe/ruby` even though they exist in the repo.
* The `exe/ruby` bundle builds `opal` (mini + a bit more) but not `opal/full`,
  so `FileTest`, `pack`/`unpack`, and the `Marshal`/`ObjectSpace` autoloads are
  missing from the program itself. `opal/full` already requires
  `corelib/file_test`, `corelib/string/unpack`, `corelib/array/pack` and
  registers those autoloads, so **the fix is to build `opal/full` into the
  bundle, not to add requires to `opal/opal.rb`** — measured: the bundle goes
  from 1142 KB to 1548 KB (+406 KB) and `FileTest`, `Marshal`, `pack`/`unpack`,
  `ObjectSpace`, `Struct`, `Set`, `Dir`, `ENV`, `Random`, `PatternMatching` and
  `TracePoint` all work, including the autoloaded ones (the builder compiles
  autoload targets at build time, so they need no runtime lookup).
* `Builder`/`--gem`/`add_gem_dependency` are stubs that only warn.
* No way for the JS side to know what gems are installed (the gemspecs are
  Ruby source).

---

## 7. Design decisions

**D1 — Ruby, not JS, for the gem/bundler logic.** Everything under
`lib/rubygems/` and `lib/bundler/` is Ruby, mirroring upstream paths, so
upstream files can be copied and patched rather than rewritten. `exe/gem` and
`exe/bundler` are Opal programs bundled to standalone Node executables the way
`exe/ruby` is (`tasks/ruby.mjs` + `tasks/ruby/bundle.mjs`).

**D2 — directory layout** (as requested):

```
lib/rubygems/…                 # the ported RubyGems (upstream-shaped)
lib/bundler/…                  # the ported Bundler subset (upstream-shaped)
lib/opal/gems/…                # Opal-specific glue used by exe/gem (and exe/bundler)
  http.mjs / http.rb           # Node HTTP transport for Gem::RemoteFetcher
  node_platform.rb             # Gem::TargetRbConfig, Gem.default_dir, Gem::Platform.local
  precompile.rb                # gem -> .js cache
lib/opal/exe/gem.rb            # the `gem` command (upstream exe/gem shape)
lib/opal/exe/bundler.rb        # the `bundler` command (upstream exe/bundle shape)
tasks/gem.mjs     + tasks/gem/bundle.mjs      -> exe/gem
  npm run build-gem           (mirrors build-ruby -> tasks/ruby.mjs)
tasks/bundler.mjs + tasks/bundler/bundle.mjs  -> exe/bundler
  npm run build-bundler
tasks/gem_exe.mjs, tasks/bundler_exe.mjs      -> exe/gem.exe, exe/bundler.exe
  npm run build-gem-exe / build-bundler-exe   (mirrors build-ruby-exe -> tasks/ruby_exe.mjs)
```

`lib/opal/gems/` holds only what is Opal/Node specific; anything a Ruby
reader would recognise stays in `lib/rubygems/`.

**D3 — copy upstream, patch minimally, mark every patch.** Each copied file
gets a header comment `# Opal: <what changed and why>` and the patches are the
documented categories of §6.1. This keeps later re-syncs with upstream cheap.
Files we deliberately rewrite rather than copy are listed as such.

**D4 — resolution is upstream PubGrub.** Vendor `lib/rubygems/vendor/pub_grub`
verbatim (2 patches) and port `Gem::Resolver` + its sets. No bespoke solver.

**D5 — metadata: compact index for remote, `.gemspec` Ruby source for
installed, YAML for `.gem`.** All three are upstream formats, so gems
installed by CRuby into the same tree remain readable, and vice versa.

**D6 — a JSON index for the JS side.** The installer also maintains
`<gem_dir>/specifications/index.json` (name, version, platform, full_name,
require_paths, dependencies, executables, files). Ruby reads the `.gemspec`;
the JS builder/CLI reads the JSON. One writer (the Ruby installer), two
readers. This avoids writing a Ruby-gemspec parser in JS.

**D7 — precompilation.** `gem compile NAME` (and `gem install --compile`)
writes, per gem, `<gem_dir>/compiled/<full_name>/<digest>/<require_path>/x.js`
using `Builder`/`Compiler` with `requirable: true`. The gem's *logical* require
paths are preserved, so `require 'x'` finds `compiled/…/x.js`. Both loaders
prefer `.js` over `.rb`: the builder already sorts by extension order
(`FileFinder#sortMatches`, `.js` first), and `exe/ruby`'s loader will try
`.js` before `.rb`. A `.js` is `eval`ed directly — no compiler, no parse.
The `<digest>` is a hash of the gem's sources + `OPAL_COMPILER_KEY`, so stale
output can never be picked up.
*(In with M6: `Gem::CompiledTree` writes the tree and names it with that
digest — exe/gem and exe/ruby stamp the same `OPAL_COMPILER_KEY`, imported
from one `compilerKey()` — and `BasicSpecification#full_require_paths` puts
the matching directory in front of the gem's source paths, so it is the
directory order that prefers `.js`; `exe/ruby` already loaded a plain `.js`
as it stands (M0). The builder consulting the tree, and `gem install
--compile`, stay with M7.)*

**D8 — `Gem::Platform.local` is `Gem::Platform::RUBY` on Opal.** Opal runs
pure-Ruby gems; `ruby`-platform selection is the only sane default, and
`--platform` stays available for explicit choices. Native-extension gems are
detected (`spec.extensions.any?`) and refused with a clear error.

**D9 — `Gem.dir` defaults to `Gem.user_dir`** (see §2). `GEM_HOME`, `GEM_PATH`,
`--install-dir`/`-i` and `.gemrc` (`Gem::ConfigFile`, trimmed) work as usual.

**D10 — Node 26 (nvm) is the toolchain for this work.** The `.exe` builds
require it (the system Node 22 has no SEA fuse), and it is also the faster
runtime for the test suite. Concretely:

* `tasks/gem_exe.mjs` / `tasks/bundler_exe.mjs` reuse `tasks/ruby_exe.mjs`'s
  "re-run myself under nvm Node 26" trick, and on Node 26 build the executable
  with `--build-sea=config.json` instead of
  `--experimental-sea-config` + copy + `npx postject` + codesign/signtool.
  `exe_compiler.mjs` grows a `buildSea()` that prefers `--build-sea` when
  `process.execPath` supports it and falls back to the current path otherwise.
* The fetch worker (§6.3) is the primary HTTP transport; `HTTP_GET_HELPER`
  stays only as the Node-22 snapshot fallback.
* `NODE_USE_ENV_PROXY=1` is set by the fetcher on Node 26.
* Nothing in the *generated* code may depend on Node 26: the shipped target
  stays ES2024 / Node 22 (AGENTS.md), so the worker transport must degrade to
  `execFileSync` there.

**D11 — no `node:sqlite` cache.** It is stable on Node 26 and would make the
compact-index cache and the installed-spec index fast, but it would make the
`.exe` and the browser path diverge. Not planned; revisit if the JSON cache in
`~/.cache/opal-gem/` proves slow.

**D12 — no external binaries; use what Node offers.** Nothing in the
implementation, the build tasks or the tests may shell out to a program that
isn't Node itself. `curl`, `wget`, `tar`, `gzip`, `unzip`, `git`, `gem`, `sh`
and `npx` are all out. The consequence is that every capability has to come
from Node's own standard library, which for this project it does:

| need | Node facility | note |
| --- | --- | --- |
| HTTP(S), conditional requests, proxies | global `fetch` (undici) in a worker, `node:https`/`node:http` | `NODE_USE_ENV_PROXY=1` for `HTTP_PROXY`/`NO_PROXY` (§6.3) |
| SHA256/SHA512/MD5 checksums | `node:crypto` `createHash` | backs `stdlib/digest.rb` |
| gzip of `metadata.gz`, `data.tar.gz`, `checksums.yaml.gz` | `node:zlib` `gunzipSync`/`gzipSync` | backs `stdlib/zlib.rb` |
| tar read/write | **none** — no `node:tar` in Node 22 or 26 | hence the `Gem::Package::Tar*` port |
| random bytes (`SecureRandom`) | `node:crypto` `randomBytes` | |
| tmp dir, home dir, platform | `node:os` | already behind `Opal.platform` |
| process lock (Bundler's `process_lock`) | `node:fs` `openSync(path, 'wx')` | Node has no `flock`; `IO#flock` is `NotImplementedError` on Opal (§6.1) |
| running `bundle exec` / `gem exec` | `node:child_process` with `process.execPath` or our own `exe/*` | spawning Node is allowed |
| building `exe/*.exe` | `node --build-sea` on Node 26 | replaces `npx postject` (§5) |

Two consequences worth stating:

* `tasks/gem_exe.mjs` and `tasks/bundler_exe.mjs` use `--build-sea` only and
  therefore require nvm Node 26; they do not inherit `exe_compiler.mjs`'s
  `npx postject` fallback. (`opal --compile-to-exe node` keeps its current
  path; changing it is out of scope here.)
* Bundler's **git and path sources stay deferred** partly for this reason:
  a git source means running the `git` binary. Implementing them later needs an
  explicit exception to D12, or a pure-JS git client, which is not on offer.

Where an external tool is genuinely useful it is used only as a *development
oracle*, never by shipped code or the test suite — e.g. `tar tvf out.gem` or
`curl` while probing, to confirm our own reader/writer agrees with the format.

**D13 — no Thread and no locks: the port drops both.** Ruby threads cannot be
built on Node, and they are not needed. A `Thread.new` that runs its block
inline is a Proc with extra steps, and a lock whose only job is to keep one
thread out of another is a no-op — so neither gets an Opal implementation.

*The thread sites are all worker pools.* `request_set.rb:175` (download pool
over the `Thread::Queue` at `:162`), `bundler/worker.rb:99` (fed by the
`Thread::Queue` in `bundler/installer/parallel_installer.rb:182`) and
`bundler/fetcher/connection_pools.rb` (`Thread::SizedQueue`). Each pops an
already-filled queue until a sentinel, so calling the Proc directly computes
the same thing, in order. `core_ext/tcpsocket_init.rb` and
`gemcutter_utilities/webauthn_*` (MFA) are not ported.

*Why the locks exist, site by site.* All of them are mutual exclusion between
real threads, in four flavours:

1. **interleaved output** — `compact_index_client.rb:32`
   (`DEBUG_MUTEX.synchronize { warn(...) }`) and `user_interaction.rb:583`
   (`locked_puts`) keep one line contiguous.
2. **a shared mutable cache** — `specification.rb:115 @load_cache_mutex` guards
   only the two `@load_cache` hash accesses (1117, 1129) and `clear_load_cache`
   (788). Tellingly, the `File.read` and `eval` of the gemspec sit *outside*
   the lock, precisely because evaluating a gemspec can re-enter
   `Specification.load`.
3. **process-global state** — `bundler/shared_helpers.rb:54,60` wrap
   `Dir.chdir`/`Dir.pwd` in `rubygems_integration.rb:9 EXT_LOCK`, because
   native-extension builds change the process CWD while other threads read it.
   Native extensions are out of scope (D8).
4. **the require hook** — `core_ext/kernel_require.rb:12
   RUBYGEMS_ACTIVATION_MONITOR` wraps the whole gem lookup in `Kernel#require`.

None of them encodes a non-thread invariant: no recursion guard, no ordering
contract, no memory barrier (JS has one thread, and `Atomics.wait` blocks it
outright, so there is no shared-memory hazard to guard).

*Keeping them is not neutral, it is a hazard.* Site 4 is a **Monitor rather
than a Mutex precisely because `require` is reentrant**: activating a gem runs
that gem's code, which requires more gems while the outer `require` still holds
the lock. Substituting Opal's non-reentrant `Mutex` there deadlocks a path
CRuby never deadlocks on; implementing `Monitor` instead means writing reentrant
counter machinery whose only observable effect is to be a no-op. Dropping the
wrapper is the faithful translation — same behaviour, no new machinery. The
same reasoning removes `Thread::Queue`/`SizedQueue` in the three pools: a plain
Array is the same work list.

*One kind of lock does stay:* the **cross-process** one. Two separate `gem`
processes really can run at once, so `Gem.open_file_with_lock` and
`Bundler::ProcessLock` keep a lock — but as an exclusive-create marker file
(`fs.openSync(path, 'wx')`) holding the owner's pid, because Node offers no
`flock` at all (§6.1, D12). In-process locks are about threads; that one is
about processes, and it is not removable.

*What `stdlib/thread.rb` is still needed for:* `Thread::Backtrace::Location`,
without which the existing `Kernel#caller_locations`
(`opal/corelib/kernel.rb:328`) raises `uninitialized constant Thread` — with it
loaded it returns correct `path`/`lineno`/`label`/`base_label`/`absolute_path`,
which is what `bundler/dsl.rb` uses to find the Gemfile. And
`Thread.current.thread_variable_get/set`, used by `bundler/ui/shell.rb:97,171`
to nest its log level — single-threaded that is just a variable, and the shim
already does it. So the file is **required, never extended**: no `Thread.new`,
`#join`, `#value`, `#status`, `Thread.main`, `abort_on_exception`,
`ConditionVariable`, `handle_interrupt`, `Monitor`.

*Why not real threads, for the record.* Ruby threads share one heap — `@x`,
procs, class tables, `$globals`, `object_id`, `equal?` — while
`node:worker_threads` are isolates sharing only `SharedArrayBuffer` (binary);
crossing that means proxying every object access, which breaks identity and
finalizers and is unusably slow. Cooperative green threads would need to
suspend an arbitrary Ruby method mid-body (that is what `join`, `Queue#pop` and
`synchronize` do to their caller), which in JS means compiling every method to
an async function — a universal version of Opal's opt-in `--await`: a new
calling convention, a Promise per call, `ensure`/`rescue`/`retry`/`throw`
re-derived across suspension points, and a regression of the allocation-bound
work in this repo. Opal has no `Fiber` either (only `FiberError`), and
generators hit the same viral problem.

The one thing this decision cannot fake is **`Timeout`**: the vendored
`vendor/timeout/lib/timeout.rb:87` implements the alarm as a watcher thread
that must run *while* the block runs, so a Proc substitution is meaningless.
`stdlib/timeout.rb` is therefore a pass-through that ignores the deadline, and
real deadlines move to the fetch worker, which has `AbortSignal.timeout` (§6.3).

Where concurrency genuinely pays, it lives in JS: the fetch worker issues
several requests per round trip and hands results back one at a time (§6.3).
That restores the throughput RubyGems wanted from its download pool without
any Ruby-thread semantics.

---

## 8. Implementation plan

Nine milestones, each independently testable and committable. Rough sizes are
lines of new/ported code.

### M0 — Opal fixes that everything else depends on (~400 lines) — **done**

1. `opal/corelib/array.rb`: make `Array#hash`'s cycle detection compare only
   against the current ancestor chain instead of every previously hashed
   object. Spec in `spec/opal/core/array/hash_spec.rb`.
2. `exe/ruby` (and later `exe/gem`, `exe/bundler`): build **`opal/full`** into
   the bundle (`builder.build("opal/full", { requirable: true, load: true })`
   in `tasks/ruby/bundle.mjs`). It already requires `corelib/file_test`,
   `corelib/string/unpack` and `corelib/array/pack` and registers the
   `Marshal`/`ObjectSpace`/`Struct`/`Set`/`Dir`/`ENV`/`Random`/
   `PatternMatching`/`TracePoint` autoloads, so this one line replaces what
   would otherwise be several new requires in `opal/opal.rb`. Cost: +406 KB
   (1142 → 1548 KB), verified working.
3. `stdlib/thread.rb`: **require it, do not extend it** (D13). It supplies
   `Thread::Backtrace::Location`, without which the existing
   `Kernel#caller_locations` raises `uninitialized constant Thread`, and
   `Thread.current` thread-locals. No `Thread.new`, no `Thread::Mutex` alias,
   no `Monitor`: the port drops the lock wrappers and the thread pools (M4/M8).
4. `exe/ruby`: add `$OPAL_HOME` and `$OPAL_HOME/opal` to `$LOAD_PATH`; make
   `find_feature` try `.js` (eval directly) as well as `.rb`. The load path is
   still needed after item 2, for `require 'corelib/…'` and `require 'opal/…'`
   issued by user and gem code at runtime.
5. Docs: note the regexp atomic-group and bang-method limitations in
   `HACKING.md`/`AGENTS.md`.
6. `lib/opal/compiler/cli/exe_compiler.mjs`: add a `--build-sea` fast path for
   Node 26 (one step, no postject/npx/signing), keep the existing path for
   Node 22, and re-verify whether `HTTP_GET_HELPER` is still needed there.
   `tasks/ruby_exe.mjs` then shares the same helper.

*Exit test:* `exe/ruby -e "p FileTest; p Marshal.load(Marshal.dump([1,'a'])); p [1,2].pack('C*'); p caller_locations.first.path"` works with **no `-I`** and no explicit `require 'thread'`; `node tasks/test.mjs` green.

**Status: done**, all six items. Item 5 landed in
`docs/unsupported_features.md` rather than `HACKING.md` — that file is where
the regexp, immutable-string and `flock` limitations now stand — and item 6's
fast path is the `--build-sea` branch of
`lib/opal/compiler/cli/exe_compiler.mjs`, which `tasks/ruby_exe.mjs` already
shares. Item 4's `.js` lookup is what let M1 skip a yaml shim.

### M1 — stdlib pieces (~1300 lines) — **done**

`stdlib/digest.rb`, `stdlib/zlib.rb`, `stdlib/uri.rb` (full, trimmed port of
the vendored `uri`), `stdlib/tsort.rb`, `stdlib/english.rb`,
`stdlib/timeout.rb` (a pass-through: the vendored alarm is a watcher thread, so
the deadline cannot be honoured here, D13), `stdlib/js-yaml-3-6-1.rb` shim (or
loader fix). No `stdlib/monitor.rb` — the port drops the lock wrappers (D13).

Tests: `test/opal/test_digest.rb`, `test_zlib.rb`, `test_uri.rb` (against
ruby/spec's `library/uri` where it passes), plus `spec/ruby/library/digest/*`
which already exists in the suite.

*Exit test:* `Digest::SHA256.hexdigest("a")`, `Zlib.gunzip(Zlib.gzip("a"))`,
`URI.parse("https://x/y").request_uri`, `TSort` on a small graph.

**Status: done**, the exit test passes. `digest.rb`, `zlib.rb`, `uri/`,
`tsort.rb`, `English.rb` and `timeout.rb` are in `stdlib/`; the yaml item
needed no `js-yaml-3-6-1.rb` shim, because M0's fourth item — `find_feature`
trying `.js`, landed as d5ada5a88 — lets `stdlib/yaml.rb` require that plain
`.js` file, and `Gem::SafeYAML` reads a real `metadata.gz` through it. Tests
came out of ruby/spec rather than new `test/opal/test_{digest,zlib,uri}.rb`:
`library/uri`, `library/digest`, `library/zlib` and `library/timeout` are in
`spec/selection/common`, and the deliberate gaps — the RFC 2396 parser,
`URI::Parser`, the schemes nobody uses — sit in `spec/filters/bugs/uri.rb`.
One gap surfaced later and closed in M4: `URI::Generic.build2` still asked
RFC2396_PARSER for an escape, so `URI::Util.escape` does that job now.

### M2 — `Gem` core, no I/O (~2600 lines) — **done**

Port: `errors.rb`, `exceptions.rb`, `deprecate.rb`, `text.rb`, `version.rb`,
`requirement.rb`, `platform.rb`, `dependency.rb`, `name_tuple.rb`,
`defaults.rb` (Opal-specific), `path_support.rb`, `config_file.rb` (trimmed),
`yaml_serializer.rb`, `safe_yaml.rb`, `rubygems.rb` (the `Gem` module,
trimmed: `dir`, `path`, `paths`, `default_dir`, `user_dir`, `load_path`,
`refresh`, `configuration`).

`lib/opal/gems/node_platform.rb` supplies `Gem::TargetRbConfig`-equivalent
data and `Gem.default_dir`.

Tests: `spec/opal/gems/{version,requirement,platform,dependency,name_tuple}_spec.rb`
— port the relevant cases from `test/cruby/test/rubygems/` (already vendored
in this repo) where they run.

*Exit test:* the §4 version/requirement/dependency probe runs unpatched except
for the two documented rewrites.

**Status: done**, against the ported tree rather than the probe's own copies.
Three changes of shape: `lib/opal/gems/node_platform.rb` never appeared, the
Opal answers sit in `lib/rubygems/defaults.rb` (no system directory,
`default_dir` is `user_dir`, no vendor or extension directory,
`local_platform` is plain `ruby`); `errors.rb` was folded into
`exceptions.rb`, which lost the load-error hierarchy (next paragraph); and the
files are `require`d eagerly by `lib/rubygems.rb` instead of autoloaded, so that
a compiled bundle carries them. Two files arrived later than the plan assumed,
with the milestones that first needed them: `text.rb` and `deprecate.rb`.

That folding was undone afterwards, and `errors.rb` is a file of its own again:
the activation failures belong to it, not to `Gem::Exception`. `Gem::LoadError <
::LoadError` — not a `StandardError`, so a script rescues it the way it does in
CRuby — carries `name` and `requirement`, and `MissingSpecError`,
`MissingSpecVersionError` and `ConflictError` hang off it. Until then the two
raises in `specification.rb` and the `rescue Gem::LoadError` of
`Gem.try_activate` were naming a constant that did not exist, so a gem that
could not activate died with `NameError` instead. Specs:
`spec/opal/gems/errors_spec.rb`, and the last four examples of
`spec/opal/gems/activation_spec.rb` reach all three through a real activation.

### M3 — `Gem::Specification` and the gemspec round-trip (~1200 lines) — **done**

A trimmed `Gem::Specification` + `BasicSpecification` + `SpecificationPolicy`
(≈1400 lines instead of 4593) keeping: attributes and defaults, `to_ruby`,
`to_yaml`/`yaml_initialize`/`init_with`, `self.load` (eval), `self.all`,
`self.each`, `self.find_by_name`, `self.latest_spec_for`,
`self.find_inactive_by_path`, `full_name`, `gem_dir`, `matches_name?`,
`contains_requirable_file?`, `activate`/`activated?`/`activate_dependencies`,
`missing_extensions?`, `validate`.

Plus `gem build` (gemspec → `.gem`): `package.rb` (trimmed),
`package/tar_reader.rb`, `tar_reader/entry.rb`, `tar_header.rb`,
`tar_writer.rb`, `package/*_source.rb`, `validator.rb`, `util.rb`.

*Exit test:* `exe/gem build hello.gemspec` produces a `.gem` that our own
`Gem::Package` reader round-trips (members, sizes, checksums) and that
`exe/gem spec`/`gem info` reads back; `Gem::Specification.load` on a
CRuby-installed gemspec works. (`tar tvf` is a handy development cross-check
only — the test asserts with our reader, per D12.)

**Status: done as an API**, in `spec/opal/gems/{specification,package}_spec.rb`
and through `Gem::Package.build(spec)` / `Gem::Package.open`: the `.gem` our
writer produces is read back by our own reader with matching members, sizes
and checksums; `cruby-tiny-0.1.0.gem` — a package built by real rubygems,
committed under `spec/opal/gems/fixtures/` — verifies, parses and extracts
through it; and `to_ruby`/`Gem::Specification.load` round-trip a gemspec.
What the exit test calls `exe/gem build` and `exe/gem spec` is the M6 command
wrapped around that same call. Two files on the list were not ported as such:
`validator.rb` became `Gem::Package#verify`, and `installer_uninstaller_utils.rb`
need no counterpart — its only job was plugin bookkeeping. (`errors.rb` was left
out too, its classes folded into `exceptions.rb`; that arrangement was undone
later, see M2.)
`matches_name?` is not missing: RubyGems 4.1 has no such method, the work is
done by `contains_requirable_file?` and `find_inactive_by_path`.

### M4 — installed-gem store, activation and `require` (~900 lines) — **done**, bar `exe/gem install`

`Gem::Source`, `SourceList`, `Source::Installed`, `Source::Local`,
`Source::SpecificFile`, `Gem::Specification` scanning, `Gem::Installer`
(trimmed: unpack, checksum verify, spec write, `index.json` write, binstubs,
no extensions/no ri), `Gem::Uninstaller`, `Gem::InstallerUninstallerUtils`.

Runtime activation: `lib/rubygems/core_ext/kernel_require.rb` ported to hook
`Kernel#require` (and `Gem::Specification.find_in_unresolved` simplified),
plus the `exe/ruby` loader consulting `Gem.load_path`.

`Gem.open_file_with_lock` gets an Opal implementation based on an
exclusive-create lock file rather than `flock`, which Node does not offer
(§6.1, D12) — that one is a *cross-process* lock and stays (D13).

In the port itself: drop the `@load_cache_mutex`, `DEBUG_MUTEX` and
`user_interaction.rb MUTEX` wrappers, and drop
`RUBYGEMS_ACTIVATION_MONITOR` from the `kernel_require.rb` port (D13);
`request_set.rb`'s thread pool becomes a plain loop over an Array.

*Exit test:* `exe/gem install ./hello-1.0.0.gem` then
`exe/ruby -e "require 'hello'; puts Hello.hi"` with **no `-I`**, and
`exe/opal -e "require 'hello'"` compiling it.

**Status: done**, first line included. `exe/gem install ./hello-1.0.0.gem`
(the `.gem` built by `exe/ruby`'s `Gem::Package`), then `exe/ruby -e
"require 'hello'"` with no `-I`, and `gem uninstall -x -I` taking all of it
away again — `spec/lib/gems/cli.test.mjs` walks that path, and the specs check
the API version of it too: the wrapper in `<gem_home>/bin` running the gem's
executable, and `Gem::Uninstaller` removing the binstub with the rest. The last
line of the exit test, `exe/opal` compiling an
installed gem, is the builder's half and waits for M7. Three deviations:

* no ported `core_ext/kernel_require.rb`: Opal compiles `require` to a
  runtime call, so the hook lives in `exe/ruby`'s `find_feature`, which asks
  `Gem.try_activate` for a path that is not on `$LOAD_PATH` and searches
  again. That also closed a hole that predated the port — a feature nobody
  could find raised the platform loader's `ENOENT`, now a `LoadError`, which
  is what a require hook can rescue;
* no `index.json` to write: RubyGems 4.1 keeps one gemspec per gem and
  rescans the directory through `Gem::SpecificationRecord`, and the port
  copies that, so M7's `gem_paths.mjs` reads `specifications/*.gemspec`;
* a gem that declares `extensions` is refused by `verify_buildable` instead
  of being half-built (§1), and no plugin or Windows stub wrappers are
  generated — hence no `installer_uninstaller_utils.rb`.

### M5 — remote metadata and resolution (~2600 lines) — **done**

`lib/opal/gems/http.mjs` (persistent fetch worker, §6.3) +
`Gem::Net::HTTP`/`Gem::HTTPTransport` in `lib/rubygems/vendored_net_http.rb` +
`Gem::RemoteFetcher`,
`Gem::CompactIndexClient` (+ `cache`, `cache_file`, `http_fetcher`, `parser`,
`updater`), `Gem::Resolver` + `resolver/*` (sets, specifications, requests),
`vendor/pub_grub` (2 patches), `Gem::SpecFetcher`, `Gem::DependencyInstaller`.

*Exit test:* `exe/gem install rake` (resolve → download → checksum → install),
`exe/gem install <gem>` where the resolver must backtrack, and a
`SolveFailure` case whose message renders.

**Status: offline half in.** The engine first: `lib/rubygems/vendor/pub_grub`
and `lib/rubygems/vendored_pub_grub.rb` are byte-identical to upstream (1926
lines, `diff -rq` clean), covered by `spec/opal/gems/pub_grub_spec.rb` — a
solve, a backtrack, a `SolveFailure` whose message renders, and the
`Gem::Requirement`-to-range bridge. Corelib needed nothing for it:
`Hash#compare_by_identity`, `Range#bsearch`, `Struct.new(…) do` and keyword
arguments all exist, so the vendored files stand exactly as upstream writes
them. Above it sits `Gem::Resolver` (667 lines, itself the PubGrub source
object) with 16 files of `resolver/` — the sets (`Set`, `ComposedSet`,
`BestSet`, `CurrentSet`, `IndexSet`, `InstallerSet`, `RequirementList`), the
specifications (`Specification`, `SpecSpecification`, `IndexSpecification`,
`InstalledSpecification`, `LocalSpecification`) and the requests
(`DependencyRequest`, `ActivationRequest`, `Incompatibility`, `Strategy`) —
plus `Gem::SpecFetcher`. `spec/opal/gems/resolver_spec.rb` (7 examples) resolves
a tree of local `.gem` files, downloads them through `Gem::Source::Local`,
installs them in dependency order, resolves against the installed gems, and
checks both failure classes and what a remote domain with no source configured
answers (that last example pinned the transport seam down until the remote half
replaced it). Six deviations, all of them the
transport or a feature §1 drops:

* `resolver.rb`'s require list stops at what is ported: `api_set*`,
  `source_set` (compact index: the transport) and the git, lock and vendor sets
  and specifications (upstream's `gem dependencies` machinery, which §1 leaves
  out) are not there.
* `Gem::Source#dependency_resolver_set`/`#new_dependency_resolver_set` came in
  with the offline half and the probe stubbed out: choosing the compact index
  over the marshal index is one HTTP fetch, so a remote source answered the same
  "remote sources are not available yet" as its other remote methods and only a
  `file://` source got the marshal-index set. The remote half restored the
  probe; see below.
* `Gem::SpecFetcher`: its three `Gem::RemoteFetcher::FetchError` rescues read
  for `Gem::Exception` (upstream's `FetchError` is a subclass of it, and every
  remote read currently raises that), and its `@fetcher`, which this file never
  reads back, stays nil.
* `ActivationRequest#installed?` loses its `VendorSpecification` branch — no
  vendored-gem source here.
* `Gem::DependencyResolutionError` (PubGrub's explanation as the message) joined
  `exceptions.rb`, and `Gem::UnsatisfiableDependencyError` took 4.1's shape
  `(dep_request, platform_mismatch)` with `attr_accessor :errors`: the port's
  3.x-era shape died on the resolver's `new(dep_request, all)`, where `all` is
  an Array, and 4.1's `#errors` is what the commands print.

The install driver sits on top of that: `Gem::RequestSet` (553 upstream lines),
`Gem::DependencyInstaller` (275) and the `Gem::AvailableSet` the installer
requires. `DependencyInstaller#install` builds an `InstallerSet`, asks
`RequestSet` to resolve it and installs the `ActivationRequest`s in
`sorted_requests` order — TSort over the requests, so a gem comes after the gems
it needs, which is the order `Gem::Installer` accepts (`#specs` keeps the order
the resolver answered in). Four deviations, and one thing to know about the API:

* `request_set.rb` mixes in the tsort of `stdlib/tsort.rb` under its own name,
  as `dependency_list.rb` does, and its `install` downloads sequentially —
  upstream hands the downloads to a pool of `Thread::Queue` workers sized by
  `Gem.configuration.concurrent_downloads`, and this port has no threads (D13).
* `install_from_gemdeps`, `load_gemdeps`, `load_lockfile` and the two files
  upstream requires at the bottom (`request_set/gem_dependency_api`, the Gemfile
  DSL, and `request_set/lockfile`) are left out: they need the git, vendor and
  lock sets §1 leaves out and Bundler's lockfile parser, which is M8.
  `#git_set`, `#vendor_set` and `#source_set` stay nil and `#resolve` drops them.
* `Gem::Cooldown` (the `--cooldown` supply-chain filter) is not ported: it wants
  the publish timestamps the compact index will bring, so `cooldown` stays nil
  on the resolver, the request set and the installer, which is upstream's own
  state when no cooldown is configured, and both cooldown paths in `resolver.rb`
  stay inert. M6 brings the option.
* `DependencyInstaller#in_background` loses its fork: `Process.fork` answers
  here, but it is not a fork — it hands the block to the Opal system runner —
  and §1 does not install documentation, so the work runs inline.

The thing to know: `RequestSet#resolve` hands the set its `remote=`, and
`InstallerSet#remote=(true)` widens a `:local` domain to `:both`, which sends
the lookup into the remote set — so a caller that wants to stay offline has to
pass the set's own answer back, `request_set.remote = set.consider_remote?`, as
upstream's installer does.

`spec/opal/gems/dependency_installer_spec.rb` (8 examples) installs a tree from
a directory of `.gem` files, installs the `.gem` named on the command line with
its dependency, keeps `--ignore-dependencies` to the named gem, shows that a
second run reinstalls only the gem in `always_install` and not its dependency,
and checks both failure paths (its remote-seam example became a check that a
remote domain asks the sources it is given, once the remote half below landed);
the exe/ruby suite gained two cases proving the driver rides in the compiled
bundle — one run resolves `helper (~> 0.1.0)` to
`tiny-0.1.0` rather than the `0.2.0` next to it and installs the pair, and
`require 'helper'` with no `-I` then activates the gem and what it pulls in.

The marshal reader is in as well: `Gem::SafeMarshal` — all 1051 upstream lines
of `safe_marshal.rb`, `safe_marshal/elements.rb`, `safe_marshal/reader.rb` and
`safe_marshal/visitors/{visitor,to_ruby,stream_printer}.rb` — required with the
rest of rubygems, which closes the `Gem.load_safe_marshal` hole that
`Specification._load` was calling into. It reads a `specs.4.8` index written by
real CRuby — the `[name, version, platform]` triples, with their `Gem::Version`
and `Gem::Platform` objects — and it refuses what `safe_load` refuses. Three
deviations, all of them places where the format and Opal's strings or `Marshal`
part company:

* `Symbol#name` was missing: `resolve_ivar` and `resolve_symbol_name` ask a
  symbol link for its name. `opal/corelib/string.rb` answers it now, frozen and
  the same String per symbol as CRuby does, and
  `spec/ruby/core/symbol/name_spec.rb` is in the selection and green.
* an Opal String holds characters while the stream holds bytes, and
  `force_encoding` only retags them, so a stream string tagged UTF-8 is decoded
  with `TextDecoder` as its `:E` ivar is read (`#decode_utf8`). A string tagged
  US-ASCII or BINARY keeps its bytes, which is what keeps `"\xff"` one byte
  rather than a replacement character.
* the Time branch reads what CRuby wrote instead of upstream's rebuild. Upstream
  rebuilds a marshal stream and hands it back to `Marshal.load`, because a
  Time's ivars are its internal representation; `Marshal` here has no Time
  support at all — it reads CRuby's user-defined body as a `time_t` and answers
  1970, which is why every `Marshal.load for a Time` example is filtered in
  `spec/filters/bugs/marshal.rb`, and Opal cannot even produce the stream
  upstream rebuilds, since it dumps an object with ivars where CRuby writes a
  user-defined one. So `ToRuby#time_from_dump` decodes `rb_time_mdump`'s two
  packed little-endian words itself: seconds as `high * 2**32 + low` and the
  nanosecond remainder, never `>>`/`&`, which coerce to a signed int32. RubyGems
  normalizes `Specification#date` to a Time, so *every* marshalled full spec
  carries one, and the extended-year form (`timewin` with the sign bit set) and
  a Time's own ivars are refused with `UnsupportedError` rather than misread.
  That opens the legacy `.gemspec.rz` path the compact index does not need.

`spec/opal/gems/safe_marshal_spec.rb` (15 examples) reads fixtures under
`spec/opal/gems/fixtures/safe_marshal/`: streams written by CRuby 3.3, kept as
data because Opal's `Marshal` writes an object with ivars where CRuby writes a
user-defined one. They cover the index triples with their classes, the
symbols the gem format uses, the UTF-8 strings, the three permission refusals, a
stream that is not marshal 4.8, a `Time` in its local, subsecond and rational
forms, and that `Specification._load` reaches this reader.

**Status: remote half in** (`fec5398bf`, `ac054ad5e`). The transport runs the
request on a standing Node Worker while the Ruby thread parks on a
`SharedArrayBuffer` with `Atomics.wait` (§6.3): one Worker, so one connection
pool for the process, and several URLs in one round trip, which is what a
compact-index update asks of it. `Gem::Net::HTTP` is a stand-in that keeps
upstream's names — the status classes where `Net::HTTP` puts them, the
per-class `body_permitted?`, the nil body a 304 answers so that
`cache_update_path` keeps its cached copy — over `Gem::HTTPTransport`, the seam
every remote read goes through, and a program that cannot reach
`lib/opal/gems/http.mjs` says so at the first fetch rather than failing inside
a require. `Gem::RemoteFetcher` is the ported file: pooling, certificate files,
proxy arguments, the global gem cache and the redirect limits. `Gem::URI` is the
stdlib library under the name the vendored copy gives — the constant and the
`Gem::URI(uri)` constructor the client and the API set call point at
`stdlib/uri.rb`, which M1 put there under its real name.

On top of it the four compact-index files came in (`cache`, `cache_file`,
`http_fetcher`, `parser`, `updater`): the `versions` row agrees with the MD5 of
the `info` file it points at, an ETag is stored unwrapped and sent re-quoted,
and an `info` file that grew on the server is appended through a `Range` request
rather than refetched. Its `HTTPFetcher` seam is what keeps the client
independent of the transport, and `spec/opal/gems/compact_index_client_spec.rb`
(19 examples) drives it against a synthetic index. `Gem::Resolver::APISet`,
`APISpecification` and the small parser of the information lines answer a
dependency with no second fetch — the line carries the dependencies and the
requirements — and `Gem::Source#new_dependency_resolver_set` decides between the
two index formats by asking for the `versions` file and falling back to the
marshal indexes. `spec/opal/gems/remote_source_spec.rb` (11 examples) reads both
formats, a `quick/Marshal.4.8/*.gemspec.rz` dump written by CRuby, a download
into the cache of a `GEM_HOME`, and one install laid out end to end;
`spec/opal/gems/remote_fetcher_spec.rb` (24) covers the fetcher itself. The
bodies of every index the specs read are built in the spec or kept as fixtures,
and the server is `spec/opal/gems/support/http_fixture.rb`: a Node Worker,
because the thread that asks for a fetch is the event loop the specs run on.
The deviations are those of §1 — no threads, no OpenSSL, no Socket, immutable
strings:

* upstream's `net/http` is not vendored: 4.1's reads sockets and does TLS
  handshakes through OpenSSL. What `vendored_net_http.rb` holds is the interface
  the ported code inspects, and the fetch is Node's `fetch`.
* `compact_index_client/http_fetcher.rb` asks `Gem::HAVE_OPENSSL` of the constant
  table (this port's `Gem::Security` carries no OpenSSL, so the file upstream
  reads it from is gone) and drops `SocketError` from its `rescue` list — a
  rescue list naming a missing constant dies when it is evaluated, and no DNS
  failure can reach here.
* the two Thread::Mutexes in these files — the one guarding the client's debug
  output and the one around `@endpoints`, the set of paths the process has
  already fetched — are gone (D13: one thread); `@endpoints` still means what it
  did, which is what `#reset!` and `#already_fetched?` are about.
* `Digest::MD5.file(path.to_s)`: the digest reads here take a path *name*, not
  anything answering `#to_path`, which the client's Pathnames do.
* the mutable strings the client and updater shave in place (`delete_prefix!`,
  `delete_suffix!`, `tap(&:chomp!)`) have no counterpart, so the test and the
  cut are one step each — `#unwrap(etag, '"')` refuses an ETag whose quotes are
  unbalanced the way upstream's two bangs did.
* `api_specification.rb` reads the `created_at` of an information line through a
  private copy of `Gem::Cooldown.parse_created_at` rather than the class, which
  §1 leaves out; nothing downstream asks for the value.

Two bugs outside the port fell out of these specs. `Gem::Net::HTTPResponse`
stored its header names as the server sent them while `#[]` downcased the query,
so an ETag lookup missed — the names are stored lower case now, as `net/http`
keeps them. `CGI.escape`/`CGI.unescape`, which `Gem::UriFormatter` is built on,
were `encodeURI`/`decodeURI`: the first kept `#$&?` and the non-ASCII characters
instead of escaping them, the second left the escapes that are legal in a URI
(`%2F`, `%3A`) alone, and both are the form-urlencoded pair now, with the two
ruby/spec examples for them out of `spec/filters/bugs/cgi.rb`. And `stdlib/uri/rfc3986_parser.rb` had the relative-ref
`path_absolute` as `/SEG+` where upstream's `\g<seg>*+` is a subexpression call
the possessive star applies to whole, i.e. `/SEG*`: `URI.parse("/")` raised,
which is exactly the argument `Gem::Source#enforce_trailing_slash` merges for a
source given without a path, so no source without a trailing slash could be read
at all (ruby/spec parses no lone slash, hence nothing covered the alternative;
`spec/opal/stdlib/uri/parse_relative_ref_spec.rb` does now). `stdlib/zlib.rb`
came in with the batch too: `GzipReader#tag` decoded nothing — `force_encoding`
only retags, so UTF-8 gzip text read back one character per byte — and `#read`
answered wrong at the end of its stream and let a negative length through.

M5's exit test came with M6's first batch: `exe/gem install tiny
--clear-sources --source http://127.0.0.1:PORT/ci/`, resolving against a
compact index the test itself serves and installing the package it downloads,
in `spec/lib/gems/cli.test.mjs`. Running the same path against rubygems.org is
now a run rather than a missing feature; the suite keeps to the fixture.

### M6 — the `gem` CLI (~1500 lines) — **in progress**

`lib/opal/exe/gem.rb`, `Gem::GemRunner`, `Gem::CommandManager`,
`Gem::Command`, `user_interaction.rb` (trimmed), `version_option.rb`,
`local_remote_options.rb`, `install_update_options.rb`, `query_utils.rb`, and
commands: **install, uninstall, list, search, info, contents, which, env,
sources, build, spec, dependency, outdated, cleanup, fetch, unpack, lock,
help, environment** (+ `i`/`s` aliases). `compile` is an Opal-only command
(precompilation, D7).

Build tasks: `tasks/gem.mjs`, `tasks/gem/bundle.mjs`, `tasks/gem_exe.mjs`
(the last via the shared `--build-sea` helper from M0.6);
`package.json` scripts `build-gem` and `build-gem-exe`, following the existing
`build-ruby` (`node tasks/ruby.mjs`) and `build-ruby-exe`
(`node tasks/ruby_exe.mjs`).

Tests: `spec/lib/gems/cli.test.mjs` — spawn `exe/gem` against a local
`Source::Local` fixture directory (no network) plus one network-marked test.

**Status: in progress.** The runner is in — `lib/opal/exe/gem.rb` (the script
`tasks/gem.mjs` bundles into `exe/gem`, with `tasks/gem_exe.mjs` for the
single-file executable), `Gem::GemRunner`, `Gem::CommandManager` with its
abbreviated-command lookup and `-h`/`-v`/`-C` handling, `Gem::Command` with its
option groups, common options and `show_lookup_failure`, the
`version_option`/`local_remote_options`/`install_update_options` mixins, and the
`install`, `uninstall` and `help` commands with the `i` alias. That closed both
exit tests that were waiting on a command: build → `exe/gem install
./hello-1.0.0.gem` → `exe/ruby -e "require 'hello'"` → uninstall, and
`exe/gem install tiny --clear-sources --source http://127.0.0.1:PORT/ci/`
against a compact index the test itself serves — the last case also being the
one that shows a bundle reaches the transport through its baked `OPAL_HOME`.
`spec/lib/gems/cli.test.mjs` covers it (15 cases, no network).

Two read-only batches have gone in since: `Gem::QueryUtils` with `list`,
`search`, `info`, `contents`, `which` and `spec` (the last four including what
an installed repository answers: `list -i`, `--details`, `contents -l`,
`spec FIELD`), and the packaging trio `build`, `fetch` and `unpack` with
`Gem::GemspecHelpers`. Since then `environment`, `sources`, `outdated`,
`dependency`, `cleanup` and the Opal-only `compile` came in, which is every
command §8 lists except `lock` (out with the lockfile and gemdeps machinery)
and the `update` commands (out with the resolver's install side, M8).
`gem compile NAME` (D7) writes the gem's requirable files as JavaScript under
`<gem_dir>/compiled/<full_name>/<digest>/` (`Gem::CompiledTree`,
`Gem::Commands::CompileCommand`), and `BasicSpecification#full_require_paths`
puts that tree in front of the gem's source paths when the digest - the gem's
sources plus the compiler of the program that compiled it, `OPAL_COMPILER_KEY`
stamped by both bundles - still matches, so a require meets a `.js` with no
parser on the way and an edited gem is simply read from its `.rb` again. The
read-only
query path also runs against rubygems.org by hand: `gem search rake` answers
from the live compact index, `gem fetch rake` writes the package where it
runs, and `gem install rake` / `gem install addressable` (two gems, a real
dependency) resolve, download, check and install — the run that reached
`Time.iso8601` and two in-place String mutations is what §11's
`opal/corelib/time.rb` row and the YAMLSerializer fix came from.

What the batch leaves out, each traceable to §1 or a later milestone:

* plugin loading in `gem_runner.rb` (`Gem::PluginManager`, `load_plugins`), and
  with it `Gem::CommandManager`'s require of a command file: the commands are
  required eagerly by `lib/rubygems.rb` (§6, no `autoload`), which is the only
  way a compiled bundle can carry them — and a require path built by
  interpolation reads as a static one to the builder, which then asks for a file
  that cannot exist.
* `Gem::UnknownCommandError`'s spell-checking (DidYouMean is not in Opal); the
  error and the command manager's handling of it are upstream's otherwise.
* `-P/--trust-policy`, in `install` and in `unpack` (`Gem::Security` here has
  no `Policy`/`Policies`, so `Gem::SecurityOption` is not required and the
  places the policy was passed answer nil),
  `--cooldown` (`Gem::Cooldown` is not ported), `-g/--file` and `--without`
  (`Gem::RequestSet#install_from_gemdeps` is not ported, M8),
  `--target-rbconfig` (M7) and `--user-install`'s `Gem.vendor_dir` partner,
  which this port has no equivalent of — `--vendor` keeps upstream's "your
  platform is not supported" raise.
* `Gem::UpdateSuggestion` (this is not a RubyGems that can update itself) and
  `load_hooks` (no rdoc/ri, no post-install message printer); the options that
  would feed them — `--document`, `--post-install-message`,
  `--build-extension`, `--install-plugin` — still parse, as upstream's defaults
  carry them, and do nothing.
* the `gemdeps` half of `install` and the `gem help gem_dependencies` guide,
  which describe the same unported feature.
* **`gem lock` is out**, not deferred: its whole body is
  `Gem::RequestSet#lock` and `#load_lockfile`, which `lib/rubygems/request_set.rb`
  documents as left out with gemdeps and Bundler (M8). Porting the command
  without them would mean a lock backend of this port's own.
* **`ContentsCommand#files_in_default_gem` lists the directory instead.**
  Upstream cannot glob a default gem — its files sit in the interpreter's own
  library path — so it asks `$LOAD_PATH.resolve_feature_path` where requiring
  each one lands and `RbConfig::CONFIG["bindir"]` where its executables do.
  Neither exists here, and nothing installs a default gem, so a spec found
  under `Gem.default_specifications_dir` is listed as the directory on disk it
  is.
* `BuildCommand`'s `options[:build_path]` branch stays as written although
  nothing sets it: `--build-path` belongs to the unported `rebuild` command.
* `OutdatedCommand` keeps only the listing half. The cooldown half —
  `Gem::Cooldown`, `Gem::CooldownOption` and its `--cooldown` option, the two
  methods that pick the newest version outside the period and annotate the ones
  inside it, and the `Gem::Source#created_at_for_tuple` they read — is out with
  that cache (§1). The listing itself needed one method this port had not
  reached: `Gem::Specification.outdated_and_latest_version`.
* `DependencyCommand`'s `-p` is the local/remote options' `--http-proxy`, which
  registers it after the command's own `--pipe`; `--pipe` is the form that
  reaches the pipe format. That collision is upstream's, comment and all.
* Of D7's two entry points only `gem compile` is wired: `gem install --compile`
  waits for M7, where the precompiled tree becomes something the builder reads
  too. `compile` also has no upstream counterpart - CRuby has no ahead-of-time
  compiler - and takes a `--all` in exchange for upstream's per-option groups.

### M7 — `opal`/`ruby` find gems, and precompilation (~900 lines) — **partly done**

* `lib/opal/compiler/builder/gem_paths.mjs`: read the gemspec stubs of
  `<gem_home>/specifications` — RubyGems 4.1 has no `index.json` and rescans
  the directory, as M4 notes — and append
  `<gem_dir>/gems/<full>/<require_path>` (and `compiled/<full>` first)
  to the builder's paths.
* `--gem NAME` / `-g` implemented (drop the "not available in Node.js" warning);
  `Opalfile`'s `add_gem_dependency` implemented.
* `exe/ruby`: gem-aware loader (M4) + `.js` preference (M0) + `--gem`.
* `gem compile` writing the `compiled/` tree and the loader reading it back
  (the digest, the path preference): in with M6. `gem install --compile` and
  the builder consulting the tree remain.

*Exit test:* `exe/opal --gem rake -e "require 'rake'; puts Rake::VERSION"`;
`exe/ruby -e "require 'rake'"` measurably faster with the compiled tree
(`benchmark/`-style measurement, not a gate).

**Status: partly done.** The third bullet's `exe/ruby` is finished — its
loader is gem-aware (M4) and it loads a plain `.js` feature that registers no
Opal module (M0). The other three have not started: `cli.mjs` and `options.mjs`
still say `--gem` is "not available in Node.js" and ignore it, the builder's
`Opalfile` reader warns that `add_gem_dependency` is ignored
(`lib/opal/compiler/builder/project.mjs`), and nothing writes a `compiled/`
tree.

### M8 — Bundler (~3500 lines) — **not started**

`lib/opal/exe/bundler.rb`, `lib/bundler/`: `bundler.rb` (root, `root`,
`bundle_path`, `load`, `setup`, `require`, `ui`), `dsl.rb` (Gemfile: `source`,
`ruby`, `gem` with `:group/:require/:platform/:path/:git`(error), `group`,
`platforms`, `gemspec`, `path`, `git_source` registration),
`dependency.rb`, `source.rb` + `source/rubygems.rb` (over
`Gem::CompactIndexClient`), `source_list.rb`, `source_map.rb`, `index.rb`,
`spec_set.rb`, `lazy_specification.rb`, `definition.rb` (resolve, `add`,
`remove`, `twin`, converge), `resolver/*` + `vendored_pub_grub`,
`lockfile_parser.rb`, `lockfile_generator.rb`, `installer.rb` (delegating to
`Gem::Installer`), `runtime.rb`, `setup.rb`, `settings.rb`, `errors.rb`,
`ui/*`, `shared_helpers.rb`, `current_ruby.rb`, `ruby_dsl.rb`,
`friendly_errors.rb`, `cli.rb` + commands: **install, update, lock, exec,
list, show, info, check, clean, platform, config, init, inject(?),
remove(?), add(?), source(?), binstubs**.

`exe/bundler.exe` via `tasks/bundler_exe.mjs` — `npm run build-bundler` and
`npm run build-bundler-exe`, named after the existing `build-ruby` /
`build-ruby-exe`, and `--build-sea` on Node 26 (§5 D10).
Bundler's fetch volume is the reason the HTTP transport is a persistent worker
rather than a process per request (§6.3).

In the port: `worker.rb` and `installer/parallel_installer.rb` become sequential
loops, and the `EXT_LOCK` around `Dir.chdir`/`Dir.pwd` in `shared_helpers.rb`
goes (D13). `checksum.rb`'s `@store_mutex` and `ui/shell.rb`'s
`Thread.current.thread_variable_*` need no change — the first is a lock wrapper
to drop, the second already works.

*Exit test:* a small app with a `Gemfile` + `Gemfile.lock`:
`exe/bundler install`, `exe/bundler exec ruby -e "require '…'"`,
`exe/bundler update --conservative`, `exe/bundler list`, lockfile round-trip.

**Status: not started**, nothing of `lib/bundler` is ported. It inherits both
M5's resolver and transport and M6's option-parsing classes; its `Gemfile` and
lockfile parsing is the part that can be tested offline first, against a
resolver sitting on a local source.

### Suggested ordering rationale

M0–M2 are cheap and unblock everything; M3+M4 give an offline end-to-end
`gem install`/`require` loop that can be tested without network; M5 is where
the "equal to rubygems" requirement actually lands; M6/M7 make it usable;
M8 is the largest and depends on all of the above.

---

## 9. Risks and open questions

1. **`Array#hash` fix (M0.1)** touches a hot corelib method. It must be
   benchmarked (`tasks/string-performance.mjs`-style probe plus
   `tasks/compiler-performance.mjs`) and the full suite run.
2. **Synchronous HTTP — mitigated, not gone.** The persistent fetch worker
   (§5, §6.3) removes the process-per-request cost, but it still blocks the
   main thread with `Atomics.wait`, so a hung request hangs the program: the
   timeout must be enforced in the worker *and* on the wait. Worker creation
   inside a SEA needs `new Worker(code, { eval: true })`; a file-based worker
   will not work there. Node 22 keeps the `execFileSync` fallback, and the
   `HTTP_GET_HELPER` snapshot workaround must stay for it until a Node 22 SEA
   can be built on this machine to re-test the abort the comment describes.
3. **`Gem::Specification` is the biggest porting judgement call.** 2663 lines
   upstream; a trimmed version risks incompatibility with gems that read
   unusual attributes from their own spec at runtime. Mitigation: keep the
   attribute set and `to_ruby`/`yaml_initialize` faithful, cut only
   `default_*`/`rubygems_version` migration paths and `extensions` handling.
4. **Bundler's `exec`** must re-exec `exe/ruby`/`exe/opal` with the right
   `GEM_PATH`/`BUNDLE_GEMFILE`; process spawning from a bundled SEA executable
   (`exe/bundler.exe`) needs `process.execPath` to be the executable itself —
   verify under Node SEA.
5. **`Gemfile` evaluation needs `eval`**, hence `opal-parser` in every bundle
   (already the case for `exe/ruby`), and `instance_eval` on a DSL object —
   both supported, but Gemfiles that use `require`, `__dir__`, `RbConfig`,
   `RUBY_VERSION` comparisons or `if RUBY_ENGINE == "ruby"` need checking
   against Opal's values (`RUBY_VERSION` is `3.2.0`, `RUBY_ENGINE` is `opal`).
6. **Version pinning:** `RUBY_VERSION` is `3.2.0` but many current gems require
   `>= 3.1`/`>= 3.2` — fine — while `required_ruby_version` of `>= 3.3` gems
   will (correctly) fail. Consider whether to bump `RUBY_VERSION`; that is a
   separate, larger decision.
7. **Do we want `gem` to also read CRuby's `~/.gem/ruby/3.x.0`?** With
   `GEM_PATH` it falls out for free once the spec format matches; worth a test.
8. `exe/*.exe` are ~150 MB each (embedded Node) and are not committed today;
   decide whether `exe/gem.exe`/`exe/bundler.exe` are built on demand only.
9. **D12 (no external binaries) is a constraint on the tests too**: the
   network-dependent tests (M5, M6, M8) must either run against a local
   `Source::Local` fixture or be skipped when offline, since standing up a
   local HTTP server has to use `node:http` rather than any helper binary.

---

## 10. Immediate next steps

1. M5's remote half: `lib/opal/gems/http.mjs` plus `Gem::RemoteFetcher` and
   `Gem::CompactIndexClient`, replacing the "remote sources are not available
   yet" raise in `lib/rubygems/source.rb`, and then `resolver/api_set*` and
   `resolver/source_set` so `BestSet` has something to pick.
2. Fixtures for the CLI: a few real `.gem` files (one plain, one with
   dependencies, one with a `java` platform variant) committed where the
   resolver and CLI tests can read them — `spec/opal/gems/fixtures/` already
   starts that, and `tasks/gems-fixtures.mjs` would vendor the rest from
   rubygems.org once, offline thereafter. The resolver and installer specs
   build their gems with `Gem::Package.build` in a temporary directory instead,
   which keeps them hermetic.
3. M6's `install` command — `GemRunner`, `CommandManager`, the option classes,
   `exe/gem`, `tasks/gem.mjs` — which retires the `Gem::Installer.at(...)`
   spelling in M4's exit test and gives M5's end-to-end test its command.
   `Gem::DependencyInstaller` is what it calls, and it needs `Gem::Cooldown`
   for `--cooldown`.

---

## 11. Changed core files

The port itself is plain Ruby and lives outside the core trees (`lib/rubygems/`,
its specs under `spec/opal/gems/` and `spec/lib/gems/`, the bundling in
`tasks/ruby/bundle.mjs` and `tasks/gem/bundle.mjs`).
What it did change inside `opal/` and `lib/opal/` is 25 files, +652/−136 lines
since the branch base `6b22c1080`. Every one of them was reached by running gem
code — reading a `.gem`, a gemspec, a binstub — or by running ruby/spec over
the stdlib pieces the port needs, and each comes with a test: a case under
`spec/opal/`, one in `spec/lib/compiler/`, or a ruby/spec file added to
`spec/selection/common` with its remaining failures in `spec/filters/bugs/`.
Only the lint-only catch bindings came with none. Besides the two stdlib
libraries M1 brought — `stdlib/uri` and `stdlib/zlib`, the bulk of those
4,730 insertions — four stdlib files were changed for the port's sake:
`stdlib/cgi/util.rb` (§8's M5 status), `stdlib/stringio.rb`, the
`stdlib/uri/rfc3986_parser.rb` pattern of the same milestone, and
`stdlib/time.rb`, whose `Time.xmlschema`/`iso8601` parse the compact index's
created_at needs (§8's M6 status).

### `opal/` — runtime and corelib

| file | commit | what changed, and why |
| --- | --- | --- |
| `opal/corelib/array.rb` | e18e99e41 | M0.1. `Array#hash` joins the shared chain of the structures currently being hashed instead of keeping a map of every structure ever hashed and sending `eql?` to each. That map sent `Incompatibility#eql?` the wrong argument and raised inside PubGrub's failure reporting. |
| `opal/corelib/hash.rb` | e18e99e41 | the same for `Hash#hash`. |
| `opal/corelib/struct.rb` | e18e99e41 | `Struct#hash` joins the chain — it builds a fresh array per call, so no array repeats when a cycle closes on the Struct. |
| `opal/runtime/hash.rb` | e18e99e41 | `Opal.hash_ids`, the push/pop chain the three `#hash` methods share, and `Opal.cyclic_hash`, the value a cycle answers that propagates up (which is what keeps `rec.hash == [[rec]].hash` without comparing). |
| `opal/corelib/argf.rb` | cde8ad70b | `$<` (ARGF) was never defined. |
| `opal/corelib/io.rb` | cde8ad70b | `$>`, the default output of `print`/`puts` without an explicit IO, was never defined. |
| `opal/corelib/io.rb` | 0a62b3022 | an encoding written as a dash — `"r:UTF-8:-"`, `IO#set_encoding` — asks for no encoding of that kind, and reached `Encoding.find("-")` and raised. That is exactly how `Gem.open_file` opens a gemspec. The dash also arrives as a boxed String from `String#split`, so it compares by value. |
| `opal/corelib/process/status.rb` | cde8ad70b | `Status#to_i` (the wait status word) and `Status#>>`; `Status#==` already called a `to_i` that did not exist. |
| `opal/runtime/regexp.rb` | cde8ad70b | `Opal.last_match_ref` — the text of the rightmost group that matched, which is what `$+` means and which is not the last group when that one did not participate. |
| `opal/runtime/regexp.rb` | 38b3d9ef1 | an extended (`/x`) pattern written across several lines keeps the source it was written with, so `Regexp#source` and `Regexp.new(regexp.source)` round-trip; the whitespace strip has to happen before escaping turns a newline into `"\n"`. A gemspec date matches such a pattern (`Gem::Specification::DateTimeFormat`). Spec: `spec/opal/core/regexp/extended_spec.rb`. |
| `opal/io/buffer.rb` | a9007b0bd | binary data survives a read: decode with a fatal decoder, and when the bytes are not valid in the external encoding keep them and only label them. The old lossy decode turned every byte above 0x7f of a gzip stream into U+FFFD, so no `.gem` could be read back out of a StringIO. A slice ending mid-character is dropped and retried. |
| `opal/io/buffer.rb` | 3e5d6a8eb | optional catch bindings — the form lint accepts in code the corelib and stdlint check. |
| `opal/runtime/platforms/node_compatible.js` | 13232bad5 | exports `node:crypto` beside `fs` and `os`, which `stdlib/digest.rb` needs. |
| `opal/runtime/platforms/node_compatible.js` | a9007b0bd | exports `node:zlib`, which `stdlib/zlib.rb` needs. |
| `opal/corelib/string.rb` | bfbd0acbb | M5. `Symbol#name`, which `Gem::SafeMarshal` asks a symbol link of a marshal stream for (`#resolve_ivar`, `#resolve_symbol_name`) and Opal did not have: a frozen String, kept in a Map keyed by the symbol so `:x.name.equal?(:x.name)` holds as it does in CRuby. It sits on String, where this implementation keeps the Symbol methods (`Symbol = String` at the end of that file). `spec/ruby/core/symbol/name_spec` joined `spec/selection/common` with it and its three examples pass. |
| `opal/corelib/error.rb` | 1820b76dc | M6. `Exception#detailed_message` and `Exception.to_tty?`, the line `full_message` had been writing itself and the line `Gem::CommandManager` prints for a failed command: message with the class in parentheses on the *first* line of a multiline message, class name alone when the message is empty (a message-less `RuntimeError` answering `unhandled exception`), an anonymous class by its `#inspect` and no parenthesised part when there is a message, `highlight:` emitting the same escapes `full_message` uses, and `full_message` forwarding the keyword arguments it does not consume. The rules were pinned against the host's ruby 3.3.12 before writing them. Nine `spec/ruby/core/exception` examples came back from `spec/filters/bugs/exception.rb` with it, and those are the test. |
| `opal/corelib/time.rb` | 3f1c797c4 | M6. `Time.gm`, and with it `Time.utc`, `Time.local` and `Time.mktime`, took a seventh argument named `millisecond` and then dropped it, so `Time.utc(1985,4,12,23,20,50,520000)` answered the bare second; MRI counts that argument in millionths whatever its numeric type, which is what it does now. A value that is not a number is left out — the C-style call puts `:ignored` placeholders in those positions and MRI takes no string as a subsecond either. The test is `spec/ruby/core/time/{utc,gm,local,mktime}_spec.rb` plus the two `spec/ruby/library/time` files the same commit unfiltered; Opal's `Time` keeps microseconds, so a finer fraction than that is dropped where CRuby keeps a Rational. |

### `lib/opal/` — the toolchain

| file | commit | what changed, and why |
| --- | --- | --- |
| `lib/opal/exe/ruby.rb` | 50a30e760 | M0.2–M0.4. The bundle carries `opal/full` (and `stdlib/thread.rb` for `Thread::Backtrace::Location`, 1085 KB → 1407 KB); `<home>`, `<home>/opal` and `<home>/stdlib` join `$LOAD_PATH` so the autoloads resolve at run time; `find_feature` finds a `<path>.js` as well as a `.rb`. |
| `lib/opal/exe/ruby.rb` | d5ada5a88 | a `.js` feature that registers no `Opal.modules` entry — `stdlib/yaml.rb`'s `require "js-yaml-3-6-1"` — is evaluated and then given an empty module, instead of `Opal.require` raising LoadError because nothing appeared. |
| `lib/opal/exe/ruby.rb` | 9b9bf767b | M4's activation hook, here rather than in a ported `core_ext/kernel_require.rb` because Opal compiles `require` to the runtime loader: `find_feature` asks `Gem.try_activate` for a path that is not on `$LOAD_PATH` and searches again. A feature no gem owns is now a `LoadError` instead of the platform loader's `ENOENT`, which nothing rescued. |
| `lib/opal/compiler/cli/exe_compiler.mjs` | 491603b41 | M0.6. Node 26's `--build-sea` path: one step, no copy/chmod/sign and no `npx postject`, and the config's `output` names the executable instead of a blob. Below Node 26 the old path runs unchanged. |
| `lib/opal/compiler/cli/options.mjs` | 9e51e8087 | accepts `--enable=frozen_string_literal`, which ruby/spec runs a few programs with. Opal's string literals are JS primitives already, so it is accepted and does nothing; an unknown feature still fails like Ruby's `--enable`. |
| `lib/opal/compiler/nodes/variables.mjs` | cde8ad70b | the `+` case of `BackRefNode` fell through to a plain global nothing ever set; `$+` now reads `$~` through `Opal.last_match_ref`, and the "currently unsupported" comment goes with it. |
| `lib/opal/compiler/builder/erb_runner.mjs` | 763a227bd | the ERB worker gets the options a `new Worker` takes, from an allowlist, and retries with none. Node 26 hands a `node --test` child its whole resolved `process.execArgv` and `new Worker` rejects most of it (`ERR_WORKER_INVALID_EXEC_ARGV`), which took the compiler suite down. |
| `lib/opal/gems/http.mjs` | fec5398bf | M5, new. The fetch the transport runs on: a standing Worker does Node's `fetch` while the calling thread parks on a `SharedArrayBuffer` with `Atomics.wait` and reads the answer back with `receiveMessageOnPort` (§6.3). One Worker means one connection pool for the process; several URLs travel in one round trip, which is what a compact-index update asks for. `spec/lib/gems/http.test.mjs` is its suite, against a fixture server that is itself a Worker — the transport would otherwise park the very thread such a server needs. |
| `lib/opal/compiler/cli/runners/nodejs.mjs` | fec5398bf | the node runner publishes `OPAL_HOME` the way `tasks/ruby/bundle.mjs` bakes it into `exe/ruby`. A program compiled from source had no directory for its libraries — `__dir__` inside a required file names the load-path entry, not a path — and the transport reaches `lib/opal/gems/http.mjs` by path, since a Ruby file under `lib/opal/` is not a name a program can require (`opal/` is the runtime's namespace). |
| `lib/opal/compiler/transforms/operator_assignment.mjs`, `nodes/if.mjs`, `nodes/begin.mjs`, `transforms/conditionals.mjs` | f950e0ed8 | M5. For a variable target the transform rewrote `@x ||= rhs` into `@x = (@x || rhs)`, a write in *both* branches; MRI assigns only where the short circuit reaches the right-hand side. A memo on a frozen object therefore raised (`Gem::Version` freezes itself and pre-caches its `||=` memos, and `Gem::Version.new` caches instances in `@@all`, so one frozen Version poisoned every `'1.0.0'` in the process; `@unset &&= v` likewise defined an ivar MRI leaves undefined). The write now sits inside the Or/And branch, and `if.mjs` renders an operator assignment as a ternary in every position while `begin.mjs` and `conditionals.mjs` keep the statement shape a right-hand side can have — a memoized `begin` with a guard clause, a `rescue` or a statement `%x{}` stays an IIFE, which is what makes those compile. Same commit: the `case` switch subject is parenthesized, so `case f(x)` over a `&&`-joined subject no longer misparses. Specs: `spec/opal/core/language/memoization_spec.rb`, `.../case_spec.rb`, and the compiler fixtures for `assignment/operators` and `control/case`. |
| `lib/opal/exe/gem.rb` | 0bbcc9fa7 | M6, new. The `gem` command's program: `Gem::GemRunner.new.run ARGV.clone`, which is upstream's `exe/gem` — a command ends with `terminate_interaction`, which raises `Gem::SystemExitException`, and an uncaught `SystemExit` ends an Opal program with that status, so nothing here translates it. `tasks/gem.mjs` bundles it with opal, opal/full, thread, rubygems and opal-parser as a requirable module, plus the `OPAL_HOME` constant `Gem::HTTPTransport` reads to find `lib/opal/gems/http.mjs`; `tasks/gem_exe.mjs` makes the single-file executable, sharing the SEA re-run helper `tasks/sea_exe.mjs` with `tasks/ruby_exe.mjs`. |

Outside those two trees sit two tracked build artifacts: `exe/ruby` and
`exe/gem`, the compiled bundles of the core plus the port, rebuilt by every
commit that changed either (`git log --oneline -- exe/ruby exe/gem` lists
them). They are files to diff, not to edit, and a change to
`lib/opal/exe/ruby.rb` or to `lib/rubygems/` is only finished once
`node tasks/ruby.mjs` and `node tasks/gem.mjs` have rewritten them.

Nothing else moved in the two trees. The entry points are untouched —
`opal/base.rb`, `opal/mini.rb` and `opal/full.rb` needed no change, `exe/ruby`
only bundles `opal/full` — and beyond the `#hash` chain above, no `Array`,
`String` or `Integer` method changed: `Gem::Version`, `Gem::Requirement` and the
tar layer run on what corelib already does. In `stdlib/` the remote half
changed two lines of the URI pattern and the reading end of
`Zlib::GzipReader` (§8's M5 status); `stdlib/cgi/util.rb`'s escape pair came
with the fetch commit before it.

---

## Appendix A — probe scripts

All under `tmp/gems_probe/` (throwaway, gitignored):

* `probe1.rb`, `probe2.rb`, `probe3.rb`, `probe4.rb`, `probe5.rb` — feature
  matrix of core language, corelib and stdlib under `exe/ruby`.
* `pg/`, `gem/`, `pg_test.rb`, `pg_test2.rb`, `pg_test3.rb` — upstream
  `pub_grub` + `Gem::Version`/`Requirement`: solve, backtrack, `SolveFailure`.
* `rg/`, `yaml_test3.rb` — `Gem::YAMLSerializer`/`SafeYAML` on a real
  `metadata.gz`.
* `ci/`, `ci_test.rb`, `rake_info.txt` — compact-index parser on live data.
* `tar/`, `tar_test.rb`, `rake.gem` — `Gem::Package::TarReader` on a real gem.
* `opt_test.rb` — `OptionParser` features used by `Gem::Command`.
* `marshal_test.rb` — shows `metadata.gz` is YAML, not Marshal, in 4.x.
* `regexp_probe.mjs`, `node_probe.mjs` — Node 22 vs 26 feature matrix
  (atomic groups, modules, fs/zlib/crypto APIs).
* `syncfetch.mjs`, `persistent.mjs`, `baseline.mjs`, `baseline10.mjs` —
  synchronous HTTP via `Atomics.wait` + `Worker`, and the `execFileSync`
  baseline on the same URLs.
* `snap/` — SEA builds under Node 26 (`--build-sea`), including a
  startup-snapshot executable that performs a `fetch` from a worker, and
  startup timings.

## Appendix B — commands to reproduce the key results

These use `curl` and `tar` as *manual* probes only; per D12 nothing in the
implementation or the test suite may depend on them.

```sh
# PubGrub solves and backtracks
exe/ruby tmp/gems_probe/pg_test2.rb

# real gem metadata parses
exe/ruby tmp/gems_probe/yaml_test3.rb

# live compact index parses
curl -sS https://index.rubygems.org/info/rake > tmp/gems_probe/rake_info.txt
exe/ruby tmp/gems_probe/ci_test.rb

# real .gem unpacks (tar layer)
curl -sS -o tmp/gems_probe/rake.gem https://rubygems.org/downloads/rake-13.3.1.gem
exe/ruby -I opal tmp/gems_probe/tar_test.rb

# Node 26 vs 22: regexp/module matrix, HTTP transports (same 10 URLs, both
# transports, so the two numbers are comparable)
node tmp/gems_probe/regexp_probe.mjs
node tmp/gems_probe/baseline10.mjs && node tmp/gems_probe/persistent.mjs
N26=~/.nvm/versions/node/v26.12.0/bin/node
$N26 tmp/gems_probe/regexp_probe.mjs
$N26 tmp/gems_probe/baseline10.mjs && $N26 tmp/gems_probe/persistent.mjs

# Node 26 one-step SEA, and a worker fetch from a startup snapshot
N26=~/.nvm/versions/node/v26.12.0/bin/node
cd tmp/gems_probe/snap && $N26 --build-sea=sea.json && ./snap.blob
```

Note: `tmp/gems_probe/snap/*.blob` are ~150 MB executables — delete them, and
never commit them (the same rule as `exe/ruby.exe`).

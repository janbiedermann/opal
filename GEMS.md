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

### M1 — stdlib pieces (~1300 lines)

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

### M2 — `Gem` core, no I/O (~2600 lines)

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

### M3 — `Gem::Specification` and the gemspec round-trip (~1200 lines)

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

### M4 — installed-gem store, activation and `require` (~900 lines)

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

### M5 — remote metadata and resolution (~2600 lines)

`lib/opal/gems/http.mjs` (persistent fetch worker, §6.3) + `http.rb`
binding + `Gem::RemoteFetcher`,
`Gem::CompactIndexClient` (+ `cache`, `cache_file`, `http_fetcher`, `parser`,
`updater`), `Gem::Resolver` + `resolver/*` (sets, specifications, requests),
`vendor/pub_grub` (2 patches), `Gem::SpecFetcher`, `Gem::DependencyInstaller`.

*Exit test:* `exe/gem install rake` (resolve → download → checksum → install),
`exe/gem install <gem>` where the resolver must backtrack, and a
`SolveFailure` case whose message renders.

### M6 — the `gem` CLI (~1500 lines)

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

### M7 — `opal`/`ruby` find gems, and precompilation (~900 lines)

* `lib/opal/compiler/builder/gem_paths.mjs`: read `<gem_dir>/specifications/index.json`,
  append `<gem_dir>/gems/<full>/<require_path>` (and `compiled/<full>` first)
  to the builder's paths.
* `--gem NAME` / `-g` implemented (drop the "not available in Node.js" warning);
  `Opalfile`'s `add_gem_dependency` implemented.
* `exe/ruby`: gem-aware loader (M4) + `.js` preference (M0) + `--gem`.
* `gem compile` / `gem install --compile` writing the `compiled/` tree.

*Exit test:* `exe/opal --gem rake -e "require 'rake'; puts Rake::VERSION"`;
`exe/ruby -e "require 'rake'"` measurably faster with the compiled tree
(`benchmark/`-style measurement, not a gate).

### M8 — Bundler (~3500 lines)

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

1. Land M0 (the Opal fixes, including the `--build-sea` fast path on Node 26)
   — they are small, independently useful, and each is already reproduced by a
   probe.
2. Land M1 + M2 and re-run the §4 probes against the real `lib/rubygems` tree
   instead of `tmp/gems_probe` copies.
3. Add a `tasks/gems-fixtures.mjs` that vendors a handful of `.gem` files
   (rake, a gem with deps, a gem with a `java` platform variant) under
   `spec/fixtures/gems` so M4–M6 tests run offline.

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

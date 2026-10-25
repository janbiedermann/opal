# AGENTS Instructions

This file explains how automation and human contributors should work in this
repository. Follow the steps below to set up the project, run tests and keep the
codebase healthy.

Opal needs only Node.js (22 or later), git and npm; no Ruby.


## Setup
- Run `bin/setup` once after cloning to install the git submodules and the
  npm packages.

## Directory overview
- `lib/opal/` holds the toolchain, written in JavaScript (`.mjs`):
  - `lib/opal/parser/` is Opal's built-in Ruby parser: a JS port of Prism
    1.9. See `docs/parser.md`.
  - `lib/opal/compiler/` is the compiler (`index.mjs`, `nodes/`,
    `transforms/`), the builder (`builder/`) and the CLI with its runners
    (`cli/runners/`: `nodejs.mjs`, `browsers.mjs` for Chrome and Firefox,
    `cdp_interface.mjs`, `bidi_interface.mjs`, ...). `exe/opal` runs the CLI.
  - `lib/opal/dependencies/` only holds support files (`node_modules` with
    `chrome-remote-interface` and `terser`, the source-map shims), not the
    runners.
- `opal/` provides the runtime and Ruby core library. Its layout is:
  - `corelib/` contains Ruby's built-ins implemented in Ruby.
  - `runtime/` holds JS helpers required at execution time.
  - `opal/` offers entry points like `base.rb`, `mini.rb` and `full.rb` for
    loading subsets of the runtime.
- `stdlib/` contains Opal's standard library implementation.
- `spec/` and `test/` host the test suites: `spec/lib/{parser,compiler}`
  (`node --test`), `spec/opal` and `spec/ruby` (MSpec), `test/` (Minitest).
- `examples/` shows sample applications.
- `docs/` provides documentation for contributors and users.
- `tasks/` holds the development scripts (`tasks/*.mjs`, run with `node`).

## Running tests
- `node tasks/test.mjs` (or `npm test`) runs every Node.js suite in about
  40 seconds; ensure it passes before committing:
  - `parser`: the parser specs (`spec/lib/parser/*.test.mjs`, about 8,500 cases)
  - `compiler`: the compiler, builder and CLI specs (`spec/lib/compiler`)
  - `mspec_opal`: the Opal-specific specs under `spec/opal`
  - `mspec_ruby`: the ruby/spec compatibility suite (`PATTERN=<glob>` limits
    the run, `RUBYSPECS=true` with it only takes files of `spec/selection/common`)
  - `minitest_cruby`: the vendored CRuby tests and Opal's stdlib additions
    from `test/opal` (`FILES=<glob>` runs other test files instead)
  - `minitest_node`: integration tests in `test/nodejs`
- Name suites to run only those (`node tasks/test.mjs mspec_ruby`; `mspec` and
  `minitest` name both of theirs), or pass spec/test files or directories to run
  just them (`bin/test` does the same). `-R chrome` (or `-R firefox`) runs the
  Opal suites on another runner; `safari` only exists on macOS and the other
  suites (`parser`, `compiler`, `minitest_node`) always run on Node.js.
  `RANDOM_SEED` repeats a randomized order.

## Linting
- Run `node tasks/lint.mjs` (or `npm run lint`) to check the JavaScript style. It
  checks that `lib/opal/parser/parser.mjs` matches its parts, runs ESLint on
  the parser, the compiler, `lib/opal/gems`, the JS specs under `spec/lib`
  (the compiler step covers `spec/lib/gems` - bundler specs once failed its
  semicolon rule after the commit) and the tasks, then builds the corelib
  and stdlib and lints the result.
- After editing `lib/opal/parser/parts/*.mjs`, regenerate `parser.mjs` with
  `node tasks/parser/assemble.mjs` (`node tasks/build-parser.mjs
  runs all three parser generators, from the vendored
  `lib/opal/parser/prism-1.9.0.config.yml`; the npm scripts are
  `parser-assemble`, `parser-gen-converter`, `parser-gen-field-order` and
  `build-parser`).
- The Ruby code style is described by `.rubocop.yml`; checking it needs a Ruby
  with `rubocop` and `rubocop-performance` (optional).

## Notes
- The language server (`exe/lsp`, built by `tasks/lsp.mjs`/`tasks/lsp_exe.mjs`
  from the plain-JS tree `lib/opal/language-server/` - the Ruby server
  and `lib/opal/exe/lsp.rb` were replaced by this port in P8, LSP.md §13;
  plan in `LSP.md`): the exe is one minified Node program - `tasks/lsp/bundle.mjs`
  inlines the static ESM graph (server + parser + Compiler + the two bake
  payloads) with `lib/opal/compiler/builder/esm_linker.mjs`, then terser.
  Its stdio transport is byte-exact (`fs.readSync` into raw bytes,
  `TextDecoder('utf-8')` per body, `Buffer.byteLength` on write — LSP
  counts UTF-8 bytes while JS strings are UTF-16). LSP positions and
  `parseWithMetadata`'s envelope offsets are both UTF-16 code-unit indices
  (the envelope's `offsets` line table turns one into line/character), so
  the utf-16 positionEncoding is arithmetic, no conversion. Tests are the
  async stdio harness in `spec/lib/compiler/lsp_cli.test.mjs` (spawnSync
  would block the loop piping the frames); `LSP_EXE=<entry>` points that
  45-case parity suite at another server entry (the black-box scoreboard of
  the port), `--check DIR` runs the parse gate headless.
  esm_linker traps that cost a debugging cycle: a `node:` builtin must be
  imported by name (a default import resolves to the missing `.default` of
  the CJS exports -> undefined), the entry .mjs must carry no shebang (it
  lands inside a module body and terser chokes), and the bundles minify
  mangle-only now (see the terser bullet under the committed bundles) -
  human output still goes through `process.stdout.write`.
  Name-keyed index maps and method buckets need `Object.create(null)` +
  `Object.hasOwn` reads: the ported gems call a real method `constructor`,
  and through a plain `{}` literal that key answers `Object` as if it were
  a record.
- The language server's corelib/stdlib index (LSP.md §5) is baked at exe
  BUILD time: `node tasks/language-server/update_baked_index.mjs` runs the
  plain-node bake driver (`indexer/bake.mjs`, the same
  DeclarationListener the live server uses) and regenerates the two
  committed generated modules `lib/opal/language-server/baked_index.mjs`
  and `corelib_sources.mjs` — re-run it (and commit) after changing
  corelib/stdlib sources or the indexer; the JS driver reproduces the
  original Ruby driver's payloads byte-for-byte.
  `spec/lib/compiler/lsp_baked_index.test.mjs` is the staleness gate: it
  recomputes the bake's FNV-1a digests over the live tree in plain node.
  §10.6 settled the record shape by benchmark (`tasks/language-server/bench_index.mjs`):
  POJO literals boot 1.7-2.8x faster than either Map construction; baked
  and live records share that one plain JS shape now, keep it.
- The stdio transport writes frames with `fs.writeSync`, not
  `process.stdout.write` (transport.mjs): the stdout pipe drains inline only
  up to its ~64KB capacity, and `process.stdout.write` then queues the rest
  as an async libuv write the synchronous readSync loop never pumps - a
  >64KB response (documentSymbol on a 600KB file, semanticTokens on big
  files) stayed unanswered until the client sent another message, each loop
  turn pumping one more chunk: it looked like "the server freezes after a
  while", but perform() had already finished (instrument with
  `process.stderr.write` - terser strips `console.*` from the exe/lsp
  bundle). benchmark/parser/bench_lsp.mjs compares exe/lsp's didOpen /
  didChange (keystroke) / documentSymbol latencies against the same files'
  warm parseWithMetadata times: after the P8 port + index-on-idle + the
  single-walk API gate the gates+publish add ~1.5x over parse (~40ms per
  keystroke at 640KB; the live re-index runs once per typing burst at the
  next index-reading request, not per key; 9-17x/~0.5s was the Ruby server).
- More x-string traps, each costing a debugging cycle: a **multiline**
  backtick body splices as a *statement* (in a method tail or assignment
  the value is silently dropped — `digest` returned undefined this way);
  only a **single-line** backtick splices as an expression, so multiline
  expression x-strings must be a single-line `` `(() => {...})()` `` or a
  `%x{}` whose body ends with an explicit `return`. Inside `#{}` in an
  x-string the text is **Ruby**: naming a body-local JS variable there
  parses as a method call (`undefined method 'path'`). And node's fs
  rejects *any* Ruby-built path string — both interpolation and `String#+`
  box (`typeof` says object) — wrap them as `String(#{x})` inside the JS.
- `tmp/` is gitignored scratch space. Some of it is created by the tasks:
  `tmp/performance` (tasks/performance.mjs clones the Asciidoctor checkouts
  and writes asciidoctor_test.rb and asciidoctor_test.js there),
  `tmp/codesize` (tasks/codesize.mjs) and `tmp/compiler_performance/corpus`
  (tasks/compiler-performance.mjs, via `node benchmark/parser/gen_corpus.mjs
  <dir>`). Anything else under `tmp/` is a leftover of past sessions: don't
  depend on it, recreate what you need.
- The JavaScript target is ES2024: current and previous Chrome (including
  Android 14), Firefox, Safari (including iOS 18 and macOS) and Node.js 22.
  IE11 and other ES5-era engines are not supported, so generated code and the
  runtime may use `?.`, `??`, `??=`, class fields, `Object.hasOwn`, `Array.at`,
  `Object.groupBy`, `Promise.withResolvers` and the RegExp `v` flag.
- Opal transpiles the Ruby `/x` (extended) regexp flag - statically through
  `opal/runtime/regexp_transpiler.mjs`; only `/o` is dropped, with a warning.
  Ruby's line-anchored `^`/`$` and Ruby `/m` (dotAll) work too. But a `/x`
  pattern that interpolates another Regexp (`space = / /` then `#{space}{2}`,
  as upstream's lockfile parser does) breaks at run time: `$regexp` inserts
  the interpolated source unguarded, the x-transpile drops that space and
  leaves the `{n}` quantifier dangling ("Nothing to repeat"). Write those
  literals as escaped spaces (`\ {2}`) in the extended pattern instead.
- The list of MSpec files is in `spec/selection/common` (with per-platform
  additions/exclusions in `spec/selection/<platform>`, `!` lines exclude) and
  filters live in
  `spec/filters` (`bin/format-filters` sorts them, `bin/remove-filters`
  removes the ones given on stdin).
- Tests depend on initialized submodules (`spec/mspec`, `spec/ruby`,
  `test/cruby`); `node bin/git-submodule-fast-install` fetches them as
  archives.
- The compiler fixtures (`spec/lib/fixtures/compiler/**/*.rb` and their
  expected `.js`) are regenerated with `node tasks/compiler/update_fixtures.mjs`;
  review the diff.
- `tasks/performance.mjs` builds Asciidoctor from pinned checkouts it clones into
  `tmp/performance`: `asciidoctor/asciidoctor@869e8236` and the *fork*
  `janbiedermann/asciidoctor.js@3bdf345` (branch `opal2_compat`).
  `ASCIIDOCTOR_REPO_BASE` and `ASCIIDOCTOR_JS_REPO_BASE` override the
  remotes; with the upstream source the bundle builds but fails at run time
  (`sh: syntax error near unexpected token '('`).
  This is not an authoritative performance benchmark: it measures one
  application with a limited footprint, and the text that application handles is
  ASCII-only, so it never reaches a UTF-16 surrogate pair code. Its purpose is to
  show that a change does not regress within that limited footprint; it must not be
  used to choose what to optimize, use per-method measurements instead to do that.
- JS indexes UTF-16 units while Ruby indexes characters, so an
  `indexOf`/`lastIndexOf` fast path answers in characters only when no surrogate
  pair precedes the match, and a test that proves it costs a scan of the whole
  string. A fast path guarded that way is 10-40% slower for text outside the BMP,
  which is the text most of the world writes. `benchmark/string-performance.rb`
  covers this with its fourth case, ASCII strings ending in `𠀀` (U+20000, a
  surrogate pair in JS; the `あ` case alone cannot see that cost); keep that
  case when measuring string changes.
- Measure a JavaScript construct *inside* the Opal runtime, not in a clean V8:
  corelib extends `Array.prototype` and `String.prototype`, and V8 then drops the
  fast path of several builtins (the comment at `opal/corelib/array.rb:14-22`
  already says this for `shift`). A `[...a, ...b]` spread is 3x faster than
  `a.concat(b)` in a fresh process but 7x slower once `corelib/array` is loaded;
  `a.slice(0).sort(cmp)` is 3x slower than `a.toSorted(cmp)`; `s.replace(/lit/g, x)`
  is 3-6x slower than `s.replaceAll('lit', x)`. `Object.prototype` is untouched,
  so object spread keeps its speed. Bisect by loading one corelib file at a time
  into the same process, and measure with small probe scripts: a Ruby file that
  requires the corelib files under test and times the construct, run with
  `node exe/opal <probe.rb>` (write them under tmp/, they are throwaway).
- Do not run a before/after comparison with `git stash push <file>`: when that
  file already matches HEAD the push is a no-op, both runs then measure the same
  code, and the following `git stash pop` applies an unrelated older stash entry
  (it left mode changes and two unmerged paths here once). Swap the file instead:
  `git checkout <base> -- <file>`, measure, `git checkout HEAD -- <file>`.
- The per-method ns harness does not work under `-R chrome`/`-R firefox`: both
  browsers clamp `performance.now()`, so a 250 ns call reports `0.0` and a 1 ms
  quantum is 333 ns per call at 3,000 iterations. Time 20k-30k calls per sample
  and take the minimum over samples: write a loop harness (a Ruby file that
  calls the method in a nested loop, an `INNER` multiplier raises the
  resolution) and run it with `node exe/opal <harness.rb>`.
- Other tasks: `node tasks/dist.mjs` (build corelib/stdlib),
  `node tasks/bench.mjs` (benchmarks), `node tasks/performance.mjs`
  (performance comparison with master), `node tasks/codesize.mjs` (generated
  code size of the opal/mini, opal/base, opal/full and full-stdlib bundles,
  compared with master; results in tmp/codesize), `node
  tasks/compiler-performance.mjs` (compiler speed on the parser corpus,
  compared with master; results in tmp/compiler_performance), `node
  tasks/string-performance.mjs` (ns per call of every `String` method on
  ASCII, Japanese, ASCII-with-a-Japanese-last-character and
  ASCII-with-a-surrogate-pair-last-character (`𠀀`, U+20000) strings of 1,
  5, 25 and 125 characters; the benchmark is
  `benchmark/string-performance.rb`, `--methods=`/`--lengths=` limit the run),
  `node tasks/release.mjs` (changelog, release preparation).
- `node tasks/ruby.mjs` (`npm run build-ruby`) builds the `ruby` command
  (lib/opal/exe/ruby.rb) into exe/ruby (terser-minified, reproducible): a
  standalone Node program bundling opal, opal-parser and the whole stdlib
  and lib/ as requirable modules, which loads, compiles and runs the
  given script in its own runtime. It supports -e -c -I -r -w -W -v -d -n -p
  -0 -E - `--` -h --version; a script's runtime requires answer from the
  bundle's module table first, and `Opal.platform.load_file` runs only on
  a miss - it resolves installed gems and -I paths against $LOAD_PATH and
  the cwd. It caches compiled JS at runtime (like the builder's FileCache, but
  keyed by source+options and OPAL_COMPILER_KEY, a digest of the compiler
  sources baked into the bundle by tasks/ruby/bundle.mjs; dir
  ~/.cache/opal-ruby or OPAL_CACHE_DIR/opal-ruby, OPAL_CACHE_DISABLE turns
  it off; the asciidoctor run went 1.5s -> 0.9s). The builder's own
  ~/.cache/opal-js entries can't be shared: its key embeds the options
  object and the compiler files' mtimes, which don't exist in the bundle.
  Traps found building it: a file using `%x{}` needs the
  `# backtick_javascript: true` magic comment or x-strings compile to shell
  calls; `builder.build(path, { load: true })` is what puts a library in the
  bundle's boot index before the program (buildRequire alone doesn't);
  `Opal.normalize` drops the leading "/" of absolute require paths, which
  require_relative produces for absolute scripts; -n/-p wrap the source in
  an ARGF loop (line numbers shift by one) and Opal lacks CRuby's Kernel
  `$_` helpers and mutable String methods (`gsub!`); and Opal strings can be
  boxed String objects (corelib's `$str(s, enc)`): JS `eval(x)` returns a
  non-primitive argument *without evaluating it* (silent no-op) and node's
  fs/crypto reject them, so wrap interpolated strings passed to those in
  `String(...)`. That `String(...)` has to sit inside the JavaScript: in Ruby
  it parses as a method call and changes nothing, so
  `eval(String(File.read(f)))` keeps the conversion in the backtick body.
  `node tasks/ruby_exe.mjs` (`npm run build-ruby-exe`) builds exe/ruby.exe,
  a single-file executable (Node SEA, `--compile-to-exe node`): it re-runs
  itself under the nvm Node.js 26 because the system Node.js lacks the SEA
  fuse, and it embeds a copy of that Node.js (~150MB, too big to commit).
- `tasks/compiler-performance.mjs` is noisy: run it with `GIT_BASE_REF` set to
  the current HEAD (a ref compared against itself) and it still reports
  +-3.4% on the total and up to 330% on one stage. For a before/after, compile
  the corpus in several separate processes and keep the min per stage (+-1% on
  the total, +-3% on parse), and swap the file in with `git show HEAD:<file>`
  instead of timing two runs of the same tree.
- A refactor of the toolchain has a stronger check than timing: the emitted JS
  must be byte-identical. Compile `tmp/compiler_performance/corpus/*.rb` (the
  corpus `node tasks/compiler-performance.mjs` writes, or generate one into any
  directory with `node benchmark/parser/gen_corpus.mjs <dir>`) plus a
  few corelib files and hash the output before and after.
- `lib/opal/parser/convert.mjs` is generated by `node
  tasks/parser/gen_convert.mjs` from the vendored
  `lib/opal/parser/prism-1.9.0.config.yml` (`--config=` overrides), and unlike
  `parser.mjs` nothing checks that it is up to date; the duplicated object
  literal in each converter (with and without `flags`) is what keeps one hidden
  class per node type. Change the generator, not the file.
- The toolchain runs in Node with untouched prototypes, but Opal compiling
  itself in a browser runs the same files with corelib loaded, so the
  tampered-prototype results above apply to `lib/opal/` as well.
- Compiling the corpus spends 24% of its time in the garbage collector and no
  function reaches 0.4% of self time (`--cpu-prof`, and `--heap-prof` for the
  allocation sites): the compiler is allocation-bound, so a syntax-level change
  cannot move it, and the top sites are `Array#push` on the fragment arrays,
  `compileToFragments` and the DCE `Directive` objects.
- The browser runners find the system browser in `PATH` (`google-chrome-stable`,
  `chromium`, `chromium-freeworld`, `chromium-browser`; `firefox`,
  `firefox-esr`), so on this system `-R chrome` uses `chromium-browser` and
  `-R firefox` the packaged Firefox. `GOOGLE_CHROME_BINARY` /
  `MOZILLA_FIREFOX_BINARY` only point them at another binary. As root the
  Chrome runner adds `--no-sandbox` itself and warns; setting
  `CHROME_OPTS=--no-sandbox` stays supported and silences the warning. The
  Firefox runner drives Firefox directly
  over WebDriver BiDi (Firefox >= 112; Firefox 129+ dropped CDP, BiDi is
  its only remote protocol), the Chrome runner stays on CDP. A stray
  Firefox left on the runner port (9333) keeps an active BiDi session and
  later runs fail with "Maximum number of active sessions" - kill
  lingering `firefox` processes. On a minimal EL10 system the browsers need
  `dnf install atk at-spi2-atk at-spi2-core libXcomposite libXdamage
  libXfixes libXrandr mesa-libgbm libxkbcommon alsa-lib gtk3 libXcursor`.
- When porting Ruby bodies to `%x{}` JS: a raw `catch` that swallows an exception must call
  `$pop_exception(e)` (helper `pop_exception`) or `$!` leaks and later `raise`s get a wrong
  `cause`; JS regexes have no `\A`/`\Z` (use `^`/`$`); Opal `nil` is truthy in JS, so test
  `x === nil` instead of `!x`; `super` inside `%x{}` loses JS locals (call the superclass
  method directly instead).
- More `%x{}` traps, each one found through a failing suite: the body sees the
  compiler's JS names (`@begin` is `self.begin`, `Opal.destructure` is
  `Opal.$destructure`, `Opal.inspect` is `Opal.$inspect`) and only the helpers
  listed in the file's `# helpers:` comment; a Ruby parameter named after a
  JS reserved word (e.g. `def merge(enum)`) is rewritten by the compiler for
  Ruby code but is a syntax error inside `%x{}`, so rename the parameter; a
  `def m(n = nil)` default is `Opal.nil`, a JS object, so a body guard
  `n == null` never matches it (a `n = undefined` default does) - test
  `n === undefined || n === nil` like Enumerable#min does; an absent `&block`
  parameter is `nil` as well, so a guard `block === undefined` is never true and
  sends every call down the block path (Array#count measured 12x slower that
  way); `Opal.is_a(x, K)`
  bypasses an overridden `is_a?` (ruby/spec's `SetSpecs::SetLike` catches
  that) while `x['$is_a?'](K)` does not; and `Opal.Enumerable['$include?']`
  is `Module#include?`, not the instance method - the faithful `super` is
  `$send2(self, $find_super(self, 'mid', self['$mid'], false, true), 'mid', [args], nil)`.
- More `%x{}` traps from the corelib pass: `# helpers: X` binds `var $X = Opal.X`
  at file top, so it is undefined when the file itself defines that constant
  (math.rb's `Math`, number.rb's `Integer`/`Float`) - use `#{::Math}`, a cached
  constant fetch; a method named `float!` has jsid `$float!`, only reachable as
  `obj['$float!'](...)` (`$Math.$float!(x)` is a JS syntax error); inside `#{}`
  in a `%x{}` body the code is Ruby, so `#{pattern.$class()}` parses `$class` as
  a global variable and the compile dies; and a single-line `%x{}` body must not
  end with `;` - the compiler strips it and warns "Removed semicolon ending
  x-string expression".
- `PATTERN=<glob>` in `tasks/test.mjs` must match files: a directory pattern
  (`PATTERN=spec/ruby/core/time`) dies with MissingRequire on the directory.
  Use `PATTERN='spec/ruby/core/time/*_spec.rb'`; under PATTERN the
  `Time#_dump`/`Time._load` marshal specs fail (they are excluded by the normal
  selection) - pre-existing, not a regression.
- Files reached only through an `autoload` (like `corelib/set.rb` and
  `corelib/struct.rb`) are in none of the `tasks/codesize.mjs` bundles; measure
  their size with `node exe/opal --no-cache -c` on a script that requires or
  uses the class and diff the byte count. `--no-cache` also matters there:
  `exe/opal` caches compiled corelib, so probing an edit without it shows the
  old code.
- Per-method ns/call benchmarks that allocate (Array#sort, #reverse, #drop,
  anything returning a new collection) are GC-dominated and swing by an order
  of magnitude between runs; only compare runs of the same case, and re-measure
  those methods in plain node with `acc += result.length` (keeping the result
  alive in a variable makes the allocation cost the whole measurement).
- Replacing an operator call with the generic comparison helper is not a speedup:
  `Comparable#between?` written with the file's `cmp_or_fail` instead of `self <
  min` went 174 -> 320 ns, because `Integer#<` is a specialized JavaScript
  comparison while `cmp_or_fail` sends `<=>` and normalizes the result. Follow
  the dispatch, do not shortcut it.
- `node --cpu-prof` on `tmp/performance/asciidoctor_test.js` (the bundle
  `node tasks/performance.mjs` builds) plus aggregating
  self time per function is the fastest way to pick what to optimize; the
  callers of a hot function come from walking `parent` links of the profile
  nodes. Beware: `bin/opal` on `master` is still a Ruby script, so building a
  bundle with `> file` after checking out master leaves an empty bundle - the
  shell truncates the file before the command fails.
- The builder resolves every literal `require` at build time even inside a
  method body or an unreachable branch: `require "openssl"` in a rescue'd
  probe fails the whole bundle with MissingRequire when the stdlib is not
  vendored. A non-literal require name passes the scan, but at run time the
  platform loader *silently skips* an unresolved require - no LoadError - so
  the probe's later constant use dies with NameError instead. Answer such
  guards directly instead of probing for a missing stdlib (bundler's
  `md5_available?` does). Also: corelib `Module#method_defined?` takes only
  the name, no inherit flag; `p` of a JS `undefined` returned by a Ruby
  method crashes, so don't assert on implicit returns.
- Ruby code style for the port keeps upstream's `# frozen_string_literal:`
  headers, but corelib has no mutable `String#<<`: lock/pretty-printer
  builders (`Gem::Dependency#to_lock`, `Bundler::SharedHelpers
  .pretty_dependency`) must concatenate (`msg += ...`), and `Array(hash)` in
  Opal is `[hash]`, which upstream's `Array(x || [])` relies on.
- `node tasks/test.mjs compiler` once showed a stale failure referencing
  files that did not exist in the tree; a rerun passed. Suspect the
  `~/.cache/opal-js` FileCache before chasing ghosts: probe edits with
  `exe/opal --no-cache`.
- On a machine in UTC, time zone bugs stay hidden; run the ruby/spec suite in
  other zones too (`TZ=America/Los_Angeles`, `TZ=Pacific/Chatham`) after
  changes to Time, Date or DateTime.
- The node runner runs the `node` found in `PATH`; `NODE_EXE` points it at
  another Node.js binary and `NODE_OPTS` adds its arguments.
- `node --test` on Node 22 does not accept a directory; pass the files
  (`node --test spec/lib/parser/*.test.mjs`).
- `Array#hash`, `Hash#hash` and `Struct#hash` share the chain of structures
  being hashed (`Opal.hash_ids`, bound with `# helpers: hash_ids`) and collapse
  any structure containing a cycle to `Opal.cyclic_hash`; that value propagates
  up, which is what makes `rec.hash == [[rec]].hash` hold without comparing
  anything. A `hash` must not call `eql?`: the map of every previously hashed
  object these methods used to keep sent `eql?` to unrelated types and raised
  inside PubGrub's failure reporting.
- `exe/ruby` builds `opal/full` and `stdlib/thread.rb` into its bundle, so
  `FileTest`, `Marshal`, `pack`/`unpack`, `ObjectSpace`, `Set` and
  `caller_locations` work with no `-I` and no require; the whole stdlib and
  the port's lib/ join as requirable modules (tasks/ruby/bundle.mjs's
  sweep), so a script's `require 'optparse'` or `require 'bundler/setup'`
  answers from inside the program - OPAL_HOME, the baked checkout path
  that used to join $LOAD_PATH, is gone and the exe is relocatable (the
  sweep skips opal-builder: it links builder.mjs, whose erb worker loads
  from a file beside the checkout, and its import.meta.url bakes as the
  build machine's URL); and `find_feature` finds a `<path>.js` as it stands. Its `caller_locations` frames are
  JavaScript ones: the script runs through `eval`, so a script frame names the
  bundle, not the `.rb` file.
- `--compile-to-exe node` runs `node --build-sea=config.json` on Node.js 26 or
  newer: one step, no postject/npx/codesign, and the config's `output` names
  the executable instead of a blob. Below 26 the old
  `--experimental-sea-config` + postject path runs, and it needs a build with
  the SEA fuse, which the system `node-22` lacks.
- Inside a single-file executable, every `require()` compiled into the bundle
  is Node's embedder require, which answers only built-in modules
  ("No such built-in module: <path>") - a userland path on disk is not
  loadable, and baking a checkout path into the exe would make it non-
  relocatable anyway. The pattern for JS the bundle needs: keep the module
  CommonJS with built-in requires only, embed its source as a Ruby constant
  (builder.buildStr input is COMPILED AS RUBY - `Opal.x = ...` becomes a
  Ruby setter call and dies; use `NAME = "<json>"` like OPAL_HTTP_TRANSPORT) and run it
  through `new Function("require", "module", "exports", src)` - the scope's
  require still answers built-ins inside. That is how the HTTP transport
  (lib/opal/gems/http.cjs, OPAL_HTTP_TRANSPORT) loads; `new Function` and
  eval'd Workers are unrestricted in a SEA.
- The gem port (GEMS.md, `lib/rubygems/`) requires its files eagerly - no
  `autoload` - so a compiled bundle can carry them; `tasks/ruby/bundle.mjs`
  bundles `lib/rubygems.rb` into `exe/ruby` (1.4MB -> 2.06MB as the port grew) and
  `find_feature` calls `Gem.try_activate` when a path is not on `$LOAD_PATH`,
  so a feature that no gem owns must raise LoadError, not the ENOENT
  `Opal.platform.load_file` raises (Opal compiles `require` to the runtime, so
  upstream's `core_ext/kernel_require.rb` hook has no Ruby-level hook point).
- The committed `exe/gem`, `exe/ruby` and `exe/bundler` are generated bundles
  and the `gems` suite rebuilds `exe/gem` in place (`tasks/gem.mjs`'s default
  OUT): if a committed bundle lags its `lib/` sources, a test run dirties it.
  Rebuild the exes that carry a changed source (`node tasks/{ruby,gem,bundler}.mjs`)
  and commit them in the same commit; corelib/stdlib changes additionally need
  the baked-index re-run above and an `exe/lsp` rebuild.
- The four exe-bundle tasks minify with terser `{ mangle: true }` only (no
  compress): the bundle builds roughly halve (ruby and bundler 10s -> 5s,
  gem 7.5 -> 3.7s, lsp 4.7 -> 2.7s) for +1-5% bytes on the bundles (+0.1%
  on the 150MB SEA `.exe`). terser's `console.*` removal is a compress
  side-effect, so bundled `console.*` calls (e.g. stdlib/console.rb)
  survive and print in the task-built exes; the CLI's own `--minify` and
  `--compile-to-exe` still compress.
- `exe/gem` is `tasks/gem.mjs` (bundle in `tasks/gem/bundle.mjs`, single-file
  executable in `tasks/gem_exe.mjs` and `tasks/sea_exe.mjs`, which both `*_exe`
  tasks share): opal, opal/full, thread and rubygems at boot, opal-parser
  requirable, and the `OPAL_HTTP_TRANSPORT` constant - the CommonJS source of
  `lib/opal/gems/http.cjs`, which `Gem::HTTPTransport` runs through
  `new Function` - so the exe fetches with no tree beside it and bakes no
  checkout path: every exe is relocatable (pinned by bundle-shape cases
  in `cli.test.mjs`, `ruby_exe.test.mjs` and `bundler_cli.test.mjs`). No
  bundle bakes a path now: `tasks/{ruby,bundler}/bundle.mjs` stamp
  `OPAL_COMPILED_BUNDLE`/`OPAL_PROGRAM` (name-only constants lib/bundler
  answers paths with: `SharedHelpers#program_path` is `process.execPath`
  in a single-file executable and node's argv[1] in a node bundle; a
  hosting program names its sibling `bundler` in the same directory),
  and the stdlib sweep means no loader ever needs a tree. Plus
  `OPAL_COMPILER_KEY` (below, for
  compiled trees). The command classes are required eagerly by
  `lib/rubygems.rb`, which is also why `Gem::CommandManager` no longer requires
  a command by name: a require path with an interpolation in it still reads as
  static to the builder, which then asks for `rubygems/commands/_command`.
- `exe/bundler` is `tasks/bundler.mjs` (bundle in `tasks/bundler/bundle.mjs`,
  single-file executable in `tasks/bundler_exe.mjs`): the gem bundle's shape
  plus `lib/bundler.rb` at boot and `lib/opal/exe/bundler.rb` as the program.
  Thor is not vendored, so `Bundler::CLI` restates every `method_option` in
  per-command tables and a hand-rolled scanner builds the same options hash
  (Opal's Symbol == String makes the String/Symbol key mix the command
  classes read one lookup). Traps found building it: CLI's initialize rebuilds
  the UI in an `ensure`, so `@options` must be set before its parser raises
  InvalidOption or the ensure dies on nil; upstream's `options =
  self.options.dup` in `CLI#install` would hoist a local over the `options`
  reader across the whole method, so the copy keeps its own name; the
  `all_aliases` table maps alias->command, so a canonical name must pass
  through it with `|| name`; and an unported command must skip option
  parsing so it reaches the "Could not find command" answer instead of the
  stray-positional one.
- The Bundler root's singleton `def require(*groups)` shadows every bare
  `require` written *inside* `class << self` - `eval_gemspec`'s
  `require "opal-parser"` became infinite recursion through `Bundler.require`
  once that method existed. Spell in-singleton requires `Kernel.require`
  (upstream itself does this for psych, bundler.rb:637). Same family:
  SharedHelpers' `find_file`/`find_directory` need an explicit trailing
  `nil`, because Opal's `while` ends at undefined and CRuby's returns nil,
  and callers do `find_gemfile.to_s`.
- `Kernel#load` hands the path to `Opal.load`, whose normalize drops the
  leading "/" of absolute paths; the plain node platform loader then misses
  and appends `.rb` (exe/ruby's own loader resolves them fine). Extension-less
  executables - gem `bin_file`s, binstubs - hit this: where the port must
  load an exact file it uses `eval(File.read(f), TOPLEVEL_BINDING, f)`
  (`Gem.activate_and_load_bin_path` and `Bundler::CLI::Exec#kernel_load`
  both do). Kernel.exec has no node shim either (a node process can't exec
  over itself): `bundle exec` emulates it with Kernel#system (sync spawn,
  stdio inherited) + exit($?.exitstatus); Process.spawn/system/trap all
  exist in the node platform.
- `gem compile` (D7) writes `<gem_dir>/compiled/<full_name>/<digest>/` and
  `BasicSpecification#full_require_paths` prepends that directory when the
  digest matches, so the `.js` wins the directory search (`gem which` shows
  it). The digest hashes the gem's on-disk sources *and* `OPAL_COMPILER_KEY`,
  which both bundles stamp from the one `compilerKey()` in
  `tasks/ruby/bundle.mjs` - if they disagreed, `exe/gem compile` would write a
  tree `exe/ruby` could never find. Editing an installed gem's `.rb` therefore
  invalidates its compiled tree by design and the `.rb` answers again;
  *deleting* the `.rb` makes that require a LoadError, which is the digest
  working, not a loader bug.
- The builder's `--gem NAME`/`-g` and `add_gem_dependency` resolve installed
  gems through `lib/opal/compiler/builder/gem_paths.mjs` (GEM_PATH/GEM_HOME,
  stub gemspecs parsed by regex, compiled digest dirs first). The toolchain
  has no `OPAL_COMPILER_KEY`, so it trusts the compiled tree without the
  digest check. A bundled `.js` ends with a *conditional* `Opal.loaded` mark
  (`processors.mjs`): unconditional marking of module-form JS turned the next
  require into a silent no-op, because `Opal.normalize("./greet.js")` is the
  very name `require 'greet'` asks with.
- A `spec/lib/gems/*.test.mjs` case that runs `exe/gem` and answers its HTTP
  requests from the test process must spawn it asynchronously: `spawnSync`
  blocks the event loop that serves the fixture, the child waits for a response
  that cannot arrive, and the transport's 30s timeout burns minutes
  (`spec/lib/gems/cli.test.mjs` has both runners). Give every run its own cwd,
  and a temporary `HOME`, `GEM_HOME`, `GEM_PATH` and `GEM_SPEC_CACHE`; keep
  `GEM_SOURCES` empty to hold resolution off the network.
- RubyGems' ported code reads `Gem.ruby_version.segments` (a `Gem::Version`,
  not `RUBY_VERSION`) and `Gem.rubygems_version`; `Gem.default_user_install`
  must answer false on Opal, else an install into `GEM_HOME`/`--install-dir`
  is redirected to the user directory. Node has no `flock`, so
  `Gem.open_file_with_lock` is an exclusive-create `<path>.lock` file, stolen
  once older than `Gem::LOCK_TIMEOUT`.
- `Gem::Resolver` *is* the PubGrub source object: it feeds `VersionSolver`
  (`source: self`) and turns decisions into `ActivationRequest`s. A failed
  resolution is `Gem::DependencyResolutionError` whose message is PubGrub's
  explanation; a root dependency nothing provides is the pre-check's
  `Gem::UnsatisfiableDependencyError.new(dep_request, platform_mismatch)` —
  upstream 4.1's shape, which takes a `DependencyRequest` and answers
  `#dependency` and `#errors` rather than an `original` exception. Install the
  resolved set in `Gem::RequestSet#sorted_requests` order — TSort over the
  requests, dependencies first, while `#specs` keeps resolution order. Sorting
  is not optional: `Gem::Installer` refuses a gem whose dependencies are not in
  place yet, and hand-sorting with `Gem::DependencyList#dependency_order` gives
  the reverse (dependents first).
- The install driver: `Gem::DependencyInstaller#install` builds a
  `Gem::RequestSet` over a `Gem::Resolver::InstallerSet`. `RequestSet#resolve`
  hands the set its `remote=`, and `InstallerSet#remote=(true)` widens a
  `:local` domain to `:both` - an offline caller must answer that back with
  `request_set.remote = set.consider_remote?` (upstream's installer does), or
  the lookup walks into the remote seam. `Gem::Cooldown` is not ported, so
  `cooldown` stays nil everywhere and the cooldown filters in `resolver.rb`
  stay inert; `DependencyInstaller#in_background` runs inline because Opal's
  `Process.fork` is not a fork - it hands the block to the Opal system runner.
- `exe/ruby`'s `find_feature` searches the current directory *last*, so an
  integration test that keeps several runs in one temporary directory has to
  give each run its own cwd: a `helper.rb` another test left in the shared cwd
  shadows the installed `helper` gem (as `spec/lib/compiler/ruby_exe.test.mjs`
  does with its per-run `cwd`).
- Reading a binary format with text in it: an Opal String holds characters, a
  stream holds bytes, and none of `force_encoding`, `encode`, `pack('C*')` or
  `unpack('U*')` decodes UTF-8 bytes into characters - they retag or keep one
  character per byte, so "café" reads back as 5 characters. Decode with
  `new TextDecoder('utf-8')` over the bytes (`lib/rubygems/safe_marshal/visitors/to_ruby.rb#decode_utf8`).
  A string tagged US-ASCII/BINARY must keep its bytes or "\xff" becomes U+FFFD.
  `Marshal` here has no Time support either: `Time._load` (and `#_dump`) do not
  exist, it reads CRuby's user-defined body as a `time_t` and answers 1970 -
  the reason every "Marshal.load for a Time" example sits in
  `spec/filters/bugs/marshal.rb`, and why the SafeMarshal port reads
  `rb_time_mdump`'s body itself (`ToRuby#time_from_dump`) instead of taking
  upstream's rebuild-and-`Marshal.load` path. `Marshal` is not
  a constant outside `opal/full` (which autoloads it): `require 'corelib/marshal'`.
  A marshalled payload written by CRuby cannot be generated by Opal (Opal dumps
  an object with ivars where CRuby writes a user-defined one), so those payloads
  are committed as fixtures under `spec/opal/gems/fixtures/`.
- Reading a marshal stream by hand: a fixnum encodes small positives as
  `value + 5` (so 0 is 5, and a negative mirror runs the other way); a `u:`
  body is `length + raw bytes` with no `"` marker after it; and a Time dump is
  two packed little-endian words - read them with division and remainder, never
  `>>`/`&`, which coerce to a signed int32 and lose the high word.
- A marshalled index carries `Gem::Version` and `Gem::Platform` *objects*
  (`gem generate_index` dumps them), and `Gem::NameTuple.new` does not coerce:
  a fixture that dumps the plain strings builds fine and only blows up later in
  `s.version.prerelease?`. `SafeMarshal` reads both classes, so dump the real
  ones in specs.
- An empty `**kwargs` forwarded to a method with an optional *positional*
  arrives as that positional (an object, not nothing): `Zlib::GzipWriter.wrap`
  forwarding to `new(io, level = ...)` handed it the empty Hash, which then
  reached node:zlib as the compression level. Guard with
  `kwargs.empty? ? new(*args) : new(*args, **kwargs)`.
- An x-string cannot sit in assignment position, in either direction:
  `x = %x{ var t = 1; t }` splices the body into an expression (`(self.b = var t
  = 1; t)` - SyntaxError), and a statement x-string under a memoized `begin`
  splices `try {...}` between commas. Keep the x-string in statement position and
  read the value back with a single-expression backtick:
  `%x{ window._x = build() }` then `` `window._x` `` (that shape is
  `stdlib/zlib.rb`'s gunzip, for one).
- An x-string body is *raw JavaScript source*: backslashes pass through
  untouched, so a JS regex literal inside takes one backslash (`/:(\d+)$/`)
  - writing `\\d` in the Ruby file yields the JS regex `/\\d/`, which
  matches a literal backslash and silently never fires. JS *string*
  escapes are the opposite: they must already be doubled in the body
  (`c === "\\"` is a JS source escape, correct as written).
- A statement-`if` guard whose assignment RHS starts with interpolation and
  whose condition is an x-string (`line = #{count} - 1 if \`#{line} >=
  #{count}\``) silently swallows the *next statement* into that line: a
  multiple assignment after it compiled as `line = [recv.$a(), (b = ...)]`
  with LHS names turned into method calls - no error, wrong code. Reorder
  or rephrase the guard (a plain RHS like `line = 0` does not trigger it).
- `stdlib/uri/rfc3986_parser.rb`: upstream's `\g<seg>*+` is a *subexpression
  call* - the star applies to the whole re-expansion - so the relative-ref
  `path_absolute` is `/SEG*`, which is what makes `URI.parse("/")` parse. With a
  `+` there, `uri.merge("/")` raises InvalidURIError, and that is exactly what
  `Gem::Source#enforce_trailing_slash` merges for a source given without a
  trailing slash (ruby/spec parses no lone slash, so nothing covers it:
  `spec/opal/stdlib/uri/parse_relative_ref_spec.rb` does).
- `spec/opal/gems/support/http_fixture.rb` restarts its Worker when a call adds
  a route, and a restart means a new port: a spec that registers routes inside
  an example invalidates every port captured earlier in the file. Put all the
  routes of a file in its `before :all` and read the port it returns.
- MSpec in `spec/opal`: expect `-> { }.should raise_error(X)` (space, not
  `.should.raise`); `start_with` and `be_truthy` matchers do not exist there;
  a predicate that answers an object (`Gem::SourceList#include?` finds and
  returns) needs a `.nil?` assertion.
- Opal has `Symbol = String` (`opal/corelib/string.rb`, at the end), so
  `Symbol === x` and `x.is_a?(Symbol)` are true of *every* String and a Symbol
  cannot be told from one at run time. Upstream Ruby that branches on a Symbol
  argument needs a shape test instead: `Gem::Command#add_option` reads a leading
  dash to tell an option flag from the option-group name it also accepts first.
- optparse registers its `Officious` switches (`--help`, `--version`) on every
  parser: `--help` prints that parser's own banner and exits, `--version` aborts
  with "<program>: version unknown" when the parser has no version, and an
  unknown option is shifted off the argv *before* `InvalidOption` is raised, so a
  scan that rescues ParseError silently eats it. That is why `Gem::ConfigFile`
  reads its few options with a hand loop (upstream 4.1 does the same) instead of
  with a parser: `gem --version` and `gem --frobnicate` belong to
  `Gem::CommandManager`, which never sees them otherwise.
- `Dir.glob(pattern, base: nil)` ignores the nil and searches the current
  directory (CRuby raises TypeError), so a nil directory handed to
  `Gem::Util.glob_files_in_dir` reads whatever gemspec sits in the cwd. Keep
  `Gem.default_specifications_dir` a real path - upstream's, under
  `Gem.default_dir` - rather than nil, which is what `Gem::Specification
  .default_stubs` assumes.
- `Kernel#eval` raises RuntimeError "You need to provision opal-parser yourself
  in this environment" unless opal-parser is loaded, so a ported body that evals
  has to `require "opal-parser"` (as `Specification.load` and
  `Installer#ensure_loadable_spec` do). That require is static, so any bundle
  compiling those files carries the whole parser and compiler whether it wants
  them or not: `exe/gem` is 2.2MB, the size of `exe/ruby`, because a `.gemspec`
  is Ruby source.
- Reading a gem from a real source reaches code the fixtures never touch, and the
  failures are Opal's, not the port's: `tr!` and `String#<<` raise
  NotImplementedError at run time, and they sat in `SpecFetcher`'s name
  suggestion and in `Gem::YAMLSerializer`'s folded plain scalars (a real
  `metadata.gz` wraps a long summary onto the next line). A bundle's stack
  frames are byte offsets, so reproduce with `node exe/opal <probe.rb>` running
  `Gem::DependencyInstaller.new(domain: :both).install("thread_safe")` — that
  answers a Ruby backtrace.
- An installed gemspec is stub format here (`# stub:` header, no `files:`),
  because upstream writes it through `to_ruby_for_cache` and `for_cache` nils
  `files` — CRuby's `specifications/*.gemspec` look the same. `gem spec`
  answering `files: []` is not a port bug.
- `Time.iso8601`/`Time.xmlschema` (the parse class methods, and the `httpdate`
  and `rfc2822` ones still missing) are core in CRuby and absent in Opal; the
  port added them to `stdlib/time.rb`, where the instance formatters already
  live. `Time.utc`/`gm`/`local`'s seventh argument is microseconds and must be
  read with `typeof usec === 'number'`: the C-style call
  `Time.utc(1,15,20,1,1,2000,:ignored,:ignored,:ignored,:ignored)` puts junk
  there, and `Number(:ignored)` turns the whole Date into NaN.
- A compact-index fixture's *versions* line is `name v1,v2 <md5-of-info-file>`
  - one checksum per gem name covering the whole info file. The source's
  listing walks the versions line, not the info lines: a versions line naming
  only `0.1.0` hides the second version of a two-version info file, which is
  what makes `gem update` answer "Nothing to update" against a fixture meant
  to have one.
- A compiled bundle carries no file tree next to its code, so
  `lib/bundler/templates/{Executable,Executable.standalone,Gemfile}` cannot be
  read at run time: they are embedded as strings (installer.rb, cli/init.rb).
  This stdlib's ERB carries only `ERB::Util.h`, no `#result`, so the binstub
  generator fills the `<%= %>` holes with gsub - non-greedy `/<%= .*? %>/`,
  the greedy one swallows both holes on the `load Gem.bin_path(...)` line.
  The generated shebang reads `opal` because stdlib/rbconfig names the
  interpreter that; run a binstub through `exe/ruby`, not straight.
- `lib/bundler/fetcher.rb` reads `Bundler.settings` at require time, so files
  loaded while the root is still being defined (`source/rubygems.rb`) must not
  require it - `require_relative "fetcher"` belongs at first use instead
  (the autoload shape upstream leans on).
- The bundler CLI scanner registers command-table switches before the global
  ones and keeps the first (`switches[s] ||= name`): Thor's precedence of
  method_options over class_options, without which the global `-r` (retry)
  hijacks `add -r` (require).
- A gem can fail for a reason outside the port: Opal compiles some Ruby regexp
  literals (`'\)'` escapes under the `/u` flag, as in addressable) into a JS
  expression JavaScript rejects, so `require 'addressable/uri'` dies in the
  loader while `require 'public_suffix'` from the same install works.
- If an agent discovers information that required significant setup time, condense
  the result into a short bullet in this file so later agents can skip the same
  work.
- Write commit messages in the `subsystem: summary` form so changes are easy to
  track.
- New features or bugfixes should come with tests. For parser, compiler,
  builder or CLI changes add specs under `spec/lib/{parser,compiler}`; for
  runtime or stdlib consult the ruby/spec suite first and add new specs under
  `spec/opal` if needed.
- See `HACKING.md` and `CONTRIBUTING.md` for more detailed guides on
  collaborating on Opal.
- Do not commit changes to external submodules such as `spec/ruby` or
  `spec/mspec`. Instead add new files under `spec/opal` so they remain within
  the `opal` namespace.

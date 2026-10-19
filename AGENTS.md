# AGENTS Instructions

This file explains how automation and human contributors should work in this
repository. Follow the steps below to set up the project, run tests and keep the
codebase healthy.

Opal needs only Node.js (22 or later), git and yarn; no Ruby.


## Setup
- Run `bin/setup` once after cloning to install the git submodules and the
  yarn packages.

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
- `node tasks/test.mjs` (or `yarn test`) runs every Node.js suite in about
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
- Run `node tasks/lint.mjs` (or `yarn lint`) to check the JavaScript style. It
  checks that `lib/opal/parser/parser.mjs` matches its parts, runs ESLint on
  the parser, the compiler and the tasks, then builds the corelib and stdlib and
  lints the result.
- After editing `lib/opal/parser/parts/*.mjs`, regenerate `parser.mjs` with
  `node tasks/parser/assemble.mjs`.
- The Ruby code style is described by `.rubocop.yml`; checking it needs a Ruby
  with `rubocop` and `rubocop-performance` (optional).

## Notes
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
  standalone Node program bundling opal,
  opal-parser and an OPAL_HOME constant, which loads, compiles and runs the
  given script in its own runtime. It supports -e -c -I -r -w -W -v -d -n -p
  -0 -E - `--` -h --version; scripts' runtime requires are resolved through
  `Opal.platform.load_file` against $LOAD_PATH, the stdlib directory and the
  cwd. It caches compiled JS at runtime (like the builder's FileCache, but
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
  tasks/parser/gen_convert.mjs --config=<prism>/config.yml`, and unlike
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
  `caller_locations` work with no `-I` and no require; `$LOAD_PATH` also gets
  `$OPAL_HOME`, `$OPAL_HOME/opal` and `$OPAL_HOME/stdlib`, and `find_feature`
  loads a `<path>.js` as it stands. Its `caller_locations` frames are
  JavaScript ones: the script runs through `eval`, so a script frame names the
  bundle, not the `.rb` file.
- `--compile-to-exe node` runs `node --build-sea=config.json` on Node.js 26 or
  newer: one step, no postject/npx/codesign, and the config's `output` names
  the executable instead of a blob. Below 26 the old
  `--experimental-sea-config` + postject path runs, and it needs a build with
  the SEA fuse, which the system `node-22` lacks.
- The gem port (GEMS.md, `lib/rubygems/`) requires its files eagerly - no
  `autoload` - so a compiled bundle can carry them; `tasks/ruby/bundle.mjs`
  bundles `lib/rubygems.rb` into `exe/ruby` (1.4MB -> 1.9MB) and
  `find_feature` calls `Gem.try_activate` when a path is not on `$LOAD_PATH`,
  so a feature that no gem owns must raise LoadError, not the ENOENT
  `Opal.platform.load_file` raises (Opal compiles `require` to the runtime, so
  upstream's `core_ext/kernel_require.rb` hook has no Ruby-level hook point).
- RubyGems' ported code reads `Gem.ruby_version.segments` (a `Gem::Version`,
  not `RUBY_VERSION`) and `Gem.rubygems_version`; `Gem.default_user_install`
  must answer false on Opal, else an install into `GEM_HOME`/`--install-dir`
  is redirected to the user directory. Node has no `flock`, so
  `Gem.open_file_with_lock` is an exclusive-create `<path>.lock` file, stolen
  once older than `Gem::LOCK_TIMEOUT`.
- MSpec in `spec/opal`: expect `-> { }.should raise_error(X)` (space, not
  `.should.raise`); `start_with` and `be_truthy` matchers do not exist there;
  a predicate that answers an object (`Gem::SourceList#include?` finds and
  returns) needs a `.nil?` assertion.
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

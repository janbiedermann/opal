# Merge report: raise_platform_foundation → grinding_platform_foundation

Target branch: `grinding_platform_foundation`, created from `grinding_potch`
(`1581b759a`). Source branch: `raise_platform_foundation` (`ccbacfc02`).

## 1. The two branches

Merge base: `abf15821c` (2026-05-01, "Merge pull request #2786 …
ruby-4-ostruct").

| | grinding_potch | raise_platform_foundation |
|---|---|---|
| Own commits | 56 (to 2026-10-06) | 26 (to 2026-05-25) |
| Files changed | 1,961 (+107k/−23k) | 401 (+21k/−9.5k) |
| World | potch + JS compiler/builder/CLI, phases 1–5 done, Ruby toolchain removed, Node-only | pre-potch: Ruby compiler, rake tasks, Ruby-based CI, per-platform stdlib drivers |

`raise_platform_foundation` branched off **before** the potch integration; its
toolchain-side changes target code that no longer exists. Its value is the
platform work in `opal/`, `stdlib/`, `test/` and `spec/`.

The core commit is `161050904` "Remaster platform support with a common
corelib ruby implementation and small platform drivers" (397 files,
+20,666/−9,518). A diverged variant `raise_platform_foundation_local`
(20 ahead / 8 behind) exists; out of scope here.

## 2. What raise_platform_foundation brings

- **Common corelib platform implementation** (Ruby, platform-independent):
  `Dir#glob`/`#fnmatch` (no picomatch), `#expand_path`, `#absolute_path`,
  `#dirname`, `Kernel#format`, `FileTest`, `Etc`, `ARGF`, `ARGV`, `ENV`,
  `IO.copy_stream`, `Kernel.singleton_methods`, `Kernel`/`Process` process
  spawning, `Process::Sys`/`Tms`/`Uid`/`Gid`, new `#exit` codes based on
  `SystemExit`, `FileUtils`, `Pathname`, `tmpdir`.
- **New files**: `opal/corelib/{argf,env,file_test}.rb`,
  `opal/corelib/file/constants.rb`, `opal/corelib/process/{sys,tms,uid,gid}.rb`,
  `opal/io/{buffer,console,wait,nonblock}.rb` (`io/buffer.rb` moved to
  `opal/io/`), `opal/runtime/platforms/node_compatible.js` (670 lines),
  `stdlib/{etc,fcntl}.rb`, `spec/mspec-opal/should.rb`.
- **Architecture change**: deletes the per-platform stdlib drivers
  (`stdlib/nodejs/*` incl. picomatch, `stdlib/{deno,bun,gjs,headless_browser}/*`)
  in favor of the corelib Ruby code plus the `node_compatible.js` runtime
  layer; `stdlib/js-yaml-3-6-1.js` moves to `stdlib/`.
- **Tests**: moves `test/nodejs/*` to `test/opal/*` (platform-independent),
  adds `test/opal/{test_fileutils (1,935 lines),test_pathname (1,496 lines),fileasserts}.rb`.
- **Policy changes**: `backtick_javascript` default **false** (backticks embed
  JS only with the magic comment — the sweep adding the comments to all Ruby
  files is part of the branch); always raise `NotImplementedError` for
  missing features.
- **Follow-up fixes**: String "ropes" optimization (`1d83e163e`),
  `Process.getpriority`/`setpriority` on Node (`4b077d560`), Node 25
  (`rmdirSync` → `rmSync`, `7de760f8d`), root/container spec and test
  exclusions (`879c74e8c`, `eea347705`), gvars fix, `require opal/base`
  removal, Node 25 spec filters.
- **Obsolete in our world** (targets removed code): `lib/opal/*.rb` compiler,
  nodes, rewriters and Ruby `cli_runners/*` changes, `tasks/*.rake`,
  `Gemfile` (ostruct gem), Ruby-based CI jobs (ruby 3.4/4.0, TruffleRuby,
  setup-edge), RuboCop fixes, `benchmark/run.rb`, `spec/lib/*_spec.rb`.

## 3. Trial merge (`git merge --no-commit`, then aborted)

Auto-resolved: 163 modified, 105 added, 50 deleted, 17 renamed.
Conflicts: 55.

**UU (both modified, 16):**
`.github/workflows/build.yml`, `HACKING.md`, `docs/encoding.md`,
`examples/exe/create_apps.sh`, `lib/opal/compiler/cli/runners/cdp_interface.mjs`
(paired by rename detection with rpf's `lib/opal/cli_runners/cdp_interface.rb`),
`spec/filters/bugs/{datetime,exception,hash,language,time}.rb`,
`spec/filters/unsupported/time.rb`, `stdlib/nodejs.rb`,
`stdlib/opal-platform.rb`, `stdlib/opal/platform.rb`, `stdlib/rbconfig.rb`,
`tasks/performance/asciidoctor_test.rb`

**UD (modified by us, deleted by them — the driver retirement, 7):**
`stdlib/nodejs/{base,dir,open-uri,package.json}.rb`/`.json`,
`stdlib/nodejs/node_modules/.package-lock.json`, `test/nodejs/test_dir.rb`

**DU (deleted by us, modified by them — the Ruby toolchain, 32):**
`Gemfile`, `benchmark/run.rb`, `examples/rack*/app/application.rb`,
`lib/opal/{builder/processor,cli,cli_runners,compiler,exe_compiler,os,project,repl}.rb`,
`lib/opal/cli_runners/{chrome,firefox,nodejs,safari,system_runner}.rb`,
`lib/opal/nodes/{base,call/require,if,while,x_string,yield}.rb`,
`lib/opal/rewriters/{opal_engine_check,targeted_patches}.rb`,
`spec/lib/{builder_processors,rake_dist}_spec.rb`, `stdlib/opal/miniracer.rb`,
`tasks/{benchmarking,performance,testing}.rake`,
`tasks/testing/mspec_special_calls.rb`

88 files were touched on **both** sides; the corelib hotspots that auto-merged
but need review (`time.rb`, `string.rb`, `string/encoding/eucjp.rb`,
`hash.rb`, `error.rb`, `module.rb`, `proc.rb`, `regexp.rb`) are where grinding_potch's
encoding/Time/exception work meets rpf's foundation rewrite. Clean auto-merge
≠ semantic correctness.

## 4. Decision points

1. **Platform layer**: adopt rpf's corelib-Ruby + `node_compatible.js`
   architecture, or keep grinding_potch's `stdlib/nodejs/*` drivers +
   picomatch? The branch's whole point is the foundation; recommend adopting
   it, but retire the drivers only after every suite passes without them.
2. **backtick default false**: a breaking change; grinding_potch currently
   warns. rpf already carries the magic-comment sweep. Decide whether the
   merge flips it or keeps the warning and flips later.
3. **NotImplementedError policy** vs the `alias`-style fallbacks in
   `opal/corelib/unsupported.rb`.
4. **Exit codes** (`SystemExit`-based) vs grinding_potch's
   "uncaught exceptions end Node.js programs as in CRuby" (`837ffca62`).
5. **Filters**: grinding_potch's filter set is current (41 filters removed,
   `unsupported/ruby40.rb` added); do not take rpf's filter files wholesale,
   only its Node-25 and root/container entries where still applicable.
6. **CI**: keep grinding_potch's Node-only workflow; port the root/container
   exclusions. Check grinding_potch's `rmSync/mkdirSync { recursive: true }`
   uses against Node 25.

## 5. Merge plan

Each step is a commit; `node tasks/test.mjs` and `node tasks/lint.mjs` must be
green after each.

1. **Merge commit**: `git merge raise_platform_foundation` with policy:
   - DU (32): keep our deletions (toolchain is gone).
   - UD (7): keep our files for now (drivers retire in step 4).
   - UU (16): resolve by hand — keep our CI workflow, HACKING.md,
     `cdp_interface.mjs` (port rpf's CDP fixes into it), our filter set
     (add rpf's Node-25/root entries), merge `stdlib/opal-platform.rb`,
     `stdlib/opal/platform.rb`, `stdlib/rbconfig.rb`,
     `tasks/performance/asciidoctor_test.rb`, `docs/encoding.md` (rpf's
     String/Encoding docs + our encoding work), `examples/exe/create_apps.sh`.
   - Auto-merged corelib/stdlib/test files: accept, then review the 8
     corelib hotspots listed above.
2. **Fix fallout**: run all six suites; repair the corelib/stdlib seams
   (Time/DateTime/ENV-TZ, EUC-JP/Shift_JIS literals, String#inspect,
   uncaught exceptions must survive the foundation rewrite).
3. **Port rpf-only follow-ups** not carried by the merge: Process priority on
   Node, String ropes, Node 25 `rmSync` fix, root/container exclusions,
   `spec/mspec-opal/should.rb` wiring into `tasks/testing/mspec.mjs`.
4. **Retire the drivers** (decision point 1): once suites are green with
   `node_compatible.js` + corelib Ruby, delete `stdlib/nodejs/*` drivers and
   picomatch in a dedicated commit; re-home grinding_potch's `test/nodejs`
   additions into `test/opal`.
5. **Verify**: `node tasks/test.mjs` (all suites), lint, `TZ=` variants
   (America/Los_Angeles, Pacific/Chatham), a root run for the container
   exclusions, and `node tasks/dist.mjs`.

## 6. Risks

- The 163 auto-merged files hide semantic conflicts; the suites are the net,
  the hotspot review is the safety net.
- rpf predates potch: its compiler/rewriter-side behavior changes (backtick
  default, NotImplementedError, engine-check tweaks) must be re-implemented
  against the JS compiler (`lib/opal/compiler/`), not merged as Ruby.
- rpf's Node-25 filters were tuned for its runner set; re-derive them for the
  current runners.

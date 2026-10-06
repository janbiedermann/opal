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
  - `lib/opal/potch/` is potch, Opal's built-in Ruby parser: a JS port of
    Prism 1.9. See `docs/potch.md` and `POTCH.md`.
  - `lib/opal/compiler/` is the compiler (`index.mjs`, `nodes/`,
    `transforms/`), the builder (`builder/`) and the CLI with its runners
    (`cli/`). `exe/opal` runs the CLI.
  - `lib/opal/cli_runners/` holds the JS support files of the runners.
- `opal/` provides the runtime and Ruby core library. Its layout is:
  - `corelib/` contains Ruby's built-ins implemented in Ruby.
  - `runtime/` holds JS helpers required at execution time.
  - `opal/` offers entry points like `base.rb`, `mini.rb` and `full.rb` for
    loading subsets of the runtime.
- `stdlib/` contains Opal's standard library implementation.
- `spec/` and `test/` host the test suites: `spec/lib/{potch,compiler}`
  (`node --test`), `spec/opal` and `spec/ruby` (MSpec), `test/` (Minitest).
- `examples/` shows sample applications.
- `docs/` provides documentation for contributors and users.
- `tasks/` holds the development scripts (`tasks/*.mjs`, run with `node`).

## Running tests
- `node tasks/test.mjs` (or `yarn test`) runs every Node.js suite in about
  40 seconds; ensure it passes before committing:
  - `potch`: the parser specs (`spec/lib/potch/*.test.mjs`, about 8,500 cases)
  - `compiler`: the compiler, builder and CLI specs (`spec/lib/compiler`)
  - `mspec_opal`: the Opal-specific specs under `spec/opal`
  - `mspec_ruby`: the ruby/spec compatibility suite (`PATTERN=<glob>` limits
    the run, `RUBYSPECS=true` with it only takes files of `spec/ruby_specs`)
  - `minitest_cruby`: the vendored CRuby tests and Opal's stdlib additions
    from `test/opal` (`FILES=<glob>` runs other test files instead)
  - `minitest_node`: integration tests in `test/nodejs`
- Name suites to run only those (`node tasks/test.mjs mspec_ruby`; `mspec` and
  `minitest` name both of theirs), or pass spec/test files or directories to run
  just them (`bin/test` does the same). `-R chrome` (firefox, safari, ...)
  runs the Opal suites on another runner. `RANDOM_SEED` repeats a
  randomized order.

## Linting
- Run `node tasks/lint.mjs` (or `yarn lint`) to check the JavaScript style. It
  checks that `lib/opal/potch/potch.mjs` matches its parts, runs ESLint on
  potch, the compiler and the tasks, then builds the corelib and stdlib and
  lints the result.
- After editing `lib/opal/potch/parts/*.mjs`, regenerate `potch.mjs` with
  `node tasks/potch/assemble.mjs`.
- The Ruby code style is described by `.rubocop.yml`; checking it needs a Ruby
  with `rubocop` and `rubocop-performance` (optional).

## Notes
- The list of MSpec files is in `spec/ruby_specs` and filters live in
  `spec/filters` (`bin/format-filters` sorts them, `bin/remove-filters`
  removes the ones given on stdin).
- Tests depend on initialized submodules (`spec/mspec`, `spec/ruby`,
  `test/cruby`); `node bin/git-submodule-fast-install` fetches them as
  archives.
- The compiler fixtures (`spec/lib/fixtures/compiler/**/*.rb` and their
  expected `.js`) are regenerated with `node tasks/compiler/update_fixtures.mjs`;
  review the diff.
- Other tasks: `node tasks/dist.mjs` (build corelib/stdlib),
  `node tasks/bench.mjs` (benchmarks), `node tasks/performance.mjs`
  (performance comparison with master), `node tasks/release.mjs` (changelog,
  release preparation).
- The Node.js stdlib needs `NODE_PATH=stdlib/nodejs/node_modules` (for
  `picomatch`) when running Opal-built JS with plain `node` instead of
  `exe/opal -Rnodejs`.
- Browser runners without a system browser: download one with
  `npx @puppeteer/browsers install chrome-headless-shell@stable` (or
  `firefox@esr_128.14.0esr`) and point `GOOGLE_CHROME_BINARY` /
  `MOZILLA_FIREFOX_BINARY` at it. As root, Chrome needs
  `CHROME_OPTS=--no-sandbox`. Firefox 129+ dropped CDP, which the Firefox
  runner uses, so use ESR 128. On a minimal EL10 system the browsers need
  `dnf install atk at-spi2-atk at-spi2-core libXcomposite libXdamage
  libXfixes libXrandr mesa-libgbm libxkbcommon alsa-lib gtk3 libXcursor`.
- On a machine in UTC, time zone bugs stay hidden; run the ruby/spec suite in
  other zones too (`TZ=America/Los_Angeles`, `TZ=Pacific/Chatham`) after
  changes to Time, Date or DateTime.
- `node --test` on Node 22 does not accept a directory; pass the files
  (`node --test spec/lib/potch/*.test.mjs`).
- If an agent discovers information that required significant setup time, condense
  the result into a short bullet in this file so later agents can skip the same
  work.
- Write commit messages in the `subsystem: summary` form so changes are easy to
  track.
- New features or bugfixes should come with tests. For parser, compiler,
  builder or CLI changes add specs under `spec/lib/{potch,compiler}`; for
  runtime or stdlib consult the ruby/spec suite first and add new specs under
  `spec/opal` if needed.
- See `HACKING.md` and `CONTRIBUTING.md` for more detailed guides on
  collaborating on Opal.
- Do not commit changes to external submodules such as `spec/ruby` or
  `spec/mspec`. Instead add new files under `spec/opal` so they remain within
  the `opal` namespace.

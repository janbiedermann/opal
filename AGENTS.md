# AGENTS Instructions

This file explains how automation and human contributors should work in this
repository. Follow the steps below to set up the project, run tests and keep the
codebase healthy.


## Setup
- Run `bin/setup` once after cloning to install gems, yarn packages and git submodules.

## Directory overview
- `lib/` holds the compiler and CLI implementations.
  - `lib/opal/potch/` is potch, Opal's built-in Ruby parser: a JS port of
    Prism 1.9 written as ES modules (`.mjs`). See `docs/potch.md` and
    `POTCH.md`.
- `opal/` provides the runtime and Ruby core library. Its layout is:
  - `corelib/` contains Ruby's built-ins implemented in Ruby.
  - `runtime/` holds JS helpers required at execution time.
  - `opal/` offers entry points like `base.rb`, `mini.rb` and `full.rb` for
    loading subsets of the runtime.
- `stdlib/` contains Opal's standard library implementation.
- `spec/` and `test/` host RSpec and Minitest suites.
- `examples/` shows sample applications.
- `docs/` provides documentation for contributors and users.
- `tasks/` defines Rake tasks used by `bin/rake`.

## Running tests
- Running `bin/rake` executes every suite on both Chrome and Node.js but is slow and requires a browser.
- For day-to-day work rely on the Node.js tasks and ensure they pass before committing:
  - `bin/rake rspec` runs the RSpec suite covering Opal compiler and runtime internals.
  - `bin/rake mspec_ruby_nodejs` runs the ruby/spec compatibility suite (use `PATTERN=<glob>` to limit the run).
  - `bin/rake mspec_opal_nodejs` executes the Opal-specific specs under `spec/opal`.
  - `bin/rake mspec_nodejs` runs both of the above suites in sequence.
  - `bin/rake minitest_cruby_nodejs` runs the vendored CRuby tests and Opal's stdlib additions from `test/opal` (set `FILES=<glob>` to limit).
  - `bin/rake minitest_node_nodejs` runs integration tests in `test/nodejs`.
  - `bin/rake minitest_nodejs` runs both Minitest suites on Node.js.
  - `bin/rake potch` runs the potch parser specs (`spec/lib/potch/*.test.mjs`,
    about 8,500 cases in a few seconds, Node.js only).

## Linting
- Run `bin/rake lint` to check code style. This builds the corelib and stdlib then executes RuboCop and ESLint.
- `bin/rake lint:potch` lints only the potch ES modules and checks that
  `lib/opal/potch/potch.mjs` matches its parts. After editing
  `lib/opal/potch/parts/*.mjs`, regenerate it with `bin/rake potch:assemble`.

## Notes
- The list of MSpec files is in `spec/ruby_specs` and filters live in `spec/filters`.
- Tests depend on initialized submodules (`spec/mspec`, `spec/ruby`, `test/cruby`).
- Use `bundle install`, not `bin/setup`, to install the gems without
  rewriting `Gemfile.lock` (`bin/setup` runs `bundle update`).
- The Node.js stdlib needs `NODE_PATH=stdlib/nodejs/node_modules` (for
  `picomatch`) when running Opal-built JS with plain `node` instead of
  `exe/opal -Rnodejs`.
- `node --test` on Node 22 does not accept a directory; pass the files
  (`node --test spec/lib/potch/*.test.mjs`).
- If an agent discovers information that required significant setup time, condense
  the result into a short bullet in this file so later agents can skip the same
  work.
- Write commit messages in the `subsystem: summary` form so changes are easy to
  track.
- New features or bugfixes should come with tests. For compiler or builder
  changes add RSpec specs; for runtime or stdlib consult the ruby/spec suite
  first and add new specs under `spec/opal` if needed.
- See `HACKING.md` and `CONTRIBUTING.md` for more detailed guides on
  collaborating on Opal.
- Do not commit changes to external submodules such as `spec/ruby` or
  `spec/mspec`. Instead add new files under `spec/opal` so they remain within
  the `opal` namespace.

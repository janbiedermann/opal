# Obsolete support code: report and removal plan

Opal is Node.js-only since phase 5 (`POTCH.md`): the Ruby compiler, parser,
rewriters, builder, CLI, runners, the RSpec suite, `opal.gemspec`, `Gemfile`,
`Rakefile`, `tasks/*.rake`, `bin/rake`, `bin/console`, `bin/opal-rb`,
`config.ru`, `Guardfile`, `.rspec`, `.yardopts` and `.overcommit.yml` are
already gone, and `lib/` holds no Ruby. What remains of the Ruby-era support
code is listed below.

## About `if RUBY_ENGINE`

The only `RUBY_ENGINE` conditions left in `lib/` are live compiler features,
not support code:

- `lib/opal/compiler/transforms/conditionals.mjs` — the engine-check pass that
  prunes dead `RUBY_ENGINE`/`RUBY_PLATFORM` branches from compiled Ruby.
- `lib/opal/compiler/builder/project.mjs` — strips `if RUBY_ENGINE == 'opal'`
  blocks when reading Opalfiles.

In `opal/` and `stdlib/` the few `RUBY_ENGINE` conditions
(`corelib/constants.rb`, `corelib/unsupported.rb`, `corelib/irb.rb`,
`opal/opal/regexp_transpiler.rb`, `stdlib/rbconfig.rb`,
`tasks/performance/asciidoctor_test.rb`) are runtime code or benchmark
inputs, mostly pruned at compile time — see section B for why they stay.
The actual leftovers are in the root files, `bin/` and `stdlib/opal/`.

## A. Obsolete — remove

1. **`bin/opal-repl`** — a Ruby script (`#!/usr/bin/env ruby`) that execs
   `bin/opal --repl`. `bin/opal` and `exe/opal-repl` are Node scripts; the
   wrapper needs a Ruby interpreter for nothing. Nothing references it.
   Remove it (or replace with a two-line `#!/bin/sh` wrapper).

2. **miniracer remnants** — the miniracer runner (a Ruby gem) was removed in
   phase 5; no runner sets `OPAL_PLATFORM` to `opal-miniracer` and the
   `opalminiracer` global no longer exists:
   - `stdlib/opal/miniracer.rb` (whole file)
   - `stdlib/opal/platform.rb:11` — `when 'opal-miniracer' then require 'opal/miniracer'`
   - `stdlib/opal-platform.rb:14,32-33` — the `opal_miniracer` detection and
     the `'opal-miniracer'` platform name

3. **`.inch.yml`** — inch.io configuration whose file patterns
   (`plugins/**/*.rb`, `plugins/vendor/sparkr/sparkr.rb`, `!ruby/regexp`)
   belong to a different project and a dead service.

4. **`.codeclimate.yml`** — Code Climate configuration that analyzes
   `lib/**/*.rb` and excludes `lib/opal/parser/grammar.rb` and
   `lib/opal/source_map/vlq.rb` — all removed in phase 5. CI is GitHub
   Actions (Node jobs only).

5. **`Gemfile.lock`** — untracked leftover on disk (its `Gemfile` was deleted
   in phase 5; `.gitignore` already lists it). Delete the file.

6. **`lib/opal/source_map/`** — empty directory left on disk after its `.rb`
   files moved to `stdlib/opal/` in phase 5 (git does not track directories).

## B. Looks obsolete but is needed — keep

| File | Why it stays |
|---|---|
| `stdlib/rbconfig.rb`, `stdlib/rbconfig/sizeof.rb` | mspec's `ruby_exe` helper and platform guards `require 'rbconfig'` in the compiled specs |
| `stdlib/opal/version.rb` | `Opal::VERSION`, required by `stdlib/opal-parser.rb` |
| `stdlib/racc/` | `test/cruby`'s rdoc parsers require `racc/parser.rb`; `transforms/targeted_patches.mjs` and `builder/dce.mjs` handle racc-generated code |
| `opal/corelib/constants.rb` | defines `RUBY_ENGINE`/`RUBY_VERSION`/... for compiled code |
| `opal/corelib/unsupported.rb` | runtime fallbacks (`Kernel#eval` hint, mutable-String errors) |
| `opal/corelib/irb.rb` | REPL var mode (`--irb`, used by `cli/repl.mjs`) |
| `opal/opal/regexp_transpiler.rb`, `regexp_anchors.rb` | moved from `lib/` in phase 5 because `Regexp` uses them at runtime |
| `stdlib/opal/platform.rb`, `stdlib/opal-platform.rb` | platform detection (minus the miniracer branches, item A2) |
| `stdlib/opal/repl_js.rb` | required by `cli/repl.mjs` (`require "opal/repl_js"`) |
| `tasks/performance/asciidoctor_test.rb`, `optimization_status.rb` | inputs read by `tasks/performance.mjs`; the CRuby comparison still runs them under Ruby |
| `Opalfile` | `add_load_path "lib"` is still needed: `stdlib/opal-parser.rb` requires `opal/compiler/index.mjs` through it |
| `vendored-minitest/` | the minitest library for `test/opal`, `test/nodejs`, `test/cruby` |
| `.rubocop.yml`, `.rubocop_todo.yml` | optional style checks for the Ruby that remains (corelib, stdlib, spec, test); documented in AGENTS.md |
| `bin/build-browser-source-map-support` | regenerates the committed `cli_runners/source-map-support-*.js`; browserify is a package.json dependency |
| `spec/filters/*.rb` | mspec filters, loaded by `tasks/testing/mspec_special_calls.mjs` |
| `spec/lib/fixtures/**` | fixtures of the compiler/builder specs |
| `benchmark/`, `benchmark-ips/`, `examples/exe/` | used by `tasks/bench.mjs`, `bin/opal-benchmark-ips` and the `--compile-to-exe` docs |
| `lib/opal/cli_runners/` (`source-map-support*.js`, `package.json`, `node_modules/`) | runner support (ws, commander, chrome-remote-interface) |

## C. Docs already marked "Opal 1.x" — optional move

`docs/configuring_gems.md`, `docs/using_sprockets.md`, `docs/rails.md`,
`docs/sinatra.md`, `docs/roda-sprockets.md`, `docs/rspec.md`,
`docs/jquery.md` describe gem-based integrations and carry the "applies to
Opal 1.x" banner added in phase 5. Optional: move them to `docs/1.x/` (or a
legacy branch) so the current docs are Node-only. `docs/upgrading.md`
(v0.8→v0.9) is historical.

## D. Minor leftovers — optional

- `lib/opal/compiler/builder/project.mjs` treats `Gemfile`/`.gemspec` as
  project-defining files (`PROJECT_DEFINING`) — gem-era; harmless.
- `.gitignore` Ruby-era entries (`.ruby-version`, `.rvmrc`, `.rspec-local`,
  `Gemfile*`, `.bundle`) — harmless.

## Removal plan

Each step is one commit (`subsystem: summary`), followed by
`node tasks/test.mjs` and `node tasks/lint.mjs` (both must stay green).

1. `cli: drop the Ruby bin/opal-repl wrapper`
   - delete `bin/opal-repl`; smoke-test `exe/opal-repl -e 'puts 1'`.
2. `stdlib: remove the miniracer remnants`
   - delete `stdlib/opal/miniracer.rb`; drop the `opal-miniracer` branch in
     `stdlib/opal/platform.rb` and the detection in `stdlib/opal-platform.rb`;
     `grep -rn miniracer` afterwards must only hit CHANGELOG/POTCH.
3. `repo: remove obsolete configs and leftovers`
   - delete `.inch.yml`, `.codeclimate.yml`, `Gemfile.lock` (untracked) and
     the empty `lib/opal/source_map/` directory.
4. (optional) `docs: move the Opal 1.x gem guides to docs/1.x/`
   - move the seven guides, update the links in `docs/index.md` and README.

<!--
### Internal
### Changed
### Added
### Removed
### Deprecated
### Performance
### Fixed
-->

### Added

- `irb`: a port of ruby/irb (the v1.18.0 series) - `stdlib/irb.rb` and
  `stdlib/irb/**` vendored with `# Opal port:` patches only, a faithful
  Prism API shim (`stdlib/prism.rb`) over the vendored JS parser, the eval
  bridge (`Binding#irb_vars` and `irb: true` compiles), the line editor
  `stdlib/reline.rb` (tier-2: raw-mode over the node driver's tty
  primitives), and the command `exe/irb` (`tasks/irb.mjs`/`tasks/irb_exe.mjs`,
  the same bundle shape as `exe/ruby`)
- `exe/drill`: the command that runs programs - the test matrix and
  working-tree probes. It carries the old CLI's running options (`-e`,
  `-r`, `-I`, `-R`, `-s`, `-p`, `-g`, `-q`, `-D`, `-A`, `-E`, `-M`, `-F`,
  `-V`, `--missing-require`, `--enable-source-location`, ...) while the
  build-and-output options stay in `exe/opal`; built by
  `tasks/drill.mjs` and `tasks/drill_exe.mjs`, and it runs without a tree
  beside it: the `opal/` and `stdlib/` Ruby sources ride inside the bundle
  and unpack to `~/.cache/opal-drill` when no checkout is found
- `stdlib`: the up! network stack - `Net::HTTPServer` (evented HTTP/1.1,
  HTTP/2, HTTPS and WebSocket server over node.js, with node-cluster
  workers and pubsub), `Rack::Handler::Up` (Rack 3 handler with the
  iodine-style `rack.upgrade` WebSocket/pubsub API), and the `tempfile`
  and `cgi/escape` features; guide in `docs/http_server.md`, smoke
  drivers in `test/opal/`, rack-gem audit in `test/opal/rack_compat/`

### Changed

- `exe/opal` now only compiles - it no longer runs programs: `-e` and the
  running options live in `exe/drill`, and a flag that used to work there
  is answered with a pointer to `exe/ruby`/`exe/drill` (exit 64) instead
  of "invalid option"; running a program from the command line is
  `exe/ruby` (the CRuby-style CLI, which also accepts `--enable`/`--disable`
  now) or an `exe/irb` session
- The runtime runners (nodejs, Chrome/Firefox, the CDP/BiDi interfaces)
  moved to `lib/opal/drill/runners/`; the runner registry is injected into
  the CLI class, so the compiler no longer depends on them

### Removed

- `opal-repl`: the `--repl` option, the REPL CLI class, `exe/opal-repl`
  and `stdlib/opal/repl_js.rb` - `exe/irb` replaces them;
  `stdlib/opal-replutils.rb` and `opal/corelib/irb.rb` stay for the
  runners' browser-console session
- Remove `Opalfile` support: a project is marked by its `Gemfile` or
  `*.gemspec`, load paths are given by `-I`/`Builder#appendPaths`, and gem
  paths by `--gem` or gems installed from a `Gemfile`

### Performance

- Optimize `Hash#rehash` for the common case, avoid calling `$slice` when no hash collision is present (#2571)

### Fixed

- `String#{r,l,}strip`: Make them work like in MRI for non-breaking white-space (#2612)
- Compat regression fix: `Hash#to_n` should return a JS object (#2613)

### Internal

- The test matrix (`tasks/testing/*`), the benchmark tasks and the
  asciidoctor comparison drive `exe/drill` (rebuilding it to stay fresh)
  where they used `exe/opal`; mspec's `ruby_exe` probe programs spawn
  `exe/ruby` (`stdlib/rbconfig.rb` names it as `RUBY_EXE`)
- `exe_compiler.mjs` assembles the SEA fuse sentinel at runtime: a bundle
  that links it must not carry the string literally, or `node --build-sea`
  refuses a payload that already contains it
- Rename the `potch` parser to the parser: `lib/opal/parser`, `spec/lib/parser`,
  `tasks/parser`, `benchmark/parser` and the `parser` test suite (`exe/potch`
  keeps its name)
- Bump the ECMA version from 3 to 12 for ESLint (#2537)

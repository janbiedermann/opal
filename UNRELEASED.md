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

- `stdlib`: the up! network stack - `Net::HTTPServer` (evented HTTP/1.1,
  HTTP/2, HTTPS and WebSocket server over node.js, with node-cluster
  workers and pubsub), `Rack::Handler::Up` (Rack 3 handler with the
  iodine-style `rack.upgrade` WebSocket/pubsub API), and the `tempfile`
  and `cgi/escape` features; guide in `docs/http_server.md`, smoke
  drivers in `test/opal/`, rack-gem audit in `test/opal/rack_compat/`

### Removed

- Remove `Opalfile` support: a project is marked by its `Gemfile` or
  `*.gemspec`, load paths are given by `-I`/`Builder#appendPaths`, and gem
  paths by `--gem` or gems installed from a `Gemfile`

### Performance

- Optimize `Hash#rehash` for the common case, avoid calling `$slice` when no hash collision is present (#2571)

### Fixed

- `String#{r,l,}strip`: Make them work like in MRI for non-breaking white-space (#2612)
- Compat regression fix: `Hash#to_n` should return a JS object (#2613)

### Internal

- Rename the `potch` parser to the parser: `lib/opal/parser`, `spec/lib/parser`,
  `tasks/parser`, `benchmark/parser` and the `parser` test suite (`exe/potch`
  keeps its name)
- Bump the ECMA version from 3 to 12 for ESLint (#2537)

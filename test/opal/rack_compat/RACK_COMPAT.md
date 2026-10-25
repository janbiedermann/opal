# Rack gem compatibility with this tree

Audited 2026-10-23/25 against this tree's built `exe/ruby` (v3.1.0dev,
JS compiler + runtime loader with `Gem.try_activate`), with the real
rack gem installed (3.2.7, reference checkout v3.2.4). Reproduce with
`test/opal/rack_compat/syntax_check.sh` (compiles every rack lib file
with `./exe/ruby -c`) and `test/opal/rack_compat/probe_rack_runtime.rb`
(runtime surface probes; expects the rack gem installed).

## Verdict

The rack gem needs no vendoring: it transpiles as it is and runs
against this tree's loader. Every one of the 49 lib files compiles
(`exe/ruby -c`) and gem activation (`Gem.try_activate`) finds and
compiles the gem at runtime, so nothing needs bundling into any exe
ahead of time. Compiling is not the same as running, though: regexp
literals using Onigmo-only constructs pass `-c` and fail only where
the RegExp is built (gap 10). What blocks the rest are a handful of
opal platform gaps, all of them opal's, not rack's:

## Gaps found

| # | gap | where | blocks |
|---|-----|-------|--------|
| 1 | no `tempfile` feature in stdlib | stdlib | rack/utils (so: utils, query_parser chain, mock, multipart, rewindable_input, many middlewares) - the single biggest blocker - **fixed: `stdlib/tempfile.rb` now in the tree** |
| 2 | no `cgi/escape` feature (this stdlib ships it as `cgi/util`) | stdlib | rack/utils - **fixed: `stdlib/cgi/escape.rb` now in the tree** |
| 3 | `Time.httpdate`/`Time.rfc2822` class methods missing (only instance formatters exist) | stdlib/time.rb | rack/response (Date header) |
| 4 | `Regexp.union` raises TypeError on mixed flags; CRuby combines them per-part | opal/corelib/regexp.rb | rack/request's `trusted_proxies` at load - kills `Rack::Request` (GET/POST/FILES/url); also rack/lint IPv6 union |
| 5 | `String#<<` raises NotImplementedError | opal/corelib (mutable strings unsupported) | Rack::MockResponse body accumulation, ShowExceptions, multipart parser buffering |
| 6 | `StringIO#read(n, buf)` / sysread with out-string buffer unsupported | stdlib/stringio.rb | rack/rewindable_input; rack's multipart parser reads with an out-buffer too |
| 7 | `ERB#result`/`#run` missing (stdlib erb only compiles, no run) | stdlib/erb.rb | rack/show_status, rack/show_exceptions templates |
| 8 | `URI::RFC3986_Parser#make_regexp` missing | stdlib/uri/rfc3986_parser.rb | rack/lint (absolute-form constant) - **patch proven in `test/opal/rack_handler_smoke.rb`**: rebuilds the pattern from the parser's own constants, whitespace and group names dropped |
| 9 | a require that raises mid-file leaves the feature half-loaded: later requires succeed and the damage resurfaces as far-away NameErrors | runtime loader | observability only, but worth upstream |
| 10 | regexp literals are only partially translated at compile time: `opal/runtime/regexp_transpiler.mjs` rewrites `/x`, line-anchored `^`/`$` and `/m`, but `\g<name>` subexpression calls, possessive quantifiers (`++`), `{,n}` repeat ranges and hyphenated group names reach JavaScript untouched and die when the RegExp is built, at load of the defining file; the tree documents the constraint (GEMS.md §6.1, stdlib uri's header, whose patterns were hand-copied into JS form around it) and only stdlib gets that treatment, not gem code; AGENTS.md records a sibling literal bug (`'\)'` under `/u` kills addressable) | compiler / corelib regexp | rack/lint outright: its HOST_PATTERN/URI_ISH literals use all of these; any gem regex with them; `-c` syntax checks do not catch it |

Gap 4 has no JS escape hatch: node 22 lacks `(?i:...)` modifier
groups, so a fix needs flag-merging logic in `Regexp.union`, not a
source rewrite. Gap 10 likewise has no gem-side workaround: the
constructs appear inside rack's own literals, so only the compiler
(extending the regexp translation) or rack upstream (rewriting the
two regexes in JS form, as this stdlib's uri already did for itself)
can get Lint loaded.

Gaps 5 and 6 are Opal's long-standing mutable-string position, not
specific to this tree.

## What works today

With `stdlib/tempfile.rb` and `stdlib/cgi/escape.rb` in the tree
(gaps 1-2), and a 5-line `Time.httpdate` shim in the probe itself
(gap 3), the probe runs 32/45. Green (probe plus the hand-checks from
the original audit, incl. MediaType/MIME/URLMap/Builder/Sendfile/
Static/Directory): Utils (escape/parse/build/query), Headers,
QueryParser, Builder (`use`/`map`/`run`, config.ru eval), URLMap,
Cascade, Head, Lock, Runtime, CommonLogger, Config, ConditionalGet,
MethodOverride, Response (write/finish), Auth::Basic
(`unpack1('m')` works), Mock basics, TempfileReaper, and
Set/uri/time/digest/zlib/strscan/forwardable/fileutils/erb-parse all
present and working underneath. All 13 failures map onto gaps 4-8 and
their cascades: everything Request-dependent (Request itself, its
GET/POST/FILES forms, Deflater's `accept_encoding`, Events building a
Request - and gap 9 making half-loaded Request fail far from its
cause), everything String#<<-dependent (MockRequest/Response,
ShowExceptions), the out-buffer readers (RewindableInput, and
multipart's parser which reads with an out-buffer too), ERB#result
(ShowStatus) and uri/lint (Lint).

In short: the surface a rack handler and a typical app touch works;
Request needs gap 4, and Lint needs gaps 8 and 10 together.

For `Rack::Handler::Up` itself: it is self-contained (needs no rack
gem at all - it defines the handler over the Net::HTTPServer env). The
gem matters for apps running on it, and for `rack-lint` style checks;
`test/opal/rack_handler_smoke.rb` wraps its HTTP phase in Lint
automatically once Lint can load.

## Patches still proposed for the tree

1. `stdlib/time.rb`: class methods `httpdate`/`rfc2822`/`xmlschema`
   parsing+formatting (the instance formatters already exist).
2. `opal/corelib/regexp.rb`: `Regexp.union` merging per-part flags
   instead of raising.
3. `stdlib/uri/rfc3986_parser.rb`: `make_regexp`. Proven in
   `test/opal/rack_handler_smoke.rb`: rebuild the pattern from the
   parser's own grammar constants, whitespace and group names stripped
   so `Rack::Lint` can embed it.
4. gap 10, lint-load: extend the compile-time regexp translation for
   `\g<name>`/possessives/hyphenated group names, or get rack to write
   HOST_PATTERN and URI_ISH in JS form - the rewrite stdlib uri
   already did for itself.
5. optional: ERB#result in stdlib erb, StringIO#read out-buffer.

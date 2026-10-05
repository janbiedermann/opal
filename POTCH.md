# POTCH: a self-hosted Opal on the potch parser

This document is the working plan for replacing Opal's Ruby compiler (built
on the whitequark `parser` gem and running on CRuby) with a JavaScript
compiler built on **potch**, a pure-JS port of Prism 1.9.0. The result is an
Opal that parses and compiles in Node.js or the browser only, builds itself,
and accepts Ruby 4.0 syntax.

Status: **all phases done**: Opal's parser, compiler, builder and CLI are
JavaScript (their output identical to the former Ruby ones'), Opal needs
only Node.js to build itself and run every suite, and the Ruby compiler is
gone (see the phase results below). The performance
baseline has been collected in [`BASELINE.md`](BASELINE.md); section 8
summarises it.

---

## 1. Goals and decisions

| # | Decision |
|---|---|
| G1 | potch becomes Opal's **only** parser. The `parser` and `ast` gems go away. |
| G2 | The compiler is **ported to plain JavaScript** (ES modules, `.mjs`). No TypeScript. |
| G3 | The compiler runs **in Node.js or the browser only**. CRuby is not needed to build, test or use Opal. Opal bootstraps itself. |
| G4 | The compiler supports **Ruby 4.0** syntax and compile-time semantics. Corelib/stdlib stay at their current level; that is **out of scope**. |
| G5 | The CRuby gem API (`Opal::Compiler`, `Opal::Builder` etc. called from MRI) is **dropped for now**. |
| G6 | potch is **copied** (no subtree, no history) into the repo and maintained as part of Opal. Its specs run with Opal's specs. |
| G7 | Opal's existing layout is kept: the parser and compiler live in `lib/`, specs in `spec/`, tests in `test/`, rake/JS tasks in `tasks/`, docs in `docs/`. Ruby and JavaScript sit side by side as they already do. **No npm packages or workspaces.** |
| G8 | All new JavaScript uses the **`.mjs`** extension. |

Out of scope: corelib/stdlib Ruby 4.0 behaviour, updating the `spec/ruby` or
`test/cruby` submodules, publishing to npm, and keeping MRI-side gem
integrations (opal-sprockets, opal-rails, …) working.

---

## 2. Current state (summary)

* **Parser:** `parser` gem (`~> 3.0`) with the `Parser::Ruby32` grammar,
  wired in through `lib/opal/parser.rb` and `lib/opal/parser/*`
  (`WithRubyLexer`, `DefaultConfig`, `SourceBuffer`, and `patch.rb`, which
  patches the gem so it works when compiled by Opal).
* **AST:** `Opal::AST::Node < Parser::AST::Node` (s-expressions with a
  `Parser::Source::Map`), built by `Opal::AST::Builder`, with a small
  `Opal::AST::Matcher`.
* **Pipeline** (`Compiler#parse`, `lib/opal/compiler.rb:347`):
  1. `tokenize` parses and returns the AST, comments and tokens.
  2. `Opal::Rewriter` runs about 20 rewriters, inside `parse`.
  3. Comments become `@comments` (for `parse_comments`) and
     `@magic_comments`; tokens become `EofContent` (`__END__`).
  4. `Nodes::*` (about 35 files, about 135 handled node types) produce
     `Fragment`s, which become JS plus a source map.
* **Self-hosting today:** "opalopal" compiles `exe/opal` with Opal and runs
  it on Node, but the build is still started by CRuby, and the parser and
  ast gems are compiled to JS (`Opalfile`, `GEM_DEPENDENCY_PATHS`).
* **Target Ruby:** `RUBY_VERSION = '3.2.0'`, Ruby32 grammar. `spec/ruby` is
  from Sep 2023; `test/cruby` is at 3.3.0-preview2.
* **Size of `lib/`:** about 16.2k lines of Ruby:

  | Part | Lines |
  |---|---:|
  | nodes | 6,211 |
  | rewriters | 2,161 |
  | builder (`builder/`, `builder.rb`) | 1,636 |
  | cli runners | 1,634 |
  | compiler, fragment, regexp transpiler | 1,058 |
  | source map | 432 |
  | parser glue | 360 |

## 3. potch (summary)

* Pure-JS ES-module port of Prism 1.9.0 (the Ruby 4.0 grammar). About 48k
  lines with no runtime dependencies.
* Parses plain JS strings. **All offsets are UTF-16 code units**, so
  `source.slice(start, end)` is exact.
* `parseWithMetadata(code, options)` returns an envelope with `ast`,
  `comments`, `magic_comments`, `errors`, `warnings`, `data_loc`, `offsets`
  (where each line starts), `start_line` and `encoding`.
* Options are set through `pm_options_*_set`: `filepath`, `line`,
  `frozen_string_literal`, `version`, `scopes` (outer locals for `eval`),
  `partial_script`, `main_script`, …
* AST: plain objects
  `{ type, location:{start,end}, node_id, flags:[…], <named fields> }`.
  There are 137 Prism node types. Every scope carries `locals`, strings are
  already unescaped, and integers are a Number or a BigInt.
* `envelopeOffsetsToBytes` converts all offsets to UTF-8 bytes and
  pre-renders BigInt/Float values for JSON. The compiler does **not** need
  it, because Opal strings are JS strings. It stays for `exe/potch` and for
  wire formats.
* 37 test files, 8000+ cases, run with `node --test` and no Ruby. Some
  compare against `@ruby/prism` (the WASM reference parser). There is a
  benchmark harness (`bench/`) and an assemble step
  (`src/parts/*` → `src/potch.js`).
* Known open issue: a heredoc `opening_loc` is off by one in one fixture
  with many heredocs.

---

## 4. Target layout

```
lib/opal/potch/              # the parser (copied from potch/src, renamed to .mjs)
  index.mjs                  #   public API: parse, parseWithMetadata, lexWithMetadata, ...
  potch.mjs                  #   generated from parts/ (committed; checked by lint)
  parts/potch_part*.mjs      #   the parser sources that potch.mjs is generated from
  ast.mjs  convert.mjs  diagnostic.mjs  encoding.mjs  field_order.mjs  node.mjs
  options.mjs  regexp.mjs  static_literals.mjs  token_type.mjs
  util/*.mjs
lib/opal/compiler/           # the new JS compiler
  index.mjs                  #   compile(source, options) -> { code, map, ... }
  compiler.mjs               #   options, magic comments, helpers, scope/unique-name state
  fragment.mjs               #   Fragment + location
  source_map/*.mjs           #   file, index, map, vlq
  regexp_transpiler.mjs
  nodes/*.mjs                #   code generators, keyed by Prism node type
  transforms/*.mjs           #   the few AST transforms Prism does not make unnecessary
  builder/*.mjs              #   (phase 3) builder, path reader, processors, cache, DCE
  cli/*.mjs                  #   (phase 3) CLI + runners
exe/potch                    # launcher for lib/opal/potch/cli.mjs (from potch/cmd.js)
exe/opal                     # (phase 3) becomes a Node script running lib/opal/compiler/cli
spec/lib/potch/*.test.mjs    # potch specs (from potch/test)
spec/lib/potch/support/*.mjs
spec/lib/fixtures/potch/     # potch parse fixtures (from potch/test/fixtures)
spec/lib/fixtures/potch_errors/ # potch error fixtures (from potch/test/errors)
spec/lib/compiler/*.test.mjs # JS compiler specs (ported from spec/lib/*_spec.rb)
benchmark/potch/             # potch benchmarks + the compiler benchmark from section 8
tasks/potch.rake             # rake tasks while rake still exists
tasks/potch/*.mjs            # assemble.mjs, gen_field_order.mjs, gen_convert.mjs
docs/potch.md                # from potch README
docs/potch_performance.md    # from potch PERFORMANCE.md
```

Rules for the shared tree:

* **Naming collisions with Ruby files.** `lib/opal/path_reader.rb` tries
  `.js` before `.rb`, and `lib` is on Opal's load path. All new files are
  `.mjs` (not in `DEFAULT_EXTENSIONS`) and live in the new directories
  `lib/opal/potch/` and `lib/opal/compiler/`, so nothing can take over a
  Ruby `require` during the transition. `lib/opal/compiler.rb` and the
  directory `lib/opal/compiler/` can coexist.
* The only thing added to the root `package.json` is the dev dependency
  `@ruby/prism`, which the potch reference specs and benchmark use. It is
  an npm package, not a Ruby dependency.
* ESLint (`eslint.config.mjs`) gets an ES-module section for
  `lib/opal/potch/**`, `lib/opal/compiler/**`, `spec/lib/potch/**`,
  `spec/lib/compiler/**`, `tasks/**/*.mjs` and `exe/potch`.
* Licence: potch is MIT, like Opal. Its copyright line
  ("Copyright (c) 2026 Jan Biedermann") goes in a header comment in
  `lib/opal/potch/index.mjs` and in `docs/potch.md`.

---

## 5. Phases

Each phase ends with a commit series using `subsystem: summary` messages, and
all suites listed under "Done when" must be green.

### Phase 1: Copy potch into Opal

1. Copy the files as mapped in section 4. Do **not** copy `dist/`,
   `node_modules/`, `package*.json`, `eslint.config.js` or `LICENSE.md`.
2. Rename `*.js` to `*.mjs` and rewrite every relative `import` specifier,
   including the generated header in `potch.mjs`.
3. Update `tasks/potch/assemble.mjs` (paths: `lib/opal/potch/parts` →
   `lib/opal/potch/potch.mjs`) and `gen_field_order.mjs`.
4. Move `cmd.js` to `lib/opal/potch/cli.mjs`, and add `exe/potch` as a
   thin launcher that imports it. The launcher has no file extension, so
   it only uses a dynamic `import()`, which works whether Node treats the
   file as CommonJS or ESM.
5. Rewrite the spec imports (`../src/…` → `../../../lib/opal/potch/…`) and
   the fixture paths (`test/fixtures` → `spec/lib/fixtures/potch`,
   `test/errors` → `spec/lib/fixtures/potch_errors`) in
   `spec/lib/potch/**` and its `support/`.
6. Move the benchmark to `benchmark/potch/`, with its corpus in
   `benchmark/potch/corpus/` and imports fixed. Add the baseline scripts
   from `BASELINE.md` (`gen_corpus.mjs`, `bench_potch.mjs`, `bench_ruby.rb`,
   `bench_opal_node.rb`), with their potch import path updated to
   `lib/opal/potch/index.mjs`.
7. Add `@ruby/prism` as a dev dependency in the root `package.json`, then
   run `bin/yarn install`.
8. Add rake tasks in `tasks/potch.rake`:
   * `potch`: `node --test spec/lib/potch/`
   * `potch:assemble`, `potch:assemble_check`, `potch:bench`

   Add `potch` to the default task and to the Node.js task list in
   AGENTS.md. Add `potch:assemble_check` plus the ES-module ESLint section
   to `lint`.
9. Docs: `docs/potch.md` and `docs/potch_performance.md`, with commands
   updated to the rake tasks. Add an AGENTS.md entry for the layout and the
   test commands.

**Done when:**
* `bin/rake potch` passes the same 8000+ cases as `npm test` did in
  `../potch`.
* `bin/rake lint` is clean.
* `exe/potch -e '1'` prints the same envelope as `../potch/cmd.js`.
* The existing suites are unaffected.

### Phase 2: JS compiler core (`lib/opal/compiler/`)

The goal: `compile(source, options)` in JS reads potch's Prism AST directly
(no parser-gem translation) and produces JS that behaves the same as the
current Ruby compiler's output, plus Ruby 4.0 syntax.

**2.1 Infrastructure**
* `compiler.mjs` ports `lib/opal/compiler.rb`:
  * Compiler options keep their current names and defaults. Magic comments
    are read from `envelope.magic_comments`, limited to the comments before
    the first statement.
  * Requires, required trees, autoloads, helpers, method calls and
    `eof_content` come from `envelope.data_loc`.
  * Syntax errors become a `SyntaxError`-like error with file, line and
    source line. Line numbers are computed from `envelope.offsets` with a
    binary search.
* `parse_comments` maps comments to the next `def` using the offsets.
* `fragment.mjs` and `source_map/*` (VLQ, map, index) are straight ports.
  `regexp_transpiler.mjs` is ported with a fix for POSIX bracket classes
  such as `[[:print:]]`. Under Opal today they become `\p\{…\}`, which JS
  rejects; this is why s3 fails on Node in `BASELINE.md`.
* Locations stay as UTF-16 offsets. Line and column are computed lazily
  through the line table. Source-map columns are UTF-16, which is what
  source map v3 consumers expect.

**2.2 Code generators.** The `Base` class (scope stack, `push`, `wrap`,
`helper`, `expr`/`stmt`/`recv`, unique variable names) is ported first. Then
the Prism node types are ported in roughly this order, each with specs:

1. Literals (`Integer` including BigInt, `Float`, `Rational`, `Imaginary`,
   `String`/`InterpolatedString`/`XString`, `Symbol`, `Regexp` including
   `/x` and `/o`, `Array`, `Hash`, `Range`, `nil`/`true`/`false`/`self`,
   `__FILE__`/`__LINE__`/`__ENCODING__`) and variables (local, instance,
   class, global, numbered/back references, constants and constant paths,
   with all their write forms).
2. Calls (`CallNode` with every flag, safe navigation `&.`, attribute and
   index writes, `super`/`zsuper`, `yield`, splat, block pass, keyword
   arguments, `**nil`) and the special calls currently in `nodes/call/*`
   (`require`, `require_relative`, `autoload`, `JS` properties, eval, DCE
   markers, reflection, `=~` with named captures → `MatchWriteNode`).
3. Definitions: `def`/`defs`/endless `def`, `class`/`module`/`sclass`,
   `alias`/`undef`, and every parameter kind (`ParametersNode`, required,
   optional, rest, post, keyword, keyword-rest, block, `...` forwarding,
   anonymous `*`/`**`/`&`, `NoKeywordsParameterNode`), including the arity
   checks and kwargs extraction from `nodes/args/*`.
4. Blocks and lambdas: `BlockNode`, `LambdaNode`,
   `NumberedParametersNode`, `ItParametersNode`, shadow arguments, and the
   iter-arg handling from `block_to_iter`, `inline_args` and `mlhs_args`.
5. Control flow: `if`/`unless`/ternary, `case`/`when`, `while`/`until`
   (including `begin…end while`), `for`, `break`/`next`/`redo`/`retry`/
   `return`, `and`/`or`/`not`, flip-flops, `defined?`.
6. Exceptions: `begin`/`rescue`/`else`/`ensure`, rescue modifiers, and
   `retry`.
7. Multiple assignment: `MultiWriteNode` and `MultiTargetNode`, splats,
   nested targets.
8. Pattern matching: `case`/`in`, `=>`, `in`, and every pattern node (array,
   find, hash, alternation, capture, pinned expression/variable).
9. Opal-specific features: backtick JavaScript and `%x{}` (with the current
   semicolon and newline rules), `# backtick_javascript:` and other magic
   comments, `await` (`async_await`), `opal_runtime_mode`, `use_strict`,
   `__END__`/`DATA`, ERB templates (`Opal::ERB` compiler front end), the
   rubyspec filters rewriter, and the JS reserved-word handling.

**2.3 AST transforms.** The rewriters are reviewed one by one against the
Prism AST. Expected outcome:

| Rewriter | Fate |
|---|---|
| `binary_operator_assignment`, `logical_operator_assignment` | **Dropped**: Prism has `*OperatorWriteNode`, `*OrWriteNode` and `*AndWriteNode` for every target kind; the code generators handle them |
| `numblocks` | **Dropped**: `NumberedParametersNode` and `ItParametersNode` |
| `forward_args` | **Dropped**: `ForwardingParameterNode` and `ForwardingArgumentsNode` |
| `for_rewriter` | Moved into the `ForNode` code generator |
| `block_to_iter`, `dot_js_syntax` | Moved into the `CallNode` code generator |
| `inline_args`, `mlhs_args`, `arguments`, `dump_args`, `deduplicate_arg_name` | Reworked into argument preparation for `ParametersNode` (`locals` replaces the name bookkeeping) |
| `returnable_logic`, `thrower_finder` | Kept as small JS passes or folded into the code generators |
| `pattern_matching` | Kept, ported against the Prism pattern nodes |
| `js_reserved_words`, `opal_engine_check`, `targeted_patches`, `hashes/key_duplicates_rewriter`, `rubyspec/filters_rewriter` | Kept as JS passes (`transforms/`) |

**2.4 Ruby 4.0 compile-time features** (from 3.2 onwards; potch's
`spec/lib/fixtures/potch/{3.3-3.3,3.4,4.0}` are the reference):
* `it` as the implicit block parameter (`ItParametersNode`), including
  `it` reads, writes and indirect writes.
* Anonymous `*`, `**` and `&` forwarding, including the restrictions on
  using them inside blocks.
* Keyword-splatting `nil` (`**nil`) at call sites.
* Circular parameter defaults are errors (`def foo(bar = bar)`). potch
  already reports this; it only needs surfacing.
* Block and keyword arguments in index assignment are rejected. potch
  already rejects them; this needs a spec.
* `*nil` in splats no longer calls `nil.to_a` (4.0).
* Leading `&&`, `||`, `and` and `or` on a new line continue the expression
  (4.0, parser only; needs a spec).
* Endless method definitions with a command-call body
  (`private def foo = puts "Hello"`).
* String literals are "chilled": they warn on mutation unless a magic
  comment says otherwise. Opal strings are immutable, so the compiler keeps
  treating them as frozen; only `frozen_string_literal` handling needs
  review.
* `RUBY_VERSION`, `RUBY_ENGINE_VERSION` and the `version` option passed to
  potch are set to 4.0 for the compiler. Corelib is unchanged (G4).

The list is checked against Prism's changelog before phase 2 closes; any
other syntax change gets a spec.

**2.5 Validation harness**
* `tasks/potch/compare.mjs` and `bin/rake compiler:compare` compile every
  file in `opal/`, `stdlib/`, `spec/opal/`, `test/opal/` and the
  `spec/ruby` files listed in `spec/ruby_specs` with **both** compilers.
  They report files where the new compiler fails, and output diffs after
  normalising variable names and whitespace. The JS output does not have
  to match byte for byte; the diff is a triage tool.
* A **temporary** bridge: `Opal::Compiler` can run
  `node lib/opal/compiler/cli.mjs` in a subprocess when `OPAL_JS_COMPILER=1`
  is set. That lets the existing Ruby-driven `mspec_*` and `minitest_*`
  tasks run against the new compiler's output before the JS builder exists.
  The bridge is removed in phase 5.
* `spec/lib/compiler_spec.rb` and the `spec/lib/rewriters/*` specs are
  ported to `spec/lib/compiler/*.test.mjs` (run with `node --test`), with
  expectations rewritten from s-expressions to JS output or behaviour where
  the AST shape changed.

**Done when:**
* `compiler:compare` shows no compile failures.
* With `OPAL_JS_COMPILER=1`, `mspec_nodejs` and `minitest_nodejs` pass,
  with no new entries in `spec/filters` beyond documented differences in
  Prism semantics.
* The compiler specs and the Ruby 4.0 specs pass.
* Compiler throughput meets the targets in section 8.

#### Phase 2 results

**How it was built.** The code generators are ports of `lib/opal/nodes/*`
working on Prism nodes. Where the Ruby compiler depends on the parser gem's
tree shape, small passes over the Prism tree (`lib/opal/compiler/
transforms/`) reproduce it: `normalize` (if/unless, begin/rescue/ensure,
`__FILE__`/`__LINE__`/`__ENCODING__`), the engine check, `for` loops,
targeted patches, the `.JS` syntax, pattern matching, operator
assignment, returnable logic (`case`/`&&`/`||` into if-chains), the
thrower finder and the rubyspec filters. The argument rewriters are a
planning step (`nodes/args.mjs`). String literals are re-read from the raw
source where potch's value isn't enough (`string_literal.mjs`): bytes
that aren't valid UTF-8, binary sources, and the per-line split of
multi-line literals.

**Checks.**
* `tasks/compiler/compare.mjs` compiles files with both compilers and
  compares the output; `spec/lib/fixtures/compiler` (59 fixtures) keeps
  the Ruby compiler's output as expected results for `bin/rake compiler`.
* Output comparison over 12,753 files (`lib`, `spec/opal`, `test/opal`,
  `spec/ruby`, `test/cruby`, `benchmark`, `examples`): 99.4 % identical
  (12,665+), the JS compiler fails on none; opal/ and stdlib/ (201 files)
  are 100 % identical. The rest are the intended differences below, Ruby
  compiler bugs (e.g. broken JS for `redo` in a `for` loop), sources in
  non-UTF-8 encodings, and a few exotic tool files.
* `spec/lib/compiler`: 153 specs, including the port of
  `spec/lib/compiler_spec.rb` and the source-to-source examples of the
  rewriter specs.
* The temporary bridge (`OPAL_JS_COMPILER=1`, `lib/opal/js_compiler_bridge.rb`
  + `tasks/compiler/bridge_server.mjs`) lets the Ruby builder compile with
  the JS compiler. All Node.js suites pass with the same results as with
  the Ruby compiler: `mspec_opal_nodejs` 684 examples, 0 failures;
  `mspec_ruby_nodejs` 14,619 examples, 0 failures; `minitest_cruby_nodejs`
  208 runs, 717 assertions, 0 failures, 29 skips; `minitest_node_nodejs`
  80 runs, 0 failures.
* Performance (`BASELINE.md`, "The JS compiler"): 6–10× faster than the Ruby
  compiler on CRuby for the real files; every corpus file compiles;
  scaling is linear (s6 1.1× s5 per kB). The synthetic many-strings and
  many-methods files are at 3.0× and 2.9× s5 per kB (target ≤ 3×), mostly
  from the transform passes, which each walk the whole tree; merging or
  speeding up those walks is the next optimization. Parse share on s5:
  20 %. Chains of up to about 1,500 method calls compile (the JS stack is
  the limit).

**Intended differences from the Ruby compiler**
* `it` (Ruby 3.4) is the implicit block parameter; the Ruby compiler made
  it a method call. `**nil` passes no keywords and `def m(a = a)`
  defaults `a` to nil (Ruby 3.4).
* `_1` outside a block is a method call (NameError at runtime), not a
  bare JS variable.
* Code the parser gem accepted but Ruby rejects (e.g. a variable capture
  in an alternative pattern) is a syntax error; some constructs the Ruby
  compiler crashed on (e.g. `/#@x/`) compile.
* Source maps: positions of compiler-generated nodes point at the
  construct they come from, generated columns are UTF-16 code units.
* Temp counters (`$logical_op_recvr_tmp_N`, `$for_tmpN`, ...) restart for
  every file (the Ruby compiler kept them per process).
* potch works on JS strings: raw bytes in a source that aren't valid
  UTF-8 become U+FFFD; sources in other encodings are decoded by the
  builder (magic comment). Since then, string literals in ISO-8859-1 and
  US-ASCII sources get their source encoding and bytes, and `__ENCODING__`
  the source encoding, as in CRuby (see docs/encoding.md).

**Ruby compiler bugs kept for parity, fixed after phase 5** (each with a
fixture and specs):
* `/a b/x` on a single line was not trimmed (only multi-part regexps were,
  removing whitespace in character classes and escapes too). Extended
  regexps are handled by the regexp transpiler now, at compile time and at
  runtime (`Regexp.new(src, Regexp::EXTENDED)` works too).
* `break a, b` kept only `a`; it returns `[a, b]` (a single splat returns
  an array, also for next and return).
* `value => pattern` evaluated `value` twice; once now.
* `eval` with an assignment to an outer local shadowed it instead of
  assigning it; Kernel#eval with a binding (Binding#eval) now uses the
  binding's locals too.
* A top-level `return`, `BEGIN { }` and `END { }` were not supported; they
  are now.
* (`redo` in a loop, broken JS in the Ruby compiler, was already right.)

These fixes also let 34 filtered ruby/spec examples run (14 of them had
passed since the switch to potch and the JS compiler).

**Also fixed in potch:** escaped non-ASCII bytes in `/.../n` regexps
(`/\xff/n`) were reported as an encoding mismatch.

### Phase 3: JS builder, CLI and the in-browser compiler

1. Port to `lib/opal/compiler/builder/`:
   * `Builder`, `PathReader`/`hike`, the builder processors (`.rb`, `.js`,
     `.mjs`, `.opalerb`, `.erb`), the `require`/`require_tree`/`autoload`
     resolution, `Opalfile`/`Project`, the cache, the DCE post-processor and
     the ESM/CJS output modes.
   * `Opalfile` loses `add_gem_dependency` (no gems).
   * Decided: the builder is single-threaded (with a file cache) for now.
   * **TODO (undecided):** a forking builder, the counterpart of the Ruby
     builder's prefork scheduler: compile files in parallel with
     `worker_threads` (or child processes), keeping the output order
     deterministic as the scheduler's OrderCorrector does. Investigated on
     2026-10-05 with a prototype worker pool (8-core Ryzen 7 5700G with
     SMT, Node.js 22; cold builds without the file cache, compile plus
     source map):

     | build | files | sequential | 2 workers | 4 workers | 8 workers |
     |---|---:|---:|---:|---:|---:|
     | minimal app (corelib) | 75 | 526 ms | 417 | 334 | 349 |
     | stdlib-heavy app | 110 | 788 ms | 598 | 470 | 494 |
     | ruby/spec bundle | 2,579 | 4,536 ms | 3,374 | 2,405 | 2,088 |

     * IPC is cheap: a round trip with the source and a result of code and
       map (as a JSON string) takes ~30 µs for 0.2–10 KB files (1.4 ms at
       300 KB), 2–6 % of their compile time.
     * The costs are elsewhere: worker startup (70–100 ms until the pool is
       ready), the JIT warm-up of each worker (two thirds of a small cold
       build: the corelib compiles in 485 ms cold, 172 ms hot), and CPU
       contention (with 4 workers each is 1.3–1.5× slower than alone, with
       8 1.9–2.6×; 8 workers spend ~15 s of CPU on the 4.5 s ruby/spec
       build). Small builds are fastest with 4 workers.
     * Dependency discovery is no limit (knowing all files up front gives
       the same times).
     * With a warm file cache only changed files compile (the minimal app
       builds in 256 ms through the CLI, against 740 ms without cache), so
       a pool would only add its startup.
     * Conclusion so far: the use case is a resident compiler (server
       runner, watch-style rebuilds, test tasks) whose workers stay warm;
       a single project build is better off sequential. If built: start
       the pool only after many cache misses, at most 4 workers for typical
       builds, results as strings, `--plugin` modules loaded in the workers
       too, and an async build API (CLI runners, opal-builder).
   * ~~**TODO:** the `.rb.erb` and `.js.erb` processors~~ (done): templates
     are translated to Ruby (`erbToRuby` in `lib/opal/compiler/erb.mjs`) and
     run in Opal: in a worker thread with the nodejs stdlib during a Node.js
     build (`builder/erb_runner.mjs`), in the running Opal otherwise
     (`opalErbRunner`, also `Opal::ERB.render` in opal-parser, browsers
     included). The output matches Ruby's ERB.
2. Port to `lib/opal/compiler/cli/`:
   * the CLI and its options
   * runners: Node first; then the browser runners (Chrome/Firefox/Safari/
     Edge, via CDP or WebDriver from Node), Deno, Bun and QuickJS
   * `Server`/`SimpleServer` and the REPL, once the runners are done
3. `exe/opal` becomes a Node script with the same flags.
4. **opal-parser.** `stdlib/opal-parser.rb` keeps its Ruby API (`Kernel#eval`,
   `Opal.compile`, `Opal.eval`, `require_remote`, `text/ruby` script tags),
   but delegates to `lib/opal/compiler/index.mjs`. `eval` with a binding
   passes the binding's locals as potch `scopes`. The builder learns to
   inline `.mjs` modules into a CJS/IIFE bundle (a small internal ESM
   linker; no esbuild dependency). `lib/opal/parser/patch.rb`, the racc
   stdlib and compiling the parser/ast gems all go away.
5. Port the remaining RSpec specs (`spec/lib/builder*`, `cli*`, `paths`,
   `project`, `source_map`, …) to `spec/lib/compiler/**/*.test.mjs`.

**Done when:**
* `exe/opal` on Node, with no CRuby involved, runs `mspec_nodejs` and
  `minitest_nodejs` green.
* The browser runners pass the same suites as today.
* `opal-parser` `eval` works in Node and Chrome.

#### Phase 3 progress

Done:
* **Builder** (`lib/opal/compiler/builder/`): path reader and file finder,
  processors (`.rb`, `.opal`, `.js`, `.mjs`, `.opalerb`), `require`/
  `require_tree`/`autoload` resolution, projects and the Opalfile, a file
  cache (`~/.cache/opal-js`, `OPAL_CACHE_DIR`), DCE and the directory output
  mode. Its output, source maps and DCE results included, is byte-identical
  to the Ruby builder's.
* **ESM linker** (`builder/esm_linker.mjs`): `.mjs` files with import/export
  statements are linked with their imports into one script whose exports go
  to `Opal.esm[name]`. It needs an import graph without cycles (the
  compiler had one, now removed).
* **CLI** (`lib/opal/compiler/cli/`): all options, the runners (nodejs,
  compiler with `--watch`, server, deno, bun, quickjs, gjs, chrome, firefox,
  safari, applescript), `--compile-to-exe`, `--sexp` (prints the Prism
  tree), `--debug-source-map` and the REPL. `exe/opal`, `exe/opal-repl`,
  `exe/opal-build` and `bin/opal` are Node scripts; the Ruby CLI remains as
  `bin/opal-rb` until phase 5.
* **opal-parser** keeps its Ruby API (`Opal::Compiler`, `Kernel#eval`,
  `Opal.compile`, `Opal.eval`, `require_remote`, `text/ruby` scripts,
  `Opal::ERB`) on top of the linked JS compiler; **opal-builder** wraps the
  JS builder (Node.js only).
* `bin/rake dist` (`tasks/dist.mjs`) builds corelib and stdlib with the JS
  builder.
* The test tasks run `exe/opal` with no Ruby compiler involved:
  mspec_opal_nodejs 684 examples, mspec_ruby_nodejs 14,612, minitest_cruby_
  nodejs 208 runs (29 skips), minitest_node_nodejs 80 runs, all with 0
  failures. Seven ruby/spec examples that expect pre-3.4 parser behaviour
  (circular argument references, parse.y messages) are filtered in
  `spec/filters/unsupported/ruby40.rb`.

CLI changes:
* `-q` is now `--plugin MODULE`: a JS module imported before compiling,
  whose default export gets the CLI (the test tasks use
  `tasks/testing/mspec_special_calls.mjs` to set the rubyspec filters).
  Ruby-context requires (`--rbrequire`) don't exist anymore.
* `--gem` is ignored with a warning (no gems in Node.js); the Opalfile's
  `add_gem_dependency` likewise.
* The miniracer runner (a Ruby gem) is gone.
* opalopal (the Ruby CLI compiled with Opal) and its test tasks are removed;
  the self-hosted JS compiler replaces it. `stdlib/nodejs/opal-paths.rb.erb`
  (its gem paths) is gone.

* Browser runners: on Chrome 154 (headless shell) and Firefox ESR 128,
  mspec_opal 684 examples, mspec_ruby 16,292 and minitest_cruby 208 runs
  pass with 0 failures and 0 errors.
* Specs: `spec/lib/compiler/builder.test.mjs` and `cli.test.mjs` port the
  builder, processor, path reader, project, post-processor, DCE, CLI,
  runner, server and REPL RSpec specs (`bin/rake compiler`: 245 specs).
  The builder takes `postProcessors` (functions `(processed, builder) =>
  processed`; DCE by default) as the counterpart of
  `Builder::PostProcessor`.

Remaining:
* Safari and the applescript runner are untested (macOS only).
* The Firefox runner talks CDP, which Firefox removed in version 129 (only
  WebDriver BiDi remains); it works with Firefox ESR 128. Moving it to
  BiDi is a separate task (the Ruby runner had the same limitation).
* ~~opal-builder bundles the compiler twice~~ (done: linked modules live in
  `Opal.$$esm_registry` and each is linked once per build; opal-builder went
  from 3,276 to 1,680 kB).

### Phase 4: Self-bootstrap

1. Corelib, runtime and stdlib are built by the JS compiler only.
2. The test drivers move off Ruby: `tasks/*.mjs` scripts replace the
   rake/mspec/minitest drivers (the suites themselves already run inside
   Opal).
3. Minimal bootstrap check: a clean checkout plus `node` and `bin/yarn
   install` can build Opal and run every suite.

**Done when:** `node tasks/test.mjs` (or the equivalent) runs every Node
suite with no `ruby` binary on `PATH`.

#### Phase 4 results

Done:
* `node tasks/test.mjs` runs every Node.js suite (potch, compiler,
  mspec_opal, mspec_ruby, minitest_cruby, minitest_node), selected suites,
  given spec/test files (`bin/test` uses it) or a browser runner (`-R`).
  `tasks/testing/{mspec,minitest}.mjs` port the Ruby drivers;
  `tasks/testing/http_server.mjs` replaces the Sinatra server of the
  open-uri tests. The rake test tasks call it.
* `node tasks/lint.mjs` runs ESLint on potch, the JS compiler and the
  built corelib/stdlib; `node tasks/dist.mjs` builds corelib and stdlib.
* `bin/yarn` is a shell script; `bin/test` a Node script.
* Bootstrap check: a fresh clone (submodules initialized) with no `ruby` on
  `PATH` and an empty compile cache: `bin/yarn install`, then
  `node tasks/test.mjs` passes every suite (potch 8,463, compiler 246,
  mspec_opal 684, mspec_ruby 14,612, minitest_cruby 208 runs, minitest_node
  80 runs, 0 failures) and `node tasks/dist.mjs` builds all of corelib and
  stdlib.

Still on Ruby until phase 5: RSpec (`spec/lib/**/*_spec.rb`, it tests the
Ruby compiler), RuboCop, `bin/rake` itself, `bin/format-filters`,
`bin/remove-filters`, `bin/git-submodule-fast-install`, the benchmark and
performance tasks and the SauceLabs browser test.

### Phase 5: Remove the Ruby compiler

* Delete:
  * the Ruby compiler: `lib/opal/{compiler,parser,rewriter,fragment,
    regexp_transpiler,magic_comments,eof_content,…}.rb`, `lib/opal/nodes`,
    `lib/opal/rewriters`, `lib/opal/ast`, `lib/opal/parser/`
  * the Ruby builder and CLI
  * the temporary bridge
* Remove from the repo:
  * `opal.gemspec`, `Gemfile`/`Gemfile.lock`
  * the RSpec suite under `spec/lib/**/*_spec.rb`
  * the Rakefile and `tasks/*.rake`, once every task has a JS replacement
* Update `bin/setup`, AGENTS.md, HACKING.md, CONTRIBUTING.md and README for
  the Node-only workflow.

#### Phase 5 results

Opal is Node.js-only: no Ruby file remains in `lib/`, and neither a
Gemfile, gemspec, Rakefile nor rake task.

Moved (Ruby that Opal programs load at runtime, same require paths):
`lib/opal/regexp_{transpiler,anchors}.rb` to `opal/opal/` (corelib uses
them), `lib/opal/source_map*.rb` (the opal-source-maps library) and
`lib/opal/version.rb` to `stdlib/opal/`.

Deleted: the Ruby compiler, parser, rewriters, builder, CLI, runners, cache,
the bridge and `lib/tilt`; the RSpec suite and its helpers and fixtures;
`opal.gemspec`, `Gemfile`, the Rakefile and `tasks/*.rake`; `bin/rake`,
`bin/console`, `bin/opal-rb`; `config.ru`, `Guardfile`, `.rspec`,
`.yardopts`, `.overcommit.yml`; the compiler comparison tools
(`tasks/compiler/compare.mjs` and the Ruby oracle); the rack, rack-esm and
sinatra examples (they needed the gem).

Ported to Node.js before deleting:
* specs for what RSpec covered beyond the Ruby compiler: source maps
  (`spec/lib/compiler/source_map.test.mjs`), require resolution, the dist
  build (`dist.test.mjs`); the compiler fixtures are now regenerated by the
  JS compiler (`tasks/compiler/update_fixtures.mjs`; the `.potch.js`
  expectations became the `.js` ones)
* `bin/format-filters` (same output as the Ruby version),
  `bin/remove-filters`, `bin/git-submodule-fast-install`, `bin/setup`,
  `bin/opal-benchmark-ips`
* `tasks/bench.mjs` (benchmarks of `.rb` and benchmark-driver `.yml` files on
  the runners and optionally CRuby, reports; benchmark-ips through
  `BENCHMARK_IPS_LIB`), `tasks/performance.mjs` (the Asciidoctor comparison;
  its output is identical to CRuby's), `tasks/release.mjs` (changelog from
  the GitHub releases, release preparation, asset upload)
* the CI workflow (Node.js jobs: Linux on Node 22 and 24, macOS, Windows,
  Chrome, Firefox ESR 128, Bun, Deno, Safari, strict mode, timezone, lint,
  performance)
* AGENTS.md, README.md, HACKING.md and the docs. The guides for gem-based
  integrations (sprockets, rails, sinatra, roda, rspec, jquery, configuring
  gems) are marked as Opal 1.x.

Also fixed on the way: MSpec's benchmark mode (`BM=`) never wrote its
results (the formatter exits before the next `:finish` action).

Still possible with Ruby, but optional: RuboCop on the Ruby code
(`.rubocop.yml`), `node tasks/bench.mjs run --ruby`.

Later:
* ~~fix the Ruby compiler bugs kept for parity~~ (done, see "Phase 2 results")
* ~~optimize the transform tree walks~~ (done: 3–9× faster, see BASELINE.md)
* move the Firefox runner to WebDriver BiDi (Firefox 129+ has no CDP)
* the TODO of phase 3: the forking builder, undecided (investigated: worth
  it for a resident compiler, not for single builds; the `.rb.erb`/`.js.erb`
  processors and bundling the compiler once in opal-builder are done)

---

## 6. Testing strategy

| Suite | Location | Runs on | When |
|---|---|---|---|
| potch specs | `spec/lib/potch/*.test.mjs` | `node --test` | from phase 1 |
| JS compiler specs | `spec/lib/compiler/**/*.test.mjs` | `node --test` | from phase 2 |
| Old vs new compiler comparison | `tasks/potch/compare.mjs` | Node + CRuby | phases 2–3 only |
| Opal specs | `spec/opal` | mspec on Node and browsers | throughout |
| ruby/spec | `spec/ruby` via `spec/ruby_specs` | mspec | throughout |
| CRuby tests | `test/cruby`, `test/opal` | minitest | throughout |
| Node integration | `test/nodejs` | minitest | throughout |

The current RSpec suite stays green until phase 5 to protect the reference
implementation.

---

## 7. Risks and open questions

* **Prism vs parser-gem semantics.** Some constructs come out differently
  (e.g. `BEGIN`/`END`, `__ENCODING__`, regexp encodings, heredoc dedenting,
  string escapes, numbered-parameter scoping). Each one found becomes a
  spec, a fix, or a documented filter entry.
* **potch bugs.** potch has never been tested on this many real files. The
  known heredoc `opening_loc` off-by-one could hurt source maps and
  x-strings. potch fixes are made in `lib/opal/potch/parts/*` and checked by
  `potch:assemble_check` and the potch specs.
* **Source text and offsets.** Opal reads raw source text for x-strings,
  regexps and iter args. With UTF-16 offsets this becomes
  `source.slice(start, end)`, which is simpler than today but must be
  checked with non-ASCII sources (there are potch specs for this).
* **BigInt.** potch returns big integers as BigInt. The code generator has
  to emit them the way Opal does today (`Integer` literal limits, the
  `bignum` stdlib) and never pass a BigInt where a Number is expected.
* **Browser bundle size** of `opal-parser`. potch plus the compiler versus
  today's compiled parser gem is measured in phase 3. The goal is smaller.
* **ESM linker in the builder** (phase 3). It must handle potch's
  import/export cycles. The fallback is a prebuilt single-file potch made
  by `potch:assemble`; that is still in-repo, not a dependency.
* **Ecosystem break.** Dropping the gem API breaks opal-rspec,
  opal-sprockets, opal-rails and other gems until they move to the Node
  tooling. This was accepted (G5).
* **Performance** of the JS compiler running on Node versus the Ruby
  compiler on CRuby; see section 8.

---

## 8. Performance baseline

The full numbers, methodology and scripts are in **[`BASELINE.md`](BASELINE.md)**.
The corpus is potch's benchmark samples: s0–s6 plus the synthetic stress
files, 201 B to 2.5 MB. In summary (warm medians, ms):

| file | CRuby total | Node total (today's opal-parser) | potch parse alone |
|---|---:|---:|---:|
| s2_pack.rb (6 kB) | 16.55 | 151.29 | 1.25 |
| s3_34kb.rb | 95.04 | FAIL (regexp transpiler) | 4.64 |
| s4_114kb.rb | 411.57 | 9,885.88 | 8.09 |
| s5_639kb.rb | 1,868.30 | FAIL (too slow) | 44.78 |
| s6_mega_2.5mb.rb | 8,428.12 | FAIL (too slow) | 187.45 |

Key facts:
* On CRuby the time splits about evenly between parse, rewrite and code
  generation.
* potch parses 11–20× faster than the parser gem on files of 30 kB or more.
* Today's Node-hosted compiler is 7–9× slower than CRuby on small files,
  24–117× slower on larger ones, and cannot finish the largest files.

### Targets for the JS compiler (phase 2 exit; re-measured with the same corpus)

* **Correctness first:** every corpus file compiles, including s3, which
  fails today on Node.
* **Total compile on Node ≤ CRuby total** in `BASELINE.md` for every corpus
  file of 30 kB or more. Stretch goal: 2× faster.
* **Linear scaling:** time per kB for s6 stays within 1.5× of s5. No
  synthetic file may be more than 3× slower per kB than s5; today
  `synth_many_locals` is about 4× slower per kB than s5 on CRuby.
* **The parse share stays small:** potch takes at most 25 % of the JS
  compiler's total time for the real files.
* `benchmark/potch/compiler.mjs` (phase 2) runs the same corpus with the
  JS compiler and prints a table in the same format as `BASELINE.md`.

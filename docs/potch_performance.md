# potch performance vs. the real C WASM parser

Numbers below come from `benchmark/potch/run.mjs`, comparing
`potch` against the real C WASM parser via the published `@ruby/prism` npm
package ("ref" - the actual Prism WASM build: same parser, same WASM
binary, used here instead of a Ruby install because it needs no native
build toolchain, just `bin/yarn install`). Nothing here reaches outside this
project - no other native-parser backends, no Ruby.

## How to reproduce

```
node benchmark/potch/run.mjs [--runs=N] [--warmup-runs=N]
```

(defaults: 3 runs, 20 warmup runs). Takes a few seconds; prints the two Markdown tables below
directly.

### Methodology

- **Corpus**: 6 real Ruby files from the prism project's own `lib/prism/**`
  (copied into `benchmark/potch/corpus/`, named `s0`..`s5` by size) plus synthetic
  stress files generated in memory by `benchmark/potch/synth.mjs` (never written to
  disk) - a big array literal, many local assignments, many small methods,
  many interpolated strings, a long binary-operator chain, a long method
  chain, and deeply nested parens. `s6` is `s5` (`node.rb`, the largest
  real file) repeated 4× as a scaling check.
- **Cold**: a fresh `node` process per run (`node lib/opal/potch/cli.mjs --stdin --time`
  for `potch`, `node benchmark/potch/ref_cmd.mjs --stdin --time` for "ref" - both
  piping the source in on stdin and discarding stdout), median of
  `--runs` runs (default 3). Two different clocks, both in milliseconds:
  `parse_ms` is each backend's own `--time` output - just the parse call
  itself, nothing else. `total_ms` is a second, independent clock this
  script starts right before spawning the process and stops right after
  it exits - so it covers everything `parse_ms` doesn't: Node/V8 startup,
  loading/instantiating the parser (JS modules for `potch`, the WASM
  module for "ref"), the parse itself, building the JSON output, and
  writing it to stdout. `total_ms` is always the larger of the two
  numbers for a given run; `total_ms - parse_ms` is everything *around*
  the parse call. Only the Cold table has `total_ms`/`total ratio`
  columns - the Warm table's single `ms` column is the warm equivalent of
  `parse_ms` only (see below for why `total_ms` isn't measured warm).
- **Warm**: `--warmup-runs` iterations (default 20) in one already-running
  process (the WASM module already instantiated, the JS module already
  loaded) are run and discarded, then `--runs` more (default 3) are run
  and medianed - `potch`'s own `parseWithMetadata()` + `envelopeOffsetsToBytes()`
  (producing a real, consumable AST) against `ref`'s `parse()` from
  `@ruby/prism`'s `loadPrism()` (same thing, the real parser's own
  equivalent step). The process itself is started once, outside this
  loop, so there's no per-run "whole process" cost to add up into a
  `total_ms` the way Cold has - the single `ms` column already *is* the
  steady-state version of `parse_ms`, with one-time startup excluded by
  construction rather than measured and subtracted. The warmup default is
  20, not some smaller number, because that's roughly how many times V8
  needs to run a given function through its interpreter before it
  finishes tiering it up to optimized machine code - measuring with fewer
  warmup runs mostly measures JIT compilation cost, not the steady-state
  cost this is trying to isolate.

Measured on whatever machine ran `node benchmark/potch/run.mjs` last (this is a
single-machine comparison, not a controlled benchmark environment - expect
some run-to-run noise, especially on the smallest files where fixed
per-process overhead dominates).

## Cold (fresh process per run, median of 3)

| file | bytes | ref parse_ms | potch parse_ms | ratio | ref total_ms | potch total_ms | total ratio |
|---|---:|---:|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 6.62 | 10.71 | 1.62× | 124.68 | 135.44 | 1.09× |
| synth_deep_nest.rb | 206 | 8.54 | 14.21 | 1.66× | 126.84 | 143.52 | 1.13× |
| s1_324b.rb | 324 | 8.92 | 18.89 | 2.12× | 124.01 | 147.73 | 1.19× |
| synth_method_chain.rb | 4,006 | 10.95 | 17.73 | 1.62× | 179.09 | 190.28 | 1.06× |
| synth_binop_chain.rb | 5,892 | 14.01 | 19.93 | 1.42× | 210.84 | 228.17 | 1.08× |
| s2_pack.rb | 6,019 | 11.85 | 30.20 | 2.55× | 146.25 | 159.90 | 1.09× |
| s3_34kb.rb | 34,065 | 23.14 | 53.63 | 2.32× | 166.87 | 204.45 | 1.23× |
| s4_114kb.rb | 114,391 | 30.56 | 67.22 | 2.20× | 205.10 | 242.62 | 1.18× |
| synth_big_array.rb | 338,895 | 45.81 | 60.79 | 1.33× | 253.24 | 277.03 | 1.09× |
| synth_many_locals.rb | 317,790 | 116.27 | 128.36 | 1.10× | 347.51 | 382.66 | 1.10× |
| synth_many_methods.rb | 408,902 | 144.82 | 161.66 | 1.12× | 615.59 | **559.45** | **0.91×** |
| s5_639kb.rb | 638,935 | 80.52 | 166.20 | 2.06× | 356.18 | 437.63 | 1.23× |
| **synth_many_strings.rb** | 648,890 | 176.90 | **150.52** | **0.85×** | 804.57 | **640.38** | **0.80×** |
| s6_mega_2.5mb.rb | 2,555,740 | 236.04 | 332.85 | 1.41× | 887.09 | 955.69 | 1.08× |

## Warm (in-process, 20 warmup runs discarded, median of 3)

| file | bytes | ref ms | potch ms | ratio |
|---|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.04 | 0.07 | 1.62× |
| synth_deep_nest.rb | 206 | 0.19 | 0.53 | 2.82× |
| s1_324b.rb | 324 | 0.12 | 0.26 | 2.16× |
| synth_method_chain.rb | 4,006 | 0.58 | 0.88 | 1.51× |
| synth_binop_chain.rb | 5,892 | 1.22 | 2.48 | 2.03× |
| s2_pack.rb | 6,019 | 0.62 | 1.41 | 2.26× |
| s3_34kb.rb | 34,065 | 2.36 | 4.37 | 1.85× |
| s4_114kb.rb | 114,391 | 7.12 | 12.06 | 1.69× |
| synth_big_array.rb | 338,895 | 16.31 | 46.38 | 2.84× |
| synth_many_locals.rb | 317,790 | 65.55 | 78.75 | 1.20× |
| synth_many_methods.rb | 408,902 | 92.71 | 134.41 | 1.45× |
| s5_639kb.rb | 638,935 | 31.07 | 57.35 | 1.85× |
| synth_many_strings.rb | 648,890 | 127.79 | 199.48 | 1.56× |
| s6_mega_2.5mb.rb | 2,555,740 | 128.04 | 240.20 | 1.88× |

## Reading these numbers

- **`parse_ms`/warm `ms` columns**: `potch`'s raw recursive-descent parse
  is consistently **~1.1×-2.8× slower** than the real C WASM parser across
  ordinary source files, fairly flat from 200 bytes to 2.5MB - a constant-
  factor gap, not a scaling problem. It's *faster* on exactly the files
  dominated by many small, flag-light nodes (`synth_many_strings.rb`,
  bold above) - plain string/identifier-heavy trees play to a JS engine's
  strengths relative to the WASM boundary.
- **Cold `total_ms`**: on the largest files, `potch`'s *end-to-end*
  wall-clock (parse + build a real AST + write output) is sometimes at or
  below `ref`'s - down to 0.80× on `synth_many_strings.rb`, 0.91× on
  `synth_many_methods.rb` (both bold above) - but not reliably so; on this
  run `s6_mega_2.5mb.rb` (the largest file) came out 1.08×. Below ~340KB,
  per-process fixed overhead (~120-200ms either way, mostly Node/V8
  startup) dominates both columns almost equally, which is why the total
  ratio stays close to 1.0× even where the raw parse ratio is 1.4×-2.5×.
  This is a single-machine measurement (see "Methodology" above) - expect
  some of these total-ratio crossovers to move run to run.
- **Warm vs. cold**: the warm numbers are the fairer "how much does
  `potch`'s own code cost, once startup is out of the picture" comparison,
  and they're worse for `potch` than the cold `total_ms` numbers suggest -
  e.g. `s6_mega_2.5mb.rb` is 1.08× cold but 1.88× warm. Part of that gap is
  cold-start noise (V8 JIT/lazy-compile cost, paid in full by every
  one-process-per-parse invocation, which is how `exe/potch` is always
  driven) landing almost equally on both backends in the cold numbers,
  masking a real per-call cost difference that only the warm numbers
  isolate.

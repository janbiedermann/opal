# Compiler performance baseline

Measured on 2026-10-04, before any potch integration work (see `POTCH.md`).
It records how fast today's compiler (whitequark `parser` gem + rewriters +
code generators) is, so the JS compiler built on potch can be compared with
it.

## Setup

* **Machine:** Linux x86_64, 16 cores
* **Software:** ruby 3.3.12, node v22.23.2, parser gem 3.3.10.1
* **Opal:** branch `grinding_potch`, at `master` (`abf15821c`)
* **Corpus:** potch's benchmark samples, generated exactly as
  `potch/bench/run.mjs` builds them:
  * `s0`–`s5`: real files from Prism's own `lib/prism/**`
  * `synth_*`: stress files from `potch/bench/synth.mjs`
  * `s6`: `s5` repeated four times
* All times are **warm, in-process medians in milliseconds**.
  * Files up to 30 kB: 3 warm-up runs and 11 timed runs.
  * Files of 30–300 kB: 3 warm-up and 5 timed runs.
  * Files over 300 kB: 1 warm-up and 3 timed runs.

## What is measured

| Column | Meaning |
|---|---|
| **CRuby parse** | `Parser::Ruby32` with `Opal::AST::Builder`, parse only |
| **CRuby rewrite** | `Opal::Rewriter` (all rewriters) on the parsed tree |
| **CRuby codegen** | Total minus parse minus rewrite: code generators, fragments and joining the output (also comments, magic comments and `__END__` handling) |
| **CRuby total** | `Opal::Compiler.new(src, file:).compile` |
| **Node total** | The same compiler compiled by Opal (`-ropal-parser`) and run on Node.js, `Opal::Compiler.new(src, file:).compile`. This is today's in-browser/`eval` compiler |
| **potch parse** | `parseWithMetadata(src)` from `potch/src/index.js` on Node.js, UTF-16 offsets (what the JS compiler will use), no byte conversion |
| **parse speedup** | CRuby parse ÷ potch parse |

## Results

| file | bytes | CRuby parse | CRuby rewrite | CRuby codegen | **CRuby total** | **Node total** | **potch parse** | parse speedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.14 | 0.10 | 0.13 | 0.36 | 3.06 | 0.06 | 2.3× |
| synth_deep_nest.rb | 206 | 0.91 | 1.08 | 0.37 | 2.36 | 21.11 | 0.30 | 3.0× |
| s1_324b.rb | 324 | 0.55 | 0.57 | 0.46 | 1.58 | 12.47 | 0.23 | 2.4× |
| synth_method_chain.rb | 4,006 | 10.11 | 15.44 | 8.68 | 34.23 | 274.42 | 0.65 | 15.6× |
| synth_binop_chain.rb | 5,892 | 14.04 | 21.79 | 19.04 | 54.86 | 382.00 | 1.38 | 10.2× |
| s2_pack.rb | 6,019 | 8.22 | 4.74 | 3.59 | 16.55 | 151.29 | 1.25 | 6.6× |
| s3_34kb.rb | 34,065 | 50.64 | 30.23 | 14.17 | 95.04 | **FAIL (1)** | 4.64 | 10.9× |
| s4_114kb.rb | 114,391 | 158.09 | 140.94 | 112.54 | 411.57 | 9,885.88 | 8.09 | 19.5× |
| synth_big_array.rb | 338,895 | 537.67 | 84.12 | 23.69 | 645.48 | 75,782.63 | 39.83 | 13.5× |
| synth_many_locals.rb | 317,790 | 906.06 | 493.16 | 2,467.48 | 3,866.69 | **FAIL (2)** | 66.44 | 13.6× |
| synth_many_methods.rb | 408,902 | 1,562.80 | 1,728.05 | 1,384.21 | 4,675.06 | **FAIL (2)** | 112.76 | 13.9× |
| s5_639kb.rb | 638,935 | 756.01 | 691.72 | 420.57 | 1,868.30 | **FAIL (2)** | 44.78 | 16.9× |
| synth_many_strings.rb | 648,890 | 2,635.58 | 1,675.03 | 1,877.41 | 6,188.02 | **FAIL (2)** | 163.81 | 16.1× |
| s6_mega_2.5mb.rb | 2,555,740 | 2,729.70 | 2,484.19 | 3,214.23 | 8,428.12 | **FAIL (2)** | 187.45 | 14.6× |

Failures (noted only, not investigated further for now):

1. **s3: compile error on Node.** `Invalid regular expression:
   /c\\?(?=[\p\{Alphabetic\}\p\{Number\}…`. The regexp transpiler, when
   running under Opal, turns the POSIX class `[[:print:]]` (s3 line 766)
   into `\p{…}` with escaped braces, which JS rejects. The same file
   compiles on CRuby.
2. **Too slow to measure on Node.** The run was stopped before a single
   compile finished; all five large files ran in parallel, one process
   each. For scale: `synth_big_array` (339 kB) already takes 75.8 s per
   compile.

Output check: wherever both compilers finished, the Node-hosted and CRuby
outputs have the same size, and for `s4` they were confirmed to be
**byte-for-byte identical** (271,218 bytes). The `out_bytes` value the CRuby
script reports for s4 (271,222) differs because of how that script measures
size, not because the output differs.

## Observations

* **The CRuby time splits roughly evenly across the three phases** on the
  real files (s3–s6):
  * parsing: 32–53 %
  * rewriters: 29–37 %
  * code generation: 15–38 %

  So replacing the parser alone would at best halve compile time. Dropping
  the rewriters that Prism makes unnecessary matters about as much.
* **potch parses 11–20× faster** than the parser gem on CRuby for files of
  30 kB or more and for the synthetic chains. It is 6.6× faster on s2
  (6 kB) and 2–3× on tiny files, where fixed per-call costs dominate.
* **Today's Node-hosted compiler is 7–9× slower than CRuby on small files**
  and gets much worse with size: 24× on s4, 117× on `synth_big_array`. The
  large files didn't finish. This is the compiler that `eval` and
  `opal-parser` use in the browser.
* **`synth_many_locals` is pathological on CRuby too:** 2.5 s of its 3.9 s is
  code generation for one method with 20,000 locals, which looks
  super-linear in the number of locals per scope.
* potch parses the 2.5 MB file in 187 ms. For every file, potch's parse is
  faster than CRuby's rewrite step alone.

## The JS compiler (POTCH.md phase 2)

The same corpus and run counts with the JS compiler in `lib/opal/compiler`
on Node.js (`node benchmark/potch/bench_compiler.mjs tmp/bench_corpus`),
measured on 2026-10-04. `parse_ms` is potch; `transform_ms` is the AST
passes, measured on a separate parse; `codegen_ms` is the rest of the
total, so it can come out negative when the run-to-run variance is larger
than the code generation time.

| file | bytes | parse_ms | transform_ms | codegen_ms | total_ms | out_bytes |
|---|---:|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.07 | 0.09 | 0.04 | 0.19 | 262 |
| synth_deep_nest.rb | 206 | 0.23 | 0.53 | -0.02 | 0.74 | 113 |
| s1_324b.rb | 324 | 0.25 | 0.27 | 0.06 | 0.58 | 896 |
| synth_method_chain.rb | 4006 | 0.72 | 1.35 | 0.16 | 2.22 | 7165 |
| synth_binop_chain.rb | 5892 | 2.41 | 2.90 | -1.30 | 4.01 | 15038 |
| s2_pack.rb | 6019 | 0.93 | 1.27 | 0.26 | 2.45 | 8009 |
| s3_34kb.rb | 34065 | 4.36 | 7.32 | 3.03 | 14.71 | 44874 |
| s4_114kb.rb | 114391 | 10.43 | 19.32 | 16.51 | 46.25 | 271218 |
| synth_big_array.rb | 338895 | 45.34 | 52.60 | -32.26 | 65.68 | 289028 |
| synth_many_locals.rb | 317790 | 66.53 | 114.38 | -29.85 | 151.06 | 646862 |
| synth_many_methods.rb | 408902 | 106.24 | 270.32 | 64.19 | 440.75 | 1138055 |
| s5_639kb.rb | 638935 | 47.86 | 100.03 | 85.74 | 233.63 | 863002 |
| synth_many_strings.rb | 648890 | 154.50 | 434.80 | 112.95 | 702.25 | 1309070 |
| s6_mega_2.5mb.rb | 2555740 | 191.11 | 523.57 | 178.19 | 892.87 | 3433887 |

Compared with the Ruby compiler on CRuby (the "CRuby total" column above),
the JS compiler is 6–10× faster on the real files: s3 14.7 vs 95.0 ms,
s4 46.3 vs 411.6 ms, s5 233.6 vs 1,868.3 ms, s6 892.9 vs 8,428.1 ms. It
compiles every corpus file, including s3, which fails with today's
Node-hosted compiler.

### Faster transform passes (2026-10-05)

The `transform_ms` column above included a second parse: the benchmark
started its timer before parsing the input of the passes (fixed in
`benchmark/potch/bench_compiler.mjs`). Measured with the fixed benchmark,
before and after two changes to the passes: the tree walk visits only the
fields of a Prism node type that can hold nodes (from potch's field table),
and a census of the parse tree skips the passes with nothing to do (no
`for` loops, pattern matching, compound assignments, `.JS` calls, ...).
The output is unchanged (all 13,068 files of the comparison corpus).

| file | bytes | parse_ms | transform_ms before | transform_ms after | total_ms before | total_ms after |
|---|---:|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.07 | 0.02 | 0.01 | 0.18 | 0.18 |
| synth_deep_nest.rb | 206 | 0.27 | 0.20 | 0.10 | 0.66 | 0.53 |
| s1_324b.rb | 324 | 0.23 | 0.06 | 0.03 | 0.66 | 0.62 |
| synth_method_chain.rb | 4006 | 0.72 | 0.81 | 0.18 | 2.37 | 2.45 |
| synth_binop_chain.rb | 5892 | 1.38 | 2.66 | 0.44 | 4.18 | 2.91 |
| s2_pack.rb | 6019 | 1.42 | 0.45 | 0.19 | 2.76 | 2.98 |
| s3_34kb.rb | 34065 | 4.33 | 3.46 | 1.39 | 16.90 | 14.08 |
| s4_114kb.rb | 114391 | 12.67 | 12.05 | 4.65 | 55.10 | 49.44 |
| synth_big_array.rb | 338895 | 43.45 | 17.92 | 8.38 | 74.02 | 71.27 |
| synth_many_locals.rb | 317790 | 72.56 | 43.19 | 5.09 | 159.33 | 121.92 |
| synth_many_methods.rb | 408902 | 115.68 | 170.81 | 35.14 | 504.95 | 377.72 |
| s5_639kb.rb | 638935 | 55.69 | 61.92 | 22.80 | 213.84 | 202.77 |
| synth_many_strings.rb | 648890 | 162.55 | 305.60 | 48.77 | 789.52 | 460.98 |
| s6_mega_2.5mb.rb | 2555740 | 199.72 | 323.38 | 94.74 | 954.12 | 754.88 |

The transforms are 3–9× faster and are now a small part of the total
(code generation is the largest); totals vary by ±10 % between runs.

### Faster code generation (2026-10-05)

Small changes in the code generators, found with CPU and allocation
profiles; the output (code and source maps) is unchanged on all 13,071
files of the comparison corpus:

* `Compiler#compile` concatenates the fragment codes in a loop instead of
  `map().join()`
* symbol literals no longer create a `TextEncoder` each (their inspected
  form is cached)
* `uniqueTemp` skips its 17 replacements for plain names
* `toVars` builds its fragment list without `flat(Infinity)`
* `push`/`unshift`/`fragment` without per-call option objects, and
  `unshift` with one array operation
* methods and blocks without parameters share empty argument lists
  instead of building them twice
* the refinement check of every call no longer allocates

`codegen_ms` here is the total minus parse and transforms (it also
carries GC work left over by the parse); the best of two medians each:

| file | bytes | codegen_ms before | codegen_ms after | total_ms before | total_ms after |
|---|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.14 | 0.13 | 0.23 | 0.22 |
| synth_deep_nest.rb | 206 | 0.48 | 0.47 | 0.84 | 0.85 |
| s1_324b.rb | 324 | 0.46 | 0.46 | 0.76 | 0.74 |
| synth_method_chain.rb | 4006 | 1.65 | 1.48 | 2.62 | 2.56 |
| synth_binop_chain.rb | 5892 | 2.87 | 2.67 | 4.89 | 4.60 |
| s2_pack.rb | 6019 | 2.27 | 2.13 | 3.51 | 3.34 |
| s3_34kb.rb | 34065 | 13.02 | 12.01 | 18.99 | 17.36 |
| s4_114kb.rb | 114391 | 41.05 | 34.10 | 55.88 | 50.49 |
| synth_big_array.rb | 338895 | 66.03 | 50.30 | 124.17 | 98.47 |
| synth_many_locals.rb | 317790 | 119.24 | 104.41 | 198.63 | 191.36 |
| synth_many_methods.rb | 408902 | 325.84 | 304.48 | 477.87 | 458.37 |
| s5_639kb.rb | 638935 | 170.64 | 148.02 | 236.94 | 223.23 |
| synth_many_strings.rb | 648890 | 447.67 | 417.11 | 664.06 | 629.56 |
| s6_mega_2.5mb.rb | 2555740 | 696.97 | 615.47 | 991.76 | 939.07 |

Code generation is 7–24 % faster on the files above 30 KB (s4 17 %,
s5 13 %, s6 12 %). What remains has no single hot spot: it scales linearly
with the input, and is spread over node dispatch (`process`,
`compileToFragments`), fragment objects (about 590,000 for s6) and the GC
for them (20–40 % of the code generation time). Tried without a measurable
gain, and left out: joining adjacent fragments of a node (9 % fewer
fragments, changes the source maps' bytes), exact-size fragment arrays,
setting `fragments` in the constructor, a larger young generation
(`--max-semi-space-size`, 2–4 %). Larger gains need design changes:
generating code into one buffer with source-map positions instead of
fragment trees, and, on the parse side, potch building the plain AST
directly (its conversion step, `convertNode`, is the largest single
allocator, about 60 MB per compile of s5 and s6).

## How to reproduce

The scripts live in `benchmark/potch/`:

1. Generate the corpus. It writes `00_s0_201b.rb` … `13_s6_mega_2.5mb.rb`:

   ```sh
   node benchmark/potch/gen_corpus.mjs tmp/bench_corpus
   ```
2. CRuby, the current compiler:

   ```sh
   bundle exec ruby -Ilib benchmark/potch/bench_ruby.rb tmp/bench_corpus
   ```
3. potch, parse only:

   ```sh
   node benchmark/potch/bench_potch.mjs tmp/bench_corpus
   ```
4. Node-hosted compiler, the current compiler built with `-ropal-parser`:

   ```sh
   bundle exec exe/opal --no-cache --no-source-map -c -ropal-parser \
     -o tmp/bench_opal_node.js benchmark/potch/bench_opal_node.rb
   NODE_PATH=stdlib/nodejs/node_modules \
     node --stack-size=8000 tmp/bench_opal_node.js tmp/bench_corpus [name-filter]
   ```

   Set `RUNS`/`WARM` to override the run counts for files over 300 kB.

The original measurement ran the same scripts from a scratch directory,
importing potch from its standalone checkout. The parser code is unchanged
by the move into `lib/opal/potch/`; only comments in the generated file
changed.

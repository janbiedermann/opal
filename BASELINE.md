# Compiler performance baseline

Measured on 2026-10-04, before any potch integration work (see `POTCH.md`).
It records how fast today's compiler (whitequark `parser` gem + rewriters +
code generators) is, so the JS compiler built on potch can be compared with
it.

## Setup

* **Machine:** Linux x86_64, 16 cores
* **Software:** ruby 3.3.12, node v22.23.2, parser gem 3.3.10.1
* **Opal:** branch `grinding_potch`, at `master` (`f6a715668`)
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

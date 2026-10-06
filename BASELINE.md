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
allocator, about 60 MB per compile of s5 and s6; done, see the next
section).

### Faster AST conversion in potch (2026-10-05)

potch's parser builds its own nodes (numeric types, constant pool ids, flag
bits), which `parseWithMetadata` converts into the plain AST objects; the
conversion took 40–55 % of potch's time. It now uses one generated function
per node type (`lib/opal/potch/convert.mjs`, from Prism's `config.yml` by
`tasks/potch/gen_convert.mjs`) instead of a generic walk with a per-field
plan, and the AST's locations are the parser's own `{ start, end }` objects
instead of copies. The AST is unchanged (JSON-identical, key order
included, on 16,343 files), and so is the compiler's output, code and
source maps (13,071 files).

The conversion alone (`parseWithMetadata` minus `pm_parse`): s5 20.4 →
6.4 ms, s6 82.8 → 39.6 ms, synth_many_methods 62.1 → 17.9 ms,
synth_many_strings 82.6 → 28.3 ms. The whole compile, best of two medians
each (`parse_ms` is potch plus the transforms; less allocation also leaves
less GC work for the code generation):

| file | bytes | parse_ms before | parse_ms after | total_ms before | total_ms after |
|---|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.09 | 0.08 | 0.22 | 0.21 |
| synth_deep_nest.rb | 206 | 0.38 | 0.29 | 0.83 | 0.68 |
| s1_324b.rb | 324 | 0.28 | 0.27 | 0.70 | 0.70 |
| synth_method_chain.rb | 4006 | 1.07 | 0.64 | 2.60 | 1.82 |
| synth_binop_chain.rb | 5892 | 1.86 | 1.31 | 4.51 | 3.38 |
| s2_pack.rb | 6019 | 1.14 | 1.10 | 3.24 | 3.14 |
| s3_34kb.rb | 34065 | 6.14 | 4.95 | 18.65 | 16.08 |
| s4_114kb.rb | 114391 | 16.65 | 14.26 | 50.22 | 45.61 |
| synth_big_array.rb | 338895 | 48.45 | 43.58 | 96.49 | 87.27 |
| synth_many_locals.rb | 317790 | 76.99 | 61.99 | 185.42 | 159.21 |
| synth_many_methods.rb | 408902 | 165.32 | 125.65 | 462.84 | 388.57 |
| s5_639kb.rb | 638935 | 70.73 | 56.15 | 219.68 | 185.65 |
| synth_many_strings.rb | 648890 | 227.82 | 175.13 | 644.89 | 525.36 |
| s6_mega_2.5mb.rb | 2555740 | 307.24 | 248.55 | 929.96 | 772.97 |

The whole compile is 9–19 % faster on the files above 30 KB (s6 17 %).
`convert.mjs` adds 84 KB (5 KB gzipped) to potch.

### Faster source maps (2026-10-05)

The builder makes a source map of every file it compiles
(`compiler.sourceMap.map()`), which took another 50–65 % of the compile
time: the map split the code of each fragment into lines and built arrays
of absolute and then relative segments before encoding them. It now makes
the VLQ mappings in one pass over the fragments (newlines found with
`indexOf`, segments relative to the previous one as they are made, the
position and name of a fragment's node computed once for a run of fragments
of the same node). The compiler no longer flattens the fragment tree for
`compile` and `sourceMap`, which walk it (the flat `fragments` list, which
DCE uses, is made on demand). Code and source maps are unchanged on all
13,071 files of the comparison corpus.

`compile()` plus `sourceMap.map()` as the builder calls them, best of two
medians each:

| file | bytes | map_ms before | map_ms after | compile+map before | compile+map after |
|---|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.07 | 0.03 | 0.22 | 0.17 |
| synth_deep_nest.rb | 206 | 0.03 | 0.02 | 0.50 | 0.49 |
| s1_324b.rb | 324 | 0.13 | 0.05 | 0.61 | 0.54 |
| synth_method_chain.rb | 4006 | 0.70 | 0.26 | 2.47 | 1.70 |
| synth_binop_chain.rb | 5892 | 1.02 | 0.56 | 4.19 | 3.11 |
| s2_pack.rb | 6019 | 0.33 | 0.18 | 3.00 | 2.76 |
| s3_34kb.rb | 34065 | 2.35 | 1.63 | 16.21 | 15.72 |
| s4_114kb.rb | 114391 | 19.46 | 10.70 | 52.68 | 42.74 |
| synth_big_array.rb | 338895 | 0.59 | 0.57 | 41.05 | 40.64 |
| synth_many_locals.rb | 317790 | 72.40 | 29.41 | 171.98 | 121.57 |
| synth_many_methods.rb | 408902 | 196.24 | 97.01 | 494.75 | 351.23 |
| s5_639kb.rb | 638935 | 83.78 | 45.49 | 217.75 | 179.12 |
| synth_many_strings.rb | 648890 | 202.93 | 106.25 | 559.15 | 439.72 |
| s6_mega_2.5mb.rb | 2555740 | 370.92 | 168.49 | 938.68 | 691.68 |

Source maps are 1.5–2.6× faster; compile plus map is 19–29 % faster on the
larger real files (s4 19 %, s5 18 %, s6 26 %) and up to 31 % on the
synthetic ones.

Tried without a gain, and left out: keeping a node's code strings as plain
strings in its fragment array (the array recording its node and scope),
so that only the flat list needs Fragment objects. Two thirds of the
fragments became plain strings, but the named properties on the arrays
cost V8 a property store per array, about as much memory as the Fragment
objects saved. Generating code into one buffer instead of fragment trees
would need every node class to generate its code in order; they compute
the code of their children first and then wrap it.

### Faster potch parser core (2026-10-06)

`pm_parse` (potch's parser, now about 70 % of its time) is a close port of
Prism's C code; a profile shows the time spread over the lexer and the
expression parser, the constant pool and GC, with no single hot spot.
Three changes, all keeping the AST JSON-identical (16,347 files) and the
compiler's output unchanged (13,074 files):

* the optional locations a node creator doesn't set (`opening_loc`,
  `closing_loc`, ...; a call node had five) share one frozen
  `{ start: null, end: null }` instead of a new object each (the one
  place that changed such a location in place assigns a new one now)
* `lex_keyword` compares the first character before `startsWith` (an
  identifier was compared with every keyword of its length)
* the conversion caches the flag arrays per node type and flags value,
  without building a key string per node

`pm_parse` alone is about 6 % faster (310 → 291 ms for six large files).
Parse here is potch with the conversion and the transforms, best of two
medians each:

| file | bytes | parse_ms before | parse_ms after | total_ms before | total_ms after |
|---|---:|---:|---:|---:|---:|
| s0_201b.rb | 201 | 0.09 | 0.08 | 0.20 | 0.20 |
| synth_deep_nest.rb | 206 | 0.30 | 0.30 | 0.68 | 0.64 |
| s1_324b.rb | 324 | 0.26 | 0.23 | 0.68 | 0.63 |
| synth_method_chain.rb | 4006 | 0.77 | 0.59 | 1.99 | 1.82 |
| synth_binop_chain.rb | 5892 | 1.96 | 1.39 | 4.27 | 3.24 |
| s2_pack.rb | 6019 | 1.18 | 1.09 | 3.21 | 3.02 |
| s3_34kb.rb | 34065 | 5.73 | 4.46 | 16.79 | 15.99 |
| s4_114kb.rb | 114391 | 13.62 | 12.29 | 42.48 | 40.79 |
| synth_big_array.rb | 338895 | 40.30 | 37.40 | 81.06 | 74.06 |
| synth_many_locals.rb | 317790 | 71.23 | 56.34 | 162.61 | 143.17 |
| synth_many_methods.rb | 408902 | 127.74 | 123.14 | 368.97 | 358.57 |
| s5_639kb.rb | 638935 | 60.09 | 54.64 | 188.70 | 179.76 |
| synth_many_strings.rb | 648890 | 154.27 | 145.04 | 473.07 | 455.12 |
| s6_mega_2.5mb.rb | 2555740 | 248.06 | 203.07 | 763.82 | 713.06 |

Tried without a gain, and left out: caching the constant pool ids by
source position (a `Map` of 90,000 number keys costs more than the
string lookups it saves), an open-addressing table hashing the source's
characters without making strings (V8's native string hashing and `Map`
are faster than a JS loop), and a cache of the last interned slice (helps
some files, slows others). V8 does optimize the huge functions
(`parser_lex`, `parse_expression_prefix`), so splitting them wouldn't
help. What remains is the parser's own work, the GC of the AST (the
output) and the token snapshots: `parser.previous` is a new object per
token, because more than 400 places keep references to tokens as C keeps
copies.

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

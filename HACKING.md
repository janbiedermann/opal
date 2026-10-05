# Hacking

## Quick Start

[Fork opal/opal on GitHub](https://github.com/opal/opal/fork), then clone the fork to your machine:

```
$ git clone git://github.com/<YOUR-GITHUB-USERNAME>/opal.git
```

Setup the project (you need Node.js 22 or later, git and yarn):

```
$ bin/setup
```

Run the test suite:

```
$ node tasks/test.mjs
```

You are now ready to make your first contribution to Opal! At a high level, your workflow will be to:

1. Make changes to Opal source code
2. Run the test suite to make sure it still passes
3. Submit a pull request


## Down The Rabbit Hole

Before making changes to Opal source, you need to understand a little about how the test suite works. Every spec that Opal test suite executes is listed in `spec/ruby_specs` file. Each line in that file is a path to either a spec file or a directory full of spec files. If it's a path to a directory, all spec files in that directory will be executed when you run the test suite. Lines starting with a `!` represent files that are excluded (i.e. "execute all files in a given directory, *except* this file"), and lines starting with a `#` are ignored as comments. All paths are relative to the top-level `specs` directory. Let's follow one of these paths - `ruby/core/string/sub_spec` - and see where it goes.

Navigating to `spec/ruby/core` directory, you see that it contains multiple sub-directories, usually named after the Ruby class or module. Drilling further down into `spec/ruby/core/string` you see all the spec files for the various `String` behaviors under test, usually named by a method name followed by `_spec.rb`. Opening `spec/ruby/core/string/sub_spec.rb` you finally see the code that checks the correctness of Opal's implementation of the `String#sub` method's behavior.

When you execute `$ node tasks/test.mjs`, the code in this file is executed, along with all the other specs in the entire test suite. It's a good idea to run the entire test suite when you feel you reached a certain milestone in the course of making your changes (exactly what that means is up to you), and definitely do `$ node tasks/test.mjs` before committing your changes to make sure they have not introduced regressions or other unintended side effects.

But you will want to run tests as often as possible, after every small change, and running the entire test suite will slow you down. You need to be able to execute a single spec that is concerned with the feature you are currently working on. To accomplish this, just add `PATTERN` to your spec invocation command, like this:

```
$ node tasks/test.mjs spec/ruby/core/string/sub_spec.rb
```

This will make sure that only `spec/ruby/core/string/sub_spec.rb` is run, and no other specs are executed. Directories and globs (with `PATTERN`) can be used too:

```
$ node tasks/test.mjs spec/ruby/core/string
$ PATTERN="spec/ruby/core/string/*_spec.rb" node tasks/test.mjs mspec_ruby
```

Another way to quickly validate ideas and play with your changes is to use `opal-repl`, a tool similar to `irb`. Running `opal-repl` drops you into an interactive environment with your current version of Opal loaded, including any changes you have made.

```
$ exe/opal-repl
>> 2 + 2
=> 4
>>
```

When quickly iterating on an idea, even `opal-repl` may feel a bit too heavy, because after making a change in Opal, you must `exit` from `opal-repl` and do `$ exe/opal-repl` again to load Opal with your latest changes. In this case, you can run `opal` with the `-e` option, which executes a piece of code you pass to it once, then returns to the shell. This means that in order to run it again after making another adjustment to Opal, all you have to do is hit the up arrow key on your keyboard and press the enter key. This is the fastest way to go from making a change in Opal to seeing its effect.

```
$ exe/opal -e "3.times {puts 'hello'}"
hello
hello
hello
$
```

Let's recap what we covered so far. `spec/ruby_specs` is the "master list" of all the specs that get executed when you do `$ node tasks/test.mjs`. You know where to find individual specs, inspect them, and execute them selectively or in bulk. But how do you know which specs to work on? You may be tempted to compare the contents of one of the directories in `spec/ruby/core` with the list of paths in `spec/ruby_specs`, add the missing paths to the "master list", run `$ node tasks/test.mjs`, and start fixing the failures by implementing the missing features. However, chances are that as you are reading this, there are plenty of failing tests in the specs that are already listed in `spec/ruby_specs`. How can that be if `$ node tasks/test.mjs` runs green? To understand this, you need to get acquainted with the concept of spec filters.

There are two types of spec filters in the Opal project: `spec/filters/bugs` and `spec/filters/unsupported`. Both filters have the same effect: any spec failures that are noted inside any of the files inside of these directories are ignored when running the spec suite, i.e. they are not reported as failures. Even though their effect is the same, the purpose of `bugs` and `unsupported` filters is different. As the name suggests, `unsupported` filters list _permanent_ failures, things that other Ruby implementations can do that Opal cannot and will never be able to do (by design and by virtue of being implemented on top of JavaScript running in the browser environment). `bugs` filters, on the other hand, are _temporary_ failures, problems that need to be worked on. Problems that Opal needs your help with. Think of the `bugs` directory and the files contained within it as your "TO DO" list for contributing to Opal.

Comment out any of the `fail` lines in any of the files in the `spec/filters/bugs` directory, run `$ node tasks/test.mjs`, and watch it fail. Make it pass and submit a pull request - that's all there is to it :) Happy hacking!

Core classes use each other and your changes may fix other bugs in `spec/filters/bugs`. If you think it's possible, run an inverted test suite by providing environment variable `INVERT_RUNNING_MODE=true`:

```
$ env INVERT_RUNNING_MODE=true RUBYSPECS=true PATTERN="spec/ruby/core/string/*_spec.rb" node tasks/test.mjs mspec_ruby
```

This command will execute tests marked as "bugs" from every file in the `spec/ruby/core/string` directory. After running it you will get a list of specs that in fact are passing. Feel free to remove them from `spec/filters/bugs` (`bin/remove-filters` removes the filters listed on its standard input).

Note: Opal has some bugs that may cause a shared state between tests. Sometimes green specs are green only in the inverted test suite, so after removing them from `/bugs`, run a regular test suite one more time to verify that everything is fine.

Also there are some specs in `spec/ruby/language/while_spec.rb` that cause an infinite loop. Make sure to comment them before running a whole inverted test suite.

## Benchmarking

`node tasks/bench.mjs` runs Ruby benchmarks: `.rb` scripts (timed as a whole) and `.yml` files in the [benchmark_driver](https://github.com/benchmark-driver/) format (a `prelude`, the `benchmark` snippets and a `loop_count`). Examples are in the `benchmark` directory, and `benchmark/benchmarks` lists the ones run by default (including many from `test/cruby/benchmark`).

Benchmarking works on the principle of a single, shared benchmarking workspace, a *bench* (`tmp/bench`), where the results of each benchmark run are saved. `node tasks/bench.mjs report` shows a combined report of all the results in the workspace, the first one being the base. This means you can check out an older commit, run benchmarks, check out a newer commit, run benchmarks, then run the report to see the results from the two commits side by side. `node tasks/bench.mjs clear` resets the workspace.

```
$ node tasks/bench.mjs clear
$ node tasks/bench.mjs run benchmark/bm_array_flatten.rb benchmark/bm_array_union_numbers.rb
Benchmarking benchmark/bm_array_flatten.rb on nodejs...
bm_array_flatten 2.048 i/s - 1 times in 0.488349s
Benchmarking benchmark/bm_array_union_numbers.rb on nodejs...
bm_array_union_numbers 9.232 i/s - 1 times in 0.108314s
Results written to tmp/bench/1_opal-nodejs-2-0-0dev.txt
```

`-R <runner>` (repeatable) selects the runners (default: nodejs; chrome, firefox, bun and deno work too) and `--ruby` runs the same benchmarks with the `ruby` on your `PATH`, to compare with MRI:

```
$ node tasks/bench.mjs run --ruby benchmark/bm_array_flatten.rb benchmark/bm_array_union_numbers.rb
$ node tasks/bench.mjs report
Base: 1_opal-nodejs-2-0-0dev
Benchmark               1_opal-nodejs-2-0-0dev        2_ruby-3-3-12
bm_array_flatten                     2.048 i/s   +339.31% 8.997 i/s
bm_array_union_numbers               9.232 i/s     -5.95% 8.683 i/s
```

`node tasks/bench.mjs report <file>...` reports only the given result files, in that order. On Linux it may be required to use `xvfb-run node tasks/bench.mjs ...` for the browser runners.

`node tasks/bench.mjs ips` runs the [benchmark-ips](https://github.com/evanphx/benchmark-ips) benchmarks in `benchmark-ips/`. benchmark-ips isn't part of Opal: set `BENCHMARK_IPS_LIB` to the `lib` directory of a checkout of it.

### The Ruby Spec Suite Benchmarking

This type of benchmarking relies on a feature of MSpec whereby you can ask it to execute every example in a given spec multiple times. Adding `BM=<number of times>` to your regular spec suite invocation will hook into this MSpec functionality, collect timing information, and dump the results into the benchmarking workspace, making them available for reporting. Below is an example run with a single spec and `BM` set to `100`, meaning each example in the spec would be run 100 times.

```
$ BM=100 node tasks/test.mjs spec/ruby/core/array/permutation_spec.rb
...
Benchmark results have been written to tmp/bench/Spec1
$ node tasks/bench.mjs report tmp/bench/Spec1
```

### AsciiDoctor Benchmark and git branch performance comparison

`node tasks/performance.mjs` tests the performance of a real life application, AsciiDoctor: compiling it, running it and its asset size, plus the V8 optimization status of corelib methods. It prints a summary comparing the current branch with master (or `GITHUB_BASE_REF`); `--current` only measures the current checkout. The output is checked against CRuby's when `ruby` is available, otherwise against master's.

Example output:
```
=== Summary ===
Summary of performance changes between (previous) master and (current) v1.5.1-48-gc470e969:

Comparison of V8 function optimization status:
Files tmp/performance/optstatus_previous and tmp/performance/optstatus_current are identical

Comparison of the Asciidoctor (a real-life Opal application) compile and run:
                  Compile time: 9.367 (+2.21%) -> 9.579 (+17.53%) (change: +2.26%)
              Run time on node: 2.049 (+9.25%) -> 2.147 (+19.70%) (change: +4.80%)
                   Bundle size: 4740.27 kB -> 4740.27 kB (change: +0.00%)
          Minified bundle size: 995.10 kB -> 995.10 kB (change: +0.00%)
            Mangled & minified: 706.32 kB -> 706.32 kB (change: +0.00%)
```

## Parser and compiler

Opal's parser is potch, a JavaScript port of [Prism](https://github.com/ruby/prism) in `lib/opal/potch` (see `docs/potch.md`). The compiler, builder and CLI are in `lib/opal/compiler`; `POTCH.md` describes how they came to be. `exe/opal --sexp -e '...'` prints the syntax tree of some code, and `spec/lib/fixtures/compiler` holds examples of compiled code (regenerate the expected outputs with `node tasks/compiler/update_fixtures.mjs` and review the diff).

## Profiling

For the node runner profiling can be enbled by setting the `NODE_FLAME` environment variable. In addition 0x must be installed globally: `npm i 0x -g`. When using the node runner afterwards, it will profile the program execution and at programm exit generate a nice flamegraph that can be examined in a browser. To disable profiling again, the `NODE_FLAME` environment variable must be unset.

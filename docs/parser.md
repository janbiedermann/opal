# The parser

Opal's built-in Ruby parser lives in `lib/opal/parser/` and is maintained as
part of Opal.

It is a JS port of the [Prism](https://github.com/ruby/prism) Ruby parser, at
version 1.9.0 - the version that ships with Ruby 4.0.

It targets consumption as an **in-process JavaScript library** rather than a
serialization format: `code` is a plain JS string, and every
location in the resulting AST is a pair of **UTF-16 code-unit offsets**
into that string (so `code.slice(loc.start, loc.end)` always gives you the
exact source text, no decoding step required).

Scope, by design:

- **POJO AST** - nodes are plain objects (`{ type, location, ... }`), not
  classes. No `instanceof` checks, no methods on nodes.
- **No encoding tables** - source is a JS string (inherently UTF-16/
  Unicode), so there's no support for re-decoding it under a non-Unicode
  `# encoding:` magic comment, or for raw bytes that aren't valid UTF-8.
  This is an architectural boundary, not a missing feature.
- **No binary serialization** - no `dump`/`load`. If you need the AST
  outside this process, serialize the POJO yourself (it's already
  JSON-safe apart from `BigInt`s, see `envelopeOffsetsToBytes` below).

For performance numbers against the real C WASM parser, see
[`parser_performance.md`](./parser_performance.md).

## Using it as a library

```js
import { parse } from "./lib/opal/parser/index.mjs";

const result = parse("puts 'hello'");
result.value;     // => ProgramNode (a POJO tree)
result.errors;    // => []
result.warnings;  // => []
```

`parse(code)` is the simple entry point: no options, UTF-16 offsets,
`{ value, errors, warnings }`. For comments, magic comments, `data_loc`,
or any parse option (`filepath`, `line`, `version`, `scopes`, ...), use
`parseWithMetadata`:

```js
import { parseWithMetadata } from "./lib/opal/parser/index.mjs";
import { pm_options_filepath_set, pm_options_line_set } from "./lib/opal/parser/options.mjs";

const options = {};
pm_options_filepath_set(options, "example.rb");
pm_options_line_set(options, 10);

const envelope = parseWithMetadata("def foo\n  __FILE__\nend", options);
envelope.ast;             // the AST (same shape as parse()'s `value`)
envelope.comments;        // [{ type: "inline" | "embdoc", start, end }]
envelope.magic_comments;  // [{ key, value, key_start, key_end, value_start, value_end }]
envelope.data_loc;        // { start, end } | null  (the __END__ data segment, if any)
envelope.offsets;         // newline-list: byte/UTF-16 offset of the start of each line
envelope.start_line;      // the `line:` option, or 1
envelope.encoding;        // the detected/forced source encoding name
```

`options` is the same low-level struct `exe/potch` builds internally - see
`lib/opal/parser/options.mjs` for every `pm_options_*_set` setter (filepath, line,
encoding, frozen_string_literal, version, partial_script, main_script,
command_line, scopes). Passing `null` (or omitting it) parses with
defaults, same as `parse()`.

`lexWithMetadata(code, options)` gives you tokens instead of an AST:

```js
import { lexWithMetadata } from "./lib/opal/parser/index.mjs";

const { tokens } = lexWithMetadata("1 + 2");
// [{ type: "PM_TOKEN_INTEGER", value: "1", start: 0, end: 1 }, ...]
```

Other exports:

- `version()` - the ported Prism version string. It's a function, not a
  constant: the underlying `pm_version` function is re-exported under the
  name `version` (`export { pm_version as version }` renames the function
  itself without calling it), so you call `version()` to get the string.
- `inspect(code)` - a quick JSON pretty-print of the parsed tree, handy
  for debugging (`console.log(inspect(code))`).
- `envelopeOffsetsToBytes(envelope, source)` - mutates an envelope from
  `parseWithMetadata`/`lexWithMetadata` in place, converting every UTF-16
  offset to a UTF-8 byte offset (and pre-rendering `BigInt`/`Float`
  values into sentinel strings a JSON wire format can round-trip exactly -
  see its doc comment in `lib/opal/parser/index.mjs`). Use this only if you need byte
  offsets for compatibility with a byte-oriented backend or wire format;
  the native UTF-16 offsets are almost always what you want when you're
  already holding the source as a JS string.

Deeper internals (`node.mjs`, `ast.mjs`, the individual `parts/*.mjs`
fragments, ...) aren't part of the public API, but every module in
`lib/opal/parser/` can be imported directly (as the `options.mjs` import
above does).

## Where things live in Opal

| Path | Contents |
|---|---|
| `lib/opal/parser/index.mjs` | Public API (`parse`, `parseWithMetadata`, `lexWithMetadata`, `envelopeOffsetsToBytes`, `inspect`, `version`) |
| `lib/opal/parser/parts/*.mjs` | The parser itself, as plain fragments with no imports or exports |
| `lib/opal/parser/parser.mjs` | Generated from `parts/` (committed, see below) |
| `lib/opal/parser/*.mjs`, `util/*.mjs` | AST constants, diagnostics, encoding, options, regexp, static literals, … |
| `lib/opal/parser/cli.mjs` | The command-line tool, run as `exe/potch` |
| `spec/lib/parser/*.test.mjs` | Specs (`node --test`) |
| `spec/lib/fixtures/parser/`, `spec/lib/fixtures/parser_errors/` | Parse and error fixtures used by the specs |
| `tasks/parser/` | `assemble.mjs`, `gen_field_order.mjs` and `gen_convert.mjs` |
| `benchmark/parser/` | Benchmarks and their corpus |

Offsets are UTF-16 code-unit indices into whatever JS string you pass as
`code` - see the top of this file.

## Running the CLI (`exe/potch`)

`exe/potch` wraps the library as a line-oriented JSON tool, in case you're
driving it from something other than JS (a test harness, a subprocess
bridge, ...). Full usage:

```
exe/potch [-e <code> | --stdin] [--json-in] [--lex] [--time] [--warmup[=N]]
```

- `-e <code>` parses `<code>` directly; `--stdin` reads source from stdin
  instead; omitting both also reads stdin.
- `--json-in` treats the input as a JSON request instead of raw Ruby
  source: `{ source, filepath?, line?, lex? }` (same option set
  `parseWithMetadata` takes, as plain JSON keys).
- `--lex` lexes instead of parsing (tokens instead of an AST).
- `--time` writes `[timing] parse: N ms` to stderr (the raw `pm_parse`
  call only - see `parser_performance.md` for what that does and doesn't cover).
- `--warmup[=N]` parses the input `N` times (default 20) and waits ~1s for
  V8 to finish tiering up *before* the timed parse - isolates a warm
  per-call cost from one-time JIT/lazy-compile overhead.

Output is always a JSON envelope on stdout (pretty-printed, tab-indented):

```
$ echo 'puts "hi"' | exe/potch --stdin --time
{
	"ast": { "type": "ProgramNode", "location": { "start": 0, "end": 9 }, ... },
	"comments": [],
	"magic_comments": [],
	"errors": [],
	"warnings": [],
	"data_loc": null
}
[timing] parse: 8.421 ms
```

Note `exe/potch` always converts offsets to UTF-8 bytes before printing
(`envelopeOffsetsToBytes`) - that's a wire-format convention shared with
the other backends, not what you get calling the library functions
directly (see above).

## Running the tests

```
node tasks/test.mjs parser
```

Runs the full suite (`node --test spec/lib/parser/*.test.mjs`) - currently 8000+
cases, in a couple of seconds, with **no Ruby installation needed by the specs themselves**. It's a from-scratch Ruby-free port of the
relevant parts of upstream Ruby's `test/prism/**` suite, validated by
diffing this parser's output against the real C WASM parser (via the published
`@ruby/prism` npm package) wherever a reference is useful.

A handful of the original Ruby tests are intentionally not ported because
they depend on machinery this JS port doesn't have and isn't meant to:
binary serialization (no `dump`/`load`, see above), legacy non-UTF-8
encodings (no encoding tables, see above), or inspecting CRuby's own
compiled bytecode. Writing this port this way also surfaced two real bugs
in the parser itself along the way - both in different code paths that
decode `\xNN`/`\uNNNN`-style escapes into the output string one byte at a
time instead of merging a multi-byte UTF-8 sequence into a single
codepoint. One is fixed; one (a heredoc's `opening_loc` coming back off by
one, in a fixture with many heredocs in one file) is still open and not
yet root-caused.

```
node tasks/lint.mjs    # eslint (the parser, the compiler, the tasks and the
                       # built corelib),
                       # plus the parser.mjs assemble check
```

## Regenerating `parser.mjs`

`lib/opal/parser/parser.mjs` is a generated file - the single-file
concatenation of `lib/opal/parser/parts/*.mjs` (plus a synthesized import
header) that `index.mjs` imports from. Regenerate it after editing anything
under `parts/`:

```
node tasks/parser/assemble.mjs           # (re)writes lib/opal/parser/parser.mjs
node tasks/parser/assemble.mjs --check   # verifies it's up to date without writing (part of tasks/lint.mjs)
```

`lib/opal/parser/field_order.mjs` and `lib/opal/parser/convert.mjs` are
generated from Prism's `config.yml` by `tasks/parser/gen_field_order.mjs
--config=<path>` and `tasks/parser/gen_convert.mjs --config=<path>` (Prism
1.9's `config.yml` comes with its gem). `convert.mjs` holds one function
per node type that turns the parser's node into the plain AST object; the
generic conversion in `index.mjs` (from the field order) remains for
reference and for node types without one. They only need regenerating when
the parser moves to a new Prism version.

## Benchmarking

```
node benchmark/parser/run.mjs    # [--runs=N] [--warmup-runs=N]
```

See [`parser_performance.md`](./parser_performance.md) for the current numbers and what
this actually measures.

The compiler baseline (today's compiler on CRuby and on Node, compared with
the parser's parse times on the same corpus) is measured by
`benchmark/parser/bench_ruby.rb` and `benchmark/parser/bench_opal_node.rb`.

## License

The parser is MIT licensed, like Opal. Copyright (c) 2026 Jan Biedermann.

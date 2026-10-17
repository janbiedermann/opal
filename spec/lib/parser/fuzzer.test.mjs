// Ruby-free port of test/prism/fuzzer_test.rb — see UNI.md.
//
// The Ruby test just parses each snippet (`Prism.profile(source)` is a
// no-op wrapper around `Prism.parse` when called without a block - see
// test_helper.rb) and relies on a raised exception/segfault to fail the
// test. These snippets were all found by a fuzzer triggering invalid
// memory access in the C parser, so "parses without throwing" is the part
// worth keeping - but since fixtures.test.js already gives us a working
// envelope-diff against the real C parser for free, each snippet is also
// compared against `@ruby/prism` the same way, for real conformance signal
// instead of just "didn't crash".

import { test } from "node:test";
import assert from "node:assert/strict";

import { uniEnvelope } from "./support/uni-envelope.mjs";
import { refEnvelope } from "./support/ref-envelope.mjs";

const SNIPPETS = {
  "incomplete global variable": "$",
  "incomplete symbol": ":",
  "incomplete escaped string": '"\\',
  "trailing comment": "1\n#\n",
  "comment followed by whitespace at end of file": "1\n#\n ",
  "trailing asterisk": "a *",
  "incomplete decimal number": "0d",
  "incomplete binary number": "0b",
  "incomplete octal number": "0o",
  "incomplete hex number": "0x",
  "incomplete escaped list": "%w[\\",
  "incomplete escaped regex": "/a\\",
  "unterminated heredoc with unterminated escape at end of file": "<<A\n\\",
  "escaped octal at end of file 1": '"\\3',
  "escaped octal at end of file 2": '"\\33',
  "escaped hex at end of file 1": '"\\x',
  "escaped hex at end of file 2": '"\\x3',
  "escaped unicode at end of file 1": '"\\u{3',
  "escaped unicode at end of file 2": '"\\u{33',
  "escaped unicode at end of file 3": '"\\u{333',
  "escaped unicode at end of file 4": '"\\u{3333',
  "escaped unicode at end of file 5": '"\\u{33333',
  "escaped unicode at end of file 6": '"\\u{333333',
  "escaped unicode at end of file 7": '"\\u3',
  "escaped unicode at end of file 8": '"\\u33',
  "escaped unicode at end of file 9": '"\\u333',
  "float suffix at end of file": "1e",
  "parameter name that is zero length": "a { |b;",
  "statements node with multiple heredocs": "for <<A + <<B\nA\nB\n",
  "create a binary call node with arg before receiver": "<<-A.g/{/\nA\n/, \"\"\\\n",
  "regular expression with start and end out of order": "<<-A.g//,\nA\n/{/, ''\\\n",
  "interpolated regular expression with start and end out of order": "<<-A.g/{/,\nA\na\n/{/, ''\\\n",
};

for (const [name, source] of Object.entries(SNIPPETS)) {
  test(`fuzzer: ${name}`, async () => {
    const uni = uniEnvelope(source);
    const ref = await refEnvelope(source);

    assert.deepStrictEqual(uni.ast, ref.ast, "AST mismatch");
  });
}

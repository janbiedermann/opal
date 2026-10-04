// Ruby-free port of test/prism/version_test.rb — see UNI.md.

import { test } from "node:test";
import assert from "node:assert/strict";

import { version } from "../../../lib/opal/potch/index.mjs";

test("version is set", () => {
  assert.ok(version(), "expected version() to return a non-empty string");
});

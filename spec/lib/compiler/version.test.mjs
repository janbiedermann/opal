// lib/opal/compiler/version.mjs must match stdlib/opal/version.rb.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VERSION } from "../../../lib/opal/compiler/index.mjs";

test("VERSION matches stdlib/opal/version.rb", () => {
  const ruby = readFileSync(new URL("../../../stdlib/opal/version.rb", import.meta.url), "utf8");
  assert.equal(VERSION, /VERSION = '([^']+)'/.exec(ruby)[1]);
});

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { transformRegexp } from "../../../opal/runtime/regexp_transpiler.mjs";

const t = (source, flags) => transformRegexp(source, flags);

describe("hex escapes", () => {
  it("pads a single hex digit, which JS rejects with the u flag", () => {
    assert.deepEqual(t("[\\x0-\\x1F\\x7F0-9]", ""), ["[\\x00-\\x1F\\x7F0-9]", "u"]);
    assert.deepEqual(t("\\x7", ""), ["\\x07", "u"]);
  });

  it("leaves the two digit form and the digits that follow it alone", () => {
    assert.deepEqual(t("\\x1F", ""), ["\\x1F", "u"]);
    assert.deepEqual(t("\\x0a", ""), ["\\x0a", "u"]);
    assert.deepEqual(t("\\x1F7", ""), ["\\x1F7", "u"]);
  });

  it("leaves an escaped backslash before the x alone", () => {
    assert.deepEqual(t("\\\\x0", ""), ["\\\\x0", "u"]);
  });

  it("writes \\x{...} as the \\u{...} form JS knows", () => {
    assert.deepEqual(t("\\x{1F600}", ""), ["\\u{1F600}", "u"]);
    assert.deepEqual(t("\\x{61}", ""), ["\\u{61}", "u"]);
  });
});

describe("unicode escapes", () => {
  it("keeps the braces of \\u{...}", () => {
    assert.deepEqual(t("\\u{1F600}", ""), ["\\u{1F600}", "u"]);
    assert.deepEqual(t("\\u{61}", ""), ["\\u{61}", "u"]);
  });

  it("still reads u{2} as a quantifier", () => {
    assert.deepEqual(t("au{2,3}", ""), ["au{2,3}", "u"]);
  });
});

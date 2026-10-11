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

describe("unicode properties", () => {
  it("writes a bare Ruby script name as \\p{Script=...}", () => {
    assert.deepEqual(t("[\\p{Han}\\p{Hiragana}]+", ""), ["[\\p{Script=Han}\\p{Script=Hiragana}]+", "u"]);
    assert.deepEqual(t("\\p{Latin}+", ""), ["\\p{Script=Latin}+", "u"]);
  });

  it("writes the negated form as \\P{Script=...}", () => {
    assert.deepEqual(t("\\p{^Han}", ""), ["\\P{Script=Han}", "u"]);
    assert.deepEqual(t("\\P{^Han}", ""), ["\\p{Script=Han}", "u"]);
  });

  it("leaves the properties JS knows and the \\p{...=...} form alone", () => {
    for (const name of ["Word", "Alphabetic", "L", "Lu", "Lowercase_Letter", "White_Space", "Emoji"]) {
      assert.deepEqual(t(`\\p{${name}}`, ""), [`\\p{${name}}`, "u"]);
    }
    assert.deepEqual(t("\\p{Script=Han}", ""), ["\\p{Script=Han}", "u"]);
    assert.deepEqual(t("\\p{Script_Extensions=Han}", ""), ["\\p{Script_Extensions=Han}", "u"]);
  });

  it("leaves the POSIX names JS has no equivalent for as they were", () => {
    assert.deepEqual(t("\\p{Alnum}", ""), ["\\p{Alnum}", "u"]);
  });

  it("leaves an escaped backslash before the p alone", () => {
    assert.deepEqual(t("\\\\p{Han}", ""), ["\\\\p\\{Han\\}", "u"]);
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

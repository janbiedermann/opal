// Ruby ERB templates: the translation (erbToRuby), rendering (renderErb)
// and the .rb.erb/.js.erb builder processors.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { erbToRuby, renderErb } from "../../../lib/opal/compiler/erb.mjs";
import { Builder } from "../../../lib/opal/compiler/builder/builder.mjs";
import { NullCache } from "../../../lib/opal/compiler/builder/cache.mjs";
import { nodeErbRunner } from "../../../lib/opal/compiler/builder/erb_runner.mjs";
import { OPAL_ROOT } from "../../../lib/opal/compiler/paths.mjs";

const run = nodeErbRunner(Builder);
const render = (source, file = "/tmp/t.erb") => renderErb(source, { file, run });

describe("erbToRuby", () => {
  test("translates text, output, code and comments", () => {
    assert.equal(erbToRuby("a <%= x %> b"), '_erbout = []; _erbout << "a "; _erbout << (( x ).to_s); _erbout << " b"; _erbout.join');
    assert.equal(erbToRuby("<% if y %>z<% end %>"), '_erbout = [];  if y ; _erbout << "z";  end ; _erbout.join');
    assert.equal(erbToRuby("<%# c %>q"), '_erbout = []; _erbout << "q"; _erbout.join');
  });

  test("keeps lines in sync with the template", () => {
    const ruby = erbToRuby("a\nb\n<%# x\ny %>\n<%= __LINE__ %>");
    assert.equal(ruby.split("\n").length, 5);
  });

  test("escapes <%% and %%>, and Ruby string syntax in text", () => {
    assert.equal(erbToRuby('<%% "#{x}" \\ <%= "%%>" %>'), '_erbout = []; _erbout << "<% \\"\\#{x}\\" \\\\ "; _erbout << (( "%>" ).to_s); _erbout.join');
  });

  test("raises for an unclosed tag", () => {
    assert.throws(() => erbToRuby("a <%= x"), /not closed/);
  });
});

describe("renderErb (in a worker thread)", () => {
  // the expected results are Ruby's ERB.new(source).result
  test("renders like Ruby's ERB", () => {
    assert.equal(render("a <%= 1 + 1 %> b\n<% 2.times do |i| %>[<%= i %>]<% end %>\n"), "a 2 b\n[0][1]\n");
    assert.equal(render('<%# comment\nover lines %>x #{y} "q" \\ <%% <%= "%%>" %>\n<%= __LINE__ %> <%= File.basename(__FILE__) %>\n', "/tmp/t2.erb"), 'x #{y} "q" \\ <% %>\n3 t2.erb\n');
    assert.equal(render("<%\n  list = %w[a b c]\n%>\n<% list.each_with_index do |e, i| %>\n<%= i %>:<%= e.upcase %>\n<% end %>\ntail"), "\n\n0:A\n\n1:B\n\n2:C\n\ntail");
    assert.equal(render(""), "");
  });

  test("has the nodejs stdlib (File, ENV, __dir__)", () => {
    assert.equal(render("<%= __dir__ %> <%= File.exist?(__FILE__) %> <%= ENV.key?('PATH') %>", join(OPAL_ROOT, "Opalfile")), `${OPAL_ROOT} true true`);
  });

  test("reports errors of the template", () => {
    assert.throws(() => render("<%= raise 'boom' %>"), /ERB template error: boom/);
    assert.throws(() => render("<%= 1 + %>"), /expected an expression/);
  });
});

describe("processors", () => {
  test("build .rb.erb and .js.erb files", () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-erb-"));
    try {
      writeFileSync(join(dir, "app.rb"), 'require "conf"\nrequire "data"\nputs CONF.inspect\nputs DATA_JS\n');
      writeFileSync(join(dir, "conf.rb.erb"), "# from <%= File.basename(__FILE__) %>\nCONF = <%= [1, 2].map { |i| i * 10 }.inspect %>\n");
      writeFileSync(join(dir, "data.js.erb"), 'Opal.Object.$const_set("DATA_JS", "<%= ENV.fetch("ERB_TEST") %>");\n');
      process.env.ERB_TEST = "in-process";
      const builder = new Builder({ cache: new NullCache() });
      builder.appendPaths(dir);
      builder.build("app.rb");
      assert.ok(builder.toString().includes('"DATA_JS", "in-process"'));
      assert.ok(builder.toString().includes('Opal.modules["data"] = function() {Opal.Object.$const_set("DATA_JS", "'));
      const result = spawnSync(process.execPath, [join(OPAL_ROOT, "exe", "opal"), "--no-source-map", "-I", dir, join(dir, "app.rb")], { encoding: "utf8", env: { ...process.env, ERB_TEST: "hello", OPAL_CACHE_DISABLE: "1" } });
      assert.equal(result.stdout, "[10, 20]\nhello\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("use the builder's ERB runner", () => {
    const dir = mkdtempSync(join(tmpdir(), "opal-erb-"));
    try {
      writeFileSync(join(dir, "t.rb.erb"), "X = <%= 1 %>\n");
      const calls = [];
      const builder = new Builder({ cache: new NullCache(), erbRunner: (js) => { calls.push(js); return "X = :custom\n"; } });
      builder.appendPaths(dir);
      builder.build("t");
      assert.equal(calls.length, 1);
      assert.ok(builder.toString().includes('"custom"'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

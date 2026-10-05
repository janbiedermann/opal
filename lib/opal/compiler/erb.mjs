// Turns an .opalerb template into Ruby code for Opal's Template class.
// Port of the former Ruby lib/opal/erb.rb.
import { Compiler } from "./compiler.mjs";

const BLOCK_EXPR = /\s+(do|\{)(\s*\|[^|]*\|)?\s*$/;

export function prepareErb(source, fileName = "(erb)") {
  let result = source.replaceAll('"', '\\"');
  result = result.replace(/<%=([\s\S]+?)%>/g, (_, inner) => {
    inner = inner.replaceAll("\\'", "'").replaceAll('\\"', '"');
    if (BLOCK_EXPR.test(inner)) return `")\noutput_buffer.append= ${inner}\noutput_buffer.append("`;
    return `")\noutput_buffer.append=(${inner})\noutput_buffer.append("`;
  });
  result = result.replace(/<%([\s\S]+?)%>/g, (_, inner) => `")\n${inner.replaceAll('\\"', '"')}\noutput_buffer.append("`);
  const path = fileName.replace(/\.opalerb$/, "");
  result = `Template.new('${path}') do |output_buffer|\noutput_buffer.append("${result}")\noutput_buffer.join\nend\n`;
  return 'require "erb";' + result;
}

// Ruby ERB templates (.rb.erb, .js.erb), evaluated at build time.
//
// erbToRuby turns a template into Ruby code that returns the result, like
// Ruby's ERB in its default mode: <%= expr %> outputs, <% code %> runs,
// <%# comment %> is ignored, <%% is a literal <% (and %%> a literal %> in
// a tag). Lines stay in sync with the template (for __LINE__ and errors).
export function erbToRuby(source) {
  const out = ["_erbout = []; "];
  const text = (str) => {
    if (str === "") return;
    out.push(`_erbout << ${rubyStringLiteral(str)}; `, "\n".repeat((str.match(/\n/g) || []).length));
  };
  let i = 0;
  let pending = "";
  while (i < source.length) {
    const open = source.indexOf("<%", i);
    if (open === -1) {
      pending += source.slice(i);
      break;
    }
    pending += source.slice(i, open);
    if (source[open + 2] === "%") {
      // <%% is a literal <%
      pending += "<%";
      i = open + 3;
      continue;
    }
    text(pending);
    pending = "";
    let start = open + 2;
    const kind = source[start] === "=" || source[start] === "#" ? source[start++] : "";
    // the tag ends at the first %> that isn't %%>
    let code = "";
    let j = start;
    for (;;) {
      const close = source.indexOf("%>", j);
      if (close === -1) throw new SyntaxError("ERB: a tag is not closed (missing %>)");
      if (source[close - 1] === "%") {
        code += source.slice(j, close - 1) + "%>";
        j = close + 2;
        continue;
      }
      code += source.slice(j, close);
      i = close + 2;
      break;
    }
    if (kind === "=") out.push(`_erbout << ((${code}).to_s); `);
    else if (kind === "#") out.push("\n".repeat((code.match(/\n/g) || []).length));
    else out.push(`${code}; `);
  }
  text(pending);
  out.push("_erbout.join");
  return out.join("");
}

// A Ruby double-quoted string literal of str.
function rubyStringLiteral(str) {
  return '"' + str.replace(/[\\"#\n\r\t]/g, (c) => ({ "\\": "\\\\", '"': '\\"', "#": "\\#", "\n": "\\n", "\r": "\\r", "\t": "\\t" })[c]) + '"';
}

// Renders a Ruby ERB template: run(js) runs compiled Ruby code (compiled
// in eval mode) in an Opal runtime and returns its value. `file` is the
// template's path (__FILE__, __dir__ and error messages).
export function renderErb(source, { file = "(erb)", run }) {
  const js = new Compiler(erbToRuby(source), { file, eval: true }).compile();
  return String(run(js));
}

// A runner for the Opal runtime the code runs in (a browser page with
// opal-parser, or any Opal program): renderErb(source, { run: opalErbRunner(Opal) }).
export function opalErbRunner(Opal) {
  return (js) => new Function("Opal", "self", `return ${js}`)(Opal, Opal.top);
}

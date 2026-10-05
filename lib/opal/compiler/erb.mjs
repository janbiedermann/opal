// Turns an .opalerb template into Ruby code for Opal's Template class.
// Port of the former Ruby lib/opal/erb.rb.
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

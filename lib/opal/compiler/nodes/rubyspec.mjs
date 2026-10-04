// Special calls for running ruby/spec (mspec) with Opal, enabled by the
// `rubyspec_specials` option. Port of tasks/testing/mspec_special_calls.rb:
// rubyspec uses these features at runtime, which Opal can't do, so they
// are handled during compilation.
import { addSpecial } from "./call.mjs";
import { isNode, eachChild } from "../transforms/walk.mjs";
import { resolveRequire } from "./call_specials.mjs";

const isOpalSym = (node) => node.type === "SymbolNode" && node.unescaped === "opal";

function hasXstring(node) {
  if (!isNode(node)) return false;
  if (node.type === "XStringNode" || node.type === "InterpolatedXStringNode") return true;
  let found = false;
  eachChild(node, (child) => {
    if (!found && hasXstring(child)) found = true;
  });
  return found;
}

function rubyspec(handler) {
  return function (compileDefault) {
    if (!this.compiler.options.rubyspec_specials) return compileDefault();
    return handler.call(this, compileDefault);
  };
}

addSpecial("not_supported_on", rubyspec(function (compileDefault) {
  if (!this.arglist.some(isOpalSym)) compileDefault();
}));

addSpecial("platform_is_not", rubyspec(function (compileDefault) {
  if (this.arglist.some(isOpalSym)) return;
  if (this.arglist.some(hasXstring) || hasXstring(this.iter)) return;
  compileDefault();
}));

addSpecial("platform_is", rubyspec(function (compileDefault) {
  if (this.arglist.some(isOpalSym) || !(this.arglist.some(hasXstring) || hasXstring(this.iter))) compileDefault();
}));

addSpecial("requirable_spec_file", rubyspec(function () {
  const str = resolveRequire(this.compiler, this.arglist[0]);
  if (str != null) this.compiler.trackRequire(str);
}));

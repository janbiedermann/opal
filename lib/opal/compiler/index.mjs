// Opal's Ruby-to-JavaScript compiler.
//
//   import { compile } from "./lib/opal/compiler/index.mjs";
//   compile("puts 'hello'", { file: "hello.rb" }); // => JavaScript source
export { Compiler, OpalSyntaxError } from "./compiler.mjs";
export { VERSION } from "./version.mjs";
import { Compiler } from "./compiler.mjs";

// Compiles ruby source to javascript. Options are the Ruby compiler's
// options with the same names (file, requirable, esm, eval, ...).
export function compile(source, options = {}) {
  return new Compiler(source, options).compile();
}

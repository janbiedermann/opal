// The opalLsp/compileToJs request (port of
// ../../features/compile_to_js.rb): what `Opal` would make of this file.
// The in-process Compiler answers the compiled JavaScript, or the
// OpalSyntaxError the compiler raised - which is the compile-gate
// diagnostic itself, shown here on demand.
import { compile, OpalSyntaxError } from "../../../compiler/index.mjs";

export function perform(document) {
  document.parse();
  try {
    return { code: compile(document.source) };
  } catch (e) {
    if (e instanceof OpalSyntaxError) return { error: { message: e.message } };
    throw e;
  }
}

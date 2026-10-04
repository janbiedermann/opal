// AST passes that run between parsing and code generation, in the order
// of the Ruby compiler's rewriters (lib/opal/rewriter.rb).
import { normalize } from "./normalize.mjs";
import { opalEngineCheck, returnableLogic } from "./conditionals.mjs";
import { targetedPatches } from "./targeted_patches.mjs";
import { dotJsSyntax } from "./dot_js_syntax.mjs";
import { operatorAssignment } from "./operator_assignment.mjs";
import { throwerFinder } from "./thrower_finder.mjs";

const PASSES = [
  normalize,
  opalEngineCheck,
  targetedPatches,
  dotJsSyntax,
  operatorAssignment,
  returnableLogic,
  throwerFinder,
];

export function transform(compiler, ast) {
  for (const pass of PASSES) ast = pass(compiler, ast);
  return ast;
}

// AST passes that run between parsing and code generation, in the order
// of the Ruby compiler's rewriters (lib/opal/rewriter.rb).
import { prePostExecution } from "./pre_post_execution.mjs";
import { normalize } from "./normalize.mjs";
import { opalEngineCheck, returnableLogic } from "./conditionals.mjs";
import { forRewriter } from "./for_rewriter.mjs";
import { targetedPatches } from "./targeted_patches.mjs";
import { dotJsSyntax } from "./dot_js_syntax.mjs";
import { patternMatching } from "./pattern_matching.mjs";
import { operatorAssignment } from "./operator_assignment.mjs";
import { throwerFinder } from "./thrower_finder.mjs";
import { rubyspecFilters } from "./rubyspec_filters.mjs";
import { eachChild } from "./walk.mjs";

// What a pass needs to find in the parse tree to have anything to do (no
// earlier pass creates these); passes without a trigger always run.
const has = (...types) => (census) => types.some((t) => census.types.has(t));
const OPERATOR_WRITES = ["LocalVariable", "InstanceVariable", "GlobalVariable", "ClassVariable", "Constant", "ConstantPath", "Call", "Index"]
  .flatMap((prefix) => [`${prefix}OrWriteNode`, `${prefix}AndWriteNode`, `${prefix}OperatorWriteNode`]);

const PASSES = [
  [prePostExecution, has("PreExecutionNode", "PostExecutionNode")],
  [normalize, null],
  [opalEngineCheck, (census) => census.engineCheck],
  [forRewriter, has("ForNode")],
  [targetedPatches, (census) => census.targetedPatch],
  [dotJsSyntax, (census) => census.jsCall],
  [patternMatching, has("CaseMatchNode", "MatchPredicateNode", "MatchRequiredNode")],
  [operatorAssignment, has(...OPERATOR_WRITES)],
  [returnableLogic, null],
  // (rescue-else: an ElseNode)
  [throwerFinder, has("BreakNode", "RedoNode", "RetryNode", "ElseNode")],
  [rubyspecFilters, null],
];

// The node types of a parse tree, and whether it has `.JS` calls,
// RUBY_ENGINE/RUBY_PLATFORM checks and the patterns of targeted_patches.mjs
// (a def ending in `x = ...; x`, an array literal of more than 32 elements).
function takeCensus(root) {
  const census = { types: new Set(), jsCall: false, engineCheck: false, targetedPatch: false };
  const visit = (node) => {
    census.types.add(node.type);
    if (node.type === "CallNode" && node.name === "JS") census.jsCall = true;
    else if ((node.type === "ConstantReadNode" || node.type === "ConstantPathNode") && (node.name === "RUBY_ENGINE" || node.name === "RUBY_PLATFORM")) census.engineCheck = true;
    else if (node.type === "ArrayNode" && node.elements.length > 32) census.targetedPatch = true;
    else if (node.type === "DefNode" && node.body && node.body.type === "StatementsNode" && node.body.body.length >= 2) {
      const [assignment, ret] = node.body.body.slice(-2);
      if (assignment.type === "LocalVariableWriteNode" && ret.type === "LocalVariableReadNode" && assignment.name === ret.name) census.targetedPatch = true;
    }
    eachChild(node, visit);
  };
  visit(root);
  return census;
}

export function transform(compiler, ast) {
  const census = takeCensus(ast);
  for (const [pass, trigger] of PASSES) {
    if (trigger === null || trigger(census)) ast = pass(compiler, ast);
  }
  return ast;
}

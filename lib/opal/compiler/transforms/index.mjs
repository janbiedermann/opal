// AST passes that run between parsing and code generation, in the order
// of the Ruby compiler's rewriters (lib/opal/rewriter.rb).
const PASSES = [];

export function transform(compiler, ast) {
  for (const pass of PASSES) ast = pass(compiler, ast);
  return ast;
}

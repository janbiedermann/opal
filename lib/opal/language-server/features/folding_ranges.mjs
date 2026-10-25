// The textDocument/foldingRange request (port of
// ../../features/folding_ranges.rb). Three fold kinds, as ruby-lsp
// advertises them (LSP FoldingRangeKind):
// - "comment": consecutive # lines and =begin/=end blocks, from the
//   envelope's comments (raw offsets, not locations - comments aren't nodes);
// - "region": the keyword/end pairs and the brace blocks of the tree;
// - "imports": one fold for the leading run of require/load calls.
import { walk } from "../node.mjs";

const KIND_COMMENT = "comment";
const KIND_IMPORTS = "imports";
const KIND_REGION = "region";

const IMPORTS = ["require", "require_relative", "load"];

// The keyword/end pairs and brace blocks, as {open, close} offsets.
// The *_loc fields are loc POJOs ({start:, end:}) or null when the
// keyword has no keyword form (modifier if/unless/while).
const REGION_PAIRS = {
  ClassNode: ["class_keyword_loc", "end_keyword_loc"],
  ModuleNode: ["module_keyword_loc", "end_keyword_loc"],
  SingletonClassNode: ["class_keyword_loc", "end_keyword_loc"],
  DefNode: ["def_keyword_loc", "end_keyword_loc"],
  IfNode: ["keyword_loc", "end_keyword_loc"],
  UnlessNode: ["keyword_loc", "end_keyword_loc"],
  WhileNode: ["keyword_loc", "end_keyword_loc"],
  UntilNode: ["keyword_loc", "end_keyword_loc"],
  ForNode: ["for_keyword_loc", "end_keyword_loc"],
  CaseNode: ["keyword_loc", "end_keyword_loc"],
  BeginNode: ["begin_keyword_loc", "end_keyword_loc"],
  BlockNode: ["opening_loc", "closing_loc"],
};

export function perform(document) {
  const parseResult = document.parse();

  let folds = commentFolds(parseResult);
  folds = folds.concat(regionFolds(parseResult));
  const imp = importsFold(parseResult);
  if (imp !== null) folds.push(imp);

  return folds
    .sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine)
    .map((f) => ({ startLine: f.startLine, endLine: f.endLine, kind: f.kind }));
}

function commentFolds(parseResult) {
  const folds = [];
  let groupStart = null;
  let groupEnd = null;

  for (const comment of parseResult.comments) {
    const [sLine] = parseResult.positionAt(comment.start);
    const [eLine] = parseResult.positionAt(comment.end);

    if (comment.type === "embdoc") {
      folds.push({ startLine: sLine, endLine: eLine, kind: KIND_COMMENT });
      groupStart = groupEnd = null;
      continue;
    }

    // Consecutive inline comment lines join one fold; a gap starts over.
    if (groupEnd != null && sLine <= groupEnd + 1) {
      groupEnd = eLine;
    } else {
      if (groupStart != null && groupEnd > groupStart) {
        folds.push({ startLine: groupStart, endLine: groupEnd, kind: KIND_COMMENT });
      }
      groupStart = sLine;
      groupEnd = eLine;
    }
  }

  if (groupStart != null && groupEnd > groupStart) {
    folds.push({ startLine: groupStart, endLine: groupEnd, kind: KIND_COMMENT });
  }
  return folds;
}

function regionFolds(parseResult) {
  const pairs = [];
  walk(parseResult.ast, (node) => {
    const pair = REGION_PAIRS[node.type];
    if (pair === undefined) return;
    const openLoc = node[pair[0]];
    const closeLoc = node[pair[1]];
    if (openLoc == null || closeLoc == null) return;
    pairs.push([openLoc.start, closeLoc.start]);
  });

  const folds = [];
  for (const [openOffset, closeOffset] of pairs) {
    const [sLine] = parseResult.positionAt(openOffset);
    const [eLine] = parseResult.positionAt(closeOffset);
    if (eLine > sLine) folds.push({ startLine: sLine, endLine: eLine, kind: KIND_REGION });
  }
  return folds;
}

// One fold spanning a leading run of top-level require/load calls
// (comments inside the run don't break it - they are not statements).
function importsFold(parseResult) {
  const body = parseResult.ast.statements;
  if (body == null) return null;
  const statements = body.body ?? [];

  let first = null;
  let last = null;
  for (const node of statements) {
    // Comments are not statements, so they never break the run here;
    // the first non-import statement does.
    if (!(node.type === "CallNode" && IMPORTS.includes(node.name))) break;
    if (first === null) first = node;
    last = node;
  }

  if (first === null || last === first) return null;
  const [sLine] = parseResult.positionAt(first.location.start);
  const [eLine] = parseResult.positionAt(last.location.end);
  if (eLine <= sLine) return null;
  return { startLine: sLine, endLine: eLine, kind: KIND_IMPORTS };
}

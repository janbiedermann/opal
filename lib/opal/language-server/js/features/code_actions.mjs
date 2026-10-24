// textDocument/codeAction (port of ../../features/code_actions.rb):
// mechanical quickfixes for the gate diagnostics (LSP.md §2 gate 3). The
// client hands the diagnostics back in the request context, so a fix only
// needs to recognize its code and re-locate the node that produced it by
// the diagnostic's exact range start.
//
// v1 fixes, all single-edit:
//  * unsupported.string-mutation -> drop the bang (the non-bang method is
//    the Opal answer: "a".gsub!(x, y) becomes "a".gsub(x, y) at the call).
//  * unsupported.require        -> remove the require call.
//  * compile-warning /o         -> delete the /o flag character (the flag
//    array says "once", the source ends with the o after the closer).
// Plus two refactors: a single-line selection extracts to a local named
// `extracted` (refactor.extract, P7) - only when the selection itself
// parses as exactly one expression - and extract to method (P7b).
import { ParseResult } from "../parse_result.mjs";
import { childNodes } from "../node.mjs";

export function perform(document, context, range, only = null) {
  const diagnostics = context?.diagnostics ?? [];
  const parseResult = document.parse();
  const actions = [];
  const allowed = only == null || only.length === 0 ? null : only;

  if (kindAllowed(allowed, "quickfix")) {
    for (const diagnostic of diagnostics) {
      switch (diagnostic.code) {
        case "unsupported.string-mutation": {
          const node = findCallAt(parseResult, diagnostic.range);
          if (node !== null) actions.push(dropBang(document, parseResult, diagnostic, node));
          break;
        }
        case "unsupported.string-append": {
          const node = findCallAt(parseResult, diagnostic.range);
          if (node !== null) actions.push(appendToPlus(document, parseResult, diagnostic, node));
          break;
        }
        case "unsupported.require": {
          const node = findCallAt(parseResult, diagnostic.range);
          if (node !== null) actions.push(removeCall(document, diagnostic, node, parseResult, "Remove this require - Opal does not provide it"));
          break;
        }
        case "unsupported.thread":
        case "unsupported.fiber":
        case "unsupported.data-define": {
          // The call itself is the unsupported API; removal is offered
          // as a suggestion (the code cannot work as written anyway).
          const node = findCallAt(parseResult, diagnostic.range);
          if (node !== null) actions.push(removeCall(document, diagnostic, node, parseResult, "Remove this call - Opal does not have it"));
          break;
        }
        case "compile-warning": {
          if (!diagnostic.message.includes("Skipping the 'o' Regexp flag")) continue;
          const node = findOnceRegexpAt(parseResult, diagnostic.range.start.line);
          if (node === null) continue;
          const fix = dropOFlag(document, parseResult, diagnostic, node);
          if (fix !== null) actions.push(fix);
          break;
        }
        default:
      }
    }
  }
  if (kindAllowed(allowed, "refactor.extract")) {
    const extract = extractVariable(document, parseResult, range);
    if (extract !== null) actions.push(extract);
  }
  if (kindAllowed(allowed, "refactor.extract.method")) {
    const extracted = extractMethod(document, parseResult, range);
    if (extracted !== null) actions.push(extracted);
  }
  return actions;
}

// LSP `only` is exact-kind matching, but an advertised parent kind
// asks for its subkinds too, so compare on the dot-separated prefix.
function kindAllowed(allowed, kind) {
  return allowed === null || allowed.some((a) => kind === a || kind.startsWith(`${a}.`));
}

// refactor.extract.method (LSP.md §9 P7): v1 extracts only within
// a method body, single-line selections, the new def spliced right
// below the enclosing one. Bare identifiers in the selection that
// are locals or parameters of the enclosing def become arguments;
// uses of block parameters (their scope would not survive the
// move), of keyword params, of return/break/next or of super all
// refuse rather than mis-transform.
function extractMethod(document, parseResult, range) {
  if (range == null) return null;
  const startAt = range.start;
  const endAt = range.end;
  if (startAt.line !== endAt.line || samePosition(startAt, endAt)) return null;
  const line = startAt.line;
  const from = parseResult.offsetFor(line, startAt.character);
  const to = parseResult.offsetFor(line, endAt.character);
  const selection = document.source.slice(from, to);
  if (selection === "" || selection.trim() === "") return null;
  const check = new ParseResult(selection);
  if (check.syntaxError) return null;
  if (check.envelope.ast.statements?.body?.length !== 1) return null;
  const defNode = enclosingDef(parseResult, startAt, endAt);
  if (defNode === null) return null;

  let refuse = false;
  const free = [];
  walkStack(check.ast, (node) => {
    switch (node.type) {
      case "ReturnNode":
      case "BreakNode":
      case "NextNode":
      case "ZSuperNode":
      case "SuperNode":
        refuse = true;
        break;
      case "VCallNode":
        free.push(node.name);
        break;
      case "CallNode":
        // Opal's parser answers a bare identifier as a receiverless
        // CallNode; names the enclosing def does not own are real
        // method calls and stay in the body untouched.
        if (node.receiver == null) free.push(node.name);
        break;
      case "LocalVariableReadNode":
        free.push(node.name);
        break;
      default:
    }
  });
  if (refuse) return null;
  if (free.some((name) => defBlockParamNames(defNode).includes(name))) return null;

  const names = defOwnNames(defNode); // null: keyword params in play
  if (names === null) return null;
  const args = [...new Set(free)].filter((n) => names.includes(n));

  const indent = lineIndent(document, parseResult, defNode);
  if (indent === null) return null;
  const receiver = defNode.receiver ?? null;
  let prefix = "";
  if (receiver !== null) {
    if (receiver.type !== "SelfNode") return null; // def on another object: out of scope
    prefix = "self.";
  }

  const name = "extracted";
  const sig = args.length === 0 ? "" : `(${args.join(", ")})`;
  const call = args.length === 0 ? name : `${name}(${args.join(", ")})`;
  const defRange = parseResult.rangeForNode(defNode);
  const endLine = defRange.end.line;
  const at = { line: endLine, character: parseResult.lineRange(endLine).end.character };
  const insert = {
    range: { start: at, end: at },
    newText: `\n${indent}def ${prefix}${name}${sig}\n${indent}  ${selection.trim()}\n${indent}end`,
  };
  const replace = { range, newText: call };
  return {
    title: "Extract to method",
    kind: "refactor.extract.method",
    edit: { changes: { [document.uri]: [insert, replace] } },
  };
}

function enclosingDef(parseResult, startAt, endAt) {
  let found = null;
  walkStack(parseResult.ast, (node) => {
    if (node.type !== "DefNode") return;
    const range = parseResult.rangeForNode(node);
    if (!rangeContains(range, startAt, endAt)) return;
    if (found === null) found = node;
    else {
      const foundRange = parseResult.rangeForNode(found);
      if (rangeContains(foundRange, range.start, range.end)) found = node;
    }
  });
  return found;
}

function samePosition(a, b) {
  return a.line === b.line && a.character === b.character;
}

function rangeContains(range, startAt, endAt) {
  const afterStart = startAt.line > range.start.line ||
    (startAt.line === range.start.line && startAt.character >= range.start.character);
  const beforeEnd = endAt.line < range.end.line ||
    (endAt.line === range.end.line && endAt.character <= range.end.character);
  return afterStart && beforeEnd;
}

// The enclosing def's own name space: plain parameters plus every
// assignment target. null answers when keyword parameters are in
// play (their extraction needs `key: key` plumbing v1 declines).
function defOwnNames(defNode) {
  const names = [];
  const params = defNode.parameters ?? null;
  if (params !== null) {
    for (const p of childNodes(params)) {
      if (!p.type.endsWith("ParameterNode")) continue;
      if (p.type.includes("Keyword")) return null;
      const name = p.name ?? null;
      if (name !== null) names.push(name);
    }
  }
  walkStack(defNode, (node) => {
    if (node.type === "LocalVariableWriteNode") names.push(node.name);
  });
  return names;
}

function defBlockParamNames(defNode) {
  const names = [];
  walkStack(defNode, (node) => {
    if (node.type === "BlockParametersNode") {
      for (const params of childNodes(node)) {
        for (const p of childNodes(params)) {
          if (!p.type.endsWith("ParameterNode")) continue;
          const name = p.name ?? null;
          if (name !== null) names.push(name);
        }
      }
    }
  });
  return names;
}

// The blank (spaces/tabs) in front of the enclosing def's `def`
// keyword, reused for the inserted one.
function lineIndent(document, parseResult, defNode) {
  const startAt = parseResult.rangeForNode(defNode).start;
  const from = parseResult.offsetFor(startAt.line, 0);
  const to = parseResult.offsetFor(startAt.line, startAt.character);
  const indent = document.source.slice(from, to);
  return /^[ \t]*$/.test(indent) ? indent : null;
}

// refactor.extract (LSP.md §9 P7): pure-text, single-line only.
// The selection must parse as exactly one expression (the check
// assignment below has a single statement and no syntax error),
// or there is no action: extracting part of a multiline
// expression, or a statement list, would change the program.
function extractVariable(document, parseResult, range) {
  if (range == null) return null;
  const startAt = range.start;
  const endAt = range.end;
  if (startAt.line !== endAt.line || samePosition(startAt, endAt)) return null;
  const line = startAt.line;
  const from = parseResult.offsetFor(line, startAt.character);
  const to = parseResult.offsetFor(line, endAt.character);
  const selection = document.source.slice(from, to);
  if (selection === "") return null;
  const check = new ParseResult(`x = ${selection}`);
  if (check.syntaxError) return null;
  if (check.envelope.ast.statements?.body?.length !== 1) return null;
  // Match the enclosing statement's indentation when the new line
  // is spliced in above it.
  const lineStart = parseResult.offsetFor(line, 0);
  let i = lineStart;
  while (i < document.source.length && document.source[i] === " ") i++;
  const indent = document.source.slice(lineStart, i);
  const insert = {
    range: { start: { line, character: 0 }, end: { line, character: 0 } },
    newText: `extracted = ${selection}\n${indent}`,
  };
  const replace = { range, newText: "extracted" };
  return {
    title: "Extract to local variable",
    kind: "refactor.extract",
    edit: { changes: { [document.uri]: [insert, replace] } },
  };
}

// The CallNode whose range starts exactly where the diagnostic says
// it does - to_range built the diagnostic, so the match is exact.
function findCallAt(parseResult, range) {
  const [line, character] = [range.start.line, range.start.character];
  const stack = [parseResult.ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.type === "CallNode" && node.message_loc != null) {
      const [l, c] = parseResult.positionAt(node.location.start);
      if (l === line && c === character) return node;
    }
    for (const child of childNodes(node)) stack.push(child);
  }
  return null;
}

// A /.../ literal carrying the "once" flag on that line. The flag
// list is a field of the POJO.
function findOnceRegexpAt(parseResult, line) {
  const stack = [parseResult.ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.type === "RegularExpressionNode") {
      const [nodeLine] = parseResult.positionAt(node.location.start);
      if (nodeLine === line) {
        for (const flag of node.flags ?? []) if (flag === "once") return node;
      }
    }
    for (const child of childNodes(node)) stack.push(child);
  }
  return null;
}

function dropBang(document, parseResult, diagnostic, node) {
  const message = parseResult.rangeForLoc(node.message_loc);
  const endAt = message.end;
  const name = node.name;
  const edit = {
    range: { start: { line: endAt.line, character: endAt.character - 1 }, end: endAt },
    newText: "",
  };
  return action(document, diagnostic, `Use String#${name.slice(0, -1)} - String is immutable in Opal`, edit);
}

function removeCall(document, diagnostic, node, parseResult, title) {
  const edit = { range: parseResult.rangeForNode(node), newText: "" };
  return action(document, diagnostic, title, edit);
}

function appendToPlus(document, parseResult, diagnostic, node) {
  const message = parseResult.rangeForLoc(node.message_loc);
  const edit = { range: message, newText: "+=" };
  return action(document, diagnostic, "Use += - String is immutable in Opal", edit);
}

function dropOFlag(document, parseResult, diagnostic, node) {
  // The character to delete is the "o" flag right after the closer;
  // when the flags end differently (an unusual /foi order), no fix.
  const endOffset = node.location.end;
  const ok = document.source[endOffset - 1] === "o" && !/[A-Za-z0-9_]/.test(document.source[endOffset - 2]);
  if (!ok) return null;
  const [el, ec] = parseResult.positionAt(endOffset);
  const [sl, sc] = parseResult.positionAt(endOffset - 1);
  const edit = {
    range: { start: { line: sl, character: sc }, end: { line: el, character: ec } },
    newText: "",
  };
  return action(document, diagnostic, "Drop the /o flag - Opal ignores it", edit);
}

function action(document, diagnostic, title, edit) {
  return {
    title,
    kind: "quickfix",
    diagnostics: [diagnostic],
    edit: { changes: { [document.uri]: [edit] } },
  };
}

// Iterative stack walk (same order as the Ruby while-stack).
function walkStack(root, visit) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    visit(node);
    for (const child of childNodes(node)) stack.push(child);
  }
}

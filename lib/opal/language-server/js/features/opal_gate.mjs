// The two deep Opal gates (LSP.md §2), beyond the parse gate (port of
// ../../features/opal_gate.rb):
//
// * the compile gate - the Compiler, run on SAVE only (heavier than
//   parse): everything the parser accepts but Opal refuses to compile
//   ("unsupported parameter" destructuring params, bad rescue targets,
//   Ruby regexps V8 rejects) becomes a severity-1 diagnostic at the
//   OpalSyntaxError's own location (1-based line, 0-based UTF-16 column
//   - the JS error carries them).
// * the API gate - a curated list of what Opal does not support (no Thread,
//   no Fiber, no Data, immutable Strings, Symbol==String, missing stdlib
//   requires), matched on the parse tree, published with the parse gate on
//   every edit. The list is deliberately small: these patterns run at
//   *edit* time, so they only fire on unambiguous shapes (literal-receiver
//   bangs, an exact require name), never on a plain identifier a workspace
//   file might define itself.
import { walk, childNodes } from "../node.mjs";
import { Compiler, OpalSyntaxError } from "../../../compiler/index.mjs";

// corelib/unsupported.rb raises NotImplementedError at run time for
// these on a String receiver.
const BANG_METHODS = [
  "gsub!", "sub!", "tr!", "squeeze!", "chop!", "chomp!", "slice!", "strip!", "lstrip!", "rstrip!",
  "upcase!", "downcase!", "capitalize!", "swapcase!", "delete!", "succ!",
];
// Receiver types whose value IS a String. XStringNode is deliberately
// NOT one of them (it is in NavigationTarget's completion typing but
// not here): a backtick body answers arbitrary JavaScript - corelib
// pushes onto `js_arr` << id - and typing that as a String flagged
// Opal's own source in the §8 corpus audit.
const STRING_LITERAL_TYPES = ["StringNode", "StringInterpolationNode", "StringHeredocNode"];

// stdlib names that neither the baked set nor Opal's loader provides
// (cross-checked against the stdlib/ tree): require resolves to
// nothing and the node platform loader silently skips it (no LoadError
// - AGENTS.md), so say so at the call.
const MISSING_REQUIRES = [
  "psych", "readline", "reline", "irb", "resolv", "Reline", "net/http", "net/https", "net/smtp",
  "ripper", "csv", "pstore", "fiber",
];

// ---- the compile gate (on save) ----

export function compileDiagnostics(document) {
  const out = [];
  let error = null;
  const warnings = [];
  const options = {
    file: String(document.uri),
    dynamic_require_severity: "ignore",
    warning: (text) => warnings.push(String(text)),
  };
  try {
    new Compiler(String(document.source), options).compile();
  } catch (e) {
    if (e instanceof OpalSyntaxError || (e && e.name === "OpalSyntaxError")) {
      error = { message: String(e.message), line: e.line, column: e.column, sourceLine: e.sourceLine };
    } else {
      error = { message: String((e && e.message) || e), line: null, column: null };
    }
  }

  if (error !== null) {
    const { line } = error;
    let { column } = error;
    if (typeof line === "number") {
      // LSP positions are 0-based; the error's line is 1-based and
      // its column already a UTF-16 offset. The end spans the
      // source line that failed (it is what the editor shows).
      let width = typeof error.sourceLine === "string" ? String(error.sourceLine).replace(/\s+$/, "").length : 1;
      if (typeof column !== "number") column = 0;
      if (width < 1) width = 1;
      out.push({
        range: {
          start: { line: line - 1, character: column },
          end: { line: line - 1, character: column + width },
        },
        severity: 1, source: "opal", code: "compile",
        message: error.message,
      });
    } else {
      // A compiler refusal with no source position: document start.
      out.push({
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        severity: 1, source: "opal", code: "compile",
        message: error.message,
      });
    }
  }

  for (const text of warnings) {
    if (out.some((d) => d.message === text)) continue;
    if (document.diagnostics.some((d) => d.message === text)) continue; // the parse gate already said it
    // The Compiler's warning() ends the text with "-- <file>:<line>";
    // recover that line so the diagnostic spans the source line and
    // code actions can anchor to it.
    const m = /:(\d+)$/.exec(text);
    const range = m !== null
      ? document.parse().lineRange(Number(m[1]) - 1)
      : { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
    out.push({
      range,
      severity: 2, source: "opal", code: "compile-warning",
      message: text,
    });
  }
  return out;
}

// ---- the API gate (on open/change, with the parse gate) ----

export function apiDiagnostics(document) {
  const parseResult = document.parse();
  const ast = parseResult.ast;
  const typed = stringTypedNames(ast);
  const out = [];
  walk(ast, (node) => checkNode(parseResult, node, out, typed));
  return out;
}

// Inference-lite receiver typing, the same philosophy as P2/P4:
// a name counts as a String when the document assigns it exactly
// once and that one assignment is a String literal, and no method
// or block parameter shadows the name. Anything beyond that is
// guesswork and stays un-gated.
function stringTypedNames(ast) {
  const singleString = [];
  const assignedTwice = [];
  const parameters = [];
  walk(ast, (node) => {
    switch (node.type) {
      case "LocalVariableWriteNode":
      case "InstanceVariableWriteNode": {
        const name = node.name ?? null;
        if (singleString.includes(name)) {
          singleString.splice(singleString.indexOf(name), 1);
          assignedTwice.push(name);
        } else if (!assignedTwice.includes(name)) {
          const value = node.value ?? null;
          if (value !== null && value.type === "StringNode") singleString.push(name);
        }
        break;
      }
      case "RequiredParameterNode":
      case "OptionalParameterNode":
      case "RestParameterNode":
      case "PostRequiredParameterNode":
      case "RequiredKeywordParameterNode":
      case "OptionalKeywordParameterNode":
      case "KeywordRestParameterNode":
      case "BlockParameterNode":
        parameters.push(node.name ?? null);
        break;
      default:
    }
  });
  return singleString.filter((name) => !parameters.includes(name));
}

function stringReceiver(node, typedNames) {
  const receiver = node.receiver ?? null;
  if (receiver === null) return false;
  if (STRING_LITERAL_TYPES.includes(receiver.type)) return true;
  return (receiver.type === "LocalVariableReadNode" || receiver.type === "InstanceVariableReadNode") &&
    typedNames.includes(receiver.name);
}

function checkNode(parseResult, node, out, typedNames) {
  switch (node.type) {
    case "CallNode": {
      const receiver = node.receiver ?? null;
      // Thread.current is real (stdlib/thread.rb shims it); every
      // other Thread entry point is not. Fiber has no shim at all.
      if (receiver !== null && receiver.type === "ConstantReadNode" && receiver.name === "Thread" && node.name !== "current") {
        out.push(diagnostic(parseResult, node, "unsupported.thread",
          "Opal has no Thread: JavaScript has no OS threads"));
      } else if (receiver !== null && receiver.type === "ConstantReadNode" && receiver.name === "Fiber") {
        out.push(diagnostic(parseResult, node, "unsupported.fiber",
          "Opal has no Fiber: there is no scheduler to yield to"));
      } else if (node.name === "define" && receiver !== null && receiver.type === "ConstantReadNode" && receiver.name === "Data") {
        out.push(diagnostic(parseResult, node, "unsupported.data-define", "Opal has no Data class"));
      } else if (node.name === "<<" && stringReceiver(node, typedNames)) {
        out.push(diagnostic(parseResult, node, "unsupported.string-append",
          "String#<< raises NotImplementedError: String is immutable in Opal - use +="));
      } else if (BANG_METHODS.includes(node.name) && stringReceiver(node, typedNames)) {
        out.push(diagnostic(parseResult, node, "unsupported.string-mutation",
          `String is immutable in Opal: String#${node.name} raises NotImplementedError`));
      } else if ((node.name === "is_a?" || node.name === "kind_of?" || node.name === "instance_of?") &&
        symbolArgument(node)) {
        out.push(diagnostic(parseResult, node, "unsupported.symbol-check",
          "Symbol is String in Opal: is_a?(Symbol) answers true for every String"));
      } else if (node.name === "===" && receiver !== null && receiver.type === "ConstantReadNode" && receiver.name === "Symbol") {
        out.push(diagnostic(parseResult, node, "unsupported.symbol-check",
          "Symbol is String in Opal: Symbol === x answers true for every String"));
      } else if (node.name === "require" && missingRequire(node)) {
        out.push(diagnostic(parseResult, node, "unsupported.require",
          "Opal does not provide this stdlib: the require is silently skipped at run time"));
      }
      break;
    }
    default:
  }
}

function symbolArgument(call) {
  const args = call.arguments ?? null;
  if (args === null) return false;
  return childNodes(args).some((a) => a.type === "ConstantReadNode" && a.name === "Symbol");
}

function missingRequire(call) {
  const args = call.arguments ?? null;
  if (args === null) return false;
  return childNodes(args).some((a) => a.type === "StringNode" && MISSING_REQUIRES.includes(a.unescaped));
}

function diagnostic(parseResult, node, code, message) {
  return {
    range: parseResult.rangeForNode(node),
    severity: 2, source: "opal", code,
    message,
  };
}

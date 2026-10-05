// Pattern matching: `case ... in`, `expr => pattern` and `expr in pattern`.
// Port of the former Ruby lib/opal/rewriters/pattern_matching.rb.
//
// A pattern is converted into a data structure for the runtime's
// ::PatternMatching.call(value, pattern), which returns the values of the
// pattern's variables; those are assigned with a multiple assignment.
import { mapChildren, bodyOf } from "./walk.mjs";

const LITERALS = new Set([
  "IntegerNode", "FloatNode", "ImaginaryNode", "RationalNode", "ArrayNode", "StringNode",
  "InterpolatedStringNode", "XStringNode", "InterpolatedXStringNode", "SymbolNode", "RangeNode",
  "ConstantReadNode", "ConstantPathNode", "RegularExpressionNode", "InterpolatedRegularExpressionNode",
  "LambdaNode", "ParenthesesNode", "SourceFileNode", "SourceLineNode", "SourceEncodingNode",
]);

export function patternMatching(compiler, root) {
  let depth = 0;

  function process(node) {
    const s = (type, props) => ({ type, location: node.location, ...props });

    switch (node.type) {
      // a => b
      case "MatchRequiredNode": {
        const from = process(node.value);
        return s("OpalBegin", {
          body: [
            s("OpalLvasgn", { name: "$pmvar", value: from }),
            s("OpalIf", { test: convertFullPattern(node, structuredClone(from), node.pattern), trueBody: null, falseBody: raiseNoMatchingPatternError(node, "$pmvar") }),
          ],
        });
      }

      // a in b
      case "MatchPredicateNode":
        return s("OpalIf", { test: convertFullPattern(node, process(node.value), node.pattern), trueBody: s("TrueNode", {}), falseBody: s("FalseNode", {}) });

      // case a; in b; end
      case "CaseMatchNode": {
        depth += 1;
        const cmvar = `$cmvar${depth}`;

        let els;
        if (!node.else_clause) els = raiseNoMatchingPatternError(node, cmvar);
        else if (node.else_clause.statements) els = process(bodyOf(node.else_clause.statements));
        else els = "empty_else";

        return s("OpalBegin", {
          body: [s("OpalLvasgn", { name: cmvar, value: process(node.predicate) }), singleCaseMatch(cmvar, node.conditions, els)],
        });
      }

      default:
        return mapChildren(node, process);
    }
  }

  // raise ::NoMatchingPatternError, from
  function raiseNoMatchingPatternError(origin, from) {
    const s = (type, props) => ({ type, location: origin.location, ...props });
    return s("CallNode", {
      receiver: null,
      name: "raise",
      flags: [],
      block: null,
      arguments: s("ArgumentsNode", {
        arguments: [s("ConstantPathNode", { parent: null, name: "NoMatchingPatternError" }), s("OpalLvar", { name: from })],
      }),
    });
  }

  // in b
  function singleCaseMatch(from, cases, els) {
    const [cas, ...rest] = cases;
    const s = (type, props) => ({ type, location: cas.location, ...props });
    let patternNode = cas.pattern;
    let guard = null;
    if (patternNode.type === "OpalInGuard") {
      guard = patternNode;
      patternNode = patternNode.pattern;
    }

    let pat = convertFullPattern(cas, s("OpalLvar", { name: from }), patternNode);
    if (guard) {
      const test = process(guard.guard);
      pat = guard.kind === "if"
        ? s("AndNode", { left: pat, right: test })
        : s("AndNode", { left: pat, right: s("CallNode", { receiver: test, name: "!", arguments: null, block: null, flags: [] }) });
    }

    // the body before the following branches (numbering of nested cases)
    const body = bodyOf(cas.statements);
    const trueBody = body && process(body);
    let falseBody = null;
    if (rest.length > 0) falseBody = singleCaseMatch(from, rest, els);
    else if (els !== "empty_else") falseBody = els;

    return s("OpalIf", { test: pat, trueBody, falseBody });
  }

  // a, b, c = ::PatternMatching.(from, [...])
  function convertFullPattern(origin, from, pat) {
    const s = (type, props) => ({ type, location: origin.location, ...props });
    const variables = [];
    const pattern = convertPattern(pat, variables);

    return s("MultiWriteNode", {
      lefts: variables.map((name) => s("LocalVariableTargetNode", { name })),
      rest: null,
      rights: [],
      value: s("CallNode", {
        receiver: s("ConstantPathNode", { parent: null, name: "PatternMatching" }),
        name: "call",
        flags: [],
        block: null,
        arguments: s("ArgumentsNode", { arguments: [from, pattern] }),
      }),
    });
  }

  // PatternConverter
  function convertPattern(pat, variables) {
    const s = (type, props) => ({ type, location: pat.location, ...props });
    const array = (...items) => s("ArrayNode", { elements: items });
    const sym = (value) => s("OpalSym", { value });
    const bool = (value) => s(value ? "TrueNode" : "FalseNode", {});
    const int = (value) => s("IntegerNode", { value });
    const lit = (node) => array(sym("lit"), process(node));
    const convert = (node) => convertPattern(node, variables);

    // MyStructName(...)
    if ((pat.type === "ArrayPatternNode" || pat.type === "HashPatternNode" || pat.type === "FindPatternNode") && pat.constant) {
      return array(sym("all"), lit(pat.constant), convert({ ...pat, constant: null }));
    }

    switch (pat.type) {
      // a
      case "LocalVariableTargetNode":
        variables.push(pat.name);
        return sym("var");

      // [...] => a
      case "CapturePatternNode": {
        convert(pat.target);
        return array(sym("save"), convert(pat.value));
      }

      // ^a
      case "PinnedVariableNode":
        return lit(pat.variable);
      case "PinnedExpressionNode":
        return lit(pat.expression);

      // *
      case "SplatNode":
        return pat.expression ? array(sym("rest"), convert(pat.expression)) : array(sym("rest"));

      // {} | []
      case "AlternationPatternNode":
        return array(sym("any"), convert(pat.left), convert(pat.right));

      // [0, 1, 2] or [*, 0, 1] or [0, 1, *]
      case "ArrayPatternNode": {
        const children = [...pat.requireds];
        if (pat.rest && pat.rest.type === "SplatNode") children.push(pat.rest);
        children.push(...pat.posts);
        // [0, 1, 2,]
        if (pat.rest && pat.rest.type === "ImplicitRestNode") children.push(s("SplatNode", { expression: null }));

        const fixedSize = !children.some((i) => i.type === "SplatNode");
        const arraySize = children.filter((i) => i.type !== "SplatNode").length;
        return array(sym("array"), bool(fixedSize), int(arraySize), array(...children.map(convert)));
      }

      // {a:, b:}
      case "HashPatternNode": {
        let anySize = bool(pat.elements.length > 0 || pat.rest != null);
        const children = [];
        for (const element of pat.elements) {
          const value = element.value && element.value.type === "ImplicitNode" ? element.value.value : element.value;
          if (value && value.type === "LocalVariableTargetNode" && element.value.type === "ImplicitNode") {
            children.push(array(sym(value.name), convert(value)));
          } else {
            children.push(array(element.key, convert(value)));
          }
        }
        if (pat.rest) {
          if (pat.rest.type === "NoKeywordsParameterNode") {
            anySize = bool(false);
          } else if (pat.rest.value) {
            // Capturing rest
            anySize = convert(pat.rest.value);
          } else {
            anySize = bool(true);
          }
        }
        return array(sym("hash"), anySize, array(...children));
      }

      // [*, a, b, *]
      case "FindPatternNode": {
        const children = [pat.left, ...pat.requireds, pat.right].map(convert);
        return array(sym("find"), array(...children));
      }

      default:
        if (LITERALS.has(pat.type)) return lit(pat);
        return process(pat);
    }
  }

  return process(root);
}

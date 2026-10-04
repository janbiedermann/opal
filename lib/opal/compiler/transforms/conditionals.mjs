// Conditionals (on OpalIf nodes, see normalize.mjs): drops branches decided
// by RUBY_ENGINE/RUBY_PLATFORM checks (OpalEngineCheck rewriter) and turns
// `case`, `&&` and `||` into OpalIf chains (ReturnableLogic rewriter).
import { mapChildren, bodyOf } from "./walk.mjs";

function opalIf(origin, test, trueBody, falseBody) {
  return { type: "OpalIf", location: origin.location, test, trueBody, falseBody };
}

// Engine check must look like: RUBY_ENGINE/RUBY_PLATFORM ==/!= "string"
function engineCheck(test) {
  if (!test || test.type !== "CallNode" || test.block) return null;
  const args = test.arguments ? test.arguments.arguments : [];
  if (args.length !== 1) return null;

  const recvr = test.receiver;
  if (!recvr || (recvr.type !== "ConstantReadNode" && recvr.type !== "ConstantPathNode")) return null;
  if (args[0].type !== "StringNode") return null;
  if (test.name !== "==" && test.name !== "!=") return null;
  if (recvr.name !== "RUBY_ENGINE" && recvr.name !== "RUBY_PLATFORM") return null;

  return [test.name, args[0].unescaped];
}

export function opalEngineCheck(compiler, node) {
  if (node.type === "OpalIf") {
    const check = engineCheck(node.test);
    if (check) {
      const [method, value] = check;
      const positive = (method === "==") !== (value !== "opal");
      const body = positive ? node.trueBody : node.falseBody;
      return opalEngineCheck(compiler, body || { type: "NilNode", location: node.location });
    }
  }
  return mapChildren(node, (child) => opalEngineCheck(compiler, child));
}

const CONTROL_FLOW = new Set(["BreakNode", "NextNode", "RedoNode", "RetryNode", "ReturnNode"]);

// case/&&/|| -> OpalIf. Values of `&&`/`||` that are used are kept in
// $ret_or_N temps, numbered by nesting depth.
export function returnableLogic(compiler, root) {
  let counter = 0;
  const nextTmp = () => `$ret_or_${++counter}`;
  const freeTmp = () => counter--;

  const s = (origin, type, props) => ({ type, location: origin.location, ...props });

  function checkControlFlow(node) {
    if (node && CONTROL_FLOW.has(node.type)) compiler.error("void value expression", compiler.lineOf(node));
  }

  function process(node) {
    switch (node.type) {
      case "OpalIf": {
        checkControlFlow(node.test);
        // The ifTest flag signifies that we don't care about the return value except if it's
        // truthy or falsy. And those tests will be carried out by the respective $truthy helper calls.
        if (node.test) node.test.ifTest = true;
        return mapChildren(node, process);
      }

      case "CaseNode": {
        const lhs = node.predicate;
        const els = (node.else_clause && bodyOf(node.else_clause.statements)) || s(node, "NilNode", {});
        const lhsTmp = lhs ? nextTmp() : null;
        const out = buildIfFromWhen(node, lhs, lhsTmp, node.conditions, els);
        if (lhs) freeTmp();
        return out;
      }

      // `a || b` / `a or b`
      case "OrNode": {
        const { left: lhs, right: rhs } = node;
        checkControlFlow(lhs);

        if (node.ifTest) {
          // Let's forward the ifTest to the lhs and rhs - since we don't care about the exact return
          // value of our or, we neither do care about a return value of our lhs or rhs.
          lhs.ifTest = rhs.ifTest = true;
          return process(opalIf(node, lhs, s(node, "TrueNode", {}), rhs));
        }
        const lhsTmp = nextTmp();
        const out = process(opalIf(node, s(node, "OpalLvasgn", { name: lhsTmp, value: lhs }), s(node, "OpalJsTmp", { value: lhsTmp }), rhs));
        freeTmp();
        return out;
      }

      // `a && b` / `a and b`
      case "AndNode": {
        const { left: lhs, right: rhs } = node;
        checkControlFlow(lhs);

        if (node.ifTest) {
          lhs.ifTest = rhs.ifTest = true;
          return process(opalIf(node, lhs, rhs, s(node, "FalseNode", {})));
        }
        const lhsTmp = nextTmp();
        const out = process(opalIf(node, s(node, "OpalLvasgn", { name: lhsTmp, value: lhs }), rhs, s(node, "OpalJsTmp", { value: lhsTmp })));
        freeTmp();
        return out;
      }

      // Parentheses around a single node forward the ifTest flag.
      case "ParenthesesNode": {
        const body = node.body && node.body.type === "StatementsNode" ? node.body.body : [];
        if (node.ifTest && body.length === 1) body[0].ifTest = true;
        delete node.ifTest;
        return mapChildren(node, process);
      }

      default:
        return mapChildren(node, process);
    }
  }

  function buildIfFromWhen(node, lhs, lhsTmp, whens, els) {
    const [firstWhen, ...nextWhens] = whens;
    const rule = buildRuleFromParts(node, lhs, lhsTmp, firstWhen.conditions);
    const body = bodyOf(firstWhen.statements);

    return opalIf(
      firstWhen,
      rule,
      body && process(body),
      nextWhens.length === 0 ? process(els) : buildIfFromWhen(null, null, lhsTmp, nextWhens, els)
    );
  }

  function buildRuleFromParts(node, lhs, lhsTmp, parts) {
    const origin = node || parts[0];
    const lhsNode = node && lhsTmp
      ? s(node, "OpalLvasgn", { name: lhsTmp, value: process(lhs) })
      : s(origin, "OpalJsTmp", { value: lhsTmp });

    const [firstPart, ...nextParts] = parts;

    let subrule;
    if (firstPart.type === "SplatNode") {
      const splatOn = firstPart.expression;
      const iterVal = nextTmp();
      const block = s(firstPart, "CallNode", {
        receiver: process(splatOn),
        name: "any?",
        arguments: null,
        block: s(firstPart, "BlockNode", {
          locals: [iterVal],
          parameters: s(firstPart, "BlockParametersNode", {
            parameters: s(firstPart, "ParametersNode", {
              requireds: [s(firstPart, "RequiredParameterNode", { name: iterVal })],
              optionals: [], rest: null, posts: [], keywords: [], keyword_rest: null, block: null,
            }),
            locals: [],
          }),
          body: buildRuleFromParts(null, null, lhsTmp, [s(firstPart, "OpalLvar", { name: iterVal })]),
        }),
      });
      subrule = node && lhsTmp ? s(node, "OpalBegin", { body: [lhsNode, block] }) : block;
    } else if (lhsTmp) {
      subrule = s(firstPart, "CallNode", {
        receiver: process(firstPart),
        name: "===",
        arguments: s(firstPart, "ArgumentsNode", { arguments: [lhsNode] }),
        block: null,
      });
    } else {
      subrule = process(firstPart);
    }

    if (nextParts.length === 0) return subrule;
    return opalIf(origin, subrule, s(origin, "TrueNode", {}), buildRuleFromParts(null, null, lhsTmp, nextParts));
  }

  return process(root);
}

// Reshapes the Prism constructs whose code generation in the Ruby compiler
// depends on the parser gem's tree shape:
//
// - IfNode/UnlessNode (with elsif, ternaries, modifiers) become OpalIf
//   nodes: s(:if, test, true_body, false_body)
// - BeginNode with rescue/else/ensure clauses, and the implicit ones of
//   def/block/class bodies, become OpalEnsure > OpalRescue > OpalResbody,
//   wrapped in OpalKwbegin for an explicit begin/end; a plain begin/end
//   becomes OpalKwbegin. `a rescue b` becomes an OpalRescue.
import { mapChildren, bodyOf } from "./walk.mjs";

const s = (origin, type, props) => ({ type, location: origin.location, ...props });

function elseBody(node) {
  if (!node) return null;
  if (node.type === "ElseNode") return bodyOf(node.statements);
  return node; // elsif: a nested IfNode
}

// The assignment of a rescued exception (`rescue => target`) with $err as
// its value.
function rescueTarget(target) {
  if (!target) return null;
  const value = s(target, "OpalJsTmp", { value: "$err" });
  switch (target.type) {
    case "LocalVariableTargetNode":
      return { ...target, type: "LocalVariableWriteNode", value };
    case "InstanceVariableTargetNode":
      return { ...target, type: "InstanceVariableWriteNode", value };
    case "GlobalVariableTargetNode":
      return { ...target, type: "GlobalVariableWriteNode", value };
    case "ClassVariableTargetNode":
      return { ...target, type: "ClassVariableWriteNode", value };
    case "ConstantTargetNode":
      return { ...target, type: "ConstantWriteNode", value };
    case "ConstantPathTargetNode":
      return s(target, "ConstantPathWriteNode", { target: { ...target, type: "ConstantPathNode" }, value });
    case "CallTargetNode":
      return s(target, "CallNode", {
        receiver: target.receiver,
        name: target.name,
        arguments: s(target, "ArgumentsNode", { arguments: [value] }),
        block: null,
        flags: target.flags,
      });
    case "IndexTargetNode": {
      const args = target.arguments ? target.arguments.arguments : [];
      return s(target, "CallNode", {
        receiver: target.receiver,
        name: "[]=",
        arguments: s(target, "ArgumentsNode", { arguments: [...args, value] }),
        block: target.block,
        flags: target.flags,
      });
    }
    default:
      throw new Error(`unsupported rescue target ${target.type}`);
  }
}

function resbodies(clause) {
  const out = [];
  for (let r = clause; r; r = r.subsequent) {
    const klasses = r.exceptions.length > 0 ? s(r, "ArrayNode", { elements: r.exceptions }) : null;
    out.push(s(r, "OpalResbody", { klasses, lvar: rescueTarget(r.reference), body: bodyOf(r.statements) }));
  }
  return out;
}

// The parser gem's body for a BeginNode: s(:ensure)/s(:rescue) or the
// plain statements.
export function beginBody(node) {
  let body = bodyOf(node.statements);
  if (node.rescue_clause) {
    body = s(node, "OpalRescue", {
      body,
      resbodies: resbodies(node.rescue_clause),
      elseBody: node.else_clause ? bodyOf(node.else_clause.statements) : null,
    });
  }
  if (node.ensure_clause) {
    body = s(node, "OpalEnsure", { body, ensureBody: bodyOf(node.ensure_clause.statements) });
  }
  return body;
}

export function normalize(compiler, node) {
  mapChildren(node, (child) => normalize(compiler, child));

  switch (node.type) {
    case "IfNode":
      return s(node, "OpalIf", { test: node.predicate, trueBody: bodyOf(node.statements), falseBody: elseBody(node.subsequent) });
    case "UnlessNode":
      return s(node, "OpalIf", { test: node.predicate, trueBody: elseBody(node.else_clause), falseBody: bodyOf(node.statements) });
    case "BeginNode": {
      const hasClauses = node.rescue_clause || node.ensure_clause;
      if (!node.begin_keyword_loc) {
        // the implicit begin of a def/block/class body with rescue/ensure
        return hasClauses ? beginBody(node) : bodyOf(node.statements);
      }
      if (hasClauses) return s(node, "OpalKwbegin", { body: [beginBody(node)] });
      return s(node, "OpalKwbegin", { body: node.statements ? node.statements.body : [] });
    }
    case "RescueModifierNode":
      return s(node, "OpalRescue", {
        body: node.expression,
        resbodies: [s(node, "OpalResbody", { klasses: null, lvar: null, body: node.rescue_expression })],
        elseBody: null,
        modifier: true,
      });
    default:
      return node;
  }
}

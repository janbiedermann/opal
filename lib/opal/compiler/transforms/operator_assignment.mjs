// Compound assignment: `lhs ||= rhs`, `lhs &&= rhs` and `lhs op= rhs` on
// every kind of target. Port of lib/opal/rewriters/
// logical_operator_assignment.rb and binary_operator_assignment.rb.
//
// Prism has a node type per target and operator (LocalVariableOrWriteNode,
// CallOperatorWriteNode, IndexAndWriteNode, ...); they are rewritten into
// plain reads, writes, calls and OrNode/AndNode (turned into conditionals
// by the returnable logic pass that runs afterwards).
import { mapChildren } from "./walk.mjs";

const s = (origin, type, props) => ({ type, location: origin.location, ...props });

const call = (origin, receiver, name, args) => s(origin, "CallNode", {
  receiver,
  name,
  arguments: args.length > 0 ? s(origin, "ArgumentsNode", { arguments: args }) : null,
  block: null,
  flags: [],
});

// Target kinds: [kind, operator] for each Prism node type.
const KINDS = {};
for (const [prefix, kind] of [
  ["LocalVariable", "lvar"], ["InstanceVariable", "ivar"], ["GlobalVariable", "gvar"],
  ["ClassVariable", "cvar"], ["Constant", "const"], ["ConstantPath", "const_path"],
  ["Call", "send"], ["Index", "index"],
]) {
  KINDS[`${prefix}OrWriteNode`] = [kind, "or"];
  KINDS[`${prefix}AndWriteNode`] = [kind, "and"];
  KINDS[`${prefix}OperatorWriteNode`] = [kind, "op"];
}

// Read and write nodes for variables and constants.
function variableNodes(node, kind) {
  switch (kind) {
    case "lvar":
      return [s(node, "LocalVariableReadNode", { name: node.name, depth: node.depth }), (value) => s(node, "LocalVariableWriteNode", { name: node.name, depth: node.depth, value })];
    case "ivar":
      return [s(node, "InstanceVariableReadNode", { name: node.name }), (value) => s(node, "InstanceVariableWriteNode", { name: node.name, value })];
    case "gvar":
      return [s(node, "GlobalVariableReadNode", { name: node.name }), (value) => s(node, "GlobalVariableWriteNode", { name: node.name, value })];
    case "cvar":
      return [s(node, "ClassVariableReadNode", { name: node.name }), (value) => s(node, "ClassVariableWriteNode", { name: node.name, value })];
    case "const":
      return [s(node, "ConstantReadNode", { name: node.name }), (value) => s(node, "ConstantWriteNode", { name: node.name, value })];
    case "const_path":
      return [node.target, (value) => s(node, "ConstantPathWriteNode", { target: node.target, value })];
  }
  return null;
}

const isSafeNavigation = (node) => !!(node.flags && node.flags.includes("safe_navigation"));

export function operatorAssignment(compiler, root) {
  let logicalCounter = 0;
  let binaryCounter = 0;

  // The reader/writer method names and arguments of a call/index target.
  function sendParts(node, kind) {
    if (kind === "index") {
      return { reader: "[]", writer: "[]=", args: node.arguments ? node.arguments.arguments : [] };
    }
    return { reader: node.read_name, writer: node.write_name, args: [] };
  }

  // Caches a complex receiver in a temp: MRI calls recvr in
  // `recvr.meth ||= rhs` only once.
  function cacheReceiver(node, recvr, newTemp) {
    if (recvr && recvr.type === "CallNode") {
      const tmp = newTemp();
      return [s(node, "OpalLvasgn", { name: tmp, value: recvr }), s(node, "OpalJsTmp", { value: tmp })];
    }
    return [null, recvr];
  }

  // lhs ||= rhs / lhs &&= rhs
  function logical(node, kind, op) {
    const rhs = node.value;
    const rootType = op === "or" ? "OrNode" : "AndNode";
    const newTemp = () => `$logical_op_recvr_tmp_${++logicalCounter}`;

    if (kind === "send" || kind === "index") {
      if (isSafeNavigation(node)) {
        // recvr&.meth ||= rhs -> $tmp = recvr; $tmp.nil? ? nil : ($tmp.meth ||= rhs)
        const tmp = newTemp();
        const cache = s(node, "OpalLvasgn", { name: tmp, value: node.receiver });
        const recvr = s(node, "OpalJsTmp", { value: tmp });
        const isNil = call(node, recvr, "nil?", []);
        const plain = logical({ ...node, receiver: recvr, flags: [] }, kind, op);
        return s(node, "OpalBegin", { body: [cache, s(node, "OpalIf", { test: isNil, trueBody: s(node, "NilNode", {}), falseBody: plain })] });
      }

      const { reader, writer, args } = sendParts(node, kind);
      const [cache, recvr] = cacheReceiver(node, node.receiver, newTemp);
      const callReader = call(node, recvr, reader, args);
      const callWriter = call(node, recvr, writer, [...args, rhs]);
      const getOrSet = s(node, rootType, { left: callReader, right: callWriter });
      return cache ? s(node, "OpalBegin", { body: [cache, getOrSet] }) : getOrSet;
    }

    const [getNode, setNode] = variableNodes(node, kind);
    let condition = s(node, rootType, { left: getNode, right: rhs });

    if ((kind === "const" || kind === "const_path" || kind === "cvar") && op === "or") {
      // LHS = defined?(LHS) ? (LHS || rhs) : rhs
      const defined = s(node, "DefinedNode", { value: getNode });
      condition = s(node, "OpalIf", { test: defined, trueBody: s(node, "OpalBegin", { body: [condition] }), falseBody: rhs });
    }
    return setNode(condition);
  }

  // lhs op= rhs
  function binary(node, kind) {
    const rhs = node.value;
    const operation = node.binary_operator;
    const newTemp = () => `$binary_op_recvr_tmp_${++binaryCounter}`;

    if (kind === "send" || kind === "index") {
      if (isSafeNavigation(node)) {
        const tmp = newTemp();
        const cache = s(node, "OpalLvasgn", { name: tmp, value: node.receiver });
        const recvr = s(node, "OpalJsTmp", { value: tmp });
        const isNil = call(node, recvr, "nil?", []);
        const plain = binary({ ...node, receiver: recvr, flags: [] }, kind);
        return s(node, "OpalBegin", { body: [cache, s(node, "OpalIf", { test: isNil, trueBody: s(node, "NilNode", {}), falseBody: plain })] });
      }

      const { reader, writer, args } = sendParts(node, kind);
      const [cache, recvr] = cacheReceiver(node, node.receiver, newTemp);
      const callReader = call(node, recvr, reader, args);
      const callOp = call(node, callReader, operation, [rhs]);
      const callWriter = call(node, recvr, writer, [...args, callOp]);
      return cache ? s(node, "OpalBegin", { body: [cache, callWriter] }) : callWriter;
    }

    const [getNode, setNode] = variableNodes(node, kind);
    return setNode(call(node, getNode, operation, [rhs]));
  }

  // The logical pass runs over the whole tree before the binary one, as the
  // two rewriters did.
  function makePass(handles, rewrite) {
    function process(node) {
      // defined?(a ||= 1) is a static "assignment"
      if (node.type === "DefinedNode" && node.value && KINDS[node.value.type] && handles(KINDS[node.value.type][1])) {
        return s(node, "OpalStr", { value: "assignment" });
      }
      const kind = KINDS[node.type];
      if (kind && handles(kind[1])) return process(rewrite(node, kind[0], kind[1]));
      return mapChildren(node, process);
    }
    return process;
  }

  root = makePass((op) => op === "or" || op === "and", logical)(root);
  root = makePass((op) => op === "op", (node, kind) => binary(node, kind))(root);
  return root;
}

// Optimizations for code patterns of some libraries used with Opal. Port of
// lib/opal/rewriters/targeted_patches.rb.
import { mapChildren } from "./walk.mjs";

const SIMPLE_TYPES = new Set(["StringNode", "SymbolNode", "IntegerNode", "NilNode"]);

function literalText(node) {
  switch (node.type) {
    case "StringNode":
    case "SymbolNode":
      return node.unescaped;
    case "IntegerNode":
      return String(node.value);
    default:
      return "";
  }
}

export function targetedPatches(compiler, node) {
  if (node.type === "DefNode" && !node.receiver && node.body && node.body.type === "StatementsNode" && node.body.body.length >= 2) {
    // parser/rubyxx.rb - racc generated code often looks like:
    //
    //     def _reduce_219(val, _values, result)
    //       result = @builder.op_assign(val[0], val[1], val[2])
    //       result
    //     end
    //
    // This converter transform this into just
    //
    //     def _reduce_219(val, _values, result)
    //       @builder.op_assign(val[0], val[1], val[2])
    //     end
    const calls = node.body.body;
    const assignment = calls[calls.length - 2];
    const ret = calls[calls.length - 1];
    if (assignment.type === "LocalVariableWriteNode" && ret.type === "LocalVariableReadNode" && assignment.name === ret.name) {
      const body = [...calls.slice(0, -2), assignment.value];
      return { ...node, body: { ...node.body, body } };
    }
  }

  if (node.type === "ArrayNode" && node.elements.length > 32) {
    // Optimize large arrays produced by lexer: an array like
    //     [1, 2, 3, nil, nil, :something, :abc, nil, ...]
    // becomes compiled to:
    //     Opal.large_array_unpack("1,2,3,,something,abc,,...")
    const simple = node.elements.every((child) => {
      // Break for wrong types
      if (!SIMPLE_TYPES.has(child.type)) return false;
      // Break for strings that may conflict with our numbers, nils and separator
      if ((child.type === "StringNode" || child.type === "SymbolNode") && /^[0-9-]|^$|,/.test(child.unescaped)) return false;
      // Break for too numbers out of range, as there may be decoding issues
      if (child.type === "IntegerNode" && !(child.value >= -1000000 && child.value <= 1000000)) return false;
      return true;
    });

    if (simple) {
      const s = (type, props) => ({ type, location: node.location, ...props });
      return s("OpalJsCall", {
        receiver: s("OpalJsTmp", { value: "Opal" }),
        name: "large_array_unpack",
        arguments: s("ArgumentsNode", { arguments: [s("OpalSym", { value: node.elements.map(literalText).join(",") })] }),
        block: null,
      });
    }
  }

  return mapChildren(node, (child) => targetedPatches(compiler, child));
}

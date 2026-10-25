// The shared cursor analysis for definition/references/rename (port of
// ../../features/navigation_target.rb): find the name under the cursor
// (constant or method), its identifier range, and the module nesting
// around it. The features then disagree only about what to do with the
// answer. A target is a plain object {name, base_name, kind, range,
// nesting, receiver?, definition?}; kind is "constant" or "method".

const LITERAL_CLASSES = {
  StringNode: "String", StringInterpolationNode: "String",
  XStringNode: "String", StringHeredocNode: "String",
  IntegerNode: "Integer", FloatNode: "Float",
  ArrayNode: "Array", HashNode: "Hash", RangeNode: "Range",
  RegularExpressionNode: "Regexp", TrueNode: "TrueClass",
  FalseNode: "FalseClass", NilNode: "NilClass",
};

// Prism literal node type -> the class its value instantiates (the
// LSP.md §2 receiver-typing heuristic, shared by definition, hover,
// signature help and completion).

export function locate(document, position) {
  const parseResult = document.parse();
  const offset = parseResult.offsetFor(position.line, position.character);
  const { ancestors } = document.locateNode(position.line, position.character);
  const nesting = nestingNames(ancestors);

  for (const node of ancestors) { // innermost first
    switch (node.type) {
      case "ConstantReadNode":
        return { name: node.name, base_name: node.name, kind: "constant",
                 range: parseResult.rangeForNode(node), nesting };
      case "ConstantPathNode": {
        const full = fullPathComponent(node);
        const range = parseResult.rangeForLoc(node.name_loc) ?? parseResult.rangeForNode(node);
        return { name: full, base_name: node.name, kind: "constant", range, nesting };
      }
      case "ClassNode":
      case "ModuleNode": {
        const path = node.constant_path;
        if (path == null || !covers(path, offset)) continue;
        return { name: node.name, base_name: node.name, kind: "constant",
                 range: parseResult.rangeForNode(path), nesting };
      }
      case "CallNode": {
        const message = node.message_loc;
        if (message == null || !coversLoc(message, offset)) continue;
        return { name: node.name, base_name: node.name, kind: "method",
                 range: parseResult.rangeForLoc(message), nesting,
                 receiver: node.receiver ?? null };
      }
      case "DefNode": {
        const nameLoc = node.name_loc;
        if (nameLoc == null || !coversLoc(nameLoc, offset)) continue;
        return { name: node.name, base_name: node.name, kind: "method",
                 range: parseResult.rangeForLoc(nameLoc), nesting,
                 receiver: node.receiver ?? null, definition: true };
      }
      default:
    }
  }
  return null;
}

// The classes/modules around the cursor, qualified outer-first:
// ["Foo", "Foo::Bar"]. Used to resolve bare constant names and
// implicit self calls the way Ruby nesting does.
export function nestingNames(ancestors) {
  const segments = ancestors
    .filter((n) => n.type === "ClassNode" || n.type === "ModuleNode")
    .reverse().map((n) => n.name).filter((n) => n != null);
  const qualified = [];
  let joined = null;
  for (const seg of segments) {
    joined = joined == null ? seg : `${joined}::${seg}`;
    qualified.push(joined);
  }
  return qualified;
}

// "A::B::C" rebuilt from the target chain (ConstantPathNode#name is
// only the last segment).
export function fullPathComponent(node) {
  const parts = [node.name];
  let target = node.target ?? null;
  while (target != null && target.type === "ConstantPathNode") {
    parts.unshift(target.name);
    target = target.target ?? null;
  }
  if (target != null && target.type === "ConstantReadNode") parts.unshift(target.name);
  return parts.join("::");
}

// [fqcn, singleton-lookup] for a method target's owner; [null, false]
// when unresolvable. Receiverless calls look in the enclosing module
// (instance side); explicit receivers type through receiverClass.
export function methodOwner(state, target) {
  const receiver = target.receiver;
  const nesting = target.nesting ?? [];
  if (receiver == null) {
    if (nesting.length === 0) return [null, false];
    return [nesting[nesting.length - 1], false];
  }
  const rc = receiverClass(state, receiver, nesting);
  return rc == null ? [null, false] : rc;
}

// [class name, singleton-lookup], or null when the receiver's type is
// unknown. Resolution of a constant receiver is nesting-aware.
export function receiverClass(state, receiver, nesting) {
  switch (receiver.type) {
    case "ConstantReadNode":
    case "ConstantPathNode": {
      const full = fullPathComponent(receiver);
      const last = receiver.name;
      const candidates = [];
      for (const outer of nesting.slice().reverse()) {
        candidates.push(`${outer}::${full}`);
        candidates.push(`${outer}::${last}`);
      }
      candidates.push(full, last);
      for (const cand of [...new Set(candidates)]) {
        if (state.index.module(cand)) return [cand, true];
      }
      return null;
    }
    case "CallNode": {
      // `Klass.new.m` - the instance methods of a known Klass.
      if (receiver.name === "new") {
        const inner = receiver.receiver;
        if (inner != null && (inner.type === "ConstantReadNode" || inner.type === "ConstantPathNode")) {
          const full = fullPathComponent(inner);
          if (state.index.module(full)) return [full, false];
        }
      }
      return null;
    }
    default: {
      const literal = LITERAL_CLASSES[receiver.type];
      return literal == null ? null : [literal, false];
    }
  }
}

function covers(node, offset) {
  return node.location.start <= offset && offset <= node.location.end;
}

function coversLoc(loc, offset) {
  return offset >= loc.start && offset < loc.end;
}

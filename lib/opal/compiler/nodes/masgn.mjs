// Multiple assignment: a, (b, *c), d.e = value. Port of
// lib/opal/nodes/masgn.rb on Prism's MultiWriteNode (lefts, rest, rights).
import { Base } from "./base.mjs";

const s = (origin, type, props) => ({ type, location: origin.location, ...props });

// The targets of a MultiWriteNode/MultiTargetNode in order; `a, = x`
// (ImplicitRestNode) adds no target.
export function masgnTargets(node) {
  const out = [...node.lefts];
  if (node.rest && node.rest.type === "SplatNode") out.push(node.rest);
  out.push(...node.rights);
  return out;
}

// The assignment of `value` to a multiple assignment target, or null for
// targets handled elsewhere (splats, nested targets).
export function assignmentTo(target, value) {
  switch (target.type) {
    case "LocalVariableTargetNode":
      return { ...target, type: target.internal ? "OpalLvasgn" : "LocalVariableWriteNode", value };
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
      return null;
  }
}

export class MassAssignNode extends Base {
  static {
    this.handle("MultiWriteNode");
  }

  compile() {
    const rhs = this.node.value;
    const targets = masgnTargets(this.node);

    this.withTemp((array) => {
      if (rhs.type === "ArrayNode") {
        this.push(`${array} = `, this.expr(rhs));
        const rhsLen = rhs.elements.some((c) => c.type === "SplatNode") ? null : rhs.elements.length;
        this.compileMasgn(targets, array, rhsLen);
        this.push(`, ${array}`); // a mass assignment evaluates to the RHS
      } else {
        this.helper("to_ary");
        this.withTemp((retval) => {
          this.push(`${retval} = `, this.expr(rhs));
          this.push(`, ${array} = $to_ary(${retval})`);
          this.compileMasgn(targets, array);
          this.push(`, ${retval}`);
        });
      }
    });
  }

  // 'len' is how many rhs items are we sure we have
  compileMasgn(lhsItems, array, len = null) {
    const splatIndex = lhsItems.findIndex((child) => child.type === "SplatNode");
    const preSplat = splatIndex === -1 ? lhsItems : lhsItems.slice(0, splatIndex);
    const postSplat = splatIndex === -1 ? [] : lhsItems.slice(splatIndex);

    preSplat.forEach((child, idx) => this.compileAssignment(child, array, idx, len));

    if (postSplat.length > 0) {
      const splat = postSplat.shift();
      const part = splat.expression;

      if (postSplat.length === 0) {
        // trailing splat
        if (part) {
          this.helper("slice");
          this.push(", ");
          this.push(this.expr(assignmentTo(part, this.s("OpalJsTmp", { value: `$slice(${array}, ${preSplat.length})` }))));
        }
      } else {
        const tmp = this.scope.newTemp(); // end index for items consumed by splat
        this.push(`, ${tmp} = ${array}.length - ${postSplat.length}`);
        this.push(`, ${tmp} = (${tmp} < ${preSplat.length}) ? ${preSplat.length} : ${tmp}`);

        if (part) {
          this.helper("slice");
          this.push(", ");
          this.push(this.expr(assignmentTo(part, this.s("OpalJsTmp", { value: `$slice(${array}, ${preSplat.length}, ${tmp})` }))));
        }

        postSplat.forEach((child, idx) => {
          this.compileAssignment(child, array, idx === 0 ? tmp : `${tmp} + ${idx}`);
        });

        this.scope.queueTemp(tmp);
      }
    }
  }

  compileAssignment(child, array, idx, len = null) {
    const assign = len == null || idx >= len
      ? this.s("OpalJsTmp", { value: `(${array}[${idx}] == null ? nil : ${array}[${idx}])` })
      : this.s("OpalJsTmp", { value: `${array}[${idx}]` });

    if (child.type === "MultiTargetNode") {
      this.helper("to_ary");
      // nested destructuring
      const tmp = this.scope.newTemp();
      this.push(`, (${tmp} = $to_ary(${assign.value})`);
      this.compileMasgn(masgnTargets(child), tmp);
      this.push(")");
      this.scope.queueTemp(tmp);
      return;
    }

    const part = assignmentTo(child, assign);
    if (!part) throw new Error(`Bad child node in masgn LHS: ${child.type}`);

    this.push(", ");
    this.push(this.expr(part));
  }
}

// recv.JS.meth(args)  -> OpalJsCall:     recv.meth(args)
// recv.JS[:prop]      -> OpalJsAttr:     recv[prop]
// recv.JS[:prop] = v  -> OpalJsAttrAsgn: recv[prop] = v
// Port of lib/opal/rewriters/dot_js_syntax.rb.
import { mapChildren } from "./walk.mjs";

const isJsReceiver = (recv) =>
  recv && recv.type === "CallNode" && recv.name === "JS" && !recv.arguments && !recv.block;

export function dotJsSyntax(compiler, node) {
  if (node.type === "CallNode" && isJsReceiver(node.receiver)) {
    const recv = node.receiver.receiver;
    const args = node.arguments ? node.arguments.arguments : [];
    const s = (type, props) => ({ type, location: node.location, ...props });

    if (node.name === "[]") {
      if (args.length !== 1) compiler.error(".JS[:property] syntax supports only one argument", compiler.lineOf(node));
      node = s("OpalJsAttr", { recvr: recv, property: args[0] });
    } else if (node.name === "[]=") {
      if (args.length !== 2) compiler.error(".JS[:property]= syntax supports only two arguments", compiler.lineOf(node));
      node = s("OpalJsAttrAsgn", { recvr: recv, property: args[0], value: args[1] });
    } else {
      node = { ...node, type: "OpalJsCall", receiver: recv };
    }
  }
  return mapChildren(node, (child) => dotJsSyntax(compiler, child));
}

// Runs ERB templates at build time in Node.js (see renderErb in ../erb.mjs):
// in a worker thread with the Opal runtime and the nodejs stdlib (File,
// Dir, ENV, ...), started once per process, so the builder's own process
// doesn't load Opal. (A vm context would share the host's arrays, which
// lack Opal's methods; a worker has its own realm with real Node.js
// globals.) The builder is synchronous, so a call blocks on Atomics.wait
// until the worker replies. (Inside a running Opal, the builder uses
// opalErbRunner.)
import { Worker, MessageChannel, receiveMessageOnPort, SHARE_ENV } from "node:worker_threads";
import { join } from "node:path";
import { OPAL_ROOT } from "../paths.mjs";


let state = null;

function start(Builder) {
  const builder = new Builder({ warn: () => {} });
  builder.build("opal", { requirable: true, load: true });
  builder.build("nodejs", { requirable: true, load: true });
  // 0 until the worker has replied
  const shared = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(new URL("./erb_worker.mjs", import.meta.url), {
    // (--input-type, e.g. from `node --input-type=module -e`, is invalid for a worker file)
    execArgv: process.execArgv.filter((arg) => !arg.startsWith("--input-type")),
    // ENV is the builder's (also when it changes later)
    env: SHARE_ENV,
    workerData: { runtime: builder.toString(), shared, port: port2, nodeModules: join(OPAL_ROOT, "stdlib", "nodejs", "node_modules", "_") },
    transferList: [port2],
  });
  worker.unref();
  port1.unref();
  const state = { shared, port: port1 };
  // the worker's first reply: the runtime loaded (or why not)
  const ready = wait(state, 30000, "the ERB worker thread didn't start (see its error output)");
  if (ready.error !== undefined) throw new Error(ready.error);
  return state;
}

// The next reply of the worker, waiting at most `timeout` ms.
function wait(state, timeout, timeoutMessage) {
  if (Atomics.wait(state.shared, 0, 0, timeout) === "timed-out") throw new Error(timeoutMessage);
  Atomics.store(state.shared, 0, 0);
  return receiveMessageOnPort(state.port).message;
}

// A run(js) function for renderErb. (Builder is passed in to avoid an
// import cycle with builder.mjs.)
export function nodeErbRunner(Builder, { timeout = 60000 } = {}) {
  return (js) => {
    state ||= start(Builder);
    state.port.postMessage(js);
    const reply = wait(state, timeout, `ERB template timed out after ${timeout} ms`);
    if (reply.error !== undefined) throw new Error(`ERB template error: ${reply.error}`);
    return reply.value;
  };
}

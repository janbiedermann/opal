// The worker thread of erb_runner.mjs: loads the Opal runtime (with the
// nodejs stdlib) and runs compiled ERB templates, replying on `port` and
// waking the waiting builder through `shared`.
import { workerData } from "node:worker_threads";
import { createRequire } from "node:module";

const { runtime, shared, port, nodeModules } = workerData;

const reply = (message) => {
  port.postMessage(message);
  Atomics.store(shared, 0, 1);
  Atomics.notify(shared, 0);
};

// the first reply says whether the runtime loaded
try {
  globalThis.require = createRequire(nodeModules);
  (0, eval)(runtime);
  reply({ ready: true });
} catch (e) {
  reply({ error: `loading the Opal runtime failed: ${(e && e.message) || e}` });
}

port.on("message", (js) => {
  try {
    reply({ value: String(new Function("Opal", "self", "return " + js)(globalThis.Opal, globalThis.Opal.top)) });
  } catch (e) {
    reply({ error: (e && e.message) || String(e) });
  }
});

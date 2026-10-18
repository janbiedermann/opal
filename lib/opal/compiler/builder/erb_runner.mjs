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

// The flags of the current process worth carrying into the worker: the ones
// that change how the template's code runs. Node.js 26 hands a `node --test`
// child the whole resolved set of its options through process.execArgv, and a
// Worker rejects most of them with ERR_WORKER_INVALID_EXEC_ARGV. Which ones
// it refuses moves between Node versions (--stack-trace-limit= was taken in
// 22 and is refused in 26), so the list is chosen by hand and startWorker
// falls back to no flags at all if Node still objects.
const WORKER_FLAGS = /^(?:--enable-source-maps|--disable-source-map-(?:generation|consumption)|--title=|--deprecation=|--no-deprecation|--pending-deprecation|--throw-deprecation|--force-context-aware)/;
const WORKER_FLAGS_WITH_VALUE = ["-r", "--require", "--import", "--conditions"];

export function workerExecArgv(argv = process.execArgv) {
  const kept = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (WORKER_FLAGS_WITH_VALUE.includes(arg)) {
      kept.push(arg, argv[++index]);
    } else if (WORKER_FLAGS.test(arg)) {
      kept.push(arg);
    }
  }
  return kept;
}

// A Worker that Node refuses for one of its inherited options is started
// again without any: the options only tune the worker, none is needed.
function startWorker(url, options) {
  try {
    return new Worker(url, options);
  } catch (error) {
    if (error?.code !== "ERR_WORKER_INVALID_EXEC_ARGV" || !options.execArgv?.length) throw error;
    return startWorker(url, { ...options, execArgv: [] });
  }
}

function start(Builder) {
  const builder = new Builder({ warn: () => {} });
  builder.build("opal", { requirable: true, load: true });
  builder.build("nodejs", { requirable: true, load: true });
  // 0 until the worker has replied
  const shared = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  const worker = startWorker(new URL("./erb_worker.mjs", import.meta.url), {
    // only the options a worker accepts (see workerExecArgv)
    execArgv: workerExecArgv(),
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

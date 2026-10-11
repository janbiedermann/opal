// The BiDi client of the Firefox runner (lib/opal/compiler/cli/runners/
// bidi_interface.mjs) against a fake transport - no browser needed.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BiDi, formatArg } from "../../../lib/opal/compiler/cli/runners/bidi_interface.mjs";

// A BiDi instance wired to a fake transport recording the sent messages.
function fakeBiDi() {
  const bidi = new BiDi("ws://fake/session");
  const sent = [];
  bidi.ws = { sent, send: (msg) => sent.push(JSON.parse(msg)) };
  return bidi;
}

describe("BiDi client", () => {
  test("call sends framed commands with increasing ids", async () => {
    const bidi = fakeBiDi();
    const first = bidi.call("session.new", { capabilities: {} });
    const second = bidi.call("session.subscribe", { events: ["log"] });
    assert.deepEqual(bidi.ws.sent, [
      { id: 1, method: "session.new", params: { capabilities: {} } },
      { id: 2, method: "session.subscribe", params: { events: ["log"] } },
    ]);
    bidi.onMessage({ type: "success", id: 1, result: { sessionId: "s1" } });
    bidi.onMessage({ type: "success", id: 2, result: { subscription: "sub" } });
    assert.deepEqual((await first).sessionId, "s1");
    assert.deepEqual((await second).subscription, "sub");
  });

  test("call resolves with an empty result when there is none", async () => {
    const bidi = fakeBiDi();
    const pending = bidi.call("session.end", { sessionId: "s1" });
    bidi.onMessage({ type: "success", id: 1, result: {} });
    assert.deepEqual(await pending, {});
  });

  test("call rejects on an error response", async () => {
    const bidi = fakeBiDi();
    const pending = bidi.call("browsingContext.navigate", { url: "http://x/", context: "c" });
    bidi.onMessage({ type: "error", id: 1, error: "no such window", message: "bad" });
    await assert.rejects(pending, /no such window: bad/);
  });

  test("responses for unknown ids are ignored", () => {
    const bidi = fakeBiDi();
    assert.doesNotThrow(() => bidi.onMessage({ type: "success", id: 42, result: {} }));
    assert.doesNotThrow(() => bidi.onMessage({ type: "event", method: "unknown.event", params: {} }));
  });

  test("events are dispatched to the registered handler", () => {
    const bidi = fakeBiDi();
    const seen = [];
    bidi.on("log.entryAdded", (params) => seen.push(params));
    bidi.onMessage({ type: "event", method: "log.entryAdded", params: { type: "console", text: "hi" } });
    bidi.onMessage({ type: "event", method: "browsingContext.load", params: {} });
    assert.deepEqual(seen, [{ type: "console", text: "hi" }]);
  });

  test("openSession stores the session id and capabilities", async () => {
    const bidi = fakeBiDi();
    const pending = bidi.openSession();
    bidi.onMessage({ type: "success", id: 1, result: { sessionId: "s7", capabilities: { browserVersion: "157.0" } } });
    const capabilities = await pending;
    assert.equal(bidi.sessionId, "s7");
    assert.deepEqual(capabilities, { browserVersion: "157.0" });
  });

  test("session adds the session id to params", () => {
    const bidi = fakeBiDi();
    bidi.sessionId = "s7";
    assert.deepEqual(bidi.session({ url: "about:blank" }), { url: "about:blank", sessionId: "s7" });
  });

  test("close sends session.end and closes the socket", () => {
    const bidi = fakeBiDi();
    bidi.sessionId = "s7";
    bidi.ws.close = () => { bidi.ws.closed = true; };
    bidi.close();
    assert.deepEqual(bidi.ws.sent, [{ id: 1, method: "session.end", params: { sessionId: "s7" } }]);
    assert.equal(bidi.ws.closed, true);
  });
});

describe("console formatting", () => {
  test("RemoteValues are formatted like the CDP runner did", () => {
    assert.equal(formatArg({ type: "string", value: "hello" }), "hello");
    assert.equal(formatArg({ type: "number", value: 42 }), "42");
    assert.equal(formatArg({ type: "boolean", value: true }), "true");
    assert.equal(formatArg({ type: "null" }), "null");
    assert.equal(formatArg({ type: "undefined" }), "undefined");
    assert.equal(formatArg({ type: "object", value: [["a", { type: "number", value: 1 }]] }), '[["a",{"type":"number","value":1}]]');
  });
});

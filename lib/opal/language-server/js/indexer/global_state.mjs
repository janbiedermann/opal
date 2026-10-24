// The server's long-lived state (LSP.md §5). P8a stopgap: only the client
// info the features read; the Index with the baked corelib/stdlib payload,
// the workspace-folder indexing and the stale-corelib re-check land with
// P8b (js/indexer/), at which point this file grows into the full port of
// ../indexer/global_state.rb.
export class GlobalState {
  constructor() {
    this.index = null;
    this.clientCapabilities = {};
    this.clientName = "";
    this.opalHome = null;
    this.formatter = null;
  }

  // Answered from initialize: client info, the optional opalHome, and the
  // external formatter. Answers a summary string for the logMessage -
  // empty until P8b, so no notification is sent (a stray message would
  // shift the publish/response sequence for clients and tests).
  clientInitialized(params) {
    this.clientCapabilities = params.capabilities ?? {};
    this.clientName = params.clientInfo?.name ?? "";
    const init = params.initializationOptions ?? {};
    this.opalHome = init.opalHome ?? null;
    // External formatter command (LSP.md §9 P7): none configured, none
    // advertised. The environment is the fallback for clients that
    // cannot send initializationOptions.
    this.formatter = init.formatter ?? process.env.OPAL_LSP_FORMATTER ?? null;
    return "";
  }
}

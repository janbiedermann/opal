// The server loop: read a message, answer it, repeat. Single-threaded by
// design - one synchronous loop for lifecycle and requests, as in
// ../server.rb (there everything is already JS-native: no opal, no bridge;
// the transport read is blocking fs.readSync).
//
// P8a note: the dispatch table carries the ported cases only; a request for
// a not-yet-ported feature answers METHOD_NOT_FOUND, which is the scoreboard
// signal in LSP.md §13. Capabilities are the full shipped set from day one
// so the initialize parity case passes early.
import { Transport } from "./transport.mjs";
import { ErrorCodes, logMessage, notification, result, error } from "./protocol.mjs";
import { Store } from "./store.mjs";
import { Document } from "./document.mjs";
import { GlobalState } from "./indexer/global_state.mjs";
import { perform as documentSymbol } from "./features/document_symbol.mjs";
import { OPAL_VERSION } from "../../../../opal/corelib/version.mjs";

// The semantic-tokens legend, the subset this server emits (the token
// tables of ../features/semantic_highlighting.rb; the emitter itself joins
// in P8d and reads these from here).
export const TOKEN_TYPES = [
  "namespace", // module name
  "class",     // class name
  "method",    // method with an explicit receiver, and every def
  "function",  // bare method call (no receiver)
  "parameter", // block/method parameters
  "property",  // instance/class variables
  "variable",  // locals, globals, constants
];

export const TOKEN_MODIFIERS = [
  "declaration", // a def
  "readonly",    // constant reads
];

export class Server {
  constructor(transport = new Transport()) {
    this.transport = transport;
    this.store = new Store();
    this.stopped = false;
    this.shutdown = false;
    this.state = new GlobalState();
  }

  // Read messages until the client closes stdin or asks to exit.
  run() {
    while (!this.stopped) {
      const message = this.transport.nextMessage();
      if (message === null) break;
      this.process(message);
    }
  }

  process(message) {
    const method = message.method;
    const params = message.params;
    const id = message.id;

    try {
      switch (method) {
        case "initialize":
          this.runInitialize(id, params);
          break;
        case "initialized":
          // P1: nothing to warm up yet (indexing arrives with P8b).
          break;
        case "textDocument/didOpen":
          this.openDocument(params);
          break;
        case "textDocument/didChange":
          this.changeDocument(params);
          break;
        case "textDocument/didClose":
          this.store.delete(params?.textDocument?.uri);
          break;
        case "textDocument/didSave":
          // The compile gate (LSP.md §2 gate 2) runs on save, never on a
          // keystroke: it is a full Compiler pass.
          {
            const document = this.store.get(params?.textDocument?.uri);
            if (document) this.publishCompileGate(document);
          }
          break;
        case "textDocument/documentSymbol":
          this.withDocument(id, params, (d) => documentSymbol(d));
          break;
        case "textDocument/diagnostic":
          // Pull diagnostics (3.17, LSP.md §9 P6): the same gates as the
          // push pair, answered on demand; documents the server does not
          // know report none.
          {
            const document = this.store.get(params?.textDocument?.uri);
            this.transport.write(result(id, {
              kind: "full",
              items: document === null ? [] : this.gateDiagnostics(document),
            }));
          }
          break;
        case "shutdown":
          this.shutdown = true;
          this.transport.write(result(id, null));
          break;
        case "exit":
          // The spec: exit status 0 after a shutdown, 1 otherwise.
          this.stopped = true;
          process.exit(this.shutdown ? 0 : 1);
          break;
        case "$/cancelRequest":
          // Single-threaded: a request runs to completion; accepted and
          // honored between chunks once long work exists.
          break;
        case undefined:
        case null:
          // A response to a request the server sent (window/showMessage
          // etc.) - no such requests yet.
          break;
        default:
          if (id == null) {
            // Unknown notifications are silently ignored, as the spec says.
            break;
          }
          this.transport.write(error(id, ErrorCodes.METHOD_NOT_FOUND, `Method not found: ${method}`));
      }
    } catch (e) {
      // A request must not die silently: answer it as an internal error
      // (ruby-lsp answers the same shape, with the class in the data).
      if (id != null) {
        this.transport.write(error(id, ErrorCodes.INTERNAL_ERROR, `${e.name}: ${e.message}`));
      }
    }
  }

  runInitialize(id, params) {
    params = params ?? {};
    const summary = this.state.clientInitialized(params);
    if (summary !== "") this.log(3, `opal-language-server: ${summary}`);

    // The shipped capabilities map (../server.rb): incremental sync, push
    // diagnostics (the 3.17 shape), pull diagnostics and the AST features.
    // Only utf-16 is offered: JS strings are UTF-16 and the parser reports
    // UTF-16 offsets (lib/opal/parser/index.mjs).
    const capabilities = {
      positionEncoding: "utf-16",
      textDocumentSync: {
        openClose: true,
        change: 2, // TextDocumentSyncKind.Incremental
        save: { includeText: false },
      },
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      documentHighlightProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: { prepareProvider: true },
      workspaceSymbolProvider: true,
      hoverProvider: true,
      signatureHelpProvider: { triggerCharacters: ["(", ","] },
      typeHierarchyProvider: true,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [".", ":", "@", "\"", "'"],
      },
      codeActionProvider: { codeActionKinds: ["quickfix", "refactor.extract"] },
      // Pull diagnostics (3.17): per-document only - the three gates
      // are per-file, no cross-file claims (workspaceDiagnostics off).
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      semanticTokensProvider: {
        legend: { tokenTypes: TOKEN_TYPES, tokenModifiers: TOKEN_MODIFIERS },
        full: true,
        range: false,
      },
      inlayHintProvider: true,
      documentOnTypeFormattingProvider: {
        firstTriggerCharacter: "{",
        moreTriggerCharacter: ["\n", "|", "d"],
      },
      // Custom requests (opalLsp/showSyntaxTree, opalLsp/compileToJs)
      // are advertised under flat extension keys, as LSP's capability
      // section allows.
      opalLspShowSyntaxTreeProvider: true,
      opalLspCompileToJsProvider: true,
    };
    // Formatting is delegation, so it is advertised only when a
    // formatter command is configured (LSP.md §9 P7): no formatter,
    // no claim, and clients keep their own or none.
    if (this.state.formatter != null) capabilities.documentFormattingProvider = true;
    this.transport.write(result(id, {
      capabilities,
      serverInfo: {
        name: "opal-language-server",
        version: OPAL_VERSION,
      },
    }));
  }

  // ---- document synchronization (P1) ----

  // Answer with the feature's result for the request's document; null
  // when the document is not open (the client raced a didClose).
  withDocument(id, params, fn) {
    const document = this.store.get(params?.textDocument?.uri);
    this.transport.write(result(id, document === null ? null : fn(document)));
  }

  openDocument(params) {
    const textDocument = params.textDocument;
    if (!this.rubyLanguage(textDocument.languageId)) return;
    const document = new Document({
      uri: textDocument.uri,
      source: textDocument.text ?? "",
      version: textDocument.version ?? 0,
      languageId: textDocument.languageId,
    });
    this.store.set(document);
    this.publishParseGate(document);
    // Live indexing of open documents joins in P8b.
  }

  changeDocument(params) {
    const document = this.store.get(params?.textDocument?.uri);
    if (document === null) return;
    if (params.textDocument?.version != null) document.version = params.textDocument.version;
    document.pushEdits(params.contentChanges ?? []);
    this.publishParseGate(document);
    // Live indexing of open documents joins in P8b.
  }

  // window/logMessage: severity 1=error 2=warning 3=info 4=log.
  log(severity, message) {
    this.transport.write(logMessage(severity, message));
  }

  // The parse gate on every edit (LSP.md §9 P1). The API gate (§2 gate 3)
  // joins this call in P8d. Publishing an empty array clears the squiggles.
  publishParseGate(document) {
    this.publishDiagnostics(document, document.diagnostics);
  }

  // The compile gate on save (§2 gate 2). A document that does not
  // parse is left to the parse diagnostics already on screen: feeding
  // broken syntax to the Compiler would only re-report the same error.
  publishCompileGate(document) {
    if (document.syntaxError) return;
    this.publishDiagnostics(document, this.gateDiagnostics(document));
  }

  // All three gates for one document (push-on-save and pull share it):
  // parse + API always, the Compiler pass only over parsing source. P8a:
  // parse only, until the API and compile gates port in P8d.
  gateDiagnostics(document) {
    return document.diagnostics;
  }

  publishDiagnostics(document, diagnostics) {
    this.transport.write(notification("textDocument/publishDiagnostics", {
      uri: document.uri,
      diagnostics,
    }));
  }

  rubyLanguage(languageId) {
    return languageId == null || languageId === "ruby";
  }
}

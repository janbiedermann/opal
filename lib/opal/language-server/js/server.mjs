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
import * as DefinitionFeature from "./features/definition.mjs";
import * as ReferencesFeature from "./features/references.mjs";
import * as RenameFeature from "./features/rename.mjs";
import * as WorkspaceSymbolFeature from "./features/workspace_symbol.mjs";
import * as HoverFeature from "./features/hover.mjs";
import * as SignatureHelpFeature from "./features/signature_help.mjs";
import * as TypeHierarchyFeature from "./features/type_hierarchy.mjs";
import * as CompletionFeature from "./features/completion.mjs";
import * as FoldingRangesFeature from "./features/folding_ranges.mjs";
import * as SelectionRangesFeature from "./features/selection_ranges.mjs";
import * as DocumentHighlightFeature from "./features/document_highlight.mjs";
import * as SemanticHighlightingFeature from "./features/semantic_highlighting.mjs";
import * as InlayHintsFeature from "./features/inlay_hints.mjs";
import * as OnTypeFormattingFeature from "./features/on_type_formatting.mjs";
import * as SyntaxTreeFeature from "./features/syntax_tree.mjs";
import * as CompileToJsFeature from "./features/compile_to_js.mjs";
import * as OpalGateFeature from "./features/opal_gate.mjs";
import * as CodeActionsFeature from "./features/code_actions.mjs";
import * as FormattingFeature from "./features/formatting.mjs";
import { legend as semanticLegend } from "./features/semantic_highlighting.mjs";
import { OPAL_VERSION } from "../../../../opal/corelib/version.mjs";

// The requests whose answers read the index (NavigationTarget's
// resolution, the baked records, the live method/constant reference
// maps): dispatch runs the index catch-up for exactly these
// (index-on-idle, see process()). documentSymbol, the text features,
// the gates and the custom AST requests read only the document's own
// parse, so they never pay a re-index.
const INDEX_READERS = new Set([
  "textDocument/definition",
  "textDocument/references",
  "textDocument/prepareRename",
  "textDocument/rename",
  "textDocument/hover",
  "textDocument/signatureHelp",
  "textDocument/prepareTypeHierarchy",
  "textDocument/typeHierarchy/supertypes",
  "textDocument/typeHierarchy/subtypes",
  "textDocument/completion",
  "completionItem/resolve",
  "workspace/symbol",
]);

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

    // Index-on-idle (LSP.md §13 follow-up): didOpen/didChange no longer
    // re-index the document (that was the keystroke path's biggest stage
    // after the parse - bench_lsp). Every request that reads the index
    // first brings the open documents' records up to date, so no answer
    // can observe the stale window: this loop is single-threaded and
    // synchronous, and nothing between the edit and this line touches
    // the index. One re-index per typing burst instead of one per key.
    if (INDEX_READERS.has(method)) this.catchUpIndex();

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
          // Closed documents keep their index records (the file on disk
          // still exists, and the workspace index would re-add them):
          // catch the last edits up first, so the records hold the final
          // buffer state as the eager per-change server left them.
          this.catchUpIndex();
          this.store.delete(params?.textDocument?.uri);
          break;
        case "workspace/didChangeWatchedFiles":
          // A watched file moved on disk (a git checkout, another editor):
          // keep the live index in step. Open documents are skipped - the
          // editor buffer is authoritative and didChange already re-indexed
          // it (LSP.md §9 P6).
          for (const event of params?.changes ?? []) {
            const uri = event.uri;
            if (typeof uri !== "string" || !uri.startsWith("file://") || !uri.endsWith(".rb")) continue;
            if (this.store.get(uri) !== null) continue;
            if (event.type === 3) this.state.index.removeDocument(uri); // Deleted
            else this.state.indexWorkspaceFile(uri); // Created (1) or Changed (2)
          }
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
        case "textDocument/foldingRange":
          this.withDocument(id, params, (d) => FoldingRangesFeature.perform(d));
          break;
        case "textDocument/selectionRange":
          this.withDocument(id, params, (d) => SelectionRangesFeature.perform(d, params.positions ?? []));
          break;
        case "textDocument/documentHighlight":
          this.withDocument(id, params, (d) => DocumentHighlightFeature.perform(d, params.position));
          break;
        case "textDocument/semanticTokens/full":
          this.withDocument(id, params, (d) => SemanticHighlightingFeature.perform(d));
          break;
        case "textDocument/inlayHint":
          this.withDocument(id, params, (d) => InlayHintsFeature.perform(d, params.range));
          break;
        case "textDocument/onTypeFormatting":
          this.withDocument(id, params, (d) => OnTypeFormattingFeature.perform(d, params, this.state.clientName));
          break;
        case "opalLsp/showSyntaxTree":
          this.withDocument(id, params, (d) => SyntaxTreeFeature.perform(d));
          break;
        case "opalLsp/compileToJs":
          this.withDocument(id, params, (d) => CompileToJsFeature.perform(d));
          break;
        case "textDocument/codeAction":
          this.withDocument(id, params, (d) => CodeActionsFeature.perform(d, params.context, params.range, params.only ?? null));
          break;
        case "textDocument/formatting":
          // Whitespace delegation only (LSP.md §9 P7): null when no
          // formatter is configured, so the client keeps the buffer.
          this.withDocument(id, params, (d) => FormattingFeature.perform(d, this.state.formatter));
          break;
        case "textDocument/definition":
          this.withDocument(id, params, (d) => DefinitionFeature.perform(this.state, d, params.position));
          break;
        case "textDocument/references":
          this.withDocument(id, params, (d) => {
            const includeDecl = (params.context ?? {}).includeDeclaration;
            return ReferencesFeature.perform(this.state, d, params.position, includeDecl !== false);
          });
          break;
        case "textDocument/prepareRename":
          this.withDocument(id, params, (d) => RenameFeature.prepare(this.state, d, params.position));
          break;
        case "textDocument/rename":
          this.withDocument(id, params, (d) => RenameFeature.perform(this.state, d, params.position, params.newName));
          break;
        case "workspace/symbol":
          this.transport.write(result(id, WorkspaceSymbolFeature.perform(this.state, params?.query ?? "")));
          break;
        case "textDocument/hover":
          this.withDocument(id, params, (d) => HoverFeature.perform(this.state, d, params.position));
          break;
        case "textDocument/signatureHelp":
          this.withDocument(id, params, (d) => SignatureHelpFeature.perform(this.state, d, params.position));
          break;
        case "textDocument/prepareTypeHierarchy":
          this.withDocument(id, params, (d) => TypeHierarchyFeature.prepare(this.state, d, params.position));
          break;
        case "textDocument/typeHierarchy/supertypes":
          this.transport.write(result(id, TypeHierarchyFeature.supertypes(this.state, params?.item ?? null)));
          break;
        case "textDocument/typeHierarchy/subtypes":
          this.transport.write(result(id, TypeHierarchyFeature.subtypes(this.state, params?.item ?? null)));
          break;
        case "textDocument/completion":
          this.withDocument(id, params, (d) => CompletionFeature.perform(this.state, d, params.position));
          break;
        case "completionItem/resolve":
          this.transport.write(result(id, CompletionFeature.resolve(this.state, params)));
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
        legend: semanticLegend(),
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
    // The document joins the live index lazily (index-on-idle): its
    // records stay missing/stale until the first index-reading request
    // (or didClose) catches up - nothing else can observe the gap.
  }

  changeDocument(params) {
    const document = this.store.get(params?.textDocument?.uri);
    if (document === null) return;
    if (params.textDocument?.version != null) document.version = params.textDocument.version;
    document.pushEdits(params.contentChanges ?? []);
    this.publishParseGate(document);
    // No re-index here: the fresh parse leaves the live records stale,
    // and catchUpIndex() replaces them whole at the next index read
    // (index-on-idle; a typing burst costs one re-index, not one per key).
  }

  // Bring every open document's live records up to its current parse
  // (index-on-idle): stale means never indexed or re-parsed since the
  // listener was built (index.stale). Only the edited documents re-index;
  // after a typing burst this is one AST pass, and a clean loop costs
  // one identity compare per open document.
  catchUpIndex() {
    this.store.each((document) => {
      if (this.state.index.stale(document)) this.indexDocument(document);
    });
  }

  // The live index entry for one document: indexDocument replaces it
  // whole, so stale records never answer a definition. A closed document
  // keeps its records - the file on disk still exists, and the workspace
  // index would re-add them anyway (didClose catches them up to the
  // final buffer state first).
  indexDocument(document) {
    try {
      this.state.index.indexDocument(document);
    } catch (e) {
      // Navigation must never take the parse gate down with it.
      this.log(2, `indexing failed for ${document.uri}: ${e.name}: ${e.message}`);
    }
  }

  // window/logMessage: severity 1=error 2=warning 3=info 4=log.
  log(severity, message) {
    this.transport.write(logMessage(severity, message));
  }

  // The parse gate on every edit (LSP.md §9 P1), joined by the API gate
  // (§2 gate 3): both are single AST passes and belong on the keystroke
  // path. Publishing an empty array clears the squiggles.
  publishParseGate(document) {
    this.publishDiagnostics(document, document.diagnostics.concat(OpalGateFeature.apiDiagnostics(document)));
  }

  // The compile gate on save (§2 gate 2). A document that does not
  // parse is left to the parse diagnostics already on screen: feeding
  // broken syntax to the Compiler would only re-report the same error.
  publishCompileGate(document) {
    if (document.syntaxError) return;
    this.publishDiagnostics(document, this.gateDiagnostics(document));
  }

  // All three gates for one document (push-on-save and pull share it):
  // parse + API always, the Compiler pass only over parsing source.
  gateDiagnostics(document) {
    const diags = document.diagnostics.concat(OpalGateFeature.apiDiagnostics(document));
    if (!document.syntaxError) diags.push(...OpalGateFeature.compileDiagnostics(document));
    return diags;
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

// Minimal VS Code client for the Opal language server (LSP.md §9 P7).
// The server itself is the whole product; this file only launches it and
// forwards configuration. VS Code has no built-in hook for external Ruby
// servers, which is why this extension exists at all.
//
// Setup (see examples/vscode/README.md):
//   node tasks/lsp.mjs            # builds exe/lsp in the checkout
//   cd examples/vscode && npm install
// then press F5 in this folder (Run Extension) and open a Ruby file in
// the Extension Development Host, or package and install the VSIX.
const vscode = require("vscode");
const {
  LanguageClient,
  TransportKind,
  Trace,
} = require("vscode-languageclient/node");

let client;

function activate(context) {
  const config = vscode.workspace.getConfiguration("opal.languageServer");
  // OPAL_LSP_COMMAND is the zero-config path: the F5 launch config in this
  // folder points it at the checkout's exe/lsp.
  const command = config.get("command") || process.env.OPAL_LSP_COMMAND;
  if (!command) {
    const configure = "Configure opal.languageServer.command";
    vscode.window
      .showWarningMessage(
        "The Opal language server needs opal.languageServer.command " +
          "(the exe/lsp path; build it with `node tasks/lsp.mjs`).",
        configure
      )
      .then((chosen) => {
        if (chosen === configure) {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "opal.languageServer"
          );
        }
      });
    return;
  }

  const initializationOptions = {};
  const opalHome = config.get("opalHome") || process.env.OPAL_HOME;
  if (opalHome) {
    initializationOptions.opalHome = opalHome;
  }
  const formatter = config.get("formatter");
  if (formatter) {
    initializationOptions.formatter = formatter;
  }
  const trace = config.get("trace") || "off";

  const clientOptions = {
    documentSelector: [{ scheme: "file", language: "ruby" }],
    initializationOptions,
    // .rb changes on disk reach the server as didChangeWatchedFiles,
    // which re-indexes closed files (LSP.md §9 P6).
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.rb"),
    },
  };

  // One complete Executable ({command, args, transport}), not a
  // {run, debug} pair: in the run/debug form each side must itself be a
  // full Executable, and a bare command string there makes the client
  // reject with "Unsupported server configuration". The client appends
  // "--stdio" itself for a stdio transport, so args stay empty.
  const serverOptions = {
    command,
    transport: TransportKind.stdio,
  };

  client = new LanguageClient(
    "opalLanguageServer",
    "Opal Language Server",
    serverOptions,
    clientOptions
  );
  // start() resolves only after the server's initialize reply, so the
  // "connected" line is proof the server is up; failures land in the
  // same output channel. trace=messages/verbose logs the JSON-RPC
  // traffic client-side (no wire change; see client.js setTrace).
  client.start().then(
    () => {
      client.outputChannel.appendLine(
        "Connected: " + command + " --stdio (trace: " + trace + ")"
      );
      if (trace === "messages" || trace === "verbose") {
        client.setTrace(trace === "messages" ? Trace.Messages : Trace.Verbose);
      }
    },
    (err) => {
      client.outputChannel.appendLine(
        "Failed to start: " + (err && err.message ? err.message : err)
      );
      vscode.window.showErrorMessage(
        'Opal Language Server failed to start; see Output > "Opal Language Server".'
      );
    }
  );
  context.subscriptions.push({ dispose: () => client && client.stop() });
}

function deactivate() {
  return client ? client.stop() : undefined;
}

module.exports = { activate, deactivate };

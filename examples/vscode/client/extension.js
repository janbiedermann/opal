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
} = require("vscode-languageclient/node");

let client;

function activate(context) {
  const config = vscode.workspace.getConfiguration("opal.languageServer");
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

  const clientOptions = {
    documentSelector: [{ scheme: "file", language: "ruby" }],
    initializationOptions,
    // .rb changes on disk reach the server as didChangeWatchedFiles,
    // which re-indexes closed files (LSP.md §9 P6).
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.rb"),
    },
  };

  client = new LanguageClient(
    "opalLanguageServer",
    "Opal Language Server",
    { run: command, debug: command, transport: TransportKind.stdio, args: ["--stdio"] },
    clientOptions
  );
  client.start();
  context.subscriptions.push({ dispose: () => client && client.stop() });
}

function deactivate() {
  return client ? client.stop() : undefined;
}

module.exports = { activate, deactivate };

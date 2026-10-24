# Opal Language Server - VS Code client

A minimal client extension that launches the Opal language server
(`exe/lsp`) over stdio. The server answers exactly Opal's Ruby (see
`LSP.md`); this extension only configures and starts it.

## Build the server

```sh
node tasks/lsp.mjs          # produces exe/lsp in this checkout
```

## Run it

1. `npm install` in this folder (pulls `vscode-languageclient`).
2. Open **this folder** (`examples/vscode`) in VS Code and press F5
   ("Run Extension"): the launch config pre-sets `OPAL_LSP_COMMAND` to
   this checkout's `exe/lsp`, so the Extension Development Host starts
   the server with no settings at all.
3. In the Development Host open any `*.rb` file (the extension registers
   the Ruby language id so bare VS Code recognizes it): go to
   definition, references, rename, completion, hover and the
   diagnostics gates are live. Try typing `Thread.new { }` or
   `"a".gsub!` to see the unsupported-API warnings with quickfixes.
4. To use the real checkout as workspace, in the Development Host do
   File > Open Folder and pick the Opal checkout; optionally set
   `opal.languageServer.opalHome` to it so "go to definition" into
   corelib lands in `opal/corelib/*.rb` instead of dumped copies.
5. To watch the server's traffic: View > Output > "Opal Language
   Server". The channel prints a "Connected: ..." line once the
   server answers `initialize` (it also catches start-up failures).
   Set `opal.languageServer.trace` to `messages` or `verbose` to see
   every JSON-RPC request/response there. The server's stderr lands
   in that channel too — the `DEP0169 url.parse()` warning an F5
   session prints in the Debug Console comes from VS Code's own
   extension host (microsoft/vscode#328548), not from exe/lsp: the
   bundle contains no `require("url")` at all.

## Verify it is really parsing

- View > Output > "Opal Language Server" shows `Connected: <path> --stdio`.
- Type `def foo` with no `end`: a red error squiggle appears while
  typing (the parse gate runs on every keystroke). With trace on,
  the `textDocument/didOpen` + `textDocument/didChange` requests and
  the `textDocument/publishDiagnostics` notification scroll past.
- `Ctrl+Shift+O` lists the file's classes/methods (document symbols);
  `F12` jumps to a definition; `Thread.new { }` or `"a".gsub!`
  produce unsupported-API warnings with quickfixes (`Ctrl+.`).
- In a terminal: `pgrep -af "exe/lsp --stdio"` shows the server
  process the extension spawned.

To install it for real instead of F5: `npx @vscode/vsce package`
(adjust the `publisher` first, vsce rejects the placeholder) and install
the produced VSIX.

## Notes

- The extension forwards `.rb` file-system events; the server keeps its
  workspace index current from them (`workspace/didChangeWatchedFiles`).
- Diagnostics: parse errors and unsupported-API warnings appear as you
  type; the deeper compile gate (`/o` regexp flags and friends) runs on
  save. Quickfixes are offered for the gated patterns (drop the bang,
  `msg << x` -> `msg += x`, drop `/o`, remove the unsupported require/call).
- No built-in formatter: the server deliberately ships none (LSP.md §9
  P7). Set `opal.languageServer.formatter` to an external command (e.g.
  `st --baseline` or a `rubocop -a`-style runner): the document goes to
  its stdin and its stdout replaces the buffer on Format Document.

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
2. Open VS Code with **this folder** as the workspace and press F5
   ("Run Extension").
3. In the Extension Development Host set `opal.languageServer.command`
   to the absolute path of `exe/lsp` (the built server), then open a
   `*.rb` file: go to definition, references, rename, completion, hover
   and the diagnostics gates are live.
4. Optional: set `opal.languageServer.opalHome` to this checkout so
   "go to definition" into corelib lands in `opal/corelib/*.rb` instead
   of dumped copies of the baked sources.

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

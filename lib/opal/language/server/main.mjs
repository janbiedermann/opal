// The `opal-language-server` command: Opal's Ruby language server over
// LSP, on stdio (JS port of lib/opal/exe/lsp.rb).
//
// Until the P8e flip, this is the development entry (LSP.md §13): run it
// directly, `node lib/opal/language/server/main.mjs --stdio`; the
// committed exe/lsp is still built from the Ruby tree by tasks/lsp.mjs.
import { Server } from "./server.mjs";
import * as Check from "./check.mjs";
import { OPAL_VERSION } from "../../../../opal/corelib/version.mjs";

function usage() {
  return `Usage: opal-lsp [--stdio] [--check DIR] [--version] [--help]

    --stdio                      Speak LSP over stdin/stdout (default)
    --check DIR                  Parse-gate every .rb under DIR,
                                 print them, exit 1 on any error
    --version, -v                Print the version
    --help, -h                   Print this help

The server is configured by the client through the LSP initialize
request; there are no other command-line options yet (LSP.md §6).
`;
}

const args = process.argv.slice(2);
switch (args[0]) {
  case undefined:
  case "":
  case "--stdio":
    // stdio is the only transport: VS Code spawns the server and pipes
    // it. --stdio names it explicitly, as other language servers do.
    new Server().run();
    break;
  case "--check":
    // Parse gate over a tree, no protocol (LSP.md §6): exit 1 when any
    // file fails to parse under Opal's parser.
    process.exit(Check.run(args[1] ?? process.cwd()));
    break;
  case "--version":
  case "-v":
    process.stdout.write(`opal-language-server ${OPAL_VERSION} (Opal ${OPAL_VERSION})\n`);
    break;
  case "--help":
  case "-h":
    process.stdout.write(usage());
    break;
  default:
    console.error(`opal-lsp: unknown option ${args[0]} (-h will show valid options)`);
    process.exit(1);
}

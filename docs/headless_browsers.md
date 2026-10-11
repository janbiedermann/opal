# Running code in a Headless Browsers

## Requirements

First of all, make sure that you have Chrome, at least version 59.0, installed or Firefox, at least version 112 (the Firefox runner uses WebDriver BiDi).

## Using the runners

To run your code using headless Chrome, use `-R chrome` (`--runner chrome`) option:

    $ opal -Rchrome -e "puts 'Hello, Opal'"
    Hello, Opal

To run your code using headless Firefox, use `-R firefox` (`--runner firefox`) option:

    $ opal -Rfirefox -e "puts 'Hello, Opal'"
    Hello, Opal

The runner also listens for any exceptions and prints formatted stracktraces back to your console:

    $ opal -Rchrome -e "
    def raising_method
      raise 'test error'
    end

    raising_method
    "

    RuntimeError: test error
      from <internal:corelib/…>:2693:7:in `<main>'
      from -e:1:1:in `undefined'

## Using exit codes

By default headless browser runner explicitly sets exit code to 1 when there was any error in the code.

    $ opal -Rchrome -e "42"; echo $?
    0

    $ opal -Rchrome -e "raise 'error'"; echo $?
    RuntimeError: error
      from <internal:corelib/kerne…>:2693:7:in `<main>'
      from -e:1:1:in `undefined'
    1

You can change final exit code by using `Kernel#exit`, but make sure to require `opal/platform` in your code.

    $ opal -Rchrome -ropal/platform -e "exit(0)"; echo $?
    0

    $ opal -Rchrome -ropal/platform -e "exit(1)"; echo $?
    1

## Known limitations

1. When you call `console.log(one, two, three)` from your code headless chrome prints only the first passed object.
   The reason behind it is the format of the message that chrome sends to the runner.
   Opal intentionally uses a simplified method from Chrome API (`Console.messageAdded`) to catch `console.log` invocations.
   (Check `lib/opal/cli_runners/chrome.js` do get more information)

## Internals

### Chrome

Under the hood when you call `opal -Rchrome -e 'your code'` Opal uses the Chrome runner defined in
`lib/opal/compiler/cli/runners/browsers.mjs`. This runner tries to connect to `localhost:9222` (9222 is a default port for a headless chrome server)
or runs the server on its own. It detects your platform and uses a default path to the Chrome executable,
but you can override it by specifying `GOOGLE_CHROME_BINARY` environment variable.

When the server is up and running it passes the prepared directory to `lib/opal/compiler/cli/runners/cdp_interface.mjs`
as a subprocess. `cdp_interface.mjs` does the main job: it serves the compiled code over HTTP, drives Chrome over
the Chrome DevTools Protocol (CDP), catches errors and forwards console messages.

### Firefox

This runner tries to connect to `localhost:9333` (9333 is the default port for a headless firefox server used by Opal to prevent accidental
connection to a lingering Chrome at port 9222)
or runs the server on its own. It detects your platform and uses a default path to the Firefox executable,
but you can override it by specifying `MOZILLA_FIREFOX_BINARY` environment variable.

When the server is up and running it passes the prepared directory to `lib/opal/compiler/cli/runners/bidi_interface.mjs`
as a subprocess. `bidi_interface.mjs` does the main job: it serves the compiled code over HTTP and drives Firefox
directly over the WebDriver BiDi protocol (the standard successor of CDP, served by Firefox itself at
`ws://127.0.0.1:PORT/session`, no driver needed; see https://w3c.github.io/webdriver-bidi/).

Note that headless Firefox dismisses `prompt`/`alert`/`confirm` dialogs right away, so instead of the BiDi
`browsingContext.userPromptOpened`/`handleUserPrompt` commands, the runner injects a preload script that
routes these dialogs to its HTTP server (`/prompt` reads a line from stdin, the `opalheadlessbrowserexit`
alert reaches `/exit`).

## Using a remote chrome or firefox server

If you want to change a default browser port or your browser server is running on a different host:port
you can override default values by specifying `OPAL_CDP_HOST` and `OPAL_CDP_PORT` environment variables
(`OPAL_BIDI_HOST` and `OPAL_BIDI_PORT` for the Firefox runner; the `OPAL_CDP_*` names are accepted there too):

      $ OPAL_CDP_HOST=10.10.10.10 CHROME_PORT=8080 opal -Rchrome -e "puts 42"
      Connecting to 10.10.10.10:8080...
      42

If you want to change host and port only for chrome use `CHROME_HOST` and `CHROME_PORT` and only for firefox use `FIREFOX_HOST` and `FIREFOX_PORT`.
NOTE: `OPAL_CDP_HOST` requires a chrome or firefox server to be started. You can't start remotely a server on a different host.

## Additional options

If you need to pass additional CLI options to the Chrome executable you can do so by setting the `CHROME_OPTS` environment variable:

      $ CHROME_OPTS="--window-size=412,732" opal -Rchrome -e "puts 42"
      42

Docker users may need `CHROME_OPTS="--no-sandbox"` due to the user namespaces limitations.

_For a list of additional options see https://developers.google.com/web/updates/2017/04/headless-chrome_

For the Firefox runner use the `FIREFOX_OPTS` environment variable instead.

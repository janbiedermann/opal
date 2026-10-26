// Drives a browser over the Chrome DevTools Protocol: serves the files in
// the directory given as the last argument, loads index.html, relays the
// console output and exits with the program's exit code. Run by the
// Chrome runner (browsers.mjs); the Firefox runner uses bidi_interface.mjs.
//
// For CDP see docs/cdp_common.(md|json)
import { createRequire } from "node:module";
import fs from "node:fs";
import { createBrowserServer, randomString, gets } from "./browser_server.mjs";

const require = createRequire(import.meta.url);
const CDP = require(require.resolve("chrome-remote-interface", { paths: [new URL("../../../dependencies/", import.meta.url).pathname] }));

var dir = process.argv[process.argv.length - 1];
var port_offset; // port offset for http server, depending on number of targets
var script_id;   // of script which is executed after page is initialized, before page scripts are executed
var cdp_client;  // CDP client
var target_id;   // the used Target

var options = {
  host: process.env.OPAL_CDP_HOST || 'localhost',
  port: parseInt(process.env.OPAL_CDP_PORT || '9222')
};

// shared secret

var shared_secret = randomString(); // secret must be passed with POST requests

// support functions

function perror(error) { console.error(error); }

var exiting = false;

function shutdown(exit_code) {
  if (exiting) { return Promise.resolve(); }
  exiting = true;
  var promises = [];
  cdp_client.Page.removeScriptToEvaluateOnNewDocument(script_id).then(function(){}, perror);
  return Promise.all(promises).then(function () {
    target_id ? cdp_client.Target.closeTarget(target_id) : null;
  }).then(function() {
    server.close();
    process.exit(exit_code);
  }, function(error) {
    perror(error);
    process.exit(1);
  });
};

// simple HTTP server to deliver page, scripts to, and trigger commands from browser

var server = createBrowserServer(dir, shared_secret, {
  "/File.write": function(obj, res) {
    // totally insecure on purpose
    fs.writeFileSync(obj.filename, obj.data);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  },
});

// actual CDP code

CDP.List(options, async function(err, targets) {
  // default CDP port is 9222, Firefox runner is at 9333
  // Lets collect clients for
  // Chrome CDP starting at 9273 ...
  // Firefox CDP starting 9334 ...
  port_offset = targets ? targets.length + 51 : 51; // default CDP port is 9222, Node CDP port 9229, Firefox is at 9333

  const {webSocketDebuggerUrl} = await CDP.Version(options);

  return await CDP({target: webSocketDebuggerUrl}, function(browser_client) {

    server.listen({ port: port_offset + options.port, host: options.host });

    browser_client.Target.createTarget({url: "about:blank"}).then(function(target) {
      target_id = target;
      options.target = target_id.targetId;

      CDP(options, function(client) {
        cdp_client = client;

        var Log = client.Log,
            Page = client.Page,
            Runtime = client.Runtime;

        // enable used CDP domains
        Promise.all([
          Log.enable(),
          Page.enable(),
          Runtime.enable()
        ]).then(function() {
          // add script to set the shared_secret in the browser
          return Page.addScriptToEvaluateOnNewDocument({source: "window.OPAL_CDP_SHARED_SECRET = '" + shared_secret + "';"}).then(function(scrid) {
            script_id = scrid;
          }, perror);
        }, perror).then(function() {

          // receive and handle all kinds of log and console messages
          Log.entryAdded(function(entry) {
            process.stdout.write(entry.entry.level + ': ' + entry.entry.text + "\n");
          });

          Runtime.consoleAPICalled(function(entry) {
            var args = entry.args;
            var stack = null;
            var i, arg, frame, value;

            // output actual message
            for(i = 0; i < args.length; i++) {
              arg = args[i];
              if (arg.type === "string") { value = arg.value; }
              else { value = JSON.stringify(arg); }
              process.stdout.write(value);
            }

            if (entry.stackTrace && entry.stackTrace.callFrames) {
              stack = entry.stackTrace.callFrames;
            }

            if (entry.type === "error" && stack) {
              // print full stack for errors
              process.stdout.write("\n");
              for(i = 0; i < stack.length; i++) {
                frame = stack[i];
                if (frame) {
                  value = frame.url + ':' + frame.lineNumer + ':' + frame.columnNumber + '\n';
                  process.stdout.write(value);
                }
              }
            }
          });

          // react to exceptions
          Runtime.exceptionThrown(function(exception) {
            var ex = exception.exceptionDetails.exception.preview.properties;
            var stack = [];
            if (exception.exceptionDetails.stackTrace) {
              stack = exception.exceptionDetails.stackTrace.callFrames;
            } else {
              var d = exception.exceptionDetails;
              stack.push({
                url: d.url,
                lineNumber: d.lineNumber,
                columnNumber: d.columnNumber,
                functionName: "(unknown)"
              });
            }
            var fr;
            for (var i = 0; i < ex.length; i++) {
              fr = ex[i];
              if (fr.name === "message") {
                perror(fr.value);
              }
            }
            for (var j = 0; j < stack.length; j++) {
              fr = stack[j];
              perror(fr.url + ':' + fr.lineNumber + ':' + fr.columnNumber + ': in ' + fr.functionName);
            }
            return shutdown(1);
          });

          // handle input
          Page.javascriptDialogOpening((dialog) => {
            if (dialog.type === 'prompt') {
              var message = gets();
              if (message !== null) {
                Page.handleJavaScriptDialog({accept: true, promptText: message.replace(/\r?\n$/, '')});
              } else {
                Page.handleJavaScriptDialog({accept: false});
              }
            } else if (dialog.type === 'alert' && dialog.message === 'opalheadlessbrowserexit') {
              // A special case of an alert with a magic string "opalheadlessbrowserexit".
              // This denotes that `Kernel#exit` has been called. We would have rather used
              // an exception here, but they don't bubble sometimes.
              Page.handleJavaScriptDialog({accept: true});
              Runtime.evaluate({ expression: "window.OPAL_EXIT_CODE" }).then(function(output) {
                var exit_code = 0;
                if (typeof(output.result) !== "undefined" && output.result.type === "number") {
                  exit_code = output.result.value;
                }
                return shutdown(exit_code);
              });
            }
          });

          // page has been loaded, all code has been executed
          Page.loadEventFired(() => {
            Runtime.evaluate({ expression: "window.OPAL_EXIT_CODE" }).then(function(output) {
              if (typeof(output.result) !== "undefined" && output.result.type === "number") {
                return shutdown(output.result.value);
              } else if (typeof(output.result) !== "undefined" && output.result.type === "string" && output.result.value === "noexit") {
                // do nothing, we have headless chrome support enabled and there are most probably async events awaiting
              } else {
                return shutdown(0);
              }
            });
          });

          // init page load
          Page.navigate({ url: "http://localhost:" + (port_offset + options.port).toString() + "/index.html" });
        }, perror);
      });
    });
  });
});

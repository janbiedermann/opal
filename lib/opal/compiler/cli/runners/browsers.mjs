// Browser runners: Chrome (over the Chrome DevTools Protocol via
// cdp_interface.mjs), Firefox (over WebDriver BiDi via bidi_interface.mjs)
// and Safari (over WebDriver). Port of lib/opal/cli_runners/{chrome,firefox,safari}.rb.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { createServer, request } from "node:http";
import { connect } from "node:net";
import { tmpdir, platform } from "node:os";
import { join } from "node:path";
import { OPAL_ROOT } from "../../paths.mjs";
import { RunnerError, shellwords } from "./system.mjs";

const CLI_RUNNERS_DIR = join(OPAL_ROOT, "lib", "opal", "cli_runners");
const CDP_INTERFACE = new URL("./cdp_interface.mjs", import.meta.url).pathname;
const BIDI_INTERFACE = new URL("./bidi_interface.mjs", import.meta.url).pathname;
const isWindows = platform() === "win32";
const isMacos = platform() === "darwin";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port: Number(port) }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitFor(check, seconds = 30) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await sleep(500);
  }
  return false;
}

function commandExists(name) {
  return spawnSync("sh", ["-c", `command -v '${name.replaceAll("'", "'\\''")}'`], { stdio: "ignore" }).status === 0;
}

function findExecutable(env, windows, macos, names, what) {
  if (process.env[env]) return process.env[env];
  if (isWindows) return windows.find((p) => existsSync(p));
  if (isMacos) return macos.find((p) => existsSync(p));
  const found = names.find(commandExists);
  if (!found) throw new RunnerError(`Cannot find ${what} executable`);
  return found;
}

function killBrowser(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  if (isWindows) {
    if (spawnSync("taskkill", ["/f", "/t", "/pid", String(child.pid)], { stdio: "ignore" }).status !== 0) child.kill("SIGKILL");
  } else {
    child.kill("SIGHUP");
  }
  // Wait for the browser to exit before its profile directory is removed,
  // otherwise rmSync races with the still-running browser (ENOTEMPTY).
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => child.kill("SIGKILL"), 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function warnArgv(data, name) {
  if (data.argv && data.argv.length) process.stderr.write(`warning: ARGV is not supported by the ${name} runner ${JSON.stringify(data.argv)}\n`);
}

// Runs cdp_interface.mjs on the prepared directory; returns its exit status.
function runCdpInterface(dir, host, port, ext) {
  const env = {
    ...process.env,
    OPAL_CDP_HOST: host,
    OPAL_CDP_PORT: String(port),
    OPAL_CDP_EXT: ext,
    NODE_PATH: join(CLI_RUNNERS_DIR, "node_modules"),
  };
  const result = spawnSync(process.execPath, ["--require", join(CLI_RUNNERS_DIR, "source-map-support-node"), CDP_INTERFACE, dir], { env, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status === null ? 1 : result.status;
}

// Runs bidi_interface.mjs on the prepared directory; returns its exit status.
function runBidiInterface(dir, host, port) {
  const env = {
    ...process.env,
    OPAL_BIDI_HOST: host,
    OPAL_BIDI_PORT: String(port),
  };
  const result = spawnSync(process.execPath, ["--require", join(CLI_RUNNERS_DIR, "source-map-support-node"), BIDI_INTERFACE, dir], { env, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status === null ? 1 : result.status;
}

// Checks that a browser serves a WebDriver BiDi session at /session.
function bidiRunning(host, port) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://${host === "localhost" ? "127.0.0.1" : host}:${port}/session`);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    ws.onopen = () => {
      // close fully before resolving, Firefox counts open connections
      try {
        ws.onclose = () => finish(true);
        ws.close();
      } catch {
        finish(true);
      }
    };
    ws.onerror = () => finish(false);
    setTimeout(() => finish(false), 2000);
  });
}

async function withBrowser({ host, port, defaultHost, running, start, failure }, fn) {
  process.stdout.write(`Connecting to ${host}:${port}...\n`);
  if (await running()) return fn();
  if (host !== defaultHost) throw new Error(`${failure.name} can be started only on localhost`);
  const { child, cleanup } = start();
  try {
    const ok = await waitFor(async () => {
      process.stdout.write(`Connecting to ${host}:${port}...\n`);
      return running();
    });
    if (!ok) {
      process.stdout.write(failure.message);
      return 1;
    }
    return await fn();
  } finally {
    await killBrowser(child);
    cleanup();
  }
}

// Chrome

const CHROME_FLAGS = [
  "--allow-pre-commit-input",
  "--disable-background-networking",
  "--enable-features=NetworkServiceInProcess2",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-extensions-with-background-pages",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-features=Translate,BackForwardCache,AcceptCHFrame,AvoidUnnecessaryBeforeUnloadCheckSync",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-popup-blocking",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-sync",
  "--force-color-profile=srgb",
  "--metrics-recording-only",
  "--no-first-run",
  "--enable-automation",
  "--password-store=basic",
  "--use-mock-keychain",
  "--enable-blink-features=IdleDetection",
  "--export-tagged-pdf",
  "--headless",
  "--hide-scrollbars",
  "--mute-audio",
  // to be able to do XMLHttpRequest (see test_openuri.rb)
  "--disable-web-security",
];

// Chrome refuses to start as root while its sandbox is enabled, so add
// --no-sandbox in that case; the caller warns when it was added.
export function chromeSandboxArgs(args, isRoot = typeof process.getuid === "function" && process.getuid() === 0) {
  if (!isRoot || args.includes("--no-sandbox")) return { args, warned: false };
  return { args: [...args, "--no-sandbox"], warned: true };
}

export async function chrome(data) {
  warnArgv(data, "Chrome");
  const builder = data.builder();
  const host = process.env.CHROME_HOST || process.env.OPAL_CDP_HOST || "localhost";
  const port = process.env.CHROME_PORT || process.env.OPAL_CDP_PORT || 9222;
  const dir = mkdtempSync(join(tmpdir(), "chrome-opal-"));
  try {
    return await withBrowser({
      host, port, defaultHost: "localhost",
      running: () => portOpen(host, port),
      start: () => {
        const profile = mkdtempSync(join(tmpdir(), "chrome-opal-profile-"));
        const exe = findExecutable("GOOGLE_CHROME_BINARY",
          ["C:/Program Files/Google/Chrome Dev/Application/chrome.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"],
          ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"],
          ["google-chrome-stable", "chromium", "chromium-freeworld", "chromium-browser"], "chrome");
        const args = [...CHROME_FLAGS, `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, ...shellwords(process.env.CHROME_OPTS)];
        const started = chromeSandboxArgs(args);
        if (started.warned) process.stderr.write("warning: running as root, Chrome cannot use its sandbox, starting it with --no-sandbox\n");
        const child = spawn(exe, started.args, { stdio: "ignore" });
        child.on("error", () => {});
        return { child, cleanup: () => rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) };
      },
      failure: { name: "Chrome server", message: "Failed to start chrome server\nMake sure that you have it installed and that its version is > 59\n" },
    }, () => {
      prepareChromeFiles(builder, dir);
      return runCdpInterface(dir, host, port, builder.outputExtension);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

function prepareChromeFiles(builder, dir) {
  const js = builder.toString();
  const map = JSON.stringify(builder.sourceMap.map());
  const stack = readFileSync(join(CLI_RUNNERS_DIR, "source-map-support-browser.js"));
  const ext = builder.outputExtension;
  const moduleType = builder.isEsm ? ' type="module"' : "";
  // Some maps may contain `</script>` fragment (eg. in strings) which would close our
  // `<script>` tag prematurely. For this case, we need to escape the `</script>` tag.
  const mapJson = JSON.stringify(map).replace(/(<\/scr)(ipt>)/gi, '$1"+"$2');
  // Chrome can't handle huge data passed to `addScriptToEvaluateOnLoad`; the
  // only way is to create temporary files and pass them to chrome.
  writeFileSync(join(dir, `index.${ext}`), js);
  writeFileSync(join(dir, "index.map"), map);
  writeFileSync(join(dir, "source-map-support.js"), stack);
  writeFileSync(join(dir, "index.html"), `<html><head>
  <meta charset='utf-8'>
  <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon">
  <script src='./source-map-support.js'></script>
  <script>
  window.opalheadlesschrome = true;
  sourceMapSupport.install({
    retrieveSourceMap: function(path) {
      return path.endsWith('/index.${ext}') ? {
        url: './index.map', map: ${mapJson}
      } : null;
    }
  });
  </script>
</head><body>
  <script src='./index.${ext}'${moduleType}></script>
</body></html>
`);
}

// Firefox

const FIREFOX_PREFS = "user_pref(\"app.normandy.api_url\", \"\");\nuser_pref(\"app.update.checkInstallTime\", false);\nuser_pref(\"app.update.disabledForTesting\", true);\nuser_pref(\"apz.content_response_timeout\", 60000);\nuser_pref(\"browser.contentblocking.features.standard\", \"-tp,tpPrivate,cookieBehavior0,-cm,-fp\");\nuser_pref(\"browser.dom.window.dump.enabled\", true);\nuser_pref(\"browser.newtabpage.activity-stream.feeds.system.topstories\", false);\nuser_pref(\"browser.newtabpage.enabled\", false);\nuser_pref(\"browser.pagethumbnails.capturing_disabled\", true);\nuser_pref(\"browser.safebrowsing.blockedURIs.enabled\", false);\nuser_pref(\"browser.safebrowsing.downloads.enabled\", false);\nuser_pref(\"browser.safebrowsing.malware.enabled\", false);\nuser_pref(\"browser.safebrowsing.passwords.enabled\", false);\nuser_pref(\"browser.safebrowsing.phishing.enabled\", false);\nuser_pref(\"browser.search.update\", false);\nuser_pref(\"browser.sessionstore.resume_from_crash\", false);\nuser_pref(\"browser.shell.checkDefaultBrowser\", false);\nuser_pref(\"browser.startup.homepage\", \"about:blank\");\nuser_pref(\"browser.startup.homepage_override.mstone\", \"ignore\");\nuser_pref(\"browser.startup.page\", 0);\nuser_pref(\"browser.tabs.closeWindowWithLastTab\", false);\nuser_pref(\"browser.tabs.disableBackgroundZombification\", false);\nuser_pref(\"browser.tabs.warnOnCloseOtherTabs\", false);\nuser_pref(\"browser.tabs.warnOnOpen\", false);\nuser_pref(\"browser.translations.automaticallyPopup\", false);\nuser_pref(\"browser.uitour.enabled\", false);\nuser_pref(\"browser.urlbar.suggest.searches\", false);\nuser_pref(\"browser.usedOnWindows10.introURL\", \"\");\nuser_pref(\"browser.warnOnQuit\", false);\nuser_pref(\"datareporting.healthreport.documentServerURI\", \"http://localhost/dummy/healthreport/\");\nuser_pref(\"datareporting.healthreport.logging.consoleEnabled\", false);\nuser_pref(\"datareporting.healthreport.service.enabled\", false);\nuser_pref(\"datareporting.healthreport.service.firstRun\", false);\nuser_pref(\"datareporting.healthreport.uploadEnabled\", false);\nuser_pref(\"datareporting.policy.dataSubmissionEnabled\", false);\nuser_pref(\"datareporting.policy.dataSubmissionPolicyBypassNotification\", true);\nuser_pref(\"devtools.jsonview.enabled\", false);\nuser_pref(\"dom.disable_open_during_load\", false);\nuser_pref(\"dom.file.createInChild\", true);\nuser_pref(\"dom.ipc.reportProcessHangs\", false);\nuser_pref(\"dom.max_chrome_script_run_time\", 0);\nuser_pref(\"dom.max_script_run_time\", 0);\nuser_pref(\"extensions.autoDisableScopes\", 0);\nuser_pref(\"extensions.enabledScopes\", 5);\nuser_pref(\"extensions.getAddons.cache.enabled\", false);\nuser_pref(\"extensions.installDistroAddons\", false);\nuser_pref(\"extensions.screenshots.disabled\", true);\nuser_pref(\"extensions.update.enabled\", false);\nuser_pref(\"extensions.update.notifyUser\", false);\nuser_pref(\"extensions.webservice.discoverURL\", \"http://localhost/dummy/discoveryURL\");\nuser_pref(\"fission.bfcacheInParent\", false);\nuser_pref(\"fission.webContentIsolationStrategy\", 0);\nuser_pref(\"focusmanager.testmode\", true);\nuser_pref(\"general.useragent.updates.enabled\", false);\nuser_pref(\"geo.provider.testing\", true);\nuser_pref(\"geo.wifi.scan\", false);\nuser_pref(\"hangmonitor.timeout\", 0);\nuser_pref(\"javascript.options.showInConsole\", true);\nuser_pref(\"media.gmp-manager.updateEnabled\", false);\nuser_pref(\"network.cookie.cookieBehavior\", 0);\nuser_pref(\"network.cookie.sameSite.laxByDefault\", false);\nuser_pref(\"network.cookie.useServerTime\", false);\nuser_pref(\"network.http.prompt-temp-redirect\", false);\nuser_pref(\"network.http.speculative-parallel-limit\", 0);\nuser_pref(\"network.manage-offline-status\", false);\nuser_pref(\"network.sntp.pools\", \"localhost\");\nuser_pref(\"plugin.state.flash\", 0);\nuser_pref(\"privacy.trackingprotection.enabled\", false);\nuser_pref(\"remote.active-protocols\", 3);\nuser_pref(\"remote.enabled\", true);\nuser_pref(\"security.certerrors.mitm.priming.enabled\", false);\nuser_pref(\"security.fileuri.strict_origin_policy\", false);\nuser_pref(\"security.notification_enable_delay\", 0);\nuser_pref(\"services.settings.server\", \"http://localhost/dummy/blocklist/\");\nuser_pref(\"signon.autofillForms\", false);\nuser_pref(\"signon.rememberSignons\", false);\nuser_pref(\"startup.homepage_welcome_url\", \"about:blank\");\nuser_pref(\"startup.homepage_welcome_url.additional\", \"\");\nuser_pref(\"toolkit.cosmeticAnimations.enabled\", false);\nuser_pref(\"toolkit.startup.max_resumed_crashes\", -1);";

export async function firefox(data) {
  warnArgv(data, "Firefox");
  const builder = data.builder();
  const host = process.env.FIREFOX_HOST || process.env.OPAL_CDP_HOST || "localhost";
  // makes sure it doesn't accidentally connect to a lingering chrome
  const port = process.env.FIREFOX_PORT || process.env.OPAL_CDP_PORT || 9333;
  const dir = mkdtempSync(join(tmpdir(), "firefox-opal-"));
  let failure = "Failed to start firefox server\nMake sure that you have it installed and that its version is >= 112 (WebDriver BiDi support)\n";
  if (!isWindows && !isMacos) {
    failure += "When firefox is installed via snap, it cannot work correctly with this runner.\n" +
      "In that case, please uninstall firefox via snap and install firefox from a apt repo, see:\n" +
      "https://support.mozilla.org/en-US/kb/install-firefox-linux#w_install-firefox-deb-package-for-debian-based-distributions\n";
  }
  try {
    return await withBrowser({
      host, port, defaultHost: "localhost",
      running: async () => (await portOpen(host, port)) && (await bidiRunning(host, port)),
      start: () => {
        const profile = mkdtempSync(join(tmpdir(), "firefox-opal-profile-"));
        // firefox reads user.js and generates prefs.js from it
        writeFileSync(join(profile, "user.js"), FIREFOX_PREFS);
        const exe = findExecutable("MOZILLA_FIREFOX_BINARY",
          ["C:/Program Files/Mozilla Firefox/firefox.exe"],
          ["/Applications/Firefox.app/Contents/MacOS/Firefox", "/Applications/Firefox.app/Contents/MacOS/firefox"],
          ["firefox", "firefox-esr"], "firefox");
        const args = ["--no-remote", ...(isMacos ? ["--foreground"] : []), ...(isWindows ? ["--wait-for-browser"] : []),
          "--profile", profile, "--headless", "--remote-debugging-port", String(port), ...shellwords(process.env.FIREFOX_OPTS)];
        const child = spawn(exe, args, { stdio: "ignore" });
        child.on("error", () => {});
        return { child, cleanup: () => rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) };
      },
      failure: { name: "Firefox server", message: failure },
    }, () => {
      prepareFirefoxFiles(builder, dir);
      return runBidiInterface(dir, host, port);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

function prepareFirefoxFiles(builder, dir) {
  const ext = builder.outputExtension;
  const moduleType = builder.isEsm ? ' type="module"' : "";
  writeFileSync(join(dir, `index.${ext}`), builder.toString());
  writeFileSync(join(dir, `index.${ext}.map`), JSON.stringify(builder.sourceMap.map()));
  writeFileSync(join(dir, "index.html"), `<!DOCTYPE html>
<html><head>
  <meta charset='utf-8'>
  <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon">
  <script>
  window.opalheadlessfirefox = true;
  </script>
</head><body>
  <script src='/index.${ext}'${moduleType}></script>
</body></html>
`);
}

// Safari (WebDriver)

const SAFARI_EXECUTION_TIMEOUT = 600; // seconds

export async function safari(data) {
  warnArgv(data, "Safari");
  const builder = data.builder();
  const host = process.env.SAFARI_DRIVER_HOST || "localhost";
  const port = Number(process.env.SAFARI_DRIVER_PORT || 9444); // port + 1 is used for the http server
  const dir = mkdtempSync(join(tmpdir(), "safari-opal-"));
  const { promise: finished, resolve: finish } = Promise.withResolvers();
  const http = createServer((req, res) => {
    if (req.url === "/log") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        if (body) for (const value of Object.values(JSON.parse(body))) process.stdout.write(typeof value === "string" ? value : JSON.stringify(value));
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("");
      });
    } else if (req.url === "/exit") {
      res.end("");
      finish();
    } else {
      const path = join(dir, req.url.split("?")[0]);
      if (!path.startsWith(dir) || !existsSync(path)) {
        res.writeHead(404);
        return res.end();
      }
      res.end(readFileSync(path));
    }
  });
  await new Promise((r) => http.listen(port + 1, r));
  let driver = null;
  try {
    if (!(await portOpen(host, port))) {
      if (host !== "localhost") throw new Error("Safari driver can be started only on localhost");
      driver = spawn("/usr/bin/safaridriver", ["-p", String(port)], { stdio: "ignore" });
      if (!(await waitFor(() => portOpen(host, port)))) {
        process.stdout.write("Failed to start Safari driver\n");
        return 1;
      }
    }
    builder.buildStr('%x{\n  var req = new XMLHttpRequest();\n  req.open("GET", \'/exit\');\n  req.send();\n}\n', "(exit)", { no_export: true });
    prepareSafariFiles(builder, dir);
    const session = await postJson(host, port, "/session", { capabilities: { browserName: "Safari" } });
    const sessionId = session?.value?.sessionId;
    if (!sessionId) {
      process.stderr.write(`Could not create session: ${JSON.stringify(session)}\n`);
      return 0;
    }
    await postJson(host, port, `/session/${sessionId}/url`, { url: `http://${host}:${port + 1}/index.html` });
    const timedOut = await Promise.race([finished.then(() => false), sleep(SAFARI_EXECUTION_TIMEOUT * 1000).then(() => true)]);
    if (timedOut) process.stdout.write("Execution timed out\n");
    return 0;
  } finally {
    http.close();
    if (driver) driver.kill("SIGHUP");
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

function postJson(host, port, path, body) {
  return new Promise((resolve, reject) => {
    const req = request({ host, port, path, method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

function prepareSafariFiles(builder, dir) {
  const ext = builder.outputExtension;
  const moduleType = builder.isEsm ? ' type="module"' : "";
  writeFileSync(join(dir, `index.${ext}`), builder.toString());
  writeFileSync(join(dir, "index.map"), JSON.stringify(builder.sourceMap.map()));
  writeFileSync(join(dir, "index.html"), `<html><head>
  <meta charset='utf-8'>
  <link rel="icon" href="data:;base64,=">
</head><body>
  <script>
    var orig_log = console.log;
    var orig_err = console.error;
    var orig_warn = console.warn;
    function send_log_request(args) {
      var req = new XMLHttpRequest();
      req.open("POST", '/log');
      req.setRequestHeader("Content-Type", "application/json");
      req.send(JSON.stringify(args));
    }
    console.log = function() {
      orig_log.apply(null, arguments);
      send_log_request(arguments);
    }
    console.error = function() {
      orig_err.apply(null, arguments);
      send_log_request(arguments);
    }
    console.warn = function() {
      orig_warn.apply(null, arguments);
      send_log_request(arguments);
    }
  </script>
  <script src='./index.${ext}'${moduleType}></script>
</body></html>
`);
}

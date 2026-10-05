#!/usr/bin/env node
// Release tasks.
//
//   node tasks/release.mjs changelog [VERSION]
//     Updates CHANGELOG.md from the published GitHub releases; UNRELEASED.md
//     becomes the entry of VERSION (or "Unreleased").
//   node tasks/release.mjs prepare VERSION
//     Sets the version in stdlib/opal/version.rb, lib/opal/compiler/version.mjs
//     and opal/corelib/constants.rb, updates the changelog (unless it's a
//     prerelease), resets UNRELEASED.md and commits.
//   node tasks/release.mjs upload TAG
//     Uploads build/{opal,opal-parser}{.js,.min.js,.min.js.gz} (from
//     `node tasks/dist.mjs`) to the GitHub release TAG (needs the `gh` CLI).
//
// GITHUB_TOKEN is used for the GitHub API if set.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./testing/common.mjs";

const REPO = "opal/opal";

async function githubReleases() {
  const releases = [];
  const headers = { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`, { headers });
    if (!response.ok) throw new Error(`GitHub API: ${response.status} ${response.statusText}`);
    const batch = await response.json();
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  const version = (r) => r.tag_name.slice(1).split(".").map(Number);
  const compare = (a, b) => {
    const [x, y] = [version(a), version(b)];
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  };
  return releases.filter((r) => /^v(\d+)(\.\d+)*$/.test(r.tag_name)).sort(compare);
}

const expandPullRequestLinks = (s) => s.replace(/\(#(\d+)\)/g, "([#$1](https://github.com/opal/opal/pull/$1))");

function changelogEntry({ tagName, releaseDate, previousTagName, body }) {
  const compareUrl = `https://github.com/opal/opal/compare/${previousTagName}...${tagName}`;
  const versionName = tagName === "HEAD" ? "Unreleased" : tagName.replace(/^v/, "");
  return `## [${versionName}](${compareUrl}) - ${releaseDate}\n\n\n` + expandPullRequestLinks(body.replaceAll("\r\n", "\n").trim());
}

const CHANGELOG_HEADING = `# Change Log

All notable changes to this project will be documented in this file.
This project *tries* to adhere to [Semantic Versioning](http://semver.org/), even before v1.0.

Changes are grouped as follows:
- **Added** for new features.
- **Changed** for changes in existing functionality.
- **Deprecated** for once-stable features removed in upcoming releases.
- **Removed** for deprecated features removed in this release.
- **Fixed** for any bug fixes.
- **Security** to invite users to upgrade in case of vulnerabilities.
- **Performance** changes related to speed and efficiency.
`;

const today = () => new Date().toISOString().slice(0, 10);

async function changelog(version) {
  const entries = [];
  let previousTagName = "000000";
  for (const release of await githubReleases()) {
    entries.unshift(changelogEntry({ tagName: release.tag_name, releaseDate: release.created_at.slice(0, 10), previousTagName, body: release.body || "" }));
    previousTagName = release.tag_name;
  }
  entries.unshift(changelogEntry({
    tagName: version || "HEAD",
    releaseDate: version ? today() : "unreleased",
    previousTagName,
    body: readFileSync(join(ROOT, "UNRELEASED.md"), "utf8"),
  }));
  entries.unshift(CHANGELOG_HEADING);
  entries.push(""); // for the final newlines
  writeFileSync(join(ROOT, "CHANGELOG.md"), entries.join("\n\n\n\n\n"));
}

function replaceIn(path, fn) {
  console.log(`== update ${path}`);
  const file = join(ROOT, path);
  writeFileSync(file, fn(readFileSync(file, "utf8")));
}

async function prepare(version) {
  if (!version) throw new Error("please provide a version, e.g.: node tasks/release.mjs prepare 1.2.3");
  version = version.replace(/^v/, "");
  const current = /VERSION = '([^']+)'/.exec(readFileSync(join(ROOT, "stdlib/opal/version.rb"), "utf8"))[1];
  replaceIn("stdlib/opal/version.rb", (s) => s.replace(current, version));
  replaceIn("lib/opal/compiler/version.mjs", (s) => s.replace(current, version));
  replaceIn("opal/corelib/constants.rb", (s) => s.replace(current, version).replace(/(RUBY_RELEASE_DATE *= *')\d{4}-\d{2}-\d{2}(')/, `$1${today()}$2`));

  // like Gem::Version#prerelease?: a letter in the version
  if (/[a-zA-Z]/.test(version)) {
    console.log("== (skipping changelog update)");
  } else {
    console.log("== update changelog");
    await changelog(`v${version}`);
    writeFileSync(join(ROOT, "UNRELEASED.md"), "<!--\n### Internal\n### Changed\n### Added\n### Removed\n### Deprecated\n### Performance\n### Fixed\n-->\n\n");
  }

  console.log("== committing");
  const git = (...args) => execFileSync("git", args, { cwd: ROOT, stdio: "inherit" });
  git("add", "UNRELEASED.md", "CHANGELOG.md", "opal/corelib/constants.rb", "stdlib/opal/version.rb", "lib/opal/compiler/version.mjs");
  git("commit", "-m", `Release v${version}`);
  git("--no-pager", "show");
}

function upload(tag) {
  if (!tag) throw new Error("missing the tag (e.g. v0.4.4)");
  const files = ["opal", "opal-parser"].flatMap((name) => [`build/${name}.js`, `build/${name}.min.js`, `build/${name}.min.js.gz`]);
  execFileSync("gh", ["release", "upload", tag, ...files, "--repo", REPO], { cwd: ROOT, stdio: "inherit" });
}

const [command, arg] = process.argv.slice(2);
const commands = { changelog, prepare, upload };
if (!commands[command]) {
  console.log("usage: node tasks/release.mjs changelog [VERSION] | prepare VERSION | upload TAG");
  process.exitCode = command ? 64 : 0;
} else {
  await commands[command](arg);
}

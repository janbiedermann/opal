// Regenerates the expected outputs of the compiler fixtures
// (spec/lib/fixtures/compiler/**/*.rb -> *.js) with the JS compiler.
// Review the changes with `git diff` before committing them.
//
//   node tasks/compiler/update_fixtures.mjs [<fixture file or dir>...]
//
// A fixture can set compiler options with a first line of
//   # opal-options: {"requirable": true}
// A fixture that fails to compile expects "// error: <message>".
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Compiler } from "../../lib/opal/compiler/index.mjs";
import { decodeSource } from "../../lib/opal/compiler/builder/path_reader.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURES = join(ROOT, "spec", "lib", "fixtures", "compiler");

function walk(path, out = []) {
  if (!statSync(path).isDirectory()) {
    if (path.endsWith(".rb")) out.push(path);
  } else {
    for (const entry of readdirSync(path).sort()) walk(join(path, entry), out);
  }
  return out;
}

export function fixtureOptions(source) {
  const m = /^# opal-options: (\{.*\})\s*$/.exec(source.split("\n")[0]);
  return m ? JSON.parse(m[1]) : {};
}

const args = process.argv.slice(2);
const files = (args.length ? args : [FIXTURES]).flatMap((p) => walk(resolve(p)));
let written = 0;
for (const file of files) {
  const source = decodeSource(readFileSync(file)); // honours encoding magic comments
  const options = { file: relative(FIXTURES, file), warning: () => {}, ...fixtureOptions(source) };
  let content;
  try {
    content = new Compiler(source, options).compile();
  } catch (e) {
    content = `// error: ${e.message.split("\n")[0]}\n`;
  }
  const target = file.replace(/\.rb$/, ".js");
  if (!existsSync(target) || readFileSync(target, "utf8") !== content) {
    writeFileSync(target, content);
    written++;
    console.log(`updated ${relative(ROOT, target)}`);
  }
}
console.log(`${files.length} fixtures, ${written} updated`);

// Runs the Minitest suites (vendored CRuby tests and test/opal, and the
// Node.js integration tests in test/opal) with exe/opal.
//
// Environment: FILES (a glob of test files, cruby suite), RANDOM_SEED,
// USE_STRICT (node suite).
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { glob } from "./glob.mjs";
import { ROOT, envData, randomSeed, runOpal } from "./common.mjs";
import { withHttpServer } from "./http_server.mjs";

const STUBS = ["optparse", "io/console", "timeout", "mutex_m", "rubygems", "tempfile", "monitor"].map((s) => `-s${s}`);

const CRUBY_FILES = [
  "benchmark/test_benchmark.rb",
  "opal/test_io_buffer.rb",
  "opal/test_keyword.rb",
  "opal/test_base64.rb",
  "opal/test_openuri.rb",
  "opal/test_uri.rb",
  "opal/unsupported_and_bugs.rb",
  "opal/test_matrix.rb",
  "opal/promisev2/test_always.rb",
  "opal/promisev2/test_error.rb",
  "opal/promisev2/test_rescue.rb",
  "opal/promisev2/test_then.rb",
  "opal/promisev2/test_trace.rb",
  "opal/promisev2/test_value.rb",
  "opal/promisev2/test_when.rb",
];

const NODE_FILES = [
  "nodejs",
  "opal-parser",
  "opal/test_dir.rb",
  "opal/test_env.rb",
  "opal/test_error.rb",
  "opal/test_file.rb",
  "opal/test_file_encoding.rb",
  "opal/test_io.rb",
  "opal/test_opal_builder.rb",
  "opal/test_string.rb",
  "opal/test_await.rb",
  "opal/test_tracepoint_end.rb",
  "opal/test_yaml.rb",
];

export function writeRunner(filename, files, env) {
  const seed = randomSeed(env);
  mkdirSync(join(ROOT, "tmp"), { recursive: true });
  writeFileSync(join(ROOT, filename), `        require 'opal/platform' # in node ENV is replaced
        require 'opal-parser'
        ${envData(env)}
        srand(${seed})

        ${files.map((f) => `require '${f}'`).join("\n")}
`);
}

// The vendored CRuby tests and test/opal, on a platform.
export async function minitestCruby(platform = "nodejs", env = process.env) {
  let files;
  let includes;
  if (env.FILES) {
    // paths relative to the project root; unfiltered (the filters in
    // test/opal/unsupported_and_bugs.rb reopen classes of all the tests)
    files = ["test/unit", ...glob(env.FILES)];
    includes = ["-Itmp", "-I."];
  } else {
    files = [...CRUBY_FILES];
    includes = ["-Itest/cruby/test"];
  }
  if (platform === "nodejs") files.push("nodejs");
  const filename = `tmp/minitest_cruby_${platform}.rb`;
  return withHttpServer(() => {
    writeRunner(filename, files, env);
    return runOpal(["-Itest", "-Ilib", "-Ivendored-minitest", ...includes, ...STUBS, `-R${platform}`, "-Dwarning", "-A", "--enable-source-location", filename], { env });
  });
}

// The Node.js integration tests (test/opal).
export function minitestNode(env = process.env) {
  const filename = "tmp/minitest_node_nodejs.rb";
  writeRunner(filename, NODE_FILES, env);
  const strict = env.USE_STRICT ? ["--use-strict"] : [];
  return runOpal(["-Itest", "-Ilib", "-Ivendored-minitest", ...STUBS, "-Rnodejs", "-Dwarning", "-A", "--enable-source-location", ...strict, filename], { env });
}

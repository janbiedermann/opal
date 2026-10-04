// Runs MSpec suites (ruby/spec, spec/opal) with exe/opal. Port of
// Testing::MSpec in tasks/testing.rake.
//
// Environment: SUITE (ruby/opal), PATTERN (a glob of spec files), RUBYSPECS
// (with PATTERN: only files listed in spec/ruby_specs), RANDOM_SEED,
// INVERT_RUNNING_MODE, LIST_UNUSED_FILTERS, BM (benchmark mode).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { glob } from "./glob.mjs";
import { ROOT, envData, hostOs, randomSeed, runOpal } from "./common.mjs";

export const STUBS = [
  "mspec/helpers/tmp",
  "mspec/helpers/environment",
  "mspec/guards/block_device",
  "a_file",
  "lib/spec_helper",
  "mspec/commands/mspec-run",
  "etc",
  "rubygems",
  "zlib",
];

const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory();

// The spec files of a suite (or PATTERN).
export function specFiles(env) {
  const excepting = [];
  const rubyspecs = readFileSync(join(ROOT, "spec", "ruby_specs"), "utf8").split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (l.startsWith("#") || l === "") return false;
      if (l.startsWith("!")) {
        excepting.push(l.replace("!", "spec/") + ".rb");
        return false;
      }
      return true;
    })
    .flatMap((path) => {
      path = `spec/${path}`;
      return isDirectory(join(ROOT, path)) ? glob(`${path}/*.rb`) : [`${path}.rb`];
    })
    .filter((f) => !excepting.includes(f));

  const add = (name, files) => {
    console.log(`Adding ${String(files.length).padStart(3)} files (${name})`);
    return files;
  };

  if (env.PATTERN) {
    let files = glob(env.PATTERN);
    if (env.RUBYSPECS) files = files.filter((f) => rubyspecs.includes(f));
    return add(`PATTERN=${env.PATTERN}`, files.sort());
  }
  if (env.SUITE === "opal") return add("spec/opal", glob("spec/{opal,lib/parser}/**/*_spec.rb"));
  if (env.SUITE === "ruby") return add("spec/ruby", [...rubyspecs].sort());
  throw new Error("Please provide PATTERN (e.g. PATTERN=spec/ruby/core/numeric/**_spec.rb) or SUITE (ruby or opal)");
}

// The filter files for a suite and platform.
export function filterFiles(suite, platform, env) {
  const opalspecFilters = glob("spec/filters/**/*_opal.rb");
  if (suite === "opal") return opalspecFilters;
  // When we run an inverted test suite we should run only 'bugs'.
  // Unsupported features are not supported anyway
  const pattern = env.INVERT_RUNNING_MODE ? "spec/filters/bugs/*.rb" : `spec/filters/{unsupported,bugs,platform/${platform}}/*.rb`;
  return glob(pattern).filter((f) => !opalspecFilters.includes(f));
}

function benchmarkPath() {
  mkdirSync(join(ROOT, "tmp", "bench"), { recursive: true });
  let index = 0;
  let path;
  do path = `tmp/bench/Spec${++index}`; while (existsSync(join(ROOT, path)));
  return path;
}

// Writes the Ruby file that loads the filters and specs and runs MSpec.
export function writeRunner(filename, filters, specs, env) {
  const strip = (files) => files.map((s) => `'${s.replace(/^spec\//, "")}'`);
  const filterRequires = strip(filters).map((s) => `require ${s}`).join("\n");
  const specNames = strip(specs);
  const benchmark = env.BM_FILEPATH ? `OpalBM.main.register(${parseInt(env.BM, 10)}, '${env.BM_FILEPATH}')` : "";
  const seed = randomSeed(env);

  mkdirSync(join(ROOT, "tmp"), { recursive: true });
  writeFileSync(join(ROOT, filename), `require 'opal/platform' # in node ENV is replaced
${envData(env)}

require 'opal/full'
require 'spec_helper'
require 'securerandom'
${benchmark}

${filterRequires}

${specNames.map((s) => `requirable_spec_file ${s}`).join("\n")}

MSpec.register_files [
  ${specNames.join(",\n  ")}
]

srand(${seed})
MSpec.randomize = true

# legacy MSpec
def frozen_error_class
  FrozenError
end

MSpec.process
OSpecFilter.main.unused_filters_message(list: ${!!env.LIST_UNUSED_FILTERS})
exit MSpec.exit_code
`);
}

// Runs an MSpec suite ("ruby" or "opal") on a platform; resolves to the
// exit status.
export async function mspec(suite, platform = "nodejs", baseEnv = process.env) {
  const filename = `tmp/mspec_${platform}.rb`;
  const env = { SUITE: suite, FORMATTER: platform, ...baseEnv };
  if (env.BM) env.BM_FILEPATH = benchmarkPath();
  if (!env.OPAL_PLATFORM_NAME) env.OPAL_PLATFORM_NAME = hostOs();
  writeRunner(filename, filterFiles(suite, platform, env), specFiles(env), env);

  const stubs = STUBS.map((s) => `-s${s}`);
  const status = await runOpal(["-q", "tasks/testing/mspec_special_calls.mjs", "-Ispec/mspec/lib", "-Ispec", "-Ilib", ...stubs,
    `-R${platform}`, "-Dwarning", "-A", "--enable-source-location", filename], { env });
  if (env.BM_FILEPATH) {
    console.log(`Benchmark results have been written to ${env.BM_FILEPATH}`);
  }
  return status;
}

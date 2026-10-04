# Tasks for potch, Opal's built-in Ruby parser (lib/opal/potch, see POTCH.md
# and docs/potch.md).

potch_specs = -> { Dir['spec/lib/potch/*.test.mjs'].sort }
potch_lint_paths = %w[lib/opal/potch spec/lib/potch tasks/potch benchmark/potch exe/potch]

desc 'Run the potch parser specs (spec/lib/potch) on Node.js'
task :potch do
  sh 'node', '--test', *potch_specs.call
end

namespace :potch do
  desc 'Regenerate lib/opal/potch/potch.mjs from lib/opal/potch/parts/*.mjs'
  task :assemble do
    sh 'node tasks/potch/assemble.mjs'
  end

  desc 'Verify lib/opal/potch/potch.mjs is up to date with its parts'
  task :assemble_check do
    sh 'node tasks/potch/assemble.mjs --check'
  end

  desc 'Benchmark potch against the @ruby/prism WASM parser (RUNS=n WARMUP_RUNS=n)'
  task :bench do
    args = []
    args << "--runs=#{ENV['RUNS']}" if ENV['RUNS']
    args << "--warmup-runs=#{ENV['WARMUP_RUNS']}" if ENV['WARMUP_RUNS']
    sh 'node', 'benchmark/potch/run.mjs', *args
  end
end

namespace :lint do
  desc 'Lint the potch ES modules and check that potch.mjs is assembled'
  task :potch => 'potch:assemble_check' do
    sh 'yarn', 'run', 'eslint', *potch_lint_paths
  end
end

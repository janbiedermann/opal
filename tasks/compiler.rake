# Tasks for the JS compiler in lib/opal/compiler (see POTCH.md).

compiler_specs = -> { Dir['spec/lib/compiler/**/*.test.mjs'].sort }

desc 'Run the JS compiler specs (spec/lib/compiler) on Node.js'
task :compiler do
  sh 'node', '--test', *compiler_specs.call
end

namespace :compiler do
  desc 'Compare the JS compiler with the Ruby compiler (FILES=paths, default: opal stdlib; DIFF=n)'
  task :compare do
    files = ENV['FILES'] ? ENV['FILES'].split : %w[opal stdlib]
    args = []
    args << "--diff=#{ENV['DIFF']}" if ENV['DIFF']
    args << '--list' if ENV['LIST']
    sh 'node', 'tasks/compiler/compare.mjs', *args, *files
  end

  desc 'Regenerate the expected outputs of spec/lib/fixtures/compiler with the Ruby compiler'
  task :update_fixtures do
    sh 'node tasks/compiler/compare.mjs --update-fixtures'
  end
end

namespace :lint do
  desc 'Lint the JS compiler'
  task :compiler do
    sh 'yarn', 'run', 'eslint', 'lib/opal/compiler', 'spec/lib/compiler', 'tasks/compiler', 'tasks/dist.mjs', 'tasks/test.mjs', 'tasks/lint.mjs', 'tasks/testing'
  end
end

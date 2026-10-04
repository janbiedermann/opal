require_relative "#{__dir__}/../lib/opal/os"
require_relative "#{__dir__}/../lib/opal/cli_runners"

require 'timeout'
require 'rspec/core/rake_task'

OS = Opal::OS unless defined? OS

RSpec::Core::RakeTask.new(:rspec) do |t|
  t.pattern = 'spec/lib/**/*_spec.rb'
end

if ENV.key?('RUBYSPEC')
  warn "Did you mean RUBYSPECS=...? (RUBYSPEC was found among ENV variables)"
  exit 1
end

# The test drivers are in tasks/testing/*.mjs and tasks/test.mjs (Node.js);
# the tasks below call them.
module Testing
  class SauceLabs
    include FileUtils

    def initialize(options = {})
      @host = options.fetch(:host, '127.0.0.1')
      @port = options.fetch(:port, '3000')
      @username = options.fetch(:username)
      @access_key = options.fetch(:access_key)
      @tunnel = options.fetch(:tunnel, nil)
    end
    attr_reader :host, :port, :username, :access_key, :tunnel

    def with_server
      cd 'examples/rack'
      system 'bundle install' or raise 'bundle install failed'
      begin
        server = Process.spawn "bundle exec rackup --host #{host} --port #{port}"
        puts 'Waiting for server…'
        Timeout.timeout(30) do
          sleep 0.1 until system "curl -s 'http://#{host}:#{port}/' > /dev/null"
        end
        puts 'Server ready.'
        yield self
      rescue Timeout::Error
        puts 'Failed to start rack server'
        exit(1)
      ensure
        Process.kill(:TERM, server)
        Process.wait(server)
      end
    end

    def on_platform(options = {})
      browser = options.fetch(:browser)
      version = options.fetch(:version)
      platform = options.fetch(:platform, nil)
      device = options.fetch(:device, nil)

      puts "=============== Testing on browser: #{browser} v#{version} #{"(#{platform})" if platform}"
      require "selenium/webdriver"

      caps = {}
      caps[:platform]           = platform if platform
      caps[:browserName]        = browser if browser
      caps[:version]            = version if version
      caps[:device]             = device if device
      caps['tunnel-identifier'] = tunnel if tunnel

      driver = Selenium::WebDriver.for(
        :remote,
        url: "http://#{username}:#{access_key}@localhost:4445/wd/hub",
        desired_capabilities: caps
      )

      driver.get("http://#{host}:#{port}/")
      yield driver
      driver.quit
    end

    def test_title(driver)
      if (title = driver.title) == 'Bob is authenticated'
        puts "SUCCESS! title of webpage is: #{title}"
      else
        raise "FAILED! title of webpage is: #{title}"
      end
    end

    def run(**options)
      on_platform(**options) do |driver|
        test_title(driver)
      end
    end
  end
end


pattern_usage = <<-DESC
Use PATTERN environment variable to manually set the glob for specs:

  # Will run all specs matching the specified pattern.
  # (Note: the ruby_specs filters will still apply)
  bundle exec rake mspec_nodejs PATTERN=spec/ruby/core/module/class_variable*_spec.rb
  bundle exec rake mspec_nodejs PATTERN=spec/ruby/core/numeric/**_spec.rb
DESC
runners = Opal::CliRunners.to_h.keys.map(&:to_s).reject { |r| r == 'compiler' }
platforms = runners.sort
node_platforms = %w[nodejs]
mspec_suites = %w[ruby opal]
minitest_suites = %w[cruby]

require 'opal/paths'

platforms.each do |platform|
  mspec_suites.each do |suite|
    desc "Run the MSpec test suite on Opal::Builder/#{platform}" + pattern_usage
    task :"mspec_#{suite}_#{platform}" do
      sh 'node', 'tasks/test.mjs', '-R', platform, "mspec_#{suite}"
    end
  end

  minitest_suites.each do |suite|
    desc "Run the Minitest suite on Opal::Builder/#{platform}" + pattern_usage
    task :"minitest_#{suite}_#{platform}" do
      sh 'node', 'tasks/test.mjs', '-R', platform, "minitest_#{suite}"
    end
  end
end

node_platforms.each do |platform|
  # The name ends with the platform, which is of course mandated in this case
  desc "Run the Node.js Minitest suite on #{platform}"
  task :"minitest_node_#{platform}" do
    sh 'node', 'tasks/test.mjs', 'minitest_node'
  end
end

desc 'Run smoke tests with opal-rspec to see if something is broken'
task :smoke_test do
  opal_rspec_dir = File.expand_path('tmp/smoke_test_opal_rspec')
  gemfile_name = 'opal_rspec_smoketest.Gemfile'
  actual_output_path = "#{opal_rspec_dir}/output.txt"

  # Travis caching might be creating this, manage the state idempotently
  unless File.exist?(File.join(opal_rspec_dir, '.git'))
    rm_rf opal_rspec_dir
    sh "git clone https://github.com/opal/opal-rspec.git #{opal_rspec_dir}"
  end

  cp "tasks/testing/#{gemfile_name}", "#{opal_rspec_dir}/Gemfile"

  cd opal_rspec_dir do
    Bundler.with_unbundled_env do
      sh 'bundle check && bundle update opal-rspec || bundle install'
      sh %{bundle exec opal-rspec --color --default-path=../../spec ../../spec/lib/deprecations_spec.rb > #{actual_output_path}}

      actual_output = File.read(actual_output_path)
      begin
        require 'rspec/expectations'
        extend RSpec::Matchers
        expect(actual_output.lines[0]).to    eq("\n")
        expect(actual_output.lines[1]).to    eq("Opal::Deprecations\n")
        expect(actual_output.lines[2]).to    eq("\e[32m  defaults to warn\e[0m\n")
        expect(actual_output.lines[3]).to    eq("\e[32m  can be set to raise\e[0m\n")
        expect(actual_output.lines[4]).to    eq("\n")

        expect(actual_output.lines[5]).to match(%r{Top 2 slowest examples \(\d+\.\d+ seconds, \d+\.\d+% of total time\):\n})
        expect(actual_output.lines[7]).to match(%r{    \[1m\d+\.\d+\[0m \[1mseconds\[0m .*deprecations_spec\.rb:7\n})
        expect(actual_output.lines[9]).to match(%r{    \[1m\d+\.\d+\[0m \[1mseconds\[0m .*deprecations_spec\.rb:12\n})
        expect(actual_output.lines[10]).to    eq("\n")
        expect(actual_output.lines[11]).to match(%r{^Finished in \d+\.\d+ seconds \(files took \d+\.\d+ seconds to load\)\n$})
        expect(actual_output.lines[12]).to    eq("[32m2 examples, 0 failures[0m\n")
        expect([
          actual_output.lines[6],
          actual_output.lines[8],
        ]).to contain_exactly(
          "  Opal::Deprecations defaults to warn\n",
          "  Opal::Deprecations can be set to raise\n",
        )
      rescue RSpec::Expectations::ExpectationNotMetError
        warn $!.message
        warn "\n\n== Full output:\n#{actual_output}"
        exit 1
      end
    end
  end

  puts "Smoke test was successful!"
end

desc 'Run browser tests with SauceLabs'
task :browser_test do
  credentials = {
    username: ENV['SAUCE_USERNAME'] || warn('missing SAUCE_USERNAME env var'),
    access_key: ENV['SAUCE_ACCESS_KEY'] || warn('missing SAUCE_ACCESS_KEY env var'),
    tunnel: ENV['TRAVIS_JOB_NUMBER'],
  }

  # Exit if we're missing credentials.
  exit unless credentials[:username] && credentials[:access_key]

  Testing::SauceLabs.new(credentials).with_server do |session|
    session.run(browser: 'Internet Explorer', version: '9')
    session.run(browser: 'Internet Explorer', version: '10')
    session.run(browser: 'Internet Explorer', version: '11')
    # session.run(browser: 'Edge', version: '13') # something goes wrong
    session.run(browser: 'Firefox', version: '47')
    session.run(browser: 'Firefox', version: '48')
    # session.run(browser: 'Chrome', version: '52') # chrome webdriver is broken
    # session.run(browser: 'Chrome', version: '53') # chrome webdriver is broken
    session.run(browser: 'Safari', version: '8')
    session.run(browser: 'Safari', version: '9')
    session.run(browser: 'Safari', version: '10')
  end
end

platforms.each do |platform|
  desc "Run the whole MSpec suite on #{platform}"
  task :"mspec_#{platform}" => mspec_suites.map { |suite| :"mspec_#{suite}_#{platform}" }
end

platforms.each do |platform|
  desc "Run the whole Minitest suite on #{platform}"
  task :"minitest_#{platform}" => minitest_suites.map { |suite| :"minitest_#{suite}_#{platform}" }
end

desc "Run the whole MSpec suite on all platforms"
task :mspec    => [:mspec_chrome, :mspec_nodejs]

desc "Run the whole Minitest suite on all platforms"
task :minitest => [:minitest_chrome, :minitest_nodejs, :minitest_node_nodejs]

desc "Run all tests"
task :test_all => [:rspec, :mspec, :minitest]

# deprecated, can be removed after 0.11
task(:cruby_tests) { warn "The task 'cruby_tests' has been renamed to 'minitest_cruby_nodejs'."; exit 1 }
task(:test_cruby)  { warn "The task 'test_cruby' has been renamed to 'minitest_cruby_nodejs'."; exit 1 }
task(:test_nodejs) { warn "The task 'test_nodejs' has been renamed to 'minitest_node_nodejs'."; exit 1 }

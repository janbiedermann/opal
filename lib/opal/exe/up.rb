# backtick_javascript: true
# The `up` command: run a Rack application on the Net::HTTPServer stack,
# through Rack::Handler::Up.
#
# Like tasks/ruby.mjs builds exe/ruby out of this file's sibling
# ruby.rb, a build task builds exe/up out of this file: a standalone
# Node.js program bundling the corelib, the parser and the compiler,
# the whole stdlib - rack and the Net::HTTPServer stack included - and
# this script. It parses the options, compiles the application's
# config.ru in this process, and serves it, so the app shares this
# runtime: its requires answer from the bundle, and only files outside
# it - installed gems, -I paths, the current directory - are resolved
# against $LOAD_PATH at runtime, the way ruby.rb's loader does it.
#
# This replaced the two-stage bin/up scripts, which compiled this file
# from matz ruby first; nothing here runs under matz ruby, the bundle
# is the program.
#
# Unlike the original bin/up it can not hand a Gemfile's gems to the
# compiler ahead of time: what an app requires beyond the bundle is
# found through $LOAD_PATH and the tree's gem activation as the app's
# requires run. The node backend needs the ws npm package next to the
# app.
#
# Usage (from the application directory):
#
#   exe/up [options] [config.ru]

require 'opal-parser'
require 'opal/builder'
require 'opal/builder/processor'
require 'rack/handler/up'
require 'optparse'
require 'logger'

module UpCommand
  # A command problem worth explaining, like a missing config.ru; exit
  # status 4, as the original bin/up scripts used.
  class Error < ::StandardError; end

  class << self
    def run
      @options = get_options
      Rack::Handler::Up.run(get_app, @options)
    end

    # Options are consumed from the front of ARGV; what remains is the
    # config.ru path.
    def get_options
      options = {
        Host: '127.0.0.1',
        Port: 3000,
      }
      parser = OptionParser.new do |opts|
        opts.banner = 'Usage: up [options] [config.ru]'

        opts.on('-p', '--port PORT', Integer, 'TCP port to listen on, defaults to 3000') do |v|
          options[:Port] = v
        end
        opts.on('-b', '--host HOST', 'address to bind, defaults to 127.0.0.1') do |v|
          options[:Host] = v
        end
        opts.on('-w', '--workers COUNT', Integer, 'worker processes to fork, 0 runs workers = cpu cores, default is 1') do |v|
          options[:workers] = v
        end
        opts.on('-c', '--cert FILE', 'TLS certificate, starts TLS when given') do |v|
          options[:cert_file] = v
        end
        opts.on('-k', '--key FILE', 'TLS private key') do |v|
          options[:key_file] = v
        end
        opts.on('-a', '--ca FILE', 'TLS certificate chain to hand out') do |v|
          options[:ca_file] = v
        end
        opts.on('-s', '--self-signed', 'start TLS with an unusable self-signed certificate') do
          options[:self_signed] = true
        end
        opts.on('-P', '--pid FILE', 'write the pid of each listening process to FILE') do |v|
          options[:pid_file] = v
        end
        opts.on('-l', '--log FILE', 'log requests to FILE instead of stdout') do |v|
          options[:log] = v
        end
        opts.on('-v', '--version', 'print the version and exit') do
          puts "up (opal stdlib) #{RUBY_ENGINE_VERSION}"
          exit
        end
        opts.on('-h', '--help', 'print this help and exit') do
          puts opts
          exit
        end
      end
      parser.parse!

      options[:config_ru] = ARGV[0] if ARGV[0]

      if options[:pid_file]
        File.write(options[:pid_file], `process.pid.toString()`)
      end
      options
    end

    # The application: config.ru is compiled here, in this process, the
    # way ruby.rb compiles the script it runs - so the requires inside
    # it answer from the bundle first and only then from $LOAD_PATH and
    # the gems an activation puts on it. The wrapper is the one rack's
    # rackup puts around a config.ru; esbuild, the original stage-2
    # minifier, goes: this evals the compiled program directly.
    def get_app
      config_ru = @options[:config_ru] || File.join(Dir.pwd, 'config.ru')
      source = File.read(config_ru)
      unless source =~ /^run\s/
        raise UpCommand::Error, "No application defined in #{config_ru} file"
      end

      wrapper = <<~RUBY
        require 'rack/builder'
        UP_APP = Rack::Builder.new do
      #{source}
        end.to_app
      RUBY

      builder = Opal::Builder.new
      builder.append_paths(Dir.pwd, *$LOAD_PATH)
      builder.build_str(wrapper, 'config.rb')
      code = builder.to_s
      # the compiled config.ru defines the module, running it is what
      # hands the app to rack; like ruby.rb, this evals compiled code.
      %x{
        eval(String(#{code}));
        Opal.load('config');
      }
      unless Object.const_defined?(:UP_APP)
        raise UpCommand::Error, "rackup file #{config_ru} doesn't define an app"
      end
      Object.const_get(:UP_APP)
    end
  end
end

UpCommand.run

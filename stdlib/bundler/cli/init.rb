# frozen_string_literal: true

module Bundler
  class CLI::Init
    attr_reader :options
    def initialize(options)
      @options = options
    end

    def run
      if File.exist?(gemfile)
        Bundler.ui.error "#{gemfile} already exists at #{File.expand_path(gemfile)}"
        exit 1
      end

      unless File.writable?(Dir.pwd)
        Bundler.ui.error "Can not create #{gemfile} as the current directory is not writable."
        exit 1
      end

      if options[:gemspec]
        gemspec = File.expand_path(options[:gemspec])
        unless File.exist?(gemspec)
          Bundler.ui.error "Gem specification #{gemspec} doesn't exist"
          exit 1
        end

        spec = Bundler.load_gemspec_uncached(gemspec)
        unless spec
          Bundler.ui.error "Gem specification #{gemspec} did not produce a specification"
          exit 1
        end

        File.open(gemfile, "wb") do |file|
          file << "# Generated from #{gemspec}\n"
          # Opal: faithful line, and faithful dead end: this port pairs with a
          # RubyGems that no longer defines Gem::Specification#to_gemfile
          # (neither does the reference checkout), so `--gemspec` ends in a
          # NoMethodError upstream and here alike.
          file << spec.to_gemfile
        end
      else
        # Opal: upstream copies lib/bundler/templates/Gemfile off disk; a
        # compiled bundle carries no file tree next to its code (__dir__
        # names the module, not a directory), so the template's text is
        # inlined - upstream's IO.copy_stream of the two files has no
        # source to copy here.
        File.open(gemfile, "wb") do |destination|
          destination.write(<<~GEMFILE)
            # frozen_string_literal: true

            source "https://rubygems.org"

            # gem "rails"
          GEMFILE
        end
      end

      puts "Writing new #{gemfile} to #{SharedHelpers.pwd}/#{gemfile}"
    end

    private

    def gemfile
      @gemfile ||= options[:gemfile] || Bundler.preferred_gemfile_name
    end
  end
end

require 'spec_helper'
require 'rubygems'
require 'fileutils'
require 'bundler'
require 'bundler/deprecate'

describe 'Bundler' do
  describe 'Bundler::Version' do
    it "keeps the version in step with the ported RubyGems" do
      Bundler::VERSION.should == Gem::VERSION
      Bundler.bundler_major_version.should == 4
      Bundler.gem_version.should be_kind_of(Gem::Version)
    end
  end

  describe 'Bundler::CurrentRuby' do
    it "answers the current engine and platform" do
      Bundler.current_ruby.ruby?.should == true
      Bundler.current_ruby.jruby?.should == false
      Bundler.current_ruby.windows?.should == false
    end

    it "knows the running Ruby version" do
      Bundler.current_ruby.on_32?.should == true
      Bundler.current_ruby.ruby_32?.should == true
    end

    it "maps the Gemfile platform names onto Gem::Platform" do
      Bundler::CurrentRuby::PLATFORM_MAP[:ruby].should == Gem::Platform::RUBY
      Bundler::CurrentRuby::PLATFORM_MAP[:jruby].should == Gem::Platform::JAVA
      Bundler::CurrentRuby::PLATFORM_MAP[:mswin].should == Gem::Platform::MSWIN
      Bundler::CurrentRuby::PLATFORM_MAP[:x64_mingw].should == Gem::Platform::UNIVERSAL_MINGW
    end
  end

  describe 'Bundler::Dependency' do
    it "carries the Gemfile metadata through to readers" do
      dep = Bundler::Dependency.new("foo", ">= 1.0", {
        "group" => [:test, "dev"],
        "platforms" => ["jruby", "mswin"],
        "require" => false,
      })
      dep.groups.should == [:test, :dev]
      dep.platforms.should == [:jruby, :mswin]
      # require => false asks for nothing to be required: the list comes back empty
      dep.autorequire.should == []
      dep.name.should == 'foo'
      dep.requirement.to_s.should == ">= 1.0"
    end

    it "defaults to the default group and full inclusion" do
      dep = Bundler::Dependency.new("plain", ">= 0")
      dep.groups.should == [:default]
      dep.should_include?.should == true
      dep.autorequire.should == nil
      dep.gemfile_dep?.should == true
    end

    it "expands platform names through the platform map" do
      dep = Bundler::Dependency.new("foo", ">= 1.0", {"platforms" => ["jruby"]})
      dep.gem_platforms([Gem::Platform::RUBY, Gem::Platform::JAVA]).should == [Gem::Platform::JAVA]
    end

    it "excludes itself on a non-matching platform" do
      dep = Bundler::Dependency.new("foo", ">= 1.0", {"platforms" => ["jruby", "mswin"]})
      dep.current_platform?.should == false
      dep.should_include?.should == false
    end

    it "reads the env option as an inclusion gate" do
      ENV['BUNDLER_SPEC_ONLY_ENV'] = 'yes'
      begin
        dep = Bundler::Dependency.new("foo", ">= 1.0", {"env" => {'BUNDLER_SPEC_ONLY_ENV' => 'yes'}})
        dep.current_env?.should == true
        other = Bundler::Dependency.new("bar", ">= 1.0", {"env" => {'BUNDLER_SPEC_ONLY_ENV' => 'no'}})
        other.current_env?.should == false
      ensure
        ENV.delete 'BUNDLER_SPEC_ONLY_ENV'
      end
    end

    it "writes itself for the lockfile, marking a source with a bang" do
      Bundler::Dependency.new("foo", ">= 1.0").to_lock.should == "  foo (>= 1.0)"
      dep = Bundler::Dependency.new("bar", "1.0", {"source" => "https://rubygems.org/"})
      dep.to_lock.should == "  bar (= 1.0)!"
    end

    it "lets SharedHelpers print it with the platforms" do
      dep = Bundler::Dependency.new("foo", ">= 1.0", {"platforms" => ["jruby"]})
      Bundler::SharedHelpers.pretty_dependency(dep).should == "foo (>= 1.0) jruby"
      plain = Bundler::Dependency.new("plain", ">= 0")
      Bundler::SharedHelpers.pretty_dependency(plain).should == "plain"
    end
  end

  describe 'Gem::Dependency as Bundler patches it' do
    it "locks a plain Gem::Dependency the same way" do
      Gem::Dependency.new("a", ">= 1").to_lock.should == "  a (>= 1)"
      Gem::Dependency.new("b", ">= 0").to_lock.should == "  b"
    end

    it "answers the source and groups accessors for gemspec dependencies" do
      dep = Gem::Dependency.new("c", ">= 1")
      dep.source = :rubygems
      dep.groups = [:default]
      dep.source.should == :rubygems
      dep.groups.should == [:default]
    end

    it "compares by value" do
      Gem::Dependency.new("d", ">= 1").should eql(Gem::Dependency.new("d", ">= 1"))
    end
  end

  describe 'SharedHelpers gemfile finding' do
    before :each do
      @dir = tmp('bundler_gemfiles')
      FileUtils.mkdir_p(@dir)
      @gemfile = File.join(@dir, 'Gemfile')
      File.write(@gemfile, "source 'https://rubygems.org/'\n")
      @old_gemfile = ENV['BUNDLE_GEMFILE']
      @old_lockfile = ENV['BUNDLE_LOCKFILE']
      ENV['BUNDLE_GEMFILE'] = @gemfile
      ENV.delete 'BUNDLE_LOCKFILE'
    end

    after :each do
      if @old_gemfile
        ENV['BUNDLE_GEMFILE'] = @old_gemfile
      else
        ENV.delete 'BUNDLE_GEMFILE'
      end
      if @old_lockfile
        ENV['BUNDLE_LOCKFILE'] = @old_lockfile
      else
        ENV.delete 'BUNDLE_LOCKFILE'
      end
    end

    it "takes the gemfile from BUNDLE_GEMFILE" do
      Bundler.default_gemfile.to_s.should == @gemfile
      Bundler::SharedHelpers.in_bundle?.should == @gemfile
    end

    it "names the lockfile after the gemfile" do
      Bundler.default_lockfile.to_s.should == "#{@gemfile}.lock"
      ENV['BUNDLE_LOCKFILE'] = File.join(@dir, 'other.lock')
      Bundler.default_lockfile.to_s.should == File.join(@dir, 'other.lock')
    end

    it "roots the bundle at the gemfile's directory" do
      Bundler.root.to_s.should == @dir
    end

    it "raises GemfileNotFound when there is no gemfile" do
      ENV['BUNDLE_GEMFILE'] = ''
      -> { Bundler.default_gemfile }.should raise_error(Bundler::GemfileNotFound)
    end
  end

  describe 'Bundler::SharedHelpers.feature_removed!' do
    it "raises the RemovedError" do
      -> { Bundler::SharedHelpers.feature_removed!('go away') }.should raise_error(Bundler::RemovedError)
    end
  end

  describe 'Bundler errors' do
    it "answers the exit status of each class" do
      Bundler::GemNotFound.new.status_code.should == 7
      Bundler::ProductionError.new.status_code.should == 16
      Bundler::RemovedError.new.status_code.should == 9
      Bundler::BundlerError.all_errors[Bundler::LockfileError].should == 20
    end

    it "refuses to register a status code twice" do
      -> { Class.new(Bundler::BundlerError) { status_code(7) } }.should raise_error(ArgumentError)
    end

    it "keeps the error hierarchy the CLI relies on" do
      Bundler::GemfileEvalError.ancestors.should include(Bundler::GemfileError)
      Bundler::OperationNotSupportedError.ancestors.should include(Bundler::PermissionError)
      Bundler::BundlerError.ancestors.should include(StandardError)
    end

    it "phrases the permission error around the path" do
      error = Bundler::PermissionError.new('vendor/cache', :create)
      error.message.should include('trying to create')
      error.message.should include('vendor/cache')
      error.message.should include('executable permissions for all parent directories')
    end
  end
end

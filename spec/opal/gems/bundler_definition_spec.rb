require 'spec_helper'
require 'rubygems'
require 'bundler'
require 'fileutils'

describe 'Bundler::Definition' do
  def bundle_dir
    @bundle_dir ||= begin
      dir = File.expand_path(tmp('bundler_definition'))
      FileUtils.mkdir_p(dir)
      Dir.chdir(dir) do
        File.write("Gemfile", <<~GEMFILE)
          source "https://rubygems.org"

          gem "hello", "~> 1.0"
          gem "world", path: "vendor/world"
        GEMFILE
        FileUtils.mkdir_p("vendor/world")
        File.write("vendor/world/world.gemspec", <<~GEMSPEC)
          Gem::Specification.new do |s|
            s.name = "world"
            s.version = "0.3"
            s.summary = "local world"
            s.authors = ["t"]
          end
        GEMSPEC
        File.write("Gemfile.lock", <<~LOCK)
          PATH
            remote: vendor/world
            specs:
              world (0.3)

          GEM
            remote: https://rubygems.org/
            specs:
              hello (1.0.0)

          PLATFORMS
            ruby

          DEPENDENCIES
            hello (~> 1.0)
            world!

          BUNDLED WITH
             4.1.0
        LOCK
      end
      dir
    end
  end

  def build_definition(unlock = nil)
    Dir.chdir(bundle_dir) do
      Bundler.reset_settings_and_root!
      Bundler::Definition.build(
        File.join(bundle_dir, "Gemfile"),
        File.join(bundle_dir, "Gemfile.lock"),
        unlock
      )
    end
  end

  it "raises GemfileNotFound without a Gemfile" do
    -> { Bundler::Definition.build(File.join(tmp('nope'), "Gemfile"), nil, nil) }
      .should raise_error(Bundler::GemfileNotFound)
  end

  it "reads the Gemfile, the locked specs and the sources" do
    defn = build_definition
    defn.dependencies.map(&:name).sort.should == ["hello", "world"]
    defn.locked_gems.specs.map(&:full_name).sort.should == ["hello-1.0.0", "world-0.3"]
    defn.locked_deps.keys.sort.should == ["hello", "world"]
    defn.sources.path_sources.size.should == 1
    defn.sources.lock_sources.map {|s| s.identifier }.should ==
      ["source at `vendor/world`", "rubygems repository https://rubygems.org/"]
  end

  it "needs no resolution when Gemfile and lockfile agree" do
    defn = build_definition
    (!!defn.resolve_needed?).should == false
    defn.instance_variable_get(:@source_changes).should == false
    defn.instance_variable_get(:@path_changes).should == false
    defn.instance_variable_get(:@dependency_changes).should == false
  end

  it "needs a resolution and reports the reason when the Gemfile gains a gem" do
    dir = bundle_dir
    original = File.read(File.join(dir, "Gemfile"))
    begin
      File.write(File.join(dir, "Gemfile"), original + %{\ngem "extra"\n})
      defn = build_definition
      defn.resolve_needed?.should == true
      defn.new_deps.map(&:name).should == ["extra"]
      defn.send(:lockfile_changed_reason).should == "the dependencies in your gemfile changed"
    ensure
      File.write(File.join(dir, "Gemfile"), original)
    end
  end

  it "drops the locked state when unlocking everything" do
    defn = build_definition(true)
    defn.resolve_needed?.should == true
    defn.instance_variable_get(:@locked_specs).to_a.should == []
  end

  it "unlocks the gems named in the hash unlock" do
    defn = build_definition({gems: ["hello"]})
    defn.instance_variable_get(:@gems_to_unlock).sort.should == ["hello"]
  end

  it "keeps the current platform in the platforms list" do
    defn = build_definition
    defn.platforms.map(&:to_s).should == ["ruby"]
  end

  it "answers the running Bundler version for the BUNDLED WITH section" do
    defn = build_definition
    defn.bundler_version_to_lock.to_s.should == Bundler::VERSION
  end
end

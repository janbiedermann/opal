require 'spec_helper'
require 'rubygems'
require 'bundler'

describe 'Bundler::Dsl' do
  def eval_gemfile(contents)
    dsl = Bundler::Dsl.new
    dsl.eval_gemfile("Gemfile", contents)
    dsl
  end

  it "reads gems with their version requirements, groups and platforms" do
    dsl = eval_gemfile(<<~GEMFILE)
      gem "hello", "~> 1.0", group: [:a, :b]
      group :production do
        platforms :windows do
          gem "world"
        end
      end
      gem "plain"
    GEMFILE
    deps = dsl.dependencies
    deps.map(&:name).should == ["hello", "world", "plain"]
    deps[0].groups.should == ["a", "b"]
    deps[1].groups.should == ["production"]
    deps[1].platforms.should == ["windows"]
    deps[2].groups.should == ["default"]
    deps[2].requirement.to_s.should == ">= 0"
  end

  it "applies the source directive to a global remote and to a source block" do
    dsl = eval_gemfile(<<~GEMFILE)
      source "https://rubygems.org"
      source "https://extra.example.com" do
        gem "sourced"
      end
    GEMFILE
    sources = dsl.instance_variable_get(:@sources)
    sources.default_source.remotes.map(&:to_s).should == ["https://rubygems.org/"]
    sources.non_default_explicit_sources.map {|s| s.remotes.map(&:to_s) }.
      should == [["https://extra.example.com/"]]
    dsl.dependencies.first.source.equal?(sources.non_default_explicit_sources.first).should == true
  end

  it "rejects an unknown platform" do
    -> { eval_gemfile(%{gem "hello", platforms: [:z80]}) }.
      should raise_error(Bundler::Dsl::DSLError)
  end

  it "applies the ruby DSL to a RubyVersion" do
    dsl = eval_gemfile(%{ruby "3.2.0", engine: "ruby", engine_version: "3.2.0"})
    dsl.instance_variable_get(:@ruby_version).to_s.should == "ruby 3.2.0"
  end

  it "rejects an engine without an engine version" do
    -> { eval_gemfile(%{ruby "3.2.0", engine: "jruby"}) }.
      should raise_error(Bundler::GemfileError)
  end

  it "makes a path option a path source rooted at the Gemfile's directory" do
    dsl = eval_gemfile(%{gem "local", path: "vendor/local"})
    source = dsl.dependencies.first.source
    source.class.should == Bundler::Source::Path
    source.path.to_s.should == "vendor/local"
    source.root_path.to_s.should == File.expand_path(".")
  end

  it "answers GitError for git-backed gems - the git source is not ported" do
    -> { eval_gemfile(%{gem "fromgit", github: "opal/opal"}) }.
      should raise_error(Bundler::GitError)
  end

  it "registers git_source aliases" do
    dsl = eval_gemfile(<<~GEMFILE)
      git_source(:purl) {|repo| "https://git.example.com/\#{repo}.git" }
    GEMFILE
    dsl.instance_variable_get(:@git_sources).keys.sort.should ==
      ["bitbucket", "gist", "github", "gitlab", "purl"]
  end

  it "wraps invalid options and unknown Gemfile methods in DSLError" do
    -> { eval_gemfile(%{gem "x", notanoption: 1}) }.
      should raise_error(Bundler::Dsl::DSLError)

    error = nil
    begin
      eval_gemfile("frobnicate 1\n")
    rescue Bundler::Dsl::DSLError => e
      error = e
    end
    error.nil?.should == false
    error.message.include?("frobnicate").should == true
  end

  it "refuses the same gem with two different requirements" do
    -> { eval_gemfile(%{gem "dup", "1.0"\ngem "dup", "2.0"}) }.
      should raise_error(Bundler::GemfileError)
  end

  it "collects override directives and refuses duplicate ones" do
    dsl = eval_gemfile(%{override "bundler", version: ">= 2.2"})
    overrides = dsl.instance_variable_get(:@overrides)
    overrides.size.should == 1
    overrides.first.target.should == "bundler"
    overrides.first.field.should == :version

    -> { eval_gemfile(%{override "bundler", version: ">= 2.2"\noverride "bundler", version: ">= 3"}) }.
      should raise_error(ArgumentError)
  end

  it "refuses a bare git-source name used as a gem option collision" do
    -> { eval_gemfile(%{git_source(:git) {|r| r}}) }.
      should raise_error(Bundler::Dsl::DSLError)
  end
end

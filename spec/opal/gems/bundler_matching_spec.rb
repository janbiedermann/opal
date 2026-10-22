require 'spec_helper'
require 'rubygems'
require 'bundler'

describe 'Bundler::Index' do
  before :each do
    @index = Bundler::Index.build do |i|
      i.add Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
      i.add Bundler::LazySpecification.new("rake", Gem::Version.new("13.1"), "x86_64-linux")
      i.add Bundler::LazySpecification.new("json", Gem::Version.new("2.6"), "ruby")
    end
  end

  it "searches by name" do
    @index.search("rake").map(&:full_name).sort.should == ["rake-13.0", "rake-13.1-x86_64-linux"]
    @index["json"].map(&:full_name).should == ["json-2.6"]
    @index.search("nothing").should == []
  end

  it "searches by name and version" do
    @index.search(["rake", Gem::Version.new("13.0")]).map(&:full_name).should == ["rake-13.0"]
  end

  it "searches by the spec itself" do
    spec = @index["rake"].first
    @index[spec].map(&:full_name).should == [spec.full_name]
  end

  it "lists the names and dependencies it holds" do
    @index.spec_names.sort.should == ["json", "rake"]
    @index.dependency_names.should == []
    @index.unmet_dependency_names.should == []
  end

  it "keeps the first spec and records the later one as a duplicate in use" do
    other = Bundler::Index.build do |i|
      i.add Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
      i.add Bundler::LazySpecification.new("puma", Gem::Version.new("6.0"), "ruby")
    end
    @index.use(other)
    @index["rake"].map(&:full_name).sort.should == ["rake-13.0", "rake-13.1-x86_64-linux"]
    @index.send(:duplicates)["rake"].map(&:full_name).should == ["rake-13.0"]
    @index.spec_names.sort.should == ["json", "puma", "rake"]
  end

  it "prefers the incoming spec when merging" do
    first = Bundler::Index.build do |i|
      i.add Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    end
    second = Bundler::Index.build do |i|
      i.add Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    end
    winner = second["rake"].first
    first.merge!(second)
    first["rake"].first.object_id.should == winner.object_id
  end

  it "searches the sources it was given too" do
    remote = Bundler::Index.build do |i|
      i.add Bundler::LazySpecification.new("seam", Gem::Version.new("1.0"), "ruby")
    end
    @index.add_source(remote)
    @index.search("seam").map(&:full_name).should == ["seam-1.0"]
    @index.size.should == 3
    # upstream appends each source's spec_names array as-is, so a parented
    # Index nests; leaf indexes (what source_map consumes) stay flat
    @index.spec_names.flatten.sort.should == ["json", "rake", "seam"]
  end
end

describe 'Bundler::LazySpecification' do
  it "names itself the way a lockfile and a gem file do" do
    ruby = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    ruby.full_name.should == "rake-13.0"
    ruby.lock_name.should == "rake (13.0)"
    ruby.file_name.should == "rake-13.0.gem"

    linux = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "x86_64-linux")
    linux.full_name.should == "rake-13.0-x86_64-linux"
    linux.lock_name.should == "rake (13.0-x86_64-linux)"
  end

  it "is equal, eql and hash by its full name" do
    a = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    b = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    c = Bundler::LazySpecification.new("rake", Gem::Version.new("13.1"), "ruby")
    (a == b).should == true
    a.should eql(b)
    a.hash.should == b.hash
    (a == c).should == false
  end

  it "satisfies a dependency, letting >= 0 cover 0-series prereleases" do
    spec = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    spec.satisfies?(Bundler::Dependency.new("rake", ">= 11")).should == true
    spec.satisfies?(Bundler::Dependency.new("rake", "< 11")).should == false
    spec.satisfies?(Bundler::Dependency.new("other", ">= 0")).should == false

    zero = Bundler::LazySpecification.new("tilt", Gem::Version.new("0.1r"), "ruby")
    zero.satisfies?(Bundler::Dependency.new("tilt", ">= 0")).should == true
  end

  it "copies the metadata of a real specification" do
    gemspec = Gem::Specification.new do |s|
      s.name = "seam"
      s.version = "1.2.3"
      s.platform = "java"
      s.author = "tester"
      s.summary = "a seam"
      s.add_runtime_dependency "rake", ">= 11"
    end
    lazy = Bundler::LazySpecification.from_spec(gemspec)
    lazy.full_name.should == "seam-1.2.3-java"
    lazy.runtime_dependencies.map(&:to_s).should == ["rake (>= 11)"]
    lazy.to_lock.should == "    seam (1.2.3-java)\n    #{gemspec.runtime_dependencies.first.to_lock}\n"
  end

  it "starts unmaterialized and incomplete" do
    lazy = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    lazy.incomplete?.should == true
    lazy.missing?.should == false
  end
end

describe 'Bundler::SpecSet' do
  it "looks specs up by name newest last and keeps them sorted by name" do
    old = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    new = Bundler::LazySpecification.new("rake", Gem::Version.new("13.1"), "ruby")
    json = Bundler::LazySpecification.new("json", Gem::Version.new("2.0"), "ruby")
    set = Bundler::SpecSet.new([old, new, json])
    set["rake"].map(&:full_name).should == ["rake-13.1", "rake-13.0"]
    set.names.sort.should == ["json", "rake"]
    set.to_a.map(&:name).first(2).should == ["rake", "json"]
  end

  it "sorts rake first and the rest topologically (dependents before dependencies, upstream's order)" do
    rake = Bundler::LazySpecification.new("rake", Gem::Version.new("13.0"), "ruby")
    app = Bundler::LazySpecification.new("app", Gem::Version.new("1.0"), "ruby")
    app.dependencies = [Gem::Dependency.new("rake", ">= 0")]
    set = Bundler::SpecSet.new([app, rake])
    set.to_a.map(&:name).should == ["rake", "app"]
    set.what_required(rake).map(&:name).should == ["app", "rake"]
  end

  it "refuses the removed mutation methods with the feature-removed error" do
    set = Bundler::SpecSet.new([])
    -> { set << Bundler::LazySpecification.new("rake", Gem::Version.new("1"), "ruby") }.
      should raise_error(Bundler::RemovedError)
  end
end

describe 'Bundler::Override' do
  it "replaces a requirement" do
    override = Bundler::Override.new("rake", :required_ruby_version, ">= 3.0")
    override.apply_to(Gem::Requirement.new(">= 2.5")).to_s.should == ">= 3.0"
  end

  it "drops the upper bounds of a requirement" do
    override = Bundler::Override.new("rake", :required_ruby_version, :ignore_upper)
    override.apply_to(Gem::Requirement.new(">= 2.5", "< 4.0")).to_s.should == ">= 2.5"
    override.apply_to(Gem::Requirement.new("~> 2.5")).to_s.should == ">= 2.5"
    override.apply_to(Gem::Requirement.new("= 2.5")).to_s.should == "= 2.5"
  end

  it "finds the override for a target and field, with :all as fallback" do
    rake = Bundler::Override.new("rake", :required_ruby_version, ">= 3.0")
    all = Bundler::Override.new(:all, :required_ruby_version, ">= 2.7")
    Bundler::Override.find_for([rake, all], "rake", :required_ruby_version).should == rake
    Bundler::Override.find_for([rake, all], "json", :required_ruby_version).should == all
    Bundler::Override.find_for([rake], "json", :version).should == nil
  end
end

describe 'Bundler::RemoteSpecification and Bundler::EndpointSpecification' do
  it "names remote specs like a locked spec does" do
    remote = Bundler::RemoteSpecification.new("rake", "13.0", "ruby", nil)
    remote.full_name.should == "rake-13.0"
    remote.version.should be_kind_of(Gem::Version)
    remote.platform.should == Gem::Platform::RUBY
  end

  it "builds dependencies from the compact-index row form" do
    ep = Bundler::EndpointSpecification.new("cstruct", "2.1.1", "ruby", nil,
      [["rake", ">= 0"], ["json", ">= 1.0"]])
    ep.full_name.should == "cstruct-2.1.1"
    ep.runtime_dependencies.map(&:to_s).sort.should == ["json (>= 1.0)", "rake (>= 0)"]
    ep.platform.should == Gem::Platform::RUBY
  end

  it "matches the current ruby through MatchMetadata" do
    ep = Bundler::EndpointSpecification.new("seam", "1.0", "ruby", nil, [],
      { "ruby" => ">= 1.9" })
    ep.matches_current_metadata?.should == true
    other = Bundler::EndpointSpecification.new("seam", "1.0", "ruby", nil, [],
      { "ruby" => ">= 99" })
    other.matches_current_metadata?.should == false
  end
end

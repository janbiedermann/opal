require 'spec_helper'
require 'rubygems'
require 'bundler'

describe 'Bundler::Resolver primitives' do
  it "orders candidates by version first and priority second" do
    ruby_variant = Bundler::Resolver::Candidate.new("1.0", priority: -1)
    platform_variant = Bundler::Resolver::Candidate.new("1.0", priority: 1)
    later = Bundler::Resolver::Candidate.new("1.1")
    (ruby_variant <=> platform_variant).should == -1
    (platform_variant <=> ruby_variant).should == 1
    (ruby_variant <=> later).should == -1
    [later, platform_variant, ruby_variant].sort.first.should == ruby_variant
  end

  it "keys candidates by version and priority" do
    seen = { Bundler::Resolver::Candidate.new("1.0", priority: -1) => :ruby }
    seen[Bundler::Resolver::Candidate.new("1.0", priority: -1)].should == :ruby
    seen[Bundler::Resolver::Candidate.new("1.0", priority: 1)].should == nil
  end

  it "merges equivalent spec groups only" do
    one = Gem::Specification.new("g", "1.0")
    group = Bundler::Resolver::SpecGroup.new([one])
    twin = Bundler::Resolver::SpecGroup.new([Gem::Specification.new("g", "1.0")])
    other = Bundler::Resolver::SpecGroup.new([Gem::Specification.new("g", "2.0")])
    group.merge(twin).should == true
    group.merge(other).should == false
    # the equivalent spec dedupes through the union: specs are == by identity fields
    group.specs.size.should == 1  end

  it "names packages and recognizes the metadata pseudo-gems" do
    empty = Bundler::SpecSet.new([])
    package = Bundler::Resolver::Package.new("hello", [Gem::Platform::RUBY],
      locked_specs: empty, unlock: [])
    package.name.should == "hello"
    package.top_level?.should == false
    package.unlock?.should == false

    meta = Bundler::Resolver::Package.new("Ruby\0", [Gem::Platform::RUBY],
      locked_specs: empty, unlock: [])
    meta.meta?.should == true
    meta.to_s.should == "Ruby"
  end

  it "unlocks the packages named by an array unlock" do
    empty = Bundler::SpecSet.new([])
    pkg = Bundler::Resolver::Package.new("g", [Gem::Platform::RUBY],
      locked_specs: empty, unlock: ["g"])
    pkg.unlock?.should == true
    Bundler::Resolver::Package.new("g", [Gem::Platform::RUBY],
      locked_specs: empty, unlock: ["h"]).unlock?.should == false
  end

  it "sorts candidate versions by the promotion level" do
    promoter = Bundler::GemVersionPromoter.new
    empty = Bundler::SpecSet.new([])
    pkg = Bundler::Resolver::Package.new("g", [Gem::Platform::RUBY],
      locked_specs: empty, unlock: [])
    # the resolver feeds the promoter Candidates, the solution's version objects
    candidates = ["1.0", "2.0", "1.5"].map {|v| Bundler::Resolver::Candidate.new(v) }
    promoter.sort_versions(pkg, candidates).map {|c| c.to_s }.should ==
      ["2.0", "1.5", "1.0"]
    promoter.level = :minor
    promoter.sort_versions(pkg, candidates).map {|c| c.to_s }.should ==
      ["2.0", "1.5", "1.0"]
  end
end

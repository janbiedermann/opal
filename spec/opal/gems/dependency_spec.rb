require 'spec_helper'
require 'rubygems'

describe 'Gem::Dependency' do
  it "reads the requirements and the optional type of its arguments" do
    dependency = Gem::Dependency.new("rake", ">= 12")
    dependency.name.should == "rake"
    dependency.requirement.to_s.should == ">= 12"
    dependency.type.should == "runtime"
    dependency.runtime?.should == true

    development = Gem::Dependency.new("rake", ">= 12", :development)
    development.type.should == "development"
    development.runtime?.should == false
  end

  it "accepts a list of requirements and a bare version" do
    Gem::Dependency.new("rake", [">= 12", "< 14"]).requirement.to_s.should == ">= 12, < 14"
    Gem::Dependency.new("rake", "1.2").requirement.to_s.should == "= 1.2"
  end

  it "matches a name tuple that satisfies its requirement" do
    dependency = Gem::Dependency.new("rake", ">= 12")
    tuple = Gem::NameTuple.new("rake", Gem::Version.new("13.0"), Gem::Platform::RUBY)
    dependency.match?(tuple).should == true
    dependency.match?(Gem::NameTuple.new("jake", Gem::Version.new("13.0"))).should == false
  end

  it "refuses a name that is not a String" do
    -> { Gem::Dependency.new(1) }.should raise_error(ArgumentError)
  end

  it "merges the requirements of two dependencies on the same gem" do
    merged = Gem::Dependency.new("rake", ">= 12").merge(Gem::Dependency.new("rake", "< 14"))
    merged.name.should == "rake"
    merged.requirement.satisfied_by?(Gem::Version.new("13.0")).should == true
    merged.requirement.satisfied_by?(Gem::Version.new("15.0")).should == false
  end

  it "refuses to merge a dependency on another gem" do
    -> { Gem::Dependency.new("rake").merge(Gem::Dependency.new("jake")) }.should
      raise_error(Gem::DependencyError)
  end

  it "compares dependencies by name, type and requirement" do
    (Gem::Dependency.new("rake", ">= 12") == Gem::Dependency.new("rake", ">= 12")).should == true
    (Gem::Dependency.new("rake") == Gem::Dependency.new("jake")).should == false
  end

  it "writes itself the way the resolver reports it" do
    Gem::Dependency.new("rake", ">= 12").to_s.should == "rake (>= 12)"
  end
end

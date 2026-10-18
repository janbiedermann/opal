require 'spec_helper'
require 'rubygems'

describe 'Gem::Requirement' do
  it "checks a version against every operator it holds" do
    requirement = Gem::Requirement.new(">= 1.0", "< 2.0")
    requirement.satisfied_by?(Gem::Version.new("1.5")).should == true
    requirement.satisfied_by?(Gem::Version.new("2.5")).should == false
    requirement.satisfied_by?(Gem::Version.new("0.9")).should == false
  end

  it "accepts the requirement of a Gemfile written without a space" do
    Gem::Requirement.new(">=1.0").satisfied_by?(Gem::Version.new("1.1")).should == true
  end

  it "accepts a list, a string and a version as its argument" do
    Gem::Requirement.new(["~> 1.2"]).satisfied_by?(Gem::Version.new("1.9")).should == true
    Gem::Requirement.new("1.2").satisfied_by?(Gem::Version.new("1.2")).should == true
    Gem::Requirement.new(Gem::Version.new("1.2")).satisfied_by?(Gem::Version.new("1.2")).should == true
  end

  it "matches any version when it is the default requirement" do
    Gem::Requirement.default.satisfied_by?(Gem::Version.new("0")).should == true
    Gem::Requirement.default.none?.should == true
    Gem::Requirement.default.to_s.should == ">= 0"
  end

  it "compares a prerelease version like any other, the resolver deciding whether to offer one" do
    Gem::Requirement.new(">= 1.0").satisfied_by?(Gem::Version.new("2.0.0.rc1")).should == true
    Gem::Requirement.new(">= 2.0.0.rc1").prerelease?.should == true
  end

  it "understands the pessimistic operator" do
    requirement = Gem::Requirement.new("~> 1.2")
    requirement.satisfied_by?(Gem::Version.new("1.2.0")).should == true
    requirement.satisfied_by?(Gem::Version.new("1.9")).should == true
    requirement.satisfied_by?(Gem::Version.new("2.0")).should == false
  end

  it "says which requirement a version fails" do
    requirement = Gem::Requirement.new("= 1.0")
    requirement.satisfied_by?(Gem::Version.new("1.1")).should == false
    requirement.to_s.should == "= 1.0"
  end

  it "raises a BadRequirementError for a requirement it cannot read" do
    -> { Gem::Requirement.new(">x 1.0") }.should raise_error(Gem::Requirement::BadRequirementError)
    -> { Gem::Requirement.new("") }.should raise_error(Gem::Requirement::BadRequirementError)
  end

  it "adds the operators of another requirement to its own" do
    requirement = Gem::Requirement.new(">= 1.0")
    requirement.concat Gem::Requirement.new("< 2.0").as_list
    requirement.satisfied_by?(Gem::Version.new("1.5")).should == true
    requirement.satisfied_by?(Gem::Version.new("2.5")).should == false
  end

  it "reports whether it asks for one exact version" do
    Gem::Requirement.new("= 1.0").specific?.should == true
    Gem::Requirement.new(">= 1.0").specific?.should == false
  end
end

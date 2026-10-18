require 'spec_helper'
require 'rubygems'

describe 'Gem::Version' do
  it "compares the segments as numbers, not as text" do
    (Gem::Version.new("1.10") > Gem::Version.new("1.9")).should == true
    (Gem::Version.new("1.2.10") > Gem::Version.new("1.2.9")).should == true
  end

  it "treats a segment with letters as a prerelease that sorts before the release" do
    (Gem::Version.new("1.0.0.beta1") < Gem::Version.new("1.0.0")).should == true
    Gem::Version.new("1.0.0.beta1").prerelease?.should == true
    Gem::Version.new("1.0.0").prerelease?.should == false
  end

  it "turns a dash into a .pre. segment, as a gemspec writes it" do
    Gem::Version.new("1.2.3-rc1").to_s.should == "1.2.3.pre.rc1"
  end

  it "reports the release of a prerelease version" do
    Gem::Version.new("1.2.3.pre.4").release.to_s.should == "1.2.3"
  end

  it "ignores the trailing zeros of a version when comparing" do
    (Gem::Version.new("1.0") == Gem::Version.new("1")).should == true
    (Gem::Version.new("1.0.0") <=> Gem::Version.new("1.0")).should == 0
  end

  it "sorts a prerelease by its text segments" do
    (Gem::Version.new("1.0.a") <=> Gem::Version.new("1.0.b")).should == -1
    (Gem::Version.new("1.0.rc1") < Gem::Version.new("1.0.rc2")).should == true
  end

  it "accepts the versions a gemspec writes and rejects the rest" do
    Gem::Version.correct?("1.2.3.pre.4").should == true
    Gem::Version.correct?("1.2.3-rc1").should == true
    Gem::Version.correct?("1..2").should == false
    Gem::Version.correct?("a1").should == false
  end

  it "builds a release version out of segments" do
    Gem::Version.create(nil).to_s.should == "0"
    Gem::Version.create(3).to_s.should == "3"
    Gem::Version.create(Gem::Version.new("1.2.3")).to_s.should == "1.2.3"
  end

  it "hashes equal versions alike" do
    (Gem::Version.new("1.0").hash == Gem::Version.new("1.0.0").hash).should == true
  end

  it "reports the version it was built from" do
    Gem::Version.new(" 1.2.3 ").to_s.should == "1.2.3"
    Gem::Version.new("1.2.3").version.should == "1.2.3"
  end
end

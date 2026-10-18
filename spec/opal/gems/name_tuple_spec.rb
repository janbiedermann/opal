require 'spec_helper'
require 'rubygems'

describe 'Gem::NameTuple' do
  it "names a gem, a version and a platform" do
    tuple = Gem::NameTuple.new("rake", Gem::Version.new("13.3.1"), Gem::Platform::RUBY)
    tuple.name.should == "rake"
    tuple.version.to_s.should == "13.3.1"
    tuple.platform.should == Gem::Platform::RUBY
    tuple.full_name.should == "rake-13.3.1"
  end

  it "keeps the platform out of the full name only for the ruby platform" do
    tuple = Gem::NameTuple.new("nokogiri", Gem::Version.new("1.6.1"), Gem::Platform.new("x86_64-linux"))
    tuple.full_name.should == "nokogiri-1.6.1-x86_64-linux"
  end

  it "sorts by name, then version, then platform" do
    tuples = [
      Gem::NameTuple.new("rake", Gem::Version.new("13.0")),
      Gem::NameTuple.new("jake", Gem::Version.new("1.0")),
      Gem::NameTuple.new("rake", Gem::Version.new("12.0"))
    ]
    tuples.sort.map { |tuple| tuple.full_name }.should == ["jake-1.0", "rake-12.0", "rake-13.0"]
  end

  it "knows a prerelease tuple" do
    Gem::NameTuple.new("rake", Gem::Version.new("1.0.0.rc1")).prerelease?.should == true
    Gem::NameTuple.new("rake", Gem::Version.new("1.0.0")).prerelease?.should == false
  end

  it "matches only the platforms this runtime accepts" do
    Gem::NameTuple.new("rake", Gem::Version.new("1.0"), Gem::Platform::RUBY).match_platform?.should == true
    Gem::NameTuple.new("rake", Gem::Version.new("1.0"), Gem::Platform.new("x86_64-mswin64")).match_platform?.should == false
  end

  it "reads a list of tuples back into NameTuple objects" do
    tuples = Gem::NameTuple.from_list(["rake", Gem::Version.new("13.3.1"), Gem::Platform::RUBY].each_slice(3).to_a)
    tuples.map { |tuple| tuple.full_name }.should == ["rake-13.3.1"]
  end

  it "hashes equal tuples alike so a Set can hold them" do
    one = Gem::NameTuple.new("rake", Gem::Version.new("13.3.1"))
    other = Gem::NameTuple.new("rake", Gem::Version.new("13.3.1"))
    (one == other).should == true
    (one.hash == other.hash).should == true
  end
end

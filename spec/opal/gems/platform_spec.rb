require 'spec_helper'
require 'rubygems'

describe 'Gem::Platform' do
  it "reads a platform name into its cpu, version and os parts" do
    platform = Gem::Platform.new("x86_64-linux")
    platform.cpu.should == "x86_64"
    platform.os.should == "linux"
    platform.version.should == nil
  end

  it "reads the version out of a platform name that carries one" do
    platform = Gem::Platform.new("x86_64-darwin-23")
    platform.cpu.should == "x86_64"
    platform.os.should == "darwin"
    platform.version.should == "23"
  end

  it "compares a platform with the one written the same way" do
    (Gem::Platform.new("x86_64-linux") == Gem::Platform.new("x86_64-linux")).should == true
    (Gem::Platform.new("x86_64-linux") == Gem::Platform.new("aarch64-linux")).should == false
  end

  it "matches any version of an operating system" do
    (Gem::Platform.new("x86_64-linux") === Gem::Platform.new("x86_64-linux-gnu")).should == true
    (Gem::Platform.new("linux") === Gem::Platform.new("x86_64-linux")).should == true
  end

  it "keeps the plain ruby platform for the pure Ruby gems Opal can run" do
    Gem::Platform::RUBY.should == "ruby"
    Gem::Platform.local.should == Gem::Platform::RUBY
    Gem.platforms.include?(Gem::Platform::RUBY).should == true
  end

  it "writes itself back as the name it was read from" do
    Gem::Platform.new("x86_64-darwin-23").to_s.should == "x86_64-darwin-23"
    Gem::Platform.new("x86_64-darwin-23").to_a.should == ["x86_64", "darwin", "23"]
  end

  it "compares the platform it was read from with another" do
    (Gem::Platform.new("x86_64-linux") <=> Gem::Platform.new("x86_64-linux")).should == 0
    (Gem::Platform.new("x86_64-linux") <=> Gem::Platform.new("aarch64-linux")).should == nil
  end
end

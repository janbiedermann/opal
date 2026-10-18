require 'spec_helper'
require 'rubygems'

describe 'Gem paths' do
  before :each do
    @saved = { "GEM_HOME" => ENV["GEM_HOME"], "GEM_PATH" => ENV["GEM_PATH"] }
    Gem.clear_paths
  end

  after :each do
    @saved.each { |key, value| ENV[key] = value }
    Gem.clear_paths
  end

  it "puts the gems of this runtime under the user's data home" do
    Gem.user_dir.should == File.join(Gem.data_home, "gem", RUBY_ENGINE, RUBY_VERSION)
  end

  it "uses the user directory as the default one, Opal having no system prefix" do
    Gem.default_dir.should == Gem.user_dir
  end

  it "lets GEM_HOME move the gem directory" do
    ENV["GEM_HOME"] = "/tmp/opal_gem_home"
    Gem.dir.should == "/tmp/opal_gem_home"
    Gem.path.include?("/tmp/opal_gem_home").should == true
  end

  it "lets GEM_PATH add directories to search" do
    ENV["GEM_PATH"] = "/tmp/one:/tmp/two"
    Gem.path.first(2).should == ["/tmp/one", "/tmp/two"]
    Gem.path.include?(Gem.user_dir).should == true
  end

  it "keeps the home directory last in the search path" do
    ENV["GEM_PATH"] = "/tmp/one"
    Gem.path.last.should == Gem.user_dir
  end

  it "puts the gems of a directory under its gems subdirectory" do
    ENV["GEM_HOME"] = "/tmp/opal_gem_home"
    Gem.gems_dir.should == "/tmp/opal_gem_home/gems"
  end
end

require 'spec_helper'
require 'rubygems'
require 'fileutils'

describe 'Gem::ConfigFile' do
  before :each do
    @dir = File.expand_path("../tmp/gemrc_spec", Dir.pwd)
    FileUtils.mkdir_p @dir
    @path = File.join @dir, "gemrc"
  end

  after :each do
    FileUtils.rm_rf @dir
  end

  def write(contents)
    File.write @path, contents
  end

  it "reads the options of a .gemrc, keys and values transformed" do
    write <<~GEMRC
      :update_sources: false
      :verbose: false
      :bulk_threshold: 1
    GEMRC

    config = Gem::ConfigFile.new(["--config-file=#{@path}"])
    config.update_sources.should == false
    config.verbose?.should == false
    config.bulk_threshold.should == 1
  end

  it "reads the sources a .gemrc lists" do
    write <<~GEMRC
      ---
      sources:
      - https://gems.example.com/
      - https://rubygems.org/
    GEMRC

    Gem::ConfigFile.new(["--config-file=#{@path}"]).sources.should ==
      ["https://gems.example.com/", "https://rubygems.org/"]
  end

  it "keeps rubygems.org when the file says nothing about sources" do
    write ":verbose: true\n"
    Gem::ConfigFile.new(["--config-file=#{@path}"]).sources.should == Gem.default_sources
  end

  it "lets the command line win over the file" do
    write ":verbose: false\n"
    Gem::ConfigFile.new(["--config-file=#{@path}", "--verbose"]).verbose?.should == true
  end

  it "works with no file at all" do
    Gem::ConfigFile.new(["--config-file=#{@path}/absent"]).sources.should == Gem.default_sources
  end
end

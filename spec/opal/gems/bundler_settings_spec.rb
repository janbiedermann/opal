require 'spec_helper'
require 'rubygems'
require 'bundler'
require 'fileutils'

describe 'Bundler::Settings' do
  def env_keys
    %w[BUNDLE_FROZEN BUNDLE_JOBS BUNDLE_WITH BUNDLE_CACHE_PATH BUNDLE_APP_CONFIG]
  end

  def with_env(hash)
    hash.each {|key, value| ENV[key] = value }
    begin
      yield
    ensure
      hash.each_key {|key| ENV.delete(key) }
    end
  end

  before :each do
    env_keys.each {|key| ENV.delete(key) }
    Bundler.reset_settings_and_root!
  end

  after :each do
    env_keys.each {|key| ENV.delete(key) }
    Bundler.reset_settings_and_root!
  end

  it "answers the defaults of DEFAULT_CONFIG" do
    settings = Bundler::Settings.new
    settings[:retry].should == 3
    settings[:timeout].should == 10
    settings[:redirect].should == 5
    settings[:cache_all].should == true
    settings[:lockfile_checksums].should == true
    settings[:prefer_patch].should == false
    settings[:jobs].should == nil
    settings[:frozen].should == nil
  end

  it "encodes setting names into config and ENV keys" do
    Bundler::Settings.key_for("path.system").should == "BUNDLE_PATH__SYSTEM"
    Bundler::Settings.key_for("system-bindir").should == "BUNDLE_SYSTEM___BINDIR"
    Bundler::Settings.key_for("local.foo").should == "BUNDLE_LOCAL__FOO"
    Bundler::Settings.key_for(:frozen).should == "BUNDLE_FROZEN"
  end

  it "converts configured values by key kind" do
    with_env("BUNDLE_FROZEN" => "false", "BUNDLE_JOBS" => "3", "BUNDLE_WITH" => "test dev") do
      settings = Bundler::Settings.new
      settings[:frozen].should == false
      settings[:jobs].should == 3
      settings[:with].should == [:test, :dev]
    end
  end

  it "answers env-set keys from #all and #locations" do
    with_env("BUNDLE_FROZEN" => "true") do
      settings = Bundler::Settings.new
      settings.all.should include("frozen")
      # locations reports the raw configured value, not the converted one.
      settings.locations("frozen").should == {env: "true"}
    end
  end

  it "restores the previous value when a temporary block ends" do
    settings = Bundler::Settings.new
    inside = settings.temporary("jobs" => "7") { settings[:jobs] }
    inside.should == 7
    settings[:jobs].should == nil
  end

  it "writes, reloads and lists local settings through .bundle/config" do
    Dir.chdir(File.expand_path(tmp('bundler_settings')).tap {|dir| FileUtils.mkdir_p(dir) }) do
      FileUtils.mkdir_p("sub")
      Dir.chdir("sub") do
        # A root-less Settings never reads the local file (as upstream);
        # Bundler.settings builds one with Bundler.root.join(".bundle").
        root = Pathname.new(Dir.pwd).join(".bundle")
        settings = Bundler::Settings.new(root)
        settings.set_local(:jobs, "4")
        File.read(".bundle/config").should include("BUNDLE_JOBS")
        reloaded = Bundler::Settings.new(root)
        reloaded[:jobs].should == 4
        # raw configured value again:
        reloaded.locations("jobs").should == {local: "4"}
      end
    end
  end

  it "collects local overrides without the local. prefix" do
    Dir.chdir(File.expand_path(tmp('bundler_settings_overrides')).tap {|dir| FileUtils.mkdir_p(dir) }) do
      root = Pathname.new(Dir.pwd).join(".bundle")
      settings = Bundler::Settings.new(root)
      settings.set_local("local.hello", "/tmp/hello")
      Bundler::Settings.new(root).local_overrides.should == {"hello" => "/tmp/hello"}
    end
  end

  it "reports unconfigured keys through pretty_values_for" do
    settings = Bundler::Settings.new
    settings.pretty_values_for(:retry).should ==
      ["You have not configured a value for `retry`"]
  end

  it "obeys the env for Bundler.frozen_bundle? through the root settings" do
    with_env("BUNDLE_FROZEN" => "true") do
      Bundler.reset_settings_and_root!
      Bundler.frozen_bundle?.should == true
    end
    with_env("BUNDLE_FROZEN" => "false", "BUNDLE_DEPLOYMENT" => "true") do
      Bundler.reset_settings_and_root!
      Bundler.frozen_bundle?.should == false
    end
    Bundler.reset_settings_and_root!
    Bundler.frozen_bundle?.should == nil
  end

  it "answers the feature flags for the ported Bundler major" do
    Bundler.feature_flag.bundler_4_mode?.should == true
    Bundler.feature_flag.bundler_5_mode?.should == false
    Bundler.feature_flag.removed_major?(3).should == true
  end

  it "answers the scoped bundle path and the cache path default" do
    Bundler.ruby_scope.should == "#{RUBY_ENGINE}/#{RUBY_VERSION}"
    Bundler::Settings.new.app_cache_path.should == "vendor/cache"
    with_env("BUNDLE_CACHE_PATH" => "vendor/x") do
      Bundler::Settings.new.app_cache_path.should == "vendor/x"
    end
  end
end

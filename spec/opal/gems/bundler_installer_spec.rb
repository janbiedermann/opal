require 'spec_helper'
require 'rubygems'
require 'bundler'
require 'fileutils'

describe 'Bundler install layer' do
  it "answers the default bundle location from the system gems" do
    settings = Bundler::Settings.new
    settings.path.use_system_gems?.should == true
    settings.path.path.should == Bundler.rubygems.gem_dir
  end

  it "runs the process lock around its block and removes the lock file" do
    Dir.chdir(File.expand_path(tmp('bundler_process_lock')).tap {|dir| FileUtils.mkdir_p(dir) }) do
      inside = nil
      answer = Bundler::ProcessLock.lock(Dir.pwd) do
        inside = File.exist?("bundler.lock")
        :done
      end
      inside.should == true
      answer.should == :done
      File.exist?("bundler.lock").should == false
    end
  end

  it "levels the Shell UI and drops colors" do
    shell = Bundler::UI::Shell.new
    shell.level("info").should == true
    shell.level("debug").should == false
    shell.level = "debug"
    shell.level("debug").should == true
    -> { shell.level = "nope" }.should raise_error(ArgumentError)
    -> { shell.level("nope") }.should raise_error(RuntimeError)
    shell.add_color("plain", :red).should == "plain"
  end

  it "dedups warnings by text" do
    shell = Bundler::UI::Shell.new
    shell.warn("only once")
    shell.warn("only once") # the second call must not raise nor repeat
    shell.instance_variable_get(:@warning_history).should == ["only once"]
  end

  it "backups the original environment key behind set_env" do
    old = ENV["GEM_HOME"]
    begin
      ENV.delete("GEM_HOME")
      ENV.delete("BUNDLER_ORIG_GEM_HOME")
      Bundler::SharedHelpers.set_env("GEM_HOME", "/tmp/bundle-home")
      ENV["GEM_HOME"].should == "/tmp/bundle-home"
      ENV["BUNDLER_ORIG_GEM_HOME"].should ==
        Bundler::EnvironmentPreserver::INTENTIONALLY_NIL
      -> { Bundler::SharedHelpers.set_env("NOT_A_BUNDLER_KEY", "x") }
        .should raise_error(ArgumentError)
    ensure
      ENV.delete("GEM_HOME")
      ENV.delete("BUNDLER_ORIG_GEM_HOME")
      ENV["GEM_HOME"] = old if old
    end
  end

  it "wires the RGProxy over the Gem UI when Bundler.ui is set" do
    shell = Bundler::UI::Shell.new
    Bundler.ui = shell
    begin
      Bundler.ui.should == shell
      Gem::DefaultUserInteraction.ui.class.should == Bundler::UI::RGProxy
    ensure
      Bundler.ui = Bundler::UI::Silent.new
    end
  end
end

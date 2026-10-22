require 'spec_helper'
require 'rubygems'
require 'bundler'
require 'fileutils'
require 'ostruct'

describe 'Bundler runtime setup slice' do
  # set_bundle_environment and friends write BUNDLE_*/PATH/RUBYOPT/RUBYLIB
  # into the process's environment; every example takes them down again so
  # the specs around it keep running in a clean env.
  def with_saved_env(keys)
    prefix = Bundler::EnvironmentPreserver::BUNDLER_PREFIX
    saved = keys.map {|key| [key, ENV[prefix + key], ENV[key]] }
    begin
      yield
    ensure
      saved.each do |key, orig, raw|
        if orig == Bundler::EnvironmentPreserver::INTENTIONALLY_NIL || (orig.nil? && raw.nil?)
          ENV.delete(key)
          ENV.delete(prefix + key)
        else
          ENV[prefix + key] = orig
          ENV[key] = raw
        end
      end
    end
  end

  it "clones the boot environment in original_env" do
    snapshot = Bundler.original_env
    snapshot.is_a?(Hash).should == true
    snapshot["BUNDLER_SPEC_PROBE"] = "copy only"
    Bundler.original_env["BUNDLER_SPEC_PROBE"].nil?.should == true
  end

  it "writes the bundle variables through the environment preserver" do
    Dir.chdir(File.expand_path(tmp('bundler_set_variables')).tap {|dir| FileUtils.mkdir_p(dir) }) do
      File.write("Gemfile", "source 'https://example.com'\n")
      keys = %w[BUNDLE_BIN_PATH BUNDLE_GEMFILE BUNDLE_LOCKFILE BUNDLER_VERSION BUNDLER_SETUP]
      with_saved_env(keys) do
        Bundler::SharedHelpers.set_bundle_variables
        ENV["BUNDLER_VERSION"].should == Bundler::VERSION
        ENV["BUNDLE_BIN_PATH"].should == File.join(Bundler::SharedHelpers.source_root, "exe", "bundler")
        File.expand_path("Gemfile").should == ENV["BUNDLE_GEMFILE"]
        ENV["BUNDLE_LOCKFILE"].include?("Gemfile.lock").should == true
        ENV["BUNDLER_SETUP"].nil?.should == false
      end
    end
  end

  it "wraps the environment the child processes inherit" do
    keys = %w[BUNDLE_BIN_PATH BUNDLE_GEMFILE BUNDLE_LOCKFILE BUNDLER_VERSION BUNDLER_SETUP
              PATH RUBYOPT RUBYLIB]
    Dir.chdir(File.expand_path(tmp('bundler_set_environment')).tap {|dir| FileUtils.mkdir_p(dir) }) do
      File.write("Gemfile", "source 'https://example.com'\n")
      with_saved_env(keys) do
        Bundler::SharedHelpers.set_bundle_environment
        ENV["PATH"].split(File::PATH_SEPARATOR).first.should == "#{Bundler.bundle_path}/bin"
        ENV["RUBYOPT"].start_with?("-rbundler/setup").should == true
        ENV["RUBYLIB"].include?(Bundler::SharedHelpers.bundler_ruby_lib).should == true
        # the original PATH stays behind the prefix so the unbundling can
        # put it back, as EnvironmentPreserver expects
        ENV["BUNDLER_ORIG_PATH"].nil?.should == false
      end
    end
  end

  it "keys the bundle's specs by name and folds the default gem stubs in" do
    specs = Bundler.rubygems.add_default_gems_to([OpenStruct.new(name: "probe_gem")])
    specs.is_a?(Hash).should == true
    specs["probe_gem"].nil?.should == false
    # the defaults never displace a spec the bundle itself carries
    Bundler.rubygems.add_default_gems_to([OpenStruct.new(name: "probe_gem")]).
      fetch("probe_gem").name.should == "probe_gem"
  end

  it "clears the gem paths where upstream patched Kernel, patching nothing" do
    # the port's isolation is the load path (see the deviation note in
    # rubygems_integration.rb), so replace_entrypoints must not reach for
    # Kernel - and it must survive the call.
    Bundler.rubygems.replace_entrypoints([])
    Gem.respond_to?(:discover_gems_on_require=).should == false
  end

  it "locates executables by name and path" do
    Bundler.find_executable("/bin/sh").should == "/bin/sh"
    Bundler.find_executable("nope-xyz-probe").nil?.should == true
    Bundler.which("sh").nil?.should == false
    Bundler.which("nope-xyz-probe").nil?.should == true
  end
end

require 'spec_helper'
require 'rubygems'
require 'fileutils'

# The driver that turns "install this gem" into a resolution, a download and a
# set of installs in the right order: Gem::DependencyInstaller, which builds a
# Gem::RequestSet over a Gem::Resolver::InstallerSet. Everything here runs
# against a directory of .gem files - the domain is :local - because the
# network half of M5 is still the seam raise of Gem::Source.

def build_local_gem(dir, name, version, deps: {})
  src = File.join dir, "src-#{name}-#{version}"
  FileUtils.mkdir_p File.join(src, 'lib')
  File.write File.join(src, "lib/#{name}.rb"), "module #{name.capitalize}\nend\n"

  spec = Gem::Specification.new(name, version)
  spec.summary       = "the #{name} gem"
  spec.authors       = ['Opal']
  spec.files         = ["lib/#{name}.rb"]
  spec.require_paths = ['lib']
  deps.each {|dep, req| spec.add_runtime_dependency dep, req }

  Dir.chdir src do
    FileUtils.mv File.join(src, Gem::Package.build(spec)),
                 File.join(dir, "#{name}-#{version}.gem")
  end
end

def isolate_gem_home(dir)
  Gem.paths = Gem::PathSupport.new(
    "GEM_HOME" => File.join(dir, 'home'), "GEM_PATH" => File.join(dir, 'home'),
    "GEM_SPEC_CACHE" => File.join(dir, 'specs')
  )
  Gem::Specification.reset
end

describe 'Gem::DependencyInstaller' do
  before :each do
    @dir  = tmp('gem_dependency_installer')
    @repo = File.join @dir, 'repo'
    @home = File.join @dir, 'home'
    FileUtils.mkdir_p @repo

    build_local_gem @repo, 'tiny', '0.1.0'
    build_local_gem @repo, 'tiny', '0.2.0'
    build_local_gem @repo, 'helper', '1.0.0', deps: { 'tiny' => '~> 0.1' }

    @paths = Gem.paths
    isolate_gem_home @dir
  end

  after :each do
    Gem.loaded_specs.clear
    Gem.paths = @paths
    Gem::Specification.reset
    rm_r @dir
  end

  it 'installs a gem of the local repository together with what it needs' do
    installed = Dir.chdir(@repo) do
      Gem::DependencyInstaller.new(domain: :local, install_dir: @home)
        .install('helper')
    end

    installed.map(&:full_name).should == ['helper-1.0.0', 'tiny-0.2.0']

    Gem::Specification.reset
    Gem::Specification.to_a.map(&:full_name).sort.should ==
      ['helper-1.0.0', 'tiny-0.2.0']

    # the newest tiny the requirement allows, and nothing of the older one
    File.exist?(File.join(@home, 'gems', 'tiny-0.2.0')).should == true
    File.exist?(File.join(@home, 'gems', 'tiny-0.1.0')).should == false
  end

  it 'installs the .gem named on the command line, dependencies included' do
    installed = Dir.chdir(@repo) do
      Gem::DependencyInstaller.new(domain: :local, install_dir: @home)
        .install('./helper-1.0.0.gem')
    end

    installed.map(&:full_name).should == ['helper-1.0.0', 'tiny-0.2.0']
  end

  it 'installs only the named gem when its dependencies are ignored' do
    installed = Dir.chdir(@repo) do
      Gem::DependencyInstaller.new(
        domain: :local, install_dir: @home, ignore_dependencies: true
      ).install('helper')
    end

    installed.map(&:full_name).should == ['helper-1.0.0']

    Gem::Specification.reset
    Gem::Specification.to_a.map(&:full_name).should == ['helper-1.0.0']
  end

  it 'reinstalls the named gem on a second run, but not its dependency' do
    Dir.chdir(@repo) do
      Gem::DependencyInstaller.new(domain: :local, install_dir: @home).install('helper')

      # the gem named on the command line is in the set's always_install, which
      # is exactly the list Gem::RequestSet#install_into refuses to skip; what
      # the resolution added beside it stays as it is
      again = Gem::DependencyInstaller.new(domain: :local, install_dir: @home).install('helper')
      again.map(&:full_name).should == ['helper-1.0.0']
    end

    Gem::Specification.reset
    Gem::Specification.find_all_by_name('tiny').size.should == 1
  end

  it 'says which gem nothing in the repository can satisfy' do
    error = nil
    begin
      Dir.chdir(@repo) do
        Gem::DependencyInstaller.new(domain: :local, install_dir: @home).install('nope')
      end
    rescue Gem::UnsatisfiableDependencyError => e
      error = e
    end

    error.should_not == nil
    error.message.should.include? "user requested 'nope"
  end

  it 'refuses a gem no source of the remote domain offers' do
    # The M5 transport is in, so a :remote install asks its sources; with none
    # configured the request fails on the dependency, not on the seam.
    saved = Gem.sources.to_a
    error = nil
    begin
      Gem.sources = []
      Dir.chdir(@repo) do
        Gem::DependencyInstaller.new(domain: :remote, install_dir: @home).install('helper')
      end
    rescue Gem::Exception => e
      error = e
    ensure
      Gem.sources = saved
    end

    error.should_not == nil
    error.message.should.include? "user requested 'helper"
  end
end

describe 'Gem::RequestSet' do
  before :each do
    @dir  = tmp('gem_request_set')
    @repo = File.join @dir, 'repo'
    FileUtils.mkdir_p @repo

    build_local_gem @repo, 'tiny', '0.2.0'
    build_local_gem @repo, 'helper', '1.0.0', deps: { 'tiny' => '~> 0.1' }

    @paths = Gem.paths
    isolate_gem_home @dir
  end

  after :each do
    Gem.loaded_specs.clear
    Gem.paths = @paths
    Gem::Specification.reset
    rm_r @dir
  end

  it 'sorts the resolved requests so a gem comes after its dependencies' do
    Dir.chdir(@repo) do
      set = Gem::Resolver::InstallerSet.new :local
      request_set = Gem::RequestSet.new Gem::Dependency.new('helper', '>= 0')

      # RequestSet#resolve hands the set its #remote=, and InstallerSet widens a
      # :local domain to :both under a true remote - which is why Gem's own
      # installer passes the set's own domain back, as here
      request_set.remote = set.consider_remote?
      request_set.resolve set

      # the order Gem::Installer accepts: a gem's own dependencies first, while
      # #specs keeps the order the resolver answered in
      request_set.sorted_requests.map(&:full_name).should ==
        ['tiny-0.2.0', 'helper-1.0.0']
      request_set.specs.map(&:full_name).sort.should ==
        ['helper-1.0.0', 'tiny-0.2.0']
    end
  end

  it 'installs into --install-dir without consulting the installed gems' do
    Dir.chdir(@repo) do
      set = Gem::Resolver::InstallerSet.new :local
      set.ignore_installed = true
      request_set = Gem::RequestSet.new Gem::Dependency.new('helper', '>= 0')
      request_set.remote = set.consider_remote?
      request_set.resolve set

      installed = request_set.install install_dir: File.join(@dir, 'elsewhere')

      installed.map(&:full_name).sort.should == ['helper-1.0.0', 'tiny-0.2.0']
    end

    File.exist?(File.join(@dir, 'elsewhere', 'gems', 'helper-1.0.0')).should == true
  end
end

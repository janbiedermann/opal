require 'spec_helper'
require 'rubygems'
require 'rubygems/resolver'
require 'fileutils'

# Gem::Resolver, the layer that turns a dependency tree into the list of gems to
# activate or install, on top of the PubGrub solver RubyGems vendors. The sets
# here are the ones this port can reach without a network: the .gem files of a
# directory (Gem::Source::Local) and the gems already installed
# (Gem::Source::Installed). What stays out of reach until the transport of
# M5's second half is the remote index, and the last example pins the seam down
# so that a resolution which silently wanted the network fails where it should.
describe 'Gem::Resolver' do
  def build_gem(name, version, deps: {})
    src = File.join @repo, "src-#{name}-#{version}"
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
                   File.join(@repo, "#{name}-#{version}.gem")
    end
  end

  before :each do
    @dir  = tmp('gem_resolver')
    @repo = File.join @dir, 'repo'
    FileUtils.mkdir_p @repo

    build_gem 'tiny', '0.1.0'
    build_gem 'tiny', '0.2.0'
    build_gem 'helper', '1.0.0', deps: { 'tiny' => '~> 0.1' }
    # a gem whose own dependency is out of reach in this repository
    build_gem 'farseeker', '1.0.0', deps: { 'tiny' => '> 0.2.0' }

    @paths = Gem.paths
    Gem.paths = Gem::PathSupport.new(
      "GEM_HOME" => File.join(@dir, 'home'), "GEM_PATH" => File.join(@dir, 'home'),
      "GEM_SPEC_CACHE" => File.join(@dir, 'specs')
    )
    Gem::Specification.reset
  end

  after :each do
    Gem.loaded_specs.clear
    Gem.paths = @paths
    Gem::Specification.reset
    rm_r @dir
  end

  it 'finds a gem of the local repository as a specification of that source' do
    set = Gem::Resolver::InstallerSet.new :local
    request = Gem::Resolver::DependencyRequest.new Gem::Dependency.new('helper', '>= 0'), nil

    found = Dir.chdir(@repo) { set.find_all request }

    found.map {|s| s.spec.full_name }.should == ['helper-1.0.0']
    found.first.class.should == Gem::Resolver::IndexSpecification
    found.first.source.class.should == Gem::Source::Local

    # only a LocalSpecification - a .gem named on the command line rather than
    # found through a source - answers true here
    found.first.local?.should == false
  end

  it 'resolves the dependencies of a local gem into activation requests' do
    requests = Dir.chdir(@repo) do
      set = Gem::Resolver::InstallerSet.new :local
      Gem::Resolver.new([Gem::Dependency.new('helper', '>= 0')], set).resolve
    end

    requests.map {|r| r.spec.full_name }.sort.should == ['helper-1.0.0', 'tiny-0.2.0']

    # the newest tiny the requirement allows is 0.2.0, and nothing is installed
    requests.map {|r| r.installed? }.should == [false, false]
  end

  it 'says which dependency nothing here can satisfy' do
    error = nil
    begin
      Dir.chdir(@repo) do
        set = Gem::Resolver::InstallerSet.new :local
        Gem::Resolver.new([Gem::Dependency.new('nope', '>= 0')], set).resolve
      end
    rescue Gem::UnsatisfiableDependencyError => e
      error = e
    end

    error.should_not == nil
    error.dependency.dependency.name.should == 'nope'
    error.message.should.include? "user requested 'nope"
  end

  it 'fails the solve when the tree a gem brings in cannot be satisfied' do
    error = nil
    begin
      Dir.chdir(@repo) do
        set = Gem::Resolver::InstallerSet.new :local
        Gem::Resolver.new([Gem::Dependency.new('farseeker', '>= 0')], set).resolve
      end
    rescue Gem::DependencyResolutionError => e
      error = e
    end

    error.should_not == nil
    error.explanation.should.include? 'every version of farseeker depends on tiny > 0.2.0'
    error.explanation.should.include? 'no versions satisfy tiny > 0.2.0'
    error.message.should == error.explanation
  end

  it 'installs what the resolution asks for, dependencies first' do
    Dir.chdir(@repo) do
      set = Gem::Resolver::InstallerSet.new :local
      requests = Gem::Resolver.new([Gem::Dependency.new('helper', '>= 0')], set).resolve

      # the installer refuses a gem whose own dependencies are not in place yet,
      # so a resolved set has to go in dependency order and not in resolution
      # order - the job Gem::RequestSet does for `gem install` once M6 lands
      list = Gem::DependencyList.new
      list.add(*requests.map {|request| request.spec.spec })
      order = list.dependency_order.reverse
      order.map(&:full_name).should == ['tiny-0.2.0', 'helper-1.0.0']

      by_name = requests.to_h {|request| [request.full_name, request] }
      order.each do |spec|
        gem = by_name[spec.full_name].download File.join(@dir, 'download')
        Gem::Installer.at(gem, install_dir: Gem.dir).install
      end
    end
    Gem::Specification.reset

    Gem::Specification.find_all_by_name('tiny').map {|s| s.version.to_s }.should == ['0.2.0']
    Gem::Specification.find_by_name('helper').runtime_dependencies.map(&:name).should == ['tiny']
    File.exist?(File.join(Gem.dir, 'gems', 'helper-1.0.0', 'lib', 'helper.rb')).should == true
  end

  it 'resolves against the gems that are already installed' do
    Dir.chdir(@repo) do
      Gem::Installer.at('tiny-0.1.0.gem', install_dir: Gem.dir).install
    end
    Gem::Specification.reset

    requests = Gem::Resolver.for_current_gems([Gem::Dependency.new('tiny', '~> 0.1')]).resolve

    requests.map {|r| r.spec.full_name }.should == ['tiny-0.1.0']
    requests.map {|r| r.installed? }.should == [true]
  end

  it 'asks the remote index for what the local repository does not hold' do
    error = nil
    begin
      Dir.chdir(@repo) do
        set = Gem::Resolver::InstallerSet.new :remote
        set.add_always_install Gem::Dependency.new('helper', '>= 0')
      end
    rescue Gem::Exception => e
      error = e
    end

    error.should_not == nil
    error.message.should.include? 'remote sources are not available yet'
  end
end

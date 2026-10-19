require 'spec_helper'
require 'rubygems'
require 'fileutils'
require 'rubygems/installer'

# The part of activation the runtime needs: a spec knows the files it owns,
# activating it puts its require paths on $LOAD_PATH, and Gem.try_activate
# answers the gem a required file belongs to - which is what exe/ruby's
# loader calls when a path is not on the load path.
describe 'Gem activation' do
  before :each do
    @dir = tmp('gem_activation')
    @src = File.join @dir, 'src'
    FileUtils.mkdir_p File.join(@src, 'lib')
    File.write File.join(@src, 'lib/tiny.rb'), "module Tiny\nend\n"

    spec = Gem::Specification.new('tiny', '0.1.0')
    spec.summary       = 'A tiny gem.'
    spec.authors       = ['Opal']
    spec.files         = ['lib/tiny.rb']
    spec.require_paths = ['lib']

    path = File.join @src, Dir.chdir(@src) { Gem::Package.build spec }
    Gem::Installer.at(path, install_dir: @dir).install

    # the gem directory the run looks gems up in, for the duration of one
    # example: everything the example changes is put back below
    @paths = Gem.paths
    Gem.paths = Gem::PathSupport.new(
      "GEM_HOME" => @dir, "GEM_PATH" => @dir, "GEM_SPEC_CACHE" => File.join(@dir, 'specs')
    )
    Gem::Specification.reset

    @load_path_size = $LOAD_PATH.size
  end

  after :each do
    Gem.loaded_specs.delete 'tiny'
    Gem.loaded_specs.delete 'dep'
    Gem.loaded_specs.delete 'app'
    $LOAD_PATH.pop while $LOAD_PATH.size > @load_path_size
    Gem.paths = @paths
    Gem::Specification.reset
    rm_r @dir
  end

  it 'knows the file it owns by its require path' do
    stub = Gem::Specification.stubs_for('tiny').first
    stub.contains_requirable_file?('tiny').should == true
    stub.contains_requirable_file?('tiny.rb').should == true
    stub.contains_requirable_file?('other').should == false
  end

  it 'answers the gem a required file belongs to, through try_activate' do
    Gem.try_activate('tiny').should == true
    Gem.loaded_specs['tiny'].full_name.should == 'tiny-0.1.0'
    Gem.try_activate('missing').should == false
  end

  it 'puts the require paths of the activated gem on the load path' do
    Gem.try_activate 'tiny'

    Gem::Specification.find_by_name('tiny').activated?.should == true
    $LOAD_PATH.include?(File.join(@dir, 'gems/tiny-0.1.0/lib')).should == true
  end

  it 'answers the file a require asked for, once the gem is activated' do
    Gem.try_activate 'tiny'

    spec = Gem::Specification.find_by_path 'tiny'
    spec.full_name.should == 'tiny-0.1.0'
    spec.to_fullpath('tiny').should == File.join(@dir, 'gems/tiny-0.1.0/lib/tiny.rb')
  end

  # The three ways an activation says no, and the classes it says them with:
  # all of them are LoadErrors, not Gem::Exceptions, as in CRuby - a script
  # rescuing StandardError does not swallow a gem it cannot activate.
  it 'raises a Gem::LoadError naming the gem when another version is already activated' do
    Gem.try_activate 'tiny'

    error = nil
    begin
      Gem::Specification.new('tiny', '0.2.0').activate
    rescue Gem::LoadError => e
      error = e
    end

    error.should_not == nil
    error.name.should == 'tiny'
    error.message.should.include? "can't activate tiny-0.2.0, already activated tiny-0.1.0"
  end

  it 'raises a Gem::ConflictError when an activated gem fails a dependency' do
    Gem::Specification.new('dep', '1.0.0').activate

    app = Gem::Specification.new('app', '0.1.0')
    app.add_runtime_dependency 'dep', '>= 2.0'

    error = nil
    begin
      app.activate
    rescue Gem::ConflictError => e
      error = e
    end

    error.should_not == nil
    error.target.full_name.should == 'app-0.1.0'
    error.conflicts.values.flatten.map(&:to_s).should == ['dep (>= 2.0)']
    error.message.should.include? 'Unable to activate app-0.1.0'
  end

  it 'raises a Gem::MissingSpecError when the dependency names no gem at all' do
    error = nil
    begin
      Gem::Dependency.new('nothing', '>= 0').to_specs
    rescue Gem::MissingSpecError => e
      error = e
    end

    error.should_not == nil
    error.name.should == 'nothing'
    error.message.should.include? "Could not find 'nothing'"
    error.message.should.include? "Checked in 'GEM_PATH="
  end

  it 'raises a Gem::MissingSpecVersionError when the gem is there but not that version' do
    error = nil
    begin
      Gem::Dependency.new('tiny', '= 9.9.9').to_specs
    rescue Gem::MissingSpecVersionError => e
      error = e
    end

    error.should_not == nil
    error.specs.map(&:full_name).should == ['tiny-0.1.0']
    error.message.should.include? "did find: [tiny-0.1.0]"
  end
end


require 'spec_helper'
require 'rubygems'
require 'fileutils'
require 'rubygems/installer'
require 'rubygems/uninstaller'

describe 'Gem::Uninstaller' do
  before :each do
    @dir = tmp('gem_uninstaller')
    @src = File.join @dir, 'src'
    FileUtils.mkdir_p File.join(@src, 'lib')
    FileUtils.mkdir_p File.join(@src, 'bin')
    File.write File.join(@src, 'lib/tiny.rb'), "module Tiny\nend\n"
    File.write File.join(@src, 'bin/tiny'), "#!/usr/bin/env ruby\n"

    path = File.join @src, Dir.chdir(@src) { Gem::Package.build tiny_spec }
    Gem::Installer.at(path, install_dir: @dir, wrappers: true).install
  end

  after :each do
    rm_r @dir
  end

  def tiny_spec
    Gem::Specification.new do |spec|
      spec.name          = 'tiny'
      spec.version       = '0.1.0'
      spec.summary       = 'A tiny gem.'
      spec.description   = 'A tiny gem for the specs.'
      spec.authors       = ['Opal']
      spec.email         = 'opal@example.com'
      spec.files         = ['lib/tiny.rb', 'bin/tiny']
      spec.executables   = ['tiny']
      spec.require_paths = ['lib']
      spec.homepage      = 'https://example.com/tiny'
      spec.license       = 'MIT'
    end
  end

  def uninstall(options = {})
    Gem::Uninstaller.new('tiny', {install_dir: @dir, executables: true, force: true}.merge(options)).uninstall
  end

  it 'removes the gem directory, the gemspec and the cached gem' do
    uninstall

    File.exist?(File.join(@dir, 'gems/tiny-0.1.0')).should == false
    File.exist?(File.join(@dir, 'specifications/tiny-0.1.0.gemspec')).should == false
    File.exist?(File.join(@dir, 'cache/tiny-0.1.0.gem')).should == false
  end

  it 'removes the wrapper it installed' do
    uninstall

    File.exist?(File.join(@dir, 'bin/tiny')).should == false
  end

  it 'leaves the wrapper alone when asked to' do
    uninstall executables: false

    File.exist?(File.join(@dir, 'bin/tiny')).should == true
  end

  it 'says the gem is not installed when it is not' do
    uninstall

    -> { uninstall }.should raise_error(Gem::InstallError)
  end

  it 'scans the install directory it was given, not the default one' do
    uninstall

    Gem::SpecificationRecord.from_path(@dir).stubs.map(&:full_name).should == []
  end
end

require 'spec_helper'
require 'rubygems'
require 'fileutils'

describe 'Gem::Specification' do
  before :each do
    @dir = tmp('gem_specification')
    FileUtils.mkdir_p File.join(@dir, 'lib')
    File.write File.join(@dir, 'lib', 'tiny.rb'), "module Tiny\nend\n"
  end

  after :each do
    rm_r @dir
  end

  def tiny_spec
    Gem::Specification.new do |spec|
      spec.name        = 'tiny'
      spec.version     = '0.1.0'
      spec.summary     = 'A tiny gem.'
      spec.description = 'A tiny gem for the specs.'
      spec.authors     = ['Opal']
      spec.email       = 'opal@example.com'
      spec.files       = ['lib/tiny.rb']
      spec.require_paths = ['lib']
      spec.homepage    = 'https://example.com/tiny'
      spec.license     = 'MIT'
      spec.add_dependency 'rake', '>= 13'
      spec.add_development_dependency 'minitest', '~> 5.0'
      spec.metadata    = { 'foo' => 'bar' }
    end
  end

  it 'starts from the upstream defaults' do
    spec = Gem::Specification.new('tiny', '0.1.0')

    spec.platform.to_s.should   == 'ruby'
    spec.require_paths.should   == ['lib']
    spec.bindir.should          == 'bin'
    spec.specification_version.should == Gem::Specification::CURRENT_SPECIFICATION_VERSION
    spec.rubygems_version.should == Gem::VERSION
    spec.dependencies.should    == []
    spec.licenses.should        == []
    spec.version.to_s.should    == '0.1.0'
    spec.date.class.should      == Time
  end

  it 'describes itself with the name, the version and the platform' do
    tiny_spec.full_name.should == 'tiny-0.1.0'
    Gem::Specification.new('tiny', '0.1.0').full_name.should == 'tiny-0.1.0'

    platformed             = Gem::Specification.new('tiny', '0.1.0')
    platformed.platform    = Gem::Platform.new('java')
    platformed.full_name.should == 'tiny-0.1.0-java'
  end

  it 'keeps the runtime and the development dependencies apart' do
    spec = tiny_spec

    spec.dependencies.map(&:name).should == %w[rake minitest]
    spec.runtime_dependencies.map(&:name).should == ['rake']
    spec.development_dependencies.map(&:name).should == ['minitest']
    spec.dependencies.first.requirement.to_s.should == '>= 13'
  end

  it 'writes Ruby code that builds the same specification' do
    spec = tiny_spec
    Dir.chdir @dir do
      File.write 'tiny.gemspec', spec.to_ruby
      loaded = Gem::Specification.load 'tiny.gemspec'

      loaded.full_name.should  == 'tiny-0.1.0'
      loaded.files.should      == ['lib/tiny.rb']
      loaded.licenses.should   == ['MIT']
      loaded.metadata.should   == { 'foo' => 'bar' }
      loaded.dependencies.map { |dep| [dep.name, dep.requirement.to_s] }.should ==
        [['rake', '>= 13'], ['minitest', '~> 5.0']]
    end
  end

  it 'answers the same specification through its YAML' do
    spec = tiny_spec
    loaded = Gem::SafeYAML.safe_load spec.to_yaml

    loaded.full_name.should == 'tiny-0.1.0'
    loaded.licenses.should  == ['MIT']
    loaded.require_paths.should == ['lib']
    loaded.dependencies.map(&:name).should == %w[rake minitest]
    loaded.required_ruby_version.satisfied_by?(Gem::Version.new('3.2')).should == true
  end

  it 'compares and hashes by the name, the version, the platform and the address' do
    spec = tiny_spec
    other = tiny_spec

    (spec == other).should == true
    spec.hash.should       == other.hash
    [spec, other].uniq.size.should == 1

    other.version = '0.2.0'
    (spec == other).should == false
  end

  it 'refuses to build a gem that is missing a file it lists' do
    spec = tiny_spec
    spec.files = ['lib/tiny.rb', 'lib/absent.rb']

    error = nil
    Dir.chdir @dir do
      begin
        Gem::Package.build spec
      rescue Gem::InvalidSpecificationException => e
        error = e
      end
    end

    error.should_not == nil
    error.message.should.include? 'absent.rb'
  end

  it 'is valid when the files it lists are where it says they are' do
    spec = tiny_spec

    Dir.chdir @dir do
      spec.validate

      spec.licenses.should == ['MIT']
      spec.summary.should  == 'A tiny gem.'
    end
  end
end

require 'spec_helper'
require 'rubygems'

describe 'Gem::SafeYAML' do
  it "reads the version, the requirement and the dependency objects a gemspec writes" do
    dependency = Gem::SafeYAML.safe_load <<~YAML
      --- !ruby/object:Gem::Dependency
      name: json
      requirement: !ruby/object:Gem::Requirement
        requirements:
        - - ">="
          - !ruby/object:Gem::Version
            version: '0'
      type: :runtime
      prerelease: false
    YAML

    dependency.name.should == "json"
    dependency.type.should == "runtime"
    dependency.requirement.satisfied_by?(Gem::Version.new("2.7.2")).should == true
  end

  it "reads the plain YAML a gem's metadata.gz is made of" do
    metadata = Gem::SafeYAML.safe_load <<~YAML
      --- !ruby/object:Gem::Version
      version: 13.3.1
    YAML

    metadata.to_s.should == "13.3.1"
  end

  it "refuses a class the gemspec has no business naming" do
    -> { Gem::SafeYAML.safe_load("--- !ruby/object:Object {}\n") }.should
      raise_error(Psych::DisallowedClass)
  end

  it "refuses a YAML it cannot read" do
    -> { Gem::SafeYAML.safe_load("--- !ruby/object:Gem::Version\n  version: [\n") }.should
      raise_error(Psych::SyntaxError)
  end

  it "reads a mapping and a sequence" do
    loaded = Gem::SafeYAML.safe_load("name: rake\nsources:\n- https://rubygems.org/\n")
    loaded["name"].should == "rake"
    loaded["sources"].should == ["https://rubygems.org/"]
  end
end

describe 'Gem::YAMLSerializer' do
  it "reads the keys and values of a .gemrc, keeping the leading colon of an option key" do
    loaded = Gem::YAMLSerializer.load(":update_sources: false\n:verbose: true\n")
    loaded[":update_sources"].should == false
    loaded[":verbose"].should == true
  end

  it "turns those strings into the options RubyGems takes" do
    loaded = Gem::YAMLSerializer.load(":update_sources: false\nbulk_threshold: 3\n")
    Gem::ConfigFile.deep_transform_config_keys(loaded).should ==
      { "update_sources" => false, "bulk_threshold" => 3 }
  end
end

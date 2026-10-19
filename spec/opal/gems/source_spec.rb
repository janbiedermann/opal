require 'spec_helper'
require 'rubygems'
require 'fileutils'
require 'rubygems/source'
require 'rubygems/source_list'

describe 'Gem::Source' do
  it 'names itself by the URI it fetches from' do
    source = Gem::Source.new 'https://rubygems.org/'

    source.uri.host.should == 'rubygems.org'
    source.uri.scheme.should == 'https'
    (source == Gem::Source.new('https://rubygems.org/')).should == true
    (source == Gem::Source.new('https://example.com/')).should == false
  end

  it 'escapes a source URI that would not parse as it stands' do
    source = Gem::Source.new 'https://example.com/a space/'

    source.uri.path.should == '/a%20space/'
  end

  it 'orders a remote source against the ones that need no fetching' do
    remote = Gem::Source.new 'https://rubygems.org/'

    (remote <=> Gem::Source::Installed.new).should == -1
    (Gem::Source::Installed.new <=> remote).should == 1
    (remote <=> Gem::Source::Local.new).should == -1
    (Gem::Source::Local.new <=> Gem::Source::Installed.new).should == -1

    # two remote sources that differ keep the order they were given in
    (Gem::Source.new('https://a.example/') <=> Gem::Source.new('https://b.example/')).should == 1
  end

  it 'says what it cannot do before the fetcher arrives' do
    -> { Gem::Source.new('https://rubygems.org/').load_specs(:released) }
      .should raise_error(Gem::Exception)
  end

  it 'finds the gem of a specific file, and its spec' do
    dir = tmp 'gem_source_specific_file'
    FileUtils.mkdir_p File.join(dir, 'lib')
    File.write File.join(dir, 'lib/tiny.rb'), "module Tiny\nend\n"
    spec = Gem::Specification.new('tiny', '0.1.0')
    spec.summary = 'A tiny gem.'
    spec.authors = ['Opal']
    spec.files = ['lib/tiny.rb']
    path = File.join dir, Dir.chdir(dir) { Gem::Package.build spec }

    source = Gem::Source::SpecificFile.new path
    source.spec.full_name.should == 'tiny-0.1.0'
    source.load_specs(:released).map(&:full_name).should == ['tiny-0.1.0']
    source.fetch_spec(source.spec.name_tuple).full_name.should == 'tiny-0.1.0'
    source.download(source.spec, nil).should == File.expand_path(path)

    rm_r dir
  end

  it 'lists the gems of the directory it is run in' do
    dir = tmp 'gem_source_local'
    FileUtils.mkdir_p File.join(dir, 'lib')
    File.write File.join(dir, 'lib/tiny.rb'), "module Tiny\nend\n"
    spec = Gem::Specification.new('tiny', '0.1.0')
    spec.summary = 'A tiny gem.'
    spec.authors = ['Opal']
    spec.files = ['lib/tiny.rb']
    Dir.chdir(dir) { Gem::Package.build spec }

    Dir.chdir(dir) do
      source = Gem::Source::Local.new
      source.load_specs(:released).map(&:full_name).should == ['tiny-0.1.0']
      source.find_gem('tiny').full_name.should == 'tiny-0.1.0'
      source.download(spec, nil).should == File.expand_path(File.join(dir, 'tiny-0.1.0.gem'))
    end

    rm_r dir
  end
end

describe 'Gem::SourceList' do
  it 'is built from an array of URIs' do
    list = Gem::SourceList.from %w[https://a.example/ https://b.example/]

    list.to_a.should == %w[https://a.example/ https://b.example/]
    # include? answers the source it found, as upstream's does, and nil when
    # there is none
    list.include?('https://b.example/').nil?.should == false
    list.include?('https://c.example/').nil?.should == true
    list.empty?.should == false
  end

  it 'answers true when compared to the array of its URIs' do
    list = Gem::SourceList.from %w[https://a.example/ https://b.example/]

    (list == list.to_a).should == true
  end

  it 'keeps a source only once, and prepends on request' do
    list = Gem::SourceList.new
    list << 'https://a.example/'
    list << 'https://a.example/'
    list.to_a.should == ['https://a.example/']

    list.append 'https://b.example/'
    list.prepend 'https://b.example/'
    list.to_a.should == %w[https://b.example/ https://a.example/]

    list.delete 'https://b.example/'
    list.to_a.should == ['https://a.example/']
  end

  it 'holds the sources that are not remote' do
    list = Gem::SourceList.new
    list << Gem::Source::Installed.new
    list.sources.size.should == 1
    list.first.class.should == Gem::Source::Installed
  end
end

describe 'Gem::Uri' do
  it 'parses a source URI' do
    Gem::Uri.parse!('https://rubygems.org/').host.should == 'rubygems.org'
    Gem::Uri.parse('https://example.com:badport/').class.should == String
  end

  it 'hides the credentials of a source URI' do
    uri = Gem::Uri.new 'https://user:secret@example.com/path'

    uri.redacted.to_s.should == 'https://user:REDACTED@example.com/path'
    Gem::Uri.redact('https://user:secret@example.com/path').to_s
      .should == 'https://user:REDACTED@example.com/path'
    uri.redact_credentials_from('failed: https://user:secret@example.com/path')
      .should == 'failed: https://user:REDACTED@example.com/path'
  end
end

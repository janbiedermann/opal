require 'spec_helper'
require 'rubygems'
require 'fileutils'
require 'stringio'

describe 'Gem::Package' do
  before :each do
    @dir = tmp('gem_package')
    FileUtils.mkdir_p File.join(@dir, 'lib')
    File.write File.join(@dir, 'lib', 'tiny.rb'), "module Tiny\n  def self.hi\n    'hi'\n  end\nend\n"
  end

  after :each do
    rm_r @dir
  end

  def tiny_spec
    Gem::Specification.new do |spec|
      spec.name        = 'tiny'
      spec.version     = '0.1.0'
      spec.summary     = 'A tiny gem.'
      spec.authors     = ['Opal']
      spec.files       = ['lib/tiny.rb']
      spec.require_paths = ['lib']
      spec.homepage    = 'https://example.com/tiny'
      spec.license     = 'MIT'
    end
  end

  it 'writes a gem and reads the members back with their sizes' do
    Dir.chdir @dir do
      built = Gem::Package.build tiny_spec

      members = []
      File.open(built, 'rb') do |io|
        Gem::Package::TarReader.new(io) do |tar|
          tar.each { |entry| members << [entry.full_name, entry.header.size] }
        end
      end

      members.map(&:first).should == %w[metadata.gz data.tar.gz checksums.yaml.gz]
      members.map(&:last).each { |size| size.should > 0 }
    end
  end

  it 'reads the specification, the contents and the checksums of the gem it wrote' do
    Dir.chdir @dir do
      built     = Gem::Package.build tiny_spec
      package   = Gem::Package.new built

      package.spec.full_name.should == 'tiny-0.1.0'
      package.spec.licenses.should  == ['MIT']
      package.contents.should       == ['lib/tiny.rb']
      package.checksums.keys.sort.should == %w[SHA256 SHA512]
      package.checksums['SHA256']['metadata.gz'].length.should == 64
      package.verify.should == true
    end
  end

  it 'extracts the payload of the gem it wrote' do
    Dir.chdir @dir do
      built = Gem::Package.build tiny_spec
      Gem::Package.new(built).extract_files 'out'

      File.read('out/lib/tiny.rb').should == File.read('lib/tiny.rb')
    end
  end

  it 'refuses a gem whose payload no longer matches its checksum' do
    Dir.chdir @dir do
      built = Gem::Package.build tiny_spec

      # The name of the second member sits in its tar header: the bytes of
      # the member follow that 512 byte block, so flipping one of them keeps
      # the tar readable but breaks the recorded digest.
      bytes = File.binread(built)
      pos = bytes.index('data.tar.gz') + 512 + 8
      tampered = bytes[0...pos] + "\x01" + bytes[(pos + 1)..-1]
      File.binwrite 'tampered.gem', tampered

      error = nil
      begin
        Gem::Package.new('tampered.gem').verify
      rescue Gem::Package::FormatError => e
        error = e
      end

      error.should_not == nil
      error.message.should.include? 'checksum mismatch'
    end
  end

  it 'reads a gem that CRuby built' do
    fixture = File.expand_path('fixtures/cruby-tiny-0.1.0.gem', __dir__)
    package = Gem::Package.new fixture

    package.verify.should == true
    package.spec.full_name.should == 'tiny-0.1.0'
    package.spec.rubygems_version.to_s.should_not == Gem::VERSION
    package.contents.should == ['lib/tiny.rb']

    Dir.chdir @dir do
      package.extract_files 'out'
      File.read('out/lib/tiny.rb').should.include? 'Tiny'
    end
  end

  it 'round-trips a tar member through the writer and the reader' do
    io  = StringIO.new
    tar = Gem::Package::TarWriter.new io
    tar.add_file_simple('lib/tiny.rb', 0o644, 4) { |file| file.write 'body' }
    tar.mkdir 'lib/', 0o755
    tar.close

    # The entry closes when the reader moves on, so everything the spec
    # checks is taken while the entry is open.
    entries = []
    Gem::Package::TarReader.new(StringIO.new io.string) do |reader|
      reader.each do |entry|
        entries << [entry.full_name, entry.read, entry.header.size, entry.header.mode, entry.directory?]
      end
    end

    entries.map(&:first).should == ['lib/tiny.rb', 'lib/']
    entries.first[1].should == 'body'
    entries.first[2].should == 4
    entries.first[3].should == 0o644
    entries.last[4].should == true
  end

  it 'keeps the header fields of a tar entry' do
    io  = StringIO.new
    tar = Gem::Package::TarWriter.new io
    tar.add_file_simple('lib/tiny.rb', 0o644, 11) { |file| file.write 'a tiny body' }
    tar.close

    header = Gem::Package::TarHeader.from StringIO.new io.string[0, 512]

    header.name.should     == 'lib/tiny.rb'
    header.mode.should     == 0o644
    header.size.should     == 11
    header.typeflag.should == '0'
    header.magic.should    == 'ustar'
  end
end

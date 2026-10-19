require 'spec_helper'
require 'rubygems'

# Gem::SafeMarshal, the reader RubyGems parses marshalled specs and marshalled
# indexes with (GEMS.md M5). The files under fixtures/safe_marshal/ are streams
# dumped by CRuby's Marshal, kept as data rather than generated here: Opal's
# Marshal writes the same simple types but its own object form for the rest,
# and what has to be readable is what a gem server writes. Regenerate them with
# the CRuby script that wrote them: dump the index triples ["tiny",
# Gem::Version.new("0.1.0"), Gem::Platform.new("ruby")] etc, a Hash of permitted
# symbols, ["café", "日本語", "plain"], a Gem::Specification with a Time as its
# date, {shady: 1}, Object.new, and a String carrying an @shady ivar.

def safe_marshal_fixture(name)
  File.binread File.expand_path("fixtures/safe_marshal/#{name}.marshal", __dir__)
end

describe 'Gem::SafeMarshal' do
  it 'reads the name, version and platform triples a marshalled index holds' do
    triples = Gem::SafeMarshal.safe_load(safe_marshal_fixture('index'))

    triples.size.should == 3

    name, version, platform = triples.first
    name.should == 'tiny'
    version.class.should == Gem::Version
    version.to_s.should == '0.1.0'
    # RubyGems keeps the plain ruby platform as the String "ruby", so that is
    # what the index holds and what comes back; only the named platforms are
    # Gem::Platform objects
    platform.to_s.should == 'ruby'

    triples.map {|name, version, _| [name, version.to_s] }.should ==
      [['tiny', '0.1.0'], ['tiny', '0.2.0'], ['helper', '1.0.0']]
    triples.last.last.class.should == Gem::Platform
    triples.last.last.to_s.should == 'x86_64-linux'
  end

  it 'reads the symbols the gem formats use as keys' do
    Gem::SafeMarshal.safe_load(safe_marshal_fixture('values')).should ==
      { :runtime => 'tiny', :name => 'tiny', :development => 'x', :number => 42 }
  end

  it 'decodes the UTF-8 bytes a stream string carries' do
    strings = Gem::SafeMarshal.safe_load(safe_marshal_fixture('utf8'))

    # the stream holds bytes; an Opal String holds characters, so the visitor
    # has to decode the ones tagged UTF-8 (see its #decode_utf8)
    strings.map {|s| [s, s.length, s.bytesize] }.should ==
      [['café', 4, 5], ['日本語', 3, 9], ['plain', 5, 5]]
    strings.map {|s| s.encoding.to_s }.uniq.should == ['UTF-8']
  end

  it 'refuses a stream that is not marshal 4.8' do
    -> { Gem::SafeMarshal.safe_load('nope') }
      .should raise_error(Gem::SafeMarshal::Reader::UnsupportedVersionError)
  end

  it 'refuses a class safe_load does not permit' do
    -> { Gem::SafeMarshal.safe_load(safe_marshal_fixture('bad_class')) }
      .should raise_error(Gem::SafeMarshal::Visitors::ToRuby::UnpermittedClassError)
  end

  it 'refuses a symbol safe_load does not permit' do
    -> { Gem::SafeMarshal.safe_load(safe_marshal_fixture('bad_symbol')) }
      .should raise_error(Gem::SafeMarshal::Visitors::ToRuby::UnpermittedSymbolError)
  end

  it 'refuses an instance variable safe_load does not permit' do
    -> { Gem::SafeMarshal.safe_load(safe_marshal_fixture('bad_ivar')) }
      .should raise_error(Gem::SafeMarshal::Visitors::ToRuby::UnpermittedIvarError)
  end

  it 'refuses a Time, which is what a marshalled spec carries as its date' do
    error = nil
    begin
      Gem::SafeMarshal.safe_load(safe_marshal_fixture('spec'))
    rescue Gem::SafeMarshal::Visitors::ToRuby::UnsupportedError => e
      error = e
    end

    error.should_not == nil
    # RubyGems normalizes Specification#date to a Time, so this is the shape
    # every marshalled full spec has: the port names the missing Marshal
    # support rather than answering the wrong date Opal's Marshal reads
    error.message.should.include? 'no Time support'
    error.message.should.include? 'Time in a marshal stream'
  end
end

describe 'Gem::SafeMarshal wiring' do
  it 'is loaded with rubygems, as the eager requires load everything' do
    Gem.const_defined?(:SafeMarshal).should == true
    Gem.load_safe_marshal.should == true
  end

  it 'is what Specification._load reads through' do
    error = nil
    begin
      Gem::Specification._load(safe_marshal_fixture('spec'))
    rescue Gem::SafeMarshal::Visitors::ToRuby::UnsupportedError => e
      error = e
    end

    error.should_not == nil
    error.message.should.include? 'Time in a marshal stream'
  end
end

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
# date, {shady: 1}, Object.new, and a String carrying an @shady ivar; and the
# three time_* files, which are Time.at(1577934245).localtime,
# Time.utc(2020,1,2,3,4,5.75) and Time.at(1577934245 + Rational(1,4)).

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

  it 'reads the date of a marshalled full specification' do
    spec = Gem::SafeMarshal.safe_load(safe_marshal_fixture('spec'))

    spec.class.should == Gem::Specification
    spec.name.should == 'tiny'
    # RubyGems normalizes Specification#date to a Time, so this is the shape
    # every marshalled full spec has, and the instant is the one the dumping
    # process wrote
    spec.date.class.should == Time
    spec.date.to_i.should == 1_792_368_000
    spec.date.utc?.should == true
  end

  it 'reads a Time the writing process kept in its own zone' do
    time = Gem::SafeMarshal.safe_load(safe_marshal_fixture('time_local'))

    # the body names the instant in UTC whatever the zone it was displayed in,
    # and this Time has no zone of its own to display it in
    time.class.should == Time
    time.to_i.should == 1_577_934_245
  end

  it 'reads the microseconds a Time carries' do
    time = Gem::SafeMarshal.safe_load(safe_marshal_fixture('time_subsec'))

    time.to_f.should == 1_577_934_245.75
    time.usec.should == 750_000
  end

  it 'reads the exact fraction of a Rational Time, as far as a JavaScript Date keeps it' do
    time = Gem::SafeMarshal.safe_load(safe_marshal_fixture('time_rational'))

    # the writing process kept a third of a second as a Rational; the payload
    # holds it as microseconds
    time.to_f.should == 1_577_934_245.25
    time.usec.should == 250_000
  end

  it 'reads the time_t and microseconds Ruby 1.9 and older wrote' do
    # written by hand rather than dumped: no Ruby still writes this shape, whose
    # two words carry no marker bit and hold the seconds and microseconds plainly
    stream = "\x04\x08u:\x09Time\x0D\xE8\x03\x00\x00\x20\xA1\x07\x00".b

    time = Gem::SafeMarshal.safe_load(stream)
    time.to_f.should == 1_000.5
  end

  it 'refuses the extended-year form no gem timestamp needs' do
    # eight words' worth of fields plus the tail a year outside 1900..2099 needs
    stream = "\x04\x08u:\x09Time\x11\x43\x00\x1E\xC0\x00\x00\x50\x10\x02\x00\x00\x00".b

    -> { Gem::SafeMarshal.safe_load(stream) }
      .should raise_error(Gem::SafeMarshal::Visitors::ToRuby::TimeTooLargeError, /extended year/)
  end
end

describe 'Gem::SafeMarshal wiring' do
  it 'is loaded with rubygems, as the eager requires load everything' do
    Gem.const_defined?(:SafeMarshal).should == true
    Gem.load_safe_marshal.should == true
  end

  it 'is what a quick-index spec dump reads through' do
    # the body of the .gemspec.rz a marshal index answers for one gem: written
    # by CRuby, whose user-defined spec dump carries a created_at Time
    packed = File.binread File.expand_path('fixtures/helper-1.0.0.gemspec.rz', __dir__)
    spec = Gem::SafeMarshal.safe_load Gem::Util.inflate packed

    spec.class.should == Gem::Specification
    spec.name.should == 'helper'
    spec.version.to_s.should == '1.0.0'
    spec.date.to_i.should == 1_792_368_000
  end
end

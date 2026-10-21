require 'spec_helper'
require 'rubygems'
require 'rubygems/util'
require 'zlib'

# The two gzip helpers RubyGems reads the marshalled indexes through, and the
# inflate it reads the members of a .gem with.

describe 'Gem::Util' do
  it 'round trips bytes through gzip' do
    index = "the index\n" * 20

    packed = Gem::Util.gzip index
    # the gzip magic: what a server answers for a specs.4.8.gz is a gzip file,
    # and the writer has to write one rather than fail over its compression level
    packed.bytes.first(2).should == [0x1f, 0x8b]

    read_back = Gem::Util.gunzip packed
    read_back.should == index
    read_back.encoding.name.should == 'ASCII-8BIT'
  end

  it 'inflates the compressed form a gem file holds' do
    Gem::Util.inflate(Zlib::Deflate.deflate('a body')).should == 'a body'
  end
end

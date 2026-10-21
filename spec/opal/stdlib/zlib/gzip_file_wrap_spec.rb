require 'spec_helper'
require 'zlib'
require 'stringio'

# Zlib::GzipFile.wrap the way RubyGems reads and writes gzip through it: the
# block gets the stream, .wrap closes it afterwards and answers what the block
# answered. The writer takes its compression level as an optional positional, so
# the keyword forwarding of .wrap has to keep an empty keyword set away from it.

describe 'Zlib::GzipFile.wrap' do
  def binary_buffer
    buffer = StringIO.new String.new, 'w'
    buffer.set_encoding Encoding::BINARY
    buffer
  end

  it 'writes a gzip stream and answers what the block answered' do
    buffer = binary_buffer

    answer = Zlib::GzipWriter.wrap(buffer) {|io| io.write 'the gzip body'; :answered }
    answer.should == :answered

    written = buffer.string
    written.bytes.first(2).should == [0x1f, 0x8b]
    Zlib::GzipReader.wrap(StringIO.new(written)) {|io| io.read }.should == 'the gzip body'
  end

  it 'closes the stream it built when the block raises' do
    writer = nil
    -> { Zlib::GzipWriter.wrap(binary_buffer) {|io| writer = io; raise 'inside the block' } }
      .should raise_error(RuntimeError, 'inside the block')

    writer.closed?.should == true
  end

  it 'hands a reader the keyword arguments it takes' do
    buffer = binary_buffer
    Zlib::GzipWriter.wrap(buffer) {|io| io.write 'café' }

    text = Zlib::GzipReader.wrap(StringIO.new(buffer.string), external_encoding: Encoding::UTF_8) do |io|
      io.read
    end
    text.should == 'café'
    text.encoding.name.should == 'UTF-8'
  end

  it 'keeps the compression level a caller passes as a positional' do
    Zlib::GzipWriter.wrap(binary_buffer, 9) {|io| io.level }.should == 9
  end
end

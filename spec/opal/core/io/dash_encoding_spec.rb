require 'spec_helper'

describe 'IO encoding options written with a dash' do
  before :each do
    @name = tmp('io_dash_encoding')
    File.binwrite @name, "abc\n"
  end

  after :each do
    rm_r @name
  end

  it "ignores the dash a 'r:UTF-8:-' mode puts in the internal slot" do
    File.open(@name, 'r:UTF-8:-') do |io|
      io.external_encoding.should == Encoding::UTF_8
      io.internal_encoding.should == nil
      io.read.should == "abc\n"
    end
  end

  it 'ignores a dash asked for as the external encoding, warning about it' do
    File.open(@name, 'r:-') do |io|
      io.external_encoding.should == Encoding::UTF_8
      io.internal_encoding.should == nil
      io.read.should == "abc\n"
    end
  end

  it 'treats the dash of #set_encoding as no transcoding' do
    File.open(@name) do |io|
      io.set_encoding 'UTF-8', '-'
      io.external_encoding.should == Encoding::UTF_8
      io.internal_encoding.should == nil
    end
  end

  it 'keeps a real internal encoding' do
    File.open(@name, 'r:UTF-8:UTF-8') do |io|
      io.external_encoding.should == Encoding::UTF_8
      io.internal_encoding.should == nil
    end
  end
end

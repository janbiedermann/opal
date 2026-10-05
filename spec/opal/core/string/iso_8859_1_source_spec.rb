# encoding: iso-8859-1
describe "A source in ISO-8859-1" do
  it "has ISO-8859-1 string literals with the source's bytes" do
    s = "café"
    s.encoding.should == Encoding::ISO_8859_1
    s.bytes.should == [99, 97, 102, 233]
    s.length.should == 4
    s.encode("UTF-8").bytes.should == [99, 97, 102, 195, 169]
    s.encode("UTF-8").encoding.should == Encoding::UTF_8
    "€".bytes.should == [128]
  end

  it "keeps the encoding with escapes, interpolation and heredocs" do
    "a\xe9b".bytes.should == [97, 233, 98]
    x = 1
    "x#{x}é".encoding.should == Encoding::ISO_8859_1
    "x#{x}é".bytes.should == [120, 49, 233]
    h = <<~EOS
      café
    EOS
    h.bytes.should == [99, 97, 102, 233, 10]
  end

  it "has UTF-8 strings with \\u escapes" do
    "x\u00e9".encoding.should == Encoding::UTF_8
  end

  it "has __ENCODING__ ISO-8859-1" do
    __ENCODING__.should == Encoding::ISO_8859_1
  end
end

# encoding: shift_jis
# A source in Shift_JIS: string literals are Shift_JIS strings (the source
# requires the encoding), as in CRuby.
describe "A source in Shift_JIS" do
  it "has Shift_JIS string literals" do
    s = "日本語"
    s.encoding.should == Encoding::Shift_JIS
    s.bytes.should == [147, 250, 150, 123, 140, 234]
    s.length.should == 3
    s.valid_encoding?.should == true
    s.encode("UTF-8").should == "\u65E5\u672C\u8A9E"
    "abc".encoding.should == Encoding::Shift_JIS
  end

  it "decodes byte escapes in the source encoding" do
    "\x93\xfa".should == "日"
    "\x93z".bytes.should == [147, 122]
  end

  it "keeps the encoding with interpolation and heredocs" do
    x = 1
    "値#{x}です".encoding.should == Encoding::Shift_JIS
    "値#{x}です".bytes.should == [146, 108, 49, 130, 197, 130, 183]
    h = <<~E
      日本
    E
    h.bytes.should == [147, 250, 150, 123, 10]
  end

  it "has UTF-8 strings with \\u escapes" do
    "\u00e9".encoding.should == Encoding::UTF_8
  end

  it "has __ENCODING__ Shift_JIS" do
    __ENCODING__.should == Encoding::Shift_JIS
  end
end

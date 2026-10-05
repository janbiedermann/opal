# encoding: euc-jp
# A source in EUC-JP: string literals are EUC-JP strings, as in CRuby.
describe "A source in EUC-JP" do
  it "has EUC-JP string literals with CRuby's bytes" do
    s = "日本"
    s.encoding.should == Encoding::EUC_JP
    s.bytes.should == [198, 252, 203, 220]
    s.encode("UTF-8").should == "\u65E5\u672C"
    "ｶﾀｶﾅ".bytes.should == [142, 182, 142, 192, 142, 182, 142, 197]
    __ENCODING__.should == Encoding::EUC_JP
  end
end

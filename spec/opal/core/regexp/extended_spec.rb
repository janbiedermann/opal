describe "An extended (x) Regexp" do
  it "ignores whitespace and comments" do
    (/a b/x =~ "ab").should == 0
    (/a b # c
     d/x =~ "abd").should == 0
    (/(?<n> \d+ )  /x.match("12")[:n]).should == "12"
    "a b c".gsub(/ b \s/x, "-").should == "a -c"
  end

  it "keeps whitespace in character classes and escapes" do
    (/[a b]+/x =~ " ").should == 0
    (/a\ b/x =~ "a b").should == 0
    (/a\#b/x =~ "a#b").should == 0
    (/a [#] b/x =~ "a#b").should == 0
  end

  it "applies to interpolated parts" do
    x = "b c"
    (/a #{x}/x =~ "abc").should == 0
  end

  it "is created by Regexp.new with EXTENDED or 'x'" do
    (Regexp.new("a b # c\nd", Regexp::EXTENDED) =~ "abd").should == 0
    (Regexp.new("a b", "x") =~ "ab").should == 0
    (Regexp.new("a b", Regexp::EXTENDED | Regexp::IGNORECASE) =~ "AB").should == 0
  end

  it "keeps its source and options" do
    /a b/x.source.should == "a b"
    /a b/x.options.should == Regexp::EXTENDED
    /a b/x.should == Regexp.new("a b", Regexp::EXTENDED)
  end
end

require 'spec_helper'

describe 'A multi-line extended (/x) regular expression' do
  it "ignores the whitespace and newlines of the pattern" do
    pattern = /\A
      (\d{4})-(\d{2})-(\d{2})   # the date
      \Z/x
    (pattern =~ "2000-01-01").should == 0
    Regexp.last_match(1).should == "2000"
  end

  it "keeps the source it was written with, as Regexp#source shows it" do
    pattern = /\A
      x
      \Z/x
    pattern.source.should == "\\A\n      x\n      \\Z"
  end

  it "keeps the whitespace an escape stands for" do
    (/a\ b/x =~ "a b").should == 0
    (/a\nb/x =~ "a\nb").should == 0
    (/a\nb/x =~ "ab").should == nil
  end

  it "ignores a comment to the end of the line" do
    (/a # a comment
       b/x =~ "ab").should == 0
  end
end

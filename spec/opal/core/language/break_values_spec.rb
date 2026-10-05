describe "break, next and return with several values" do
  it "break returns them as an array" do
    [1].each { break 1, 2 }.should == [1, 2]
    (while true; break 3, 4; end).should == [3, 4]
    loop { break 5, 6 }.should == [5, 6]
  end

  it "break with a splat returns an array" do
    [1].each { break *[7, 8] }.should == [7, 8]
    [1].each { break *[9] }.should == [9]
  end

  it "break with one value or none returns it or nil" do
    [1].each { break 10 }.should == 10
    [1].each { break }.should == nil
  end

  it "next and return do the same" do
    [1].map { next 1, 2 }.should == [[1, 2]]
    [1].map { next *[3] }.should == [[3]]
    def self.return_splat; return *[4, 5]; end
    def self.return_mixed; return 7, *[8]; end
    return_splat.should == [4, 5]
    return_mixed.should == [7, 8]
  end
end

describe "Array#min" do
  it "returns the n smallest elements" do
    [3, 1, 2].min(2).should == [1, 2]
  end

  it "returns all elements when n is larger than the array size" do
    [3, 1, 2].min(5).should == [1, 2, 3]
  end

  it "returns an empty array when n is zero" do
    [3, 1, 2].min(0).should == []
  end

  it "returns the minimum element when n is nil" do
    [3, 1, 2].min(nil).should == 1
  end

  it "raises an ArgumentError for a negative n" do
    -> { [3, 1, 2].min(-1) }.should raise_error(ArgumentError)
  end
end

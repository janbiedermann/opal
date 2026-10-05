require 'opal-parser'

describe "Kernel#eval with local variables of the caller" do
  it "assigns them" do
    x = 1
    eval("x = 2")
    x.should == 2
    z = 0
    eval("z += 1")
    z.should == 1
  end

  it "assigns them from blocks and methods" do
    o = 1
    [1].each { eval("o = 7") }
    o.should == 7
    eval("[1, 2].each { |i| o += i }")
    o.should == 10
  end

  it "keeps new locals local to the eval" do
    eval("y = 5; y * 2").should == 10
    defined?(y).should == nil
  end

  it "lists them in local_variables" do
    k = 1
    eval("local_variables").should include(:k)
  end

  it "uses and assigns the locals of a binding" do
    x = 5
    b = binding
    b.eval("x + 1").should == 6
    b.eval("x = 10")
    x.should == 10
    eval("x * 2", b).should == 20
  end
end

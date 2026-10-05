require 'opal-parser'

describe "instance_eval, module_eval and class_eval with a String" do
  it "see and assign the caller's local variables" do
    x = 1
    o = Object.new
    o.instance_eval("x + 1").should == 2
    o.instance_eval("x = 5")
    x.should == 5
    [1].each { |i| o.instance_eval("x += i") }
    x.should == 6
  end

  it "use the receiver as self and definee" do
    o = Object.new
    o.instance_eval("self").should equal(o)
    o.instance_eval("def hi; 1; end")
    o.hi.should == 1
    k = Class.new
    y = 2
    k.class_eval("def k; 42; end; Z = y")
    k.new.k.should == 42
    k::Z.should == 2
    k.module_eval("self").should equal(k)
  end

  it "use the given file name" do
    Object.new.instance_eval("__FILE__", "a_file").should == "a_file"
  end

  it "fall back to the methods for other arguments and dynamic calls" do
    o = Object.new
    o.send(:instance_eval, "1 + 2").should == 3
    -> { o.instance_eval(Object.new) }.should raise_error(TypeError)
    -> { o.class_eval("1") }.should raise_error(NoMethodError)
  end
end

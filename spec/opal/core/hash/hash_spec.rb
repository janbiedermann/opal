describe "Hash#hash" do
  it "never sends eql? to another object while hashing" do
    klass = Class.new do
      def eql?(other)
        raise "eql? sent to #{other.class}"
      end

      def hash
        7
      end
    end

    -> { { a: klass.new, b: { c: klass.new } }.hash }.should_not raise_error
  end

  it "hashes equal siblings by content rather than as a cycle" do
    a = { x: 1 }

    { k: a, m: a }.hash.should == { k: { x: 1 }, m: { x: 1 } }.hash
    { k: a, m: a }.hash.should_not == { k: { x: 1 }, m: { x: 2 } }.hash
  end

  it "collapses a structure containing a cycle to one value" do
    h = {}
    h[:self] = h

    h.hash.should == { a: h }.hash
    h.hash.should == [h].hash
  end

  it "collapses a cycle shared with an array" do
    rec = []
    h   = { x: rec }
    rec << h

    rec.hash.should == h.hash
    rec.hash.should == [h].hash
  end
end

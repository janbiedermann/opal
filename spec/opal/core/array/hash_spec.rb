describe "Array#hash" do
  it "never sends eql? to another object while hashing" do
    # An eql? that assumes its argument is of its own class is common
    # (PubGrub's Incompatibility#eql? reads #cause). Hashing a nested
    # structure must not call it with anything else, or it raises.
    klass = Class.new do
      def eql?(other)
        raise "eql? sent to #{other.class}"
      end

      def hash
        7
      end
    end

    -> { [[klass.new], [klass.new]].hash }.should_not raise_error
    -> { [[klass.new], 1, [klass.new, [klass.new]]].hash }.should_not raise_error
  end

  it "hashes equal siblings by content rather than as a cycle" do
    a = [1, 2]

    [a, a].hash.should == [[1, 2], [1, 2]].hash
    [[1, 2], [1, 2]].hash.should_not == [[1, 2], [3, 4]].hash
  end

  it "hashes the same object twice by content" do
    a = [1, 2]

    [a, a].hash.should == [a.dup, a.dup].hash
  end

  it "collapses a structure containing a cycle to one value" do
    rec = []
    rec << rec

    rec.hash.should == [rec].hash
    rec.hash.should == [[rec]].hash
    rec.hash.should == [[1, rec]].hash
  end

  it "collapses a cycle reached through a hash" do
    h   = {}
    rec = [h]
    h[:x] = rec

    rec.hash.should == [h].hash
    rec.hash.should == [{ x: rec }].hash
  end
end

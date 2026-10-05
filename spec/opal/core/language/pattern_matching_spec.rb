require 'spec_helper'

describe "pattern matching" do
  it "supports basic assignment" do
    5 => a
    a.should == 5
  end

  it "supports array pattern" do
    [1,2,3,4] => [1,2,*rest]
    rest.should == [3,4]
    [1,2,3,4] => [*rest,3,x]
    rest.should == [1,2]
    x.should == 4
  end

  it "supports hash pattern" do
    {a: 4} => {a:}
    a.should == 4
    {a: 4, b: 6} => {b:}
    b.should == 6
    {a: 1, b: 2, c: 3} => {a: 1, **rest}
    rest.should == {b: 2, c: 3}
  end

  it "supports pinning" do
    a = 6
    6 => ^a
    a.should == 6
  end

  it "supports a lambda literal" do
    [6, 7] => [->(a) { a == 6 }, b]
    b.should == 7
  end

  it "supports constants" do
    [6, 7, 8] => [Integer, a, Integer]
    a.should == 7
  end

  it "supports regexps" do
    "test" => /e(s)t/
    $1.should == 's'
  end

  it "supports save pattern" do
    [6, 7, 8] => [Integer=>a, Integer=>b, Integer=>c]
    [a,b,c].should == [6, 7, 8]
  end

  it "supports find pattern with save" do
    [1, 2, 3, 4, 5] => [*before, 3 => three, 4 => four, *after]
    before.should == [1,2]
    three.should == 3
    four.should == 4
    after.should == [5]
  end

  it "supports custom classes" do
    class TotallyArrayOrHashLike
      def deconstruct
        [1,2,3]
      end

      def deconstruct_keys(_)
        {a: 1, b: 2}
      end
    end

    TotallyArrayOrHashLike.new => TotallyArrayOrHashLike[*array]
    array.should == [1,2,3]

    TotallyArrayOrHashLike.new => TotallyArrayOrHashLike(**hash)
    hash.should == {a: 1, b: 2}
  end

  it "supports case expressions" do
    case 4
    in 4
      z = true
    in 5
      z = false
    end

    z.should == true
  end

  it "supports case expressions with guards" do
    case 4
    in 4 if false
      z = true
    in 4 if true
      z = false
    end

    z.should == false
  end

  it "raises if case expression is unmatched" do
    proc do
      case 4
      in 5
        :test
      end
    end.should raise_error NoMatchingPatternError
  end

  it "doesn't raise when else in a case expression is present" do
    case 4
    in 5
      z = true
    else
      z = false
    end

    z.should == false
  end

  it "doesn't raise or set variables if an in expression is unmatched" do
    4 in String => a
    a.should == nil
  end

  it "evaluates the value of `=>` once" do
    calls = 0
    value = -> { calls += 1; {a: 1, b: [2, 3]} }
    value.call => {a:}
    value.call => {b: [_, c]}
    calls.should == 2
    a.should == 1
    c.should == 3
    -> { value.call => {a: 2} }.should raise_error(NoMatchingPatternError)
    calls.should == 3
  end

  describe "NoMatchingPatternError for a single pattern" do
    def message_of
      yield
      nil
    rescue NoMatchingPatternError => e
      e.message
    end

    it "says which check failed" do
      message_of { 1 => 2 }.should == "1: 2 === 1 does not return true"
      message_of { case 1; in 2; end }.should == "1: 2 === 1 does not return true"
      message_of { [1, 2] => [a] }.should == "[1, 2]: [1, 2] length mismatch (given 2, expected 1)"
      message_of { [1] => [a, b, *] }.should == "[1]: [1] length mismatch (given 1, expected 2+)"
      message_of { [1, [2]] => [_, [String]] }.should == "[1, [2]]: String === 2 does not return true"
      message_of { nil => [*, 1, *] }.should == "nil: nil does not respond to #deconstruct"
      message_of { 5 => {a:} }.should == "5: 5 does not respond to #deconstruct_keys"
      message_of { case [1]; in [*, 2, *]; end }.should == "[1]: [1] does not match to find pattern"
      message_of { case 1; in Integer if false; end }.should == "1: guard clause does not return true"
      message_of { case 1; in 2 | 3; end }.should == "1: 3 === 1 does not return true"
      message_of { {a: 1, b: 2} => {a: 1, **nil} }.should =~ /: rest of .* is not empty\z/
    end

    it "has just the value for case/in with several branches" do
      message_of { case 1; in 2; in 3; end }.should == "1"
    end

    it "is a NoMatchingPatternKeyError for a missing key" do
      begin
        {a: 1} => {b:}
      rescue NoMatchingPatternKeyError => e
        e.message.should =~ /: key not found: /
        e.key.should == :b
        e.matchee.should == {a: 1}
        e.should be_kind_of(NoMatchingPatternError)
      end
    end
  end
end

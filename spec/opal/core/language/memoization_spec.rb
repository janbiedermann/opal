class MemoizedTarget
  def initialize(value = nil)
    @value = value
  end

  attr_reader :value

  def or_assign(other)
    @value ||= other
  end

  def and_assign(other)
    @value &&= other
  end

  def and_assign_unset(other)
    @unset &&= other
  end

  def unset_defined
    defined?(@unset)
  end

  def unset_written
    instance_variable_defined?(:@unset)
  end

  def declared_local(taken)
    if taken
      local ||= 1
    end
    defined?(local)
  end

  def or_assign_global(other)
    $memoization_global ||= other
  end
end

class MemoizedClassVariable
  def self.or_assign(other)
    @@unset ||= other
  end

  def self.and_assign_unset(other)
    @@other_unset &&= other
  end

  def self.defined_unset
    defined?(@@unset)
  end
end

class MemoizedConstant
  def self.or_assign(other)
    self::UNSET ||= other
  end

  def self.defined_unset
    defined?(self::UNSET)
  end
end

describe "memoization" do
  it "memoizes a value with complex internal logic" do
    klass = Class.new do
      def memoized_value(dependency: nil)
        @memoized_value ||= begin
                              return nil if dependency.nil?

                              dependency.call
                            end
      end
    end

    expect(klass.new.memoized_value(dependency: proc { :value })).to eq :value
    expect(klass.new.memoized_value).to eq nil
  end

  it "keeps a truthy target without assigning it" do
    obj = MemoizedTarget.new(:kept)
    expect(obj.or_assign(:other)).to eq :kept
    expect(obj.value).to eq :kept
  end

  it "assigns a falsey target" do
    obj = MemoizedTarget.new(nil)
    expect(obj.or_assign(:set)).to eq :set
    expect(obj.value).to eq :set
  end

  it "raises when a falsey target has to be assigned on a frozen object" do
    -> { MemoizedTarget.new(nil).freeze.or_assign(:set) }.should raise_error(FrozenError)
  end

  it "never assigns a truthy target of a frozen object" do
    obj = MemoizedTarget.new(:kept).freeze
    expect(obj.or_assign(:other)).to eq :kept
    expect(obj.value).to eq :kept

    # the short circuit stops before the right hand side, so nothing is written
    expect(obj.and_assign_unset(5)).to eq nil
    expect(obj.unset_written).to eq false
  end

  it "leaves an unassigned target undefined for &&=" do
    obj = MemoizedTarget.new
    expect(obj.and_assign_unset(5)).to eq nil
    expect(obj.unset_written).to eq false
    expect(obj.unset_defined).to eq nil
  end

  it "assigns a truthy target for &&=" do
    obj = MemoizedTarget.new(:kept)
    expect(obj.and_assign(:other)).to eq :other
    expect(obj.value).to eq :other
    -> { obj.freeze.and_assign(:more) }.should raise_error(FrozenError)
  end

  it "declares a local variable even when the branch is not taken" do
    obj = MemoizedTarget.new
    expect(obj.declared_local(true)).to eq "local-variable"
    expect(obj.declared_local(false)).to eq "local-variable"
  end

  it "assigns a global variable only when the short circuit reaches it" do
    obj = MemoizedTarget.new
    $memoization_global = nil
    expect(obj.or_assign_global(:first)).to eq :first
    expect(obj.or_assign_global(:other)).to eq :first
    expect($memoization_global).to eq :first
  end

  it "assigns a class variable only when the short circuit reaches it" do
    expect(MemoizedClassVariable.or_assign(:first)).to eq :first
    expect(MemoizedClassVariable.or_assign(:other)).to eq :first
    expect(MemoizedClassVariable.defined_unset).to eq "class variable"
  end

  it "raises for &&= on an unassigned class variable, as the read is not guarded" do
    -> { MemoizedClassVariable.and_assign_unset(:other) }.should raise_error(NameError)
  end

  it "assigns a constant path only when the short circuit reaches it" do
    expect(MemoizedConstant.or_assign(:first)).to eq :first
    expect(MemoizedConstant.or_assign(:other)).to eq :first
    expect(MemoizedConstant.defined_unset).to eq "constant"
  end
end

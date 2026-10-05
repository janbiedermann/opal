require 'spec_helper'
require 'ruby2_keywords'

# The methods are in the corelib; requiring the library keeps them.
describe "require 'ruby2_keywords'" do
  it "keeps the corelib's Module#ruby2_keywords" do
    klass = Class.new { def m(*args) = args }
    klass.send(:ruby2_keywords, :m).should == nil
    -> { klass.send(:ruby2_keywords, :not_existing) }.should raise_error(NameError, /undefined method `not_existing'/)
  end

  it "keeps the corelib's Hash.ruby2_keywords_hash" do
    -> { Hash.ruby2_keywords_hash(nil) }.should raise_error(TypeError)
    Hash.ruby2_keywords_hash(a: 1).should == { a: 1 }
  end
end

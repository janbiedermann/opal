require 'spec_helper'

# Symbol = String in Opal, so these Symbol methods live on String
# (opal/corelib/string.rb); id2name is deprecated in CRuby but still
# public, and vendored IRB calls it in Context#to_s.
describe 'Symbol#id2name' do
  it 'answers the symbol name as a String' do
    :irb.id2name.should == 'irb'
    'irb'.to_sym.id2name.should == 'irb'
  end

  it 'shares Symbol#name identity' do
    (:context.id2name).equal?(:context.name).should == true
  end
end

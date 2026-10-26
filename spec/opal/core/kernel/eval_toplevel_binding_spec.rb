require 'opal-parser'

# TOPLEVEL_BINDING is flagged for the irb bridge: an eval through it
# compiles with the compiler's irb: option, so its locals live in
# Opal.irb_vars and persist across evals (the semantics irb.rb runs on).

OpalBridgeError = Class.new(StandardError)

describe 'Kernel#eval with TOPLEVEL_BINDING' do
  it 'keeps locals across separate evals' do
    eval("opal_bridge_a = 41", TOPLEVEL_BINDING, "(irb)")
    eval("opal_bridge_a + 1", TOPLEVEL_BINDING).should == 42
  end

  it 'reads locals installed through Binding#local_variable_set' do
    TOPLEVEL_BINDING.local_variable_set(:opal_bridge_b, 2)
    eval("opal_bridge_b", TOPLEVEL_BINDING).should == 2
  end

  it 'answers the value of the last expression' do
    eval("opal_bridge_v = 1\nopal_bridge_v += 41", TOPLEVEL_BINDING).should == 42
  end

  it 'evaluates multi-line input with defs and returns its value' do
    eval("def opal_bridge_greet\n  'hello'\nend\nopal_bridge_greet", TOPLEVEL_BINDING).should == 'hello'
  end

  it 'keeps definitions' do
    eval("class OpalBridgeKlass; end", TOPLEVEL_BINDING)
    Object.const_defined?(:OpalBridgeKlass).should == true
    eval("OpalBridgeKlass.new.class.name", TOPLEVEL_BINDING).should == 'OpalBridgeKlass'
  end

  it 'keeps instance variables on the receiver' do
    eval("@opal_bridge_iv = 7", TOPLEVEL_BINDING)
    eval("@opal_bridge_iv", TOPLEVEL_BINDING).should == 7
  end

  it 'works through a dup of the binding' do
    b = TOPLEVEL_BINDING.dup
    b.eval("opal_bridge_d = 1")
    eval("opal_bridge_d + 1", TOPLEVEL_BINDING).should == 2
  end

  it 'propagates exceptions raised in the evaluated code' do
    -> { eval("raise OpalBridgeError, 'boom'", TOPLEVEL_BINDING, "(irb)", 3) }
      .should raise_error(OpalBridgeError, 'boom')
  end

  it 'evaluates with self as the binding receiver' do
    TOPLEVEL_BINDING.eval("self").should == TOPLEVEL_BINDING.receiver
  end
end

describe 'Binding local variable methods on TOPLEVEL_BINDING' do
  it 'lists the locals of the irb scope' do
    eval("opal_bridge_l = 1", TOPLEVEL_BINDING)
    TOPLEVEL_BINDING.local_variables.should include('opal_bridge_l')
  end

  it 'reports defined? after an eval assignment and after local_variable_set' do
    eval("opal_bridge_e = 1", TOPLEVEL_BINDING)
    TOPLEVEL_BINDING.local_variable_defined?('opal_bridge_e').should == true
    TOPLEVEL_BINDING.local_variable_set(:'opal_bridge_f', 2)
    TOPLEVEL_BINDING.local_variable_defined?('opal_bridge_f').should == true
    TOPLEVEL_BINDING.local_variable_defined?('opal_bridge_missing').should == false
  end

  it 'gets the value of an irb local' do
    TOPLEVEL_BINDING.local_variable_set('opal_bridge_g', 3)
    TOPLEVEL_BINDING.local_variable_get('opal_bridge_g').should == 3
    eval("opal_bridge_g = 4", TOPLEVEL_BINDING)
    TOPLEVEL_BINDING.local_variable_get('opal_bridge_g').should == 4
  end

  it 'raises NameError for an undefined local' do
    -> { TOPLEVEL_BINDING.local_variable_get('opal_bridge_missing') }
      .should raise_error(NameError)
  end

  it 'round-trips the _ last-value convention' do
    TOPLEVEL_BINDING.local_variable_set(:_, 42)
    eval("_", TOPLEVEL_BINDING).should == 42
  end
end

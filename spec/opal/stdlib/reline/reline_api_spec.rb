# The reader surface of the Reline port when the input is no tty: that is
# what IRB drives for piped input (exe/irb's session cases live in
# spec/lib/compiler/irb_cli.test.mjs). The tier-2 raw editor reads fd 0
# directly and only runs under a real pty, so it is not pinnable here.
require 'spec_helper'
require 'stringio'
require 'reline'

describe 'Reline' do
  before :each do
    Reline.input = StringIO.new("puts 1+1\nputs 2+2\n")
    Reline.output = @out = StringIO.new
    Reline.prompt_proc = nil
    Reline::HISTORY.clear
  end

  after :each do
    Reline.input = nil
    Reline.output = nil
    Reline.prompt_proc = nil
  end

  describe 'readline' do
    it 'reads chomped lines and answers nil at EOF' do
      Reline.readline.should == 'puts 1+1'
      Reline.readline.should == 'puts 2+2'
      Reline.readline.should == nil
    end

    it 'prompts through output and records history unless told not to' do
      Reline.readline('> ').should == 'puts 1+1'
      @out.string.should == '> '
      Reline::HISTORY.to_a.should == ['puts 1+1']
      Reline.readline('', false).should == 'puts 2+2'
      Reline::HISTORY.to_a.should == ['puts 1+1']
    end
  end

  describe 'readmultiline' do
    it 'loops until check_termination accepts the buffer' do
      code = Reline.readmultiline('', false) { |acc| acc.lines.size >= 2 }
      code.should == "puts 1+1\nputs 2+2"
    end

    it 'answers nil when the stream ends before the buffer terminates' do
      Reline.readmultiline('', false) { |acc| false }.should == nil
    end

    it 'asks prompt_proc with the chomped lines and takes the array entry for the typed line' do
      seen = []
      Reline.prompt_proc = proc do |lines|
        seen << lines.dup
        lines.map { |l| l.include?('+') ? 'OP+ ' : '> ' }
      end
      Reline.readmultiline('> ', false) { |acc| false } # runs to EOF
      seen.first.should == ['puts 1+1']
      seen.last.should == ['puts 1+1', 'puts 2+2']
      # the continuation prompt lands on output as the array entry for the
      # line being typed (not the array, not the first): printed once per
      # readmultiline pass, twice here - line 2 and the doomed line 3
      @out.string.scan(/OP\+ /).size.should == 2
    end
  end

  describe 'misc' do
    it 'exposes the constants and version IRB reads' do
      Reline::VERSION.class.should == String
      Reline::HISTORY.to_a.should == []
      Reline.const_defined?(:IOGate).should == true
      Reline.const_defined?(:Unicode).should == true
      Reline.const_defined?(:Config).should == true
    end

    it 'answers get_screen_size with two positive numbers' do
      size = Reline.get_screen_size
      size.size.should == 2
      size[0].to_i.should > 0
      size[1].to_i.should > 0
    end

    it 'answers the dialog and editing no-ops call sites' do
      Reline.add_dialog_proc(:test, proc { '' }, nil)
      Reline.delete_text.should == nil
      Reline.ungetc('x').should == nil
      Reline.autocompletion = true
      Reline.autocompletion.should == true
    end
  end
end

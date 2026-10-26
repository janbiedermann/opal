# The Ruby-level Prism API (stdlib/prism.rb) over the vendored JavaScript
# port of Prism 1.9. The bulk of the cases are generated from the reference
# prism gem (tasks/prism/gen_prism_fixtures.rb) and pinned token by token.
# The two implementations count offsets differently by design (UTF-16 code
# units in the JS port, UTF-8 bytes in the C gem), so offsets are pinned
# only for the ASCII sources, where the two numberings agree; lines and
# byte columns are pinned for every source.

require 'prism'
require_relative 'fixtures'

describe 'Prism' do
  PRISM_FIXTURES.each do |fixture|
    src = fixture[:source]

    describe src.inspect do
      it 'lexes token types, values, lines and columns like prism' do
        # scopes: [[]] exactly like the fixture generator: both Prism
        # implementations accept a top-level yield only inside a scope.
        tokens = Prism.parse_lex(src, scopes: [[]]).value[1].map(&:first)
        rows = tokens.map do |t|
          loc = t.location
          [t.type.to_s, t.value, loc.start_line, loc.start_column, loc.end_line, loc.end_column]
        end
        rows.should == fixture[:lex].map { |r| r[0, 6] }
      end

      it 'reports offsets on one consistent numbering' do
        tokens = Prism.parse_lex(src, scopes: [[]]).value[1].map(&:first)
        offsets = tokens.map { |t| [t.location.start_offset, t.location.end_offset] }
        if fixture[:ascii_only]
          offsets.should == fixture[:lex].map { |r| r[6, 2] }
        end
        # The offsets must address the token value in the parsed source.
        tokens.each do |t|
          t.location.slice.should == t.value
        end
      end

      it 'reports the parse errors like prism' do
        result = Prism.parse_lex(src, scopes: [[]])
        rows = result.errors.map do |e|
          loc = e.location
          [e.type.to_s, e.message, e.level.to_s,
           loc.start_line, loc.start_column, loc.end_line, loc.end_column]
        end
        rows.should == fixture[:errors].map { |r| r[0, 7] }
        result.success?.should == fixture[:success]
      end

      it 'builds the same top-level statement nodes' do
        nodes = Prism.parse(src, scopes: [[]]).value.statements.body
        nodes.map { |n| n.class.name }.should == fixture[:ast]
      end
    end
  end

  describe 'the scopes: option' do
    it 'tells a local variable read from a method call' do
      without = Prism.parse('x + 1').value.statements.body.first
      with = Prism.parse('x + 1', scopes: [['x']]).value.statements.body.first
      without.receiver.class.name.should == 'Prism::CallNode'
      with.receiver.class.name.should == 'Prism::LocalVariableReadNode'
    end

    it 'works with empty and absent scopes' do
      Prism.parse('x + 1', scopes: [[]]).success?.should == true
      Prism.parse('x + 1', scopes: []).success?.should == true
    end
  end

  describe 'Location' do
    it 'compares by offsets into equal sources' do
      one = Prism.parse('a').value.statements.body.first.location
      other = Prism.parse('a').value.statements.body.first.location
      one.should == other
      (one == Prism.parse('b').value.statements.body.first.location).should == false
    end

    it 'answers byte columns like prism does' do
      token = Prism.parse_lex("puts 'あ'").value[1].map(&:first)[2]
      token.type.should == :STRING_CONTENT
      token.location.start_column.should == 6
      token.location.end_column.should == 9
    end

    it 'slices the covered text' do
      Prism.parse('a.b(1)').value.statements.body.first.location.slice.should == 'a.b(1)'
    end
  end

  describe 'the Ruby-only attribute helpers' do
    it 'exposes keyword text at the keyword location' do
      node = Prism.parse('if x then y else z end').value.statements.body.first
      node.if_keyword.should == 'if'
      node.end_keyword.should == 'end'
      Prism.parse('unless x; end').value.statements.body.first.keyword.should == 'unless'
    end

    it 'exposes opening and closing text' do
      Prism.parse('puts(1)').value.statements.body.first.opening.should == '('
      Prism.parse('puts(1)').value.statements.body.first.closing.should == ')'
      Prism.parse('x = <<~EOS' + "\n  hi\nEOS\n").value.statements.body.first.value.opening.should == '<<~EOS'
    end

    it 'answers nil (not NoMethodError) for an absent keyword location' do
      node = Prism.parse('a.b = 1').value.statements.body.first
      node.respond_to?(:opening).should == true
      node.opening.should == nil
    end

    it 'answers the unescaped body of string nodes' do
      Prism.parse("s = 'a\\b'").value.statements.body.first.value.unescaped.should == 'a\\b'
    end
  end

  describe 'ParseResult' do
    it 'hands the source back as a Prism::Source' do
      result = Prism.parse('x')
      result.source.class.name.should == 'Prism::Source'
      result.source.source.should == 'x'
    end

    it 'wraps comments' do
      comments = Prism.parse("x # y\n").comments
      comments.size.should == 1
      comments.first.text.should == '# y'
    end

    it 'answers the token pairs from lex' do
      pairs = Prism.lex('x = 1').value
      pairs.map { |(t, _)| t.type }.should == [:IDENTIFIER, :EQUAL, :INTEGER, :EOF]
      pairs.first.last.class.name.should == 'Prism::Location'
    end

    it 'answers an empty body, not nil, for empty sources' do
      Prism.parse('').value.statements.body.should == []
      Prism.parse("# only a comment\n").value.statements.body.should == []
    end
  end

  describe 'the Visitor' do
    it 'dispatches per node type and super reaches the recursive base' do
      visitor_class = Class.new(Prism::Visitor) do
        attr_reader :calls
        def initialize
          @calls = Hash.new(0)
        end

        def visit_call_node(node)
          @calls[:call] += 1
          super
        end

        def visit_local_variable_read_node(node)
          @calls[:lvar] += 1
          super
        end
      end
      visitor = visitor_class.new
      Prism.parse('a + b', scopes: [['a', 'b']]).value.accept(visitor)
      visitor.calls[:call].should == 1
      visitor.calls[:lvar].should == 2
    end
  end
end

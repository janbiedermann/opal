# helpers: slice, coerce_to, deny_frozen_access, send, respond_to
# backtick_javascript: true
# use_strict: true

require 'corelib/enumerable'

class ::Enumerator
  include ::Enumerable

  `self.$$prototype.$$is_enumerator = true`

  def self.for(object, method = :each, *args, &block)
    %x{
      var obj = #{allocate};

      obj.object = object;
      obj.size   = block;
      obj.method = method;
      obj.args   = args;
      obj.cursor = 0;

      return obj;
    }
  end

  def initialize(*, &block)
    `$deny_frozen_access(self)`

    @cursor = 0
    if block
      @object = Generator.new(&block)
      @method = :each
      @args   = []
      @size   = `arguments[0] || nil`

      if @size && !@size.respond_to?(:call)
        @size = `$coerce_to(#{@size}, Opal.Integer, 'to_int')`
      end
    else
      @object = `arguments[0]`
      @method = `arguments[1] || "each"`
      @args   = `$slice(arguments, 2)`
      @size   = nil
    end
  end

  def each(*args, &block)
    %x{
      if (block === nil && args.length === 0) return self;

      // @args + args, but args is already a fresh array when @args is empty
      if (self.args.length !== 0) args = self.args.concat(args);

      if (block === nil) {
        return $send(self.$class(), 'new', [self.object, self.method].concat(args));
      }

      return $send(self.object, self.method, args, block);
    }
  end

  def size
    %x{
      const size = self.size;
      if (size === undefined || size === nil) return nil;
      if ($respond_to(size, '$call')) return $send(size, 'call', self.args);
      return size;
    }
  end

  def with_index(offset = 0, &block)
    offset = if offset
               `$coerce_to(offset, Opal.Integer, 'to_int')`
             else
               0
             end

    return enum_for(:with_index, offset) { size } unless block

    %x{
      var result, index = offset;

      self.$each.$$p = function() {
        var param = #{::Opal.destructure(`arguments`)},
            value = block(param, index);

        index++;

        return value;
      }

      return self.$each();
    }
  end

  def each_with_index(&block)
    return enum_for(:each_with_index) { size } unless block_given?

    super
    @object
  end

  def rewind
    @cursor = 0

    self
  end

  def peek_values
    %x{
      if (self.values === undefined || self.values === nil) {
        // @values ||= map { |*i| i }, with the block as a JS function so the
        // walk doesn't pay a Ruby block call per element
        const values = [];
        self.$each.$$p = function () { values.push(Array.prototype.slice.call(arguments)); };
        self.$each();
        self.values = values;
      }
      if (self.cursor >= self.values.length) {
        #{::Kernel.raise ::StopIteration, 'iteration reached an end'}
      }
      return self.values[self.cursor];
    }
  end

  def peek
    %x{
      const values = self.$peek_values();
      return (values.length <= 1 ? values[0] : values);
    }
  end

  def next_values
    %x{
      const out = self.$peek_values();
      self.cursor += 1;
      return out;
    }
  end

  def next
    %x{
      const values = self.$next_values();
      return (values.length <= 1 ? values[0] : values);
    }
  end

  def feed(arg)
    raise NotImplementedError, "Opal doesn't support Enumerator#feed"
  end

  def +(other)
    ::Enumerator::Chain.new(self, other)
  end

  def inspect
    result = "#<#{self.class}: #{@object.inspect}:#{@method}"

    if @args.any?
      result += "(#{@args.inspect[::Range.new(1, -2)]})"
    end

    result + '>'
  end

  alias with_object each_with_object

  autoload :ArithmeticSequence, 'corelib/enumerator/arithmetic_sequence'
  autoload :Chain, 'corelib/enumerator/chain'
  autoload :Generator, 'corelib/enumerator/generator'
  autoload :Lazy, 'corelib/enumerator/lazy'
  autoload :Yielder, 'corelib/enumerator/yielder'
end

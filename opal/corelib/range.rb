# helpers: truthy, eqeq, eqeqeq, rb_gt, rb_lt, is_a, thrower, find_super, send2
# backtick_javascript: true
# use_strict: true

require 'corelib/enumerable'

class ::Range
  include ::Enumerable

  `self.$$prototype.$$is_range = true`

  attr_reader :begin, :end

  def initialize(first, last, exclude = false)
    ::Kernel.raise ::NameError, "'initialize' called twice" if @begin
    ::Kernel.raise ::ArgumentError, 'bad value for range' unless first <=> last || first.nil? || last.nil?

    @begin = first
    @end   = last
    @excl  = exclude
  end

  def ===(value)
    `value.$$is_range ? false : self['$cover?'](value)`
  end

  %x{
    function is_infinite(self) {
      if (self.begin === nil || self.end === nil ||
          self.begin === -Infinity || self.end === Infinity ||
          self.begin === Infinity || self.end === -Infinity) return true;
      return false;
    }

    // `a <=> b || 1`: an incomparable pair counts as "a after b"
    function range_compare(a, b) {
      let cmp = a['$<=>'](b);
      return cmp === nil ? 1 : cmp;
    }
  }

  def count(&block)
    if !block_given? && `is_infinite(self)`
      return ::Float::INFINITY
    end
    super
  end

  def to_a
    ::Kernel.raise ::TypeError, 'cannot convert endless range to an array' if `is_infinite(self)`
    super
  end

  def cover?(value)
    %x{
      let $begin = self.begin,
          $end = self.end,
          excl = self.excl;

      if (value.$$is_range) {
        let val_begin = value.$begin(),
            val_end = value.$end(),
            val_excl = value['$exclude_end?']();

        if (($begin !== nil && val_begin === nil) ||
            ($end !== nil && val_end === nil) ||
            (val_begin !== nil && val_end !== nil &&
              ($truthy(val_excl) ? range_compare(val_begin, val_end) >= 0 : range_compare(val_begin, val_end) > 0)) ||
            (val_begin !== nil && !self['$cover?'](val_begin))) {
          return false;
        }

        let cmp = range_compare($end, val_end);

        if ($eqeq(excl, val_excl)) return cmp >= 0;
        if ($truthy(excl)) return cmp > 0;
        if (cmp >= 0) return true;

        let val_max = value.$max();
        return val_max !== nil && range_compare(val_max, $end) <= 0;
      }

      if ($begin !== nil && range_compare($begin, value) > 0) return false;
      if ($end === nil) return true;

      let end_cmp = range_compare(value, $end);
      return $truthy(excl) ? end_cmp < 0 : end_cmp <= 0;
    }
  end

  def each(&block)
    return enum_for(:each) { size } unless block_given?

    %x{
      var i, limit;

      if (#{@begin}.$$is_number && #{@end}.$$is_number) {
        if (#{@begin} % 1 !== 0 || #{@end} % 1 !== 0) {
          #{::Kernel.raise ::TypeError, "can't iterate from Float"}
        }

        for (i = #{@begin}, limit = #{@end} + #{@excl ? 0 : 1}; i < limit; i++) {
          block(i);
        }

        return self;
      }

      if (#{@begin}.$$is_string && #{@end}.$$is_string) {
        #{@begin.upto(@end, @excl, &block)}
        return self;
      }
    }

    current = @begin
    last    = @end

    unless current.respond_to?(:succ)
      ::Kernel.raise ::TypeError, "can't iterate from #{current.class}"
    end

    while @end.nil? || (current <=> last) < 0
      yield current

      current = current.succ
    end

    yield current if !@excl && current == last

    self
  end

  def eql?(other)
    %x{
      if (!$is_a(other, #{::Range})) {
        return false;
      }

      return $eqeqeq(self.excl, other.excl) &&
        self.begin['$eql?'](other.begin) &&
        self.end['$eql?'](other.end);
    }
  end

  def exclude_end?
    # left in Ruby: it compiles to `return self.excl`, so a JS body is the same code
    @excl
  end

  def first(n = undefined)
    ::Kernel.raise ::RangeError, 'cannot get the minimum of beginless range' if @begin.nil?
    return @begin if `n == null`
    super
  end

  def include?(val)
    %x{
      let $begin = self.begin,
          $end = self.end;

      // `Integer.try_convert` answers Ruby nil, which is a truthy JS object
      if ($begin.$$is_number || $end.$$is_number ||
          $is_a($begin, #{::Time}) || $is_a($end, #{::Time}) ||
          #{::Integer.try_convert(@begin)} !== nil || #{::Integer.try_convert(@end)} !== nil) {
        return self['$cover?'](val);
      }

      if ($begin.$$is_string && $end.$$is_string) {
        // walk the successor sequence, as String#upto does, but without the
        // Enumerator and the Enumerable#any? on top of it
        let $return = $thrower('return');

        try {
          $begin['$upto'].$$p = function $$include_str(s) {
            if ($eqeq(s, val)) {
              $return.$throw(true, false);
            }
          };

          $begin['$upto']($end, self.excl);
        } catch ($e) {
          if ($e === $return) return $e.$v;
          throw $e;
        } finally {
          $return.is_orphan = true;
        }

        return false;
      }

      if ($begin.$$is_string || $end.$$is_string) {
        let cmp;

        if ($begin === nil) {
          cmp = val['$<=>']($end);
          return cmp !== nil && ($truthy(self.excl) ? cmp < 0 : cmp <= 0);
        }

        if ($end === nil) {
          cmp = $begin['$<=>'](val);
          return cmp !== nil && cmp <= 0;
        }
      }

      // super: Enumerable#include?
      return $send2(self, $find_super(self, 'include?', self['$include?'], false, true), 'include?', [val], nil);
    }
  end

  def last(n = undefined)
    ::Kernel.raise ::RangeError, 'cannot get the maximum of endless range' if @end.nil?
    return @end if `n == null`
    to_a.last(n)
  end

  # FIXME: currently hardcoded to assume range holds numerics
  def max
    if @end.nil?
      ::Kernel.raise ::RangeError, 'cannot get the maximum of endless range'
    elsif block_given?
      super
    elsif !@begin.nil? && (@begin > @end ||
                           @excl && @begin == @end)
      nil
    else
      `#{@excl} ? #{@end} - 1 : #{@end}`
    end
  end

  def min
    if @begin.nil?
      ::Kernel.raise ::RangeError, 'cannot get the minimum of beginless range'
    elsif block_given?
      super
    elsif !@end.nil? && (@begin > @end ||
                         @excl && @begin == @end)
      nil
    else
      @begin
    end
  end

  def size
    %x{
      var b = this.begin, e = this.end;

      // If begin is Numeric
      if (#{::Numeric === `b`}) {
        // If end is Numeric
        if (#{::Numeric === `e`}) {
          // Calculating size based on whether range is exclusive or inclusive
          var size = #{`e` - `b`};
          if (size < 0) {
            return 0;
          }
          if (!this.excl) {
            size += 1;
          }
          return (#{::Float === `b`} || #{::Float === `e`}) ? Math.floor(size) : size;
        }
        // If end is nil
        else if (e === nil) {
          return Infinity;
        }
      }
      // If begin is nil
      else if (b === nil) {
        // If end is Numeric
        if (#{::Numeric === `e`}) {
          return Infinity;
        }
      }

      // If neither begin nor end is Numeric
      return nil;
    }
  end

  def step(n = undefined)
    %x{
      function coerceStepSize() {
        if (n == null) {
          n = 1;
        }
        else if (!n.$$is_number) {
          n = Opal.coerce_to_or_raise(n, Opal.Integer, "to_int");
        }

        if (n < 0) {
          #{::Kernel.raise ::ArgumentError, "step can't be negative"}
        } else if (n === 0) {
          #{::Kernel.raise ::ArgumentError, "step can't be 0"}
        }
      }

      function enumeratorSize() {
        if (!#{@begin.respond_to?(:succ)}) {
          return nil;
        }

        if (#{@begin}.$$is_string && #{@end}.$$is_string) {
          return nil;
        }

        if (n % 1 === 0) {
          return #{(size / n).ceil};
        } else {
          // n is a float
          var begin = self.begin, end = self.end,
              abs = Math.abs, floor = Math.floor,
              err = (abs(begin) + abs(end) + abs(end - begin)) / abs(n) * #{::Float::EPSILON},
              size;

          if (err > 0.5) {
            err = 0.5;
          }

          if (self.excl) {
            size = floor((end - begin) / n - err);
            if (size * n + begin < end) {
              size++;
            }
          } else {
            size = floor((end - begin) / n + err) + 1
          }

          return size;
        }
      }
    }

    unless block_given?
      if (@begin.is_a?(Numeric) || @begin.nil?) &&
         (@end.is_a?(Numeric) || @end.nil?) &&
         !(@begin.nil? && @end.nil?)

        return ::Enumerator::ArithmeticSequence.new(self, n, :step)
      else
        return enum_for(:step, n) do
          %x{
            coerceStepSize();
            return enumeratorSize();
          }
        end
      end
    end

    `coerceStepSize()`

    if `self.begin.$$is_number && self.end.$$is_number`
      i = 0
      loop do
        current = @begin + i * n
        if @excl
          break if current >= @end
        elsif current > @end
          break
        end
        yield(current)
        i += 1
      end
    else
      %x{
        if (#{@begin}.$$is_string && #{@end}.$$is_string && n % 1 !== 0) {
          #{::Kernel.raise ::TypeError, 'no implicit conversion to float from string'}
        }
      }
      each_with_index do |value, idx|
        yield(value) if idx % n == 0
      end
    end
    self
  end

  def %(n)
    if @begin.is_a?(Numeric) && @end.is_a?(Numeric)
      ::Enumerator::ArithmeticSequence.new(self, n, :%)
    else
      step(n)
    end
  end

  def bsearch(&block)
    return enum_for(:bsearch) unless block_given?

    if `is_infinite(self) && (self.begin.$$is_number || self.end.$$is_number)`
      ::Kernel.raise ::NotImplementedError, "Can't #bsearch an infinite range"
    end

    unless `self.begin.$$is_number && self.end.$$is_number`
      ::Kernel.raise ::TypeError, "can't do binary search for #{@begin.class}"
    end

    to_a.bsearch(&block)
  end

  def to_s
    %x{
      let $begin = self.begin,
          $end = self.end;

      return ($begin === nil ? '' : $begin['$to_s']()) +
        ($truthy(self.excl) ? '...' : '..') +
        ($end === nil ? '' : $end['$to_s']());
    }
  end

  def inspect
    %x{
      let $begin = self.begin,
          $end = self.end;

      return ($begin === nil ? '' : $begin['$inspect']()) +
        ($truthy(self.excl) ? '...' : '..') +
        ($end === nil ? '' : $end['$inspect']());
    }
  end

  def marshal_load(args)
    @begin = args[:begin]
    @end = args[:end]
    @excl = args[:excl]
  end

  def hash
    # left in Ruby: a JS body measured the same, the cost is Array#hash
    [::Range, @begin, @end, @excl].hash
  end

  alias == eql?
  alias member? include?
end

# helpers: truthy, coerce_to, eqeq, yield1, yieldX, deny_frozen_access, send, thrower
# backtick_javascript: true
# use_strict: true

module ::Enumerable
  %x{
    function comparableForPattern(value) {
      if (value.length === 0) {
        return [nil];
      }

      if (value.length > 1) {
        // the yielded values become a single Array argument, so it has to be
        // a real Array (callers may pass the `arguments` of a yield)
        return [Array.isArray(value) ? value : Array.prototype.slice.call(value)];
      }

      return value;
    }
  }

  def all?(pattern = undefined, &block)
    %x{
      let $return = $thrower('return');

      try {
        if (pattern !== undefined) {
          self.$each.$$p = function $$all() {
            if (!$truthy($send(pattern, '===', comparableForPattern(arguments)))) {
              $return.$throw(false, $$all.$$is_lambda);
            }
          };
        } else if (block !== nil) {
          self.$each.$$p = function $$all() {
            if (!$truthy($yieldX(block, arguments))) {
              $return.$throw(false, $$all.$$is_lambda);
            }
          };
        } else {
          self.$each.$$p = function $$all() {
            if (!$truthy(Opal.$destructure(arguments))) {
              $return.$throw(false, $$all.$$is_lambda);
            }
          };
        }

        self.$each();
        return true;
      } catch ($e) {
        if ($e === $return) return $e.$v;
        throw $e;
      } finally {
        $return.is_orphan = true;
      }
    }
  end

  def any?(pattern = undefined, &block)
    %x{
      let $return = $thrower('return');

      try {
        if (pattern !== undefined) {
          self.$each.$$p = function $$any() {
            if ($truthy($send(pattern, '===', comparableForPattern(arguments)))) {
              $return.$throw(true, $$any.$$is_lambda);
            }
          };
        } else if (block !== nil) {
          self.$each.$$p = function $$any() {
            if ($truthy($yieldX(block, arguments))) {
              $return.$throw(true, $$any.$$is_lambda);
            }
          };
        } else {
          self.$each.$$p = function $$any() {
            if ($truthy(Opal.$destructure(arguments))) {
              $return.$throw(true, $$any.$$is_lambda);
            }
          };
        }

        self.$each();
        return false;
      } catch ($e) {
        if ($e === $return) return $e.$v;
        throw $e;
      } finally {
        $return.is_orphan = true;
      }
    }
  end

  def chunk(&block)
    return to_enum(:chunk) { enumerator_size } unless block_given?

    ::Enumerator.new do |yielder|
      %x{
        let previous = nil, accumulate = [];

        function releaseAccumulate() {
          if (accumulate.length > 0) {
            #{yielder.yield(`previous`, `accumulate`)}
          }
        }

        self.$each.$$p = function(value) {
          let key = $yield1(block, value);

          if (key === nil) {
            releaseAccumulate();
            accumulate = [];
            previous = nil;
          } else {
            if (previous === nil || previous === key) {
              accumulate.push(value);
            } else {
              releaseAccumulate();
              accumulate = [value];
            }

            previous = key;
          }
        }

        self.$each();

        releaseAccumulate();
      }
    end
  end

  def chunk_while(&block)
    ::Kernel.raise ::ArgumentError, 'no block given' unless block_given?

    # left in Ruby: a JS body needs a wrapper block to negate the test, and
    # that wrapper measured ~10% slower than this
    slice_when { |before, after| !(yield before, after) }
  end

  def collect(&block)
    return enum_for(:collect) { enumerator_size } unless block_given?

    %x{
      let result = [];

      self.$each.$$p = function() {
        let value = $yieldX(block, arguments);

        result.push(value);
      };

      self.$each();

      return result;
    }
  end

  def collect_concat(&block)
    return enum_for(:collect_concat) { enumerator_size } unless block_given?

    %x{
      let result = [];

      self.$each.$$p = function () {
        let value = $yield1(block, #{::Opal.destructure(`arguments`)}),
            ary = Opal.coerce_to_or_nil(value, Opal.Array, "to_ary");

        if (ary !== nil) {
          for (let i = 0, length = ary.length; i < length; i++) {
            result.push(ary[i]);
          }
        } else {
          result.push(value);
        }
      };

      self.$each();

      return result;
    }
  end

  def compact
    `self.$to_a()['$compact']()`
  end

  def count(object = undefined, &block)
    %x{
      if (object != null && block !== nil) {
        #{warn('warning: given block not used')}
      }

      let result = 0;

      if (object != null) {
        self.$each.$$p = function () {
          if ($eqeq(#{::Opal.destructure(`arguments`)}, object)) {
            result++;
          }
        };
      } else if (block !== nil) {
        self.$each.$$p = function () {
          if ($truthy($yieldX(block, arguments))) {
            result++;
          }
        };
      } else {
        self.$each.$$p = function () {
          result++;
        };
      }

      self.$each();

      return result;
    }
  end

  def cycle(n = nil, &block)
    unless block_given?
      return enum_for(:cycle, n) do
        if n.nil?
          respond_to?(:size) ? ::Float::INFINITY : nil
        else
          n = `Opal.coerce_to_or_raise(n, Opal.Integer, "to_int")`
          n > 0 ? enumerator_size * n : 0
        end
      end
    end

    unless n.nil?
      n = `Opal.coerce_to_or_raise(n, Opal.Integer, "to_int")`

      return if `n <= 0`
    end

    %x{
      let all = [], i, length, value;

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param);

        all.push(param);
      }

      self.$each();

      if (all.length === 0) {
        return nil;
      }

      if (n === nil) {
        while (true) {
          for (i = 0, length = all.length; i < length; i++) {
            value = $yield1(block, all[i]);
          }
        }
      }
      else {
        while (n > 1) {
          for (i = 0, length = all.length; i < length; i++) {
            value = $yield1(block, all[i]);
          }

          n--;
        }
      }
    }
  end

  def detect(ifnone = undefined, &block)
    return enum_for :detect, ifnone unless block_given?

    %x{
      let $return = $thrower('return');

      try {
        self.$each.$$p = function $$detect() {
          let value = Opal.$destructure(arguments);

          if ($truthy($yield1(block, value))) {
            $return.$throw(value, $$detect.$$is_lambda);
          }
        };

        self.$each();
      } catch ($e) {
        if ($e === $return) return $e.$v;
        throw $e;
      } finally {
        $return.is_orphan = true;
      }

      if (ifnone !== undefined) {
        if (typeof(ifnone) === 'function') {
          return ifnone();
        } else {
          return ifnone;
        }
      }

      return nil;
    }
  end

  def drop(number)
    number = `$coerce_to(number, Opal.Integer, 'to_int')`

    if `number < 0`
      ::Kernel.raise ::ArgumentError, 'attempt to drop negative size'
    end

    %x{
      let result  = [],
          current = 0;

      self.$each.$$p = function() {
        if (number <= current) {
          result.push(#{::Opal.destructure(`arguments`)});
        }

        current++;
      };

      self.$each()

      return result;
    }
  end

  def drop_while(&block)
    return enum_for :drop_while unless block_given?

    %x{
      let result   = [],
          dropping = true;

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)};

        if (dropping) {
          let value = $yield1(block, param);

          if (!$truthy(value)) {
            dropping = false;
            result.push(param);
          }
        }
        else {
          result.push(param);
        }
      };

      self.$each();

      return result;
    }
  end

  def each_cons(n, &block)
    if `arguments.length != 1`
      ::Kernel.raise ::ArgumentError, "wrong number of arguments (#{`arguments.length`} for 1)"
    end

    n = ::Opal.try_convert n, ::Integer, :to_int

    if `n <= 0`
      ::Kernel.raise ::ArgumentError, 'invalid size'
    end

    unless block_given?
      return enum_for(:each_cons, n) do
        enum_size = enumerator_size
        if enum_size.nil?
          nil
        elsif enum_size == 0 || enum_size < n
          0
        else
          enum_size - n + 1
        end
      end
    end

    %x{
      let buffer = [];

      self.$each.$$p = function() {
        let element = #{::Opal.destructure(`arguments`)};
        buffer.push(element);
        if (buffer.length > n) {
          buffer.shift();
        }
        if (buffer.length == n) {
          $yield1(block, buffer.slice(0, n));
        }
      }

      self.$each();

      return self;
    }
  end

  def each_entry(*data, &block)
    unless block_given?
      return to_enum(:each_entry, *data) { enumerator_size }
    end

    %x{
      self.$each.$$p = function() {
        let item = #{::Opal.destructure(`arguments`)};

        $yield1(block, item);
      }

      self.$each(...data);

      return self;
    }
  end

  def each_slice(n, &block)
    n = `$coerce_to(#{n}, Opal.Integer, 'to_int')`

    if `n <= 0`
      ::Kernel.raise ::ArgumentError, 'invalid slice size'
    end

    return enum_for(:each_slice, n) { respond_to?(:size) ? (size / n).ceil : nil } unless block_given?

    %x{
      let slice = []

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)};

        slice.push(param);

        if (slice.length === n) {
          $yield1(block, slice);
          slice = [];
        }
      };

      self.$each();

      // our "last" group, if smaller than n then won't have been yielded
      if (slice.length > 0) {
        $yield1(block, slice);
      }
    }

    self
  end

  def each_with_index(*args, &block)
    return enum_for(:each_with_index, *args) { enumerator_size } unless block_given?

    %x{
      let index = 0;

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)};

        block(param, index);

        index++;
      };

      self.$each(...args);
    }

    self
  end

  def each_with_object(object, &block)
    return enum_for(:each_with_object, object) { enumerator_size } unless block_given?

    %x{
      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)};

        block(param, object);
      };

      self.$each();
    }

    object
  end

  def entries(*args)
    %x{
      let result = [];

      self.$each.$$p = function() {
        result.push(#{::Opal.destructure(`arguments`)});
      };

      self.$each(...args);

      return result;
    }
  end

  def filter_map(&block)
    return enum_for(:filter_map) { enumerator_size } unless block_given?

    %x{
      let result = [];

      self.$each.$$p = function () {
        let value = $yield1(block, #{::Opal.destructure(`arguments`)});

        if ($truthy(value)) {
          result.push(value);
        }
      };

      self.$each();

      return result;
    }
  end

  def find_all(&block)
    return enum_for(:find_all) { enumerator_size } unless block_given?

    %x{
      let result = [];

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param);

        if ($truthy(value)) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    }
  end

  def find_index(object = undefined, &block)
    return enum_for :find_index if `object === undefined && block === nil`

    %x{
      if (object != null && block !== nil) {
        #{warn('warning: given block not used')}
      }
    }

    index = 0

    if `object != null`
      each do |*value|
        if ::Opal.destructure(value) == object
          return index
        end

        `index += 1`
      end
    else
      each do |*value|
        if yield(*value)
          return index
        end

        `index += 1`
      end
    end

    nil
  end

  def first(number = undefined)
    if `number === undefined`
      each do |value|
        return value
      end
      nil
    else
      result = []
      number = `$coerce_to(number, Opal.Integer, 'to_int')`

      if `number < 0`
        ::Kernel.raise ::ArgumentError, 'attempt to take negative size'
      end

      if `number == 0`
        return []
      end

      current = 0

      each do |*args|
        `result.push(#{::Opal.destructure(args)})`

        if `number <= ++current`
          return result
        end
      end

      result
    end
  end

  def grep(pattern, &block)
    %x{
      let result = [];

      self.$each.$$p = function $$grep() {
        if (!$truthy($send(pattern, '===', comparableForPattern(arguments)))) {
          return;
        }

        // the yielded values, as an Array the caller can see
        let value = arguments.length > 1 ? Array.prototype.slice.call(arguments) : arguments;

        if (block !== nil) {
          result.push($yieldX(block, arguments.length > 1 ? [value] : value));
        } else {
          result.push(arguments.length <= 1 ? value[0] ?? nil : value);
        }
      };

      self.$each();

      return result;
    }
  end

  def grep_v(pattern, &block)
    %x{
      let result = [];

      self.$each.$$p = function $$grep_v() {
        if ($truthy($send(pattern, '===', comparableForPattern(arguments)))) {
          return;
        }

        // the yielded values, as an Array the caller can see
        let value = arguments.length > 1 ? Array.prototype.slice.call(arguments) : arguments;

        if (block !== nil) {
          result.push($yieldX(block, arguments.length > 1 ? [value] : value));
        } else {
          result.push(arguments.length <= 1 ? value[0] ?? nil : value);
        }
      };

      self.$each();

      return result;
    }
  end

  def group_by(&block)
    return enum_for(:group_by) { enumerator_size } unless block_given?

    %x{
      let hash = Opal.hash_new();

      self.$each.$$p = function () {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param),
            ary = Opal.hash_get(hash, value);

        if (ary === undefined) {
          ary = [];
          Opal.hash_put(hash, value, ary);
        }

        ary.push(param);
      };

      self.$each();

      return hash;
    }
  end

  def include?(obj)
    %x{
      let $return = $thrower('return');

      try {
        self.$each.$$p = function $$include() {
          if ($eqeq(Opal.$destructure(arguments), obj)) {
            $return.$throw(true, $$include.$$is_lambda);
          }
        };

        self.$each();
        return false;
      } catch ($e) {
        if ($e === $return) return $e.$v;
        throw $e;
      } finally {
        $return.is_orphan = true;
      }
    }
  end

  def inject(object = undefined, sym = undefined, &block)
    %x{
      let result = object;

      if (block !== nil && sym === undefined) {
        self.$each.$$p = function() {
          let value = #{::Opal.destructure(`arguments`)};

          if (result === undefined) {
            result = value;
            return;
          }

          value = $yieldX(block, [result, value]);

          result = value;
        };
      }
      else {
        if (sym === undefined) {
          if (!#{::Symbol === object}) {
            #{::Kernel.raise ::TypeError, "#{object.inspect} is not a Symbol"};
          }

          sym    = object;
          result = undefined;
        }

        self.$each.$$p = function() {
          let value = #{::Opal.destructure(`arguments`)};

          if (result === undefined) {
            result = value;
            return;
          }

          result = #{`result`.__send__ sym, `value`};
        };
      }

      self.$each();

      return result ?? nil;
    }
  end

  def lazy
    ::Enumerator::Lazy.new(self, enumerator_size) do |enum, *args|
      enum.yield(*args)
    end
  end

  def enumerator_size
    `self['$respond_to?']('size') ? self.$size() : nil`
  end

  def max(n = undefined, &block)
    %x{
      if (n === undefined || n === nil) {
        let result, value;

        self.$each.$$p = function() {
          let item = #{::Opal.destructure(`arguments`)};

          if (result === undefined) {
            result = item;
            return;
          }

          if (block !== nil) {
            value = $yieldX(block, [item, result]);
          } else {
            value = #{`item` <=> `result`};
          }

          if (value === nil) {
            #{::Kernel.raise ::ArgumentError, 'comparison failed'};
          }

          if (value > 0) {
            result = item;
          }
        }

        self.$each();

        return result ?? nil;
      }

      n = $coerce_to(n, Opal.Integer, 'to_int');

      if (Number.isFinite(n) && n >= 0 && n <= 64) {
        if (n === 0) {
          return [];
        }

        let best = [];

        function compareMax(a, b) {
          let cmp = (block !== nil) ? $yieldX(block, [a, b]) : #{`a` <=> `b`};

          if (cmp === nil) {
            #{::Kernel.raise ::ArgumentError, 'comparison failed'};
          }

          return cmp;
        }

        self.$each.$$p = function () {
          let item = #{::Opal.destructure(`arguments`)};

          if (best.length < n) {
            best.push(item);

            let i = best.length - 1;
            while (i > 0 && compareMax(item, best[i - 1]) > 0) {
              best[i] = best[i - 1];
              i--;
            }
            best[i] = item;
          } else if (compareMax(item, best[n - 1]) > 0) {
            best.push(item);

            let i = n;
            while (i > 0 && compareMax(item, best[i - 1]) > 0) {
              best[i] = best[i - 1];
              i--;
            }
            best[i] = item;
            best.pop();
          }
        };

        self.$each();

        return best;
      }
    }

    sort(&block).reverse.first(n)
  end

  def max_by(n = nil, &block)
    return enum_for(:max_by, n) { enumerator_size } unless block

    unless n.nil?
      return sort_by(&block).reverse.take n
    end

    %x{
      let result,
          by;

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param);

        if (result === undefined) {
          result = param;
          by     = value;
          return;
        }

        if (#{`value` <=> `by`} > 0) {
          result = param
          by     = value;
        }
      };

      self.$each();

      return result ?? nil;
    }
  end

  def min(n = nil, &block)
    %x{
      if (n === undefined || n === nil) {
        let result;

        if (block !== nil) {
          self.$each.$$p = function() {
            let param = #{::Opal.destructure(`arguments`)};

            if (result === undefined) {
              result = param;
              return;
            }

            let value = block(param, result);

            if (value === nil) {
              #{::Kernel.raise ::ArgumentError, 'comparison failed'};
            }

            if (value < 0) {
              result = param;
            }
          };
        }
        else {
          self.$each.$$p = function() {
            let param = #{::Opal.destructure(`arguments`)};

            if (result === undefined) {
              result = param;
              return;
            }

            if (#{::Opal.compare(`param`, `result`)} < 0) {
              result = param;
            }
          };
        }

        self.$each();

        return result ?? nil;
      }

      n = $coerce_to(n, Opal.Integer, 'to_int');

      if (Number.isFinite(n) && n >= 0 && n <= 64) {
        if (n === 0) {
          return [];
        }

        let best = [];

        function compareMin(a, b) {
          let cmp = (block !== nil) ? $yieldX(block, [a, b]) : #{::Opal.compare(`a`, `b`)};

          if (cmp === nil) {
            #{::Kernel.raise ::ArgumentError, 'comparison failed'};
          }

          return cmp;
        }

        self.$each.$$p = function () {
          let item = #{::Opal.destructure(`arguments`)};

          if (best.length < n) {
            best.push(item);

            let i = best.length - 1;
            while (i > 0 && compareMin(item, best[i - 1]) < 0) {
              best[i] = best[i - 1];
              i--;
            }
            best[i] = item;
          } else if (compareMin(item, best[n - 1]) < 0) {
            best.push(item);

            let i = n;
            while (i > 0 && compareMin(item, best[i - 1]) < 0) {
              best[i] = best[i - 1];
              i--;
            }
            best[i] = item;
            best.pop();
          }
        };

        self.$each();

        return best;
      }
    }

    if block_given?
      return sort { |a, b| yield a, b }.take n
    else
      return sort.take n
    end
  end

  def min_by(n = nil, &block)
    return enum_for(:min_by, n) { enumerator_size } unless block

    unless n.nil?
      return sort_by(&block).take n
    end

    %x{
      let result,
          by;

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param);

        if (result === undefined) {
          result = param;
          by     = value;
          return;
        }

        if (#{`value` <=> `by`} < 0) {
          result = param
          by     = value;
        }
      };

      self.$each();

      return result ?? nil;
    }
  end

  def minmax(&block)
    %x{
      let min = nil, max = nil, first_time = true;

      self.$each.$$p = function () {
        let element = #{::Opal.destructure(`arguments`)};

        if (first_time) {
          min = max = element;
          first_time = false;
        } else {
          let min_cmp = (block !== nil) ? $yieldX(block, [min, element]) : #{`min` <=> `element`};

          if (min_cmp === nil) {
            #{::Kernel.raise ::ArgumentError, 'comparison failed'}
          } else if (min_cmp > 0) {
            min = element;
          }

          let max_cmp = (block !== nil) ? $yieldX(block, [max, element]) : #{`max` <=> `element`};

          if (max_cmp === nil) {
            #{::Kernel.raise ::ArgumentError, 'comparison failed'}
          } else if (max_cmp < 0) {
            max = element;
          }
        }
      };

      self.$each();

      return [min, max];
    }
  end

  def minmax_by(&block)
    return enum_for(:minmax_by) { enumerator_size } unless block

    %x{
      let min_result = nil,
          max_result = nil,
          min_by,
          max_by;

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param);

        if ((min_by === undefined) || #{`value` <=> `min_by`} < 0) {
          min_result = param;
          min_by     = value;
        }

        if ((max_by === undefined) || #{`value` <=> `max_by`} > 0) {
          max_result = param;
          max_by     = value;
        }
      };

      self.$each();

      return [min_result, max_result];
    }
  end

  def none?(pattern = undefined, &block)
    %x{
      let $return = $thrower('return');

      try {
        if (pattern !== undefined) {
          self.$each.$$p = function $$none() {
            if ($truthy($send(pattern, '===', comparableForPattern(arguments)))) {
              $return.$throw(false, $$none.$$is_lambda);
            }
          };
        } else if (block !== nil) {
          self.$each.$$p = function $$none() {
            if ($truthy($yieldX(block, arguments))) {
              $return.$throw(false, $$none.$$is_lambda);
            }
          };
        } else {
          self.$each.$$p = function $$none() {
            if ($truthy(Opal.$destructure(arguments))) {
              $return.$throw(false, $$none.$$is_lambda);
            }
          };
        }

        self.$each();
        return true;
      } catch ($e) {
        if ($e === $return) return $e.$v;
        throw $e;
      } finally {
        $return.is_orphan = true;
      }
    }
  end

  def one?(pattern = undefined, &block)
    %x{
      let count = 0,
          $return = $thrower('return');

      try {
        if (pattern !== undefined) {
          self.$each.$$p = function $$one() {
            if ($truthy($send(pattern, '===', comparableForPattern(arguments))) && ++count > 1) {
              $return.$throw(false, $$one.$$is_lambda);
            }
          };
        } else if (block !== nil) {
          self.$each.$$p = function $$one() {
            if ($truthy($yieldX(block, arguments)) && ++count > 1) {
              $return.$throw(false, $$one.$$is_lambda);
            }
          };
        } else {
          self.$each.$$p = function $$one() {
            if ($truthy(Opal.$destructure(arguments)) && ++count > 1) {
              $return.$throw(false, $$one.$$is_lambda);
            }
          };
        }

        self.$each();
        return count === 1;
      } catch ($e) {
        if ($e === $return) return $e.$v;
        throw $e;
      } finally {
        $return.is_orphan = true;
      }
    }
  end

  def partition(&block)
    return enum_for(:partition) { enumerator_size } unless block_given?

    %x{
      let truthy = [], falsy = [], result;

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param);

        if ($truthy(value)) {
          truthy.push(param);
        }
        else {
          falsy.push(param);
        }
      };

      self.$each();

      return [truthy, falsy];
    }
  end

  def reject(&block)
    return enum_for(:reject) { enumerator_size } unless block_given?

    %x{
      let result = [];

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)},
            value = $yield1(block, param);

        if (!$truthy(value)) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    }
  end

  def reverse_each(&block)
    return enum_for(:reverse_each) { enumerator_size } unless block_given?

    %x{
      let result = [];

      self.$each.$$p = function() {
        result.push(arguments);
      };

      self.$each();

      for (let i = result.length - 1; i >= 0; i--) {
        $yieldX(block, result[i]);
      }

      return result;
    }
  end

  def slice_before(pattern = undefined, &block)
    if `pattern === undefined && block === nil`
      ::Kernel.raise ::ArgumentError, 'both pattern and block are given'
    end

    if `pattern !== undefined && block !== nil || arguments.length > 1`
      ::Kernel.raise ::ArgumentError, "wrong number of arguments (#{`arguments.length`} expected 1)"
    end

    ::Enumerator.new do |e|
      %x{
        let slice = [];

        if (block !== nil) {
          if (pattern === undefined) {
            self.$each.$$p = function() {
              let param = #{::Opal.destructure(`arguments`)},
                  value = $yield1(block, param);

              if ($truthy(value) && slice.length > 0) {
                #{e << `slice`};
                slice = [];
              }

              slice.push(param);
            };
          }
          else {
            self.$each.$$p = function() {
              let param = #{::Opal.destructure(`arguments`)},
                  value = block(param, #{pattern.dup});

              if ($truthy(value) && slice.length > 0) {
                #{e << `slice`};
                slice = [];
              }

              slice.push(param);
            };
          }
        }
        else {
          self.$each.$$p = function() {
            let param = #{::Opal.destructure(`arguments`)},
                value = #{pattern === `param`};

            if ($truthy(value) && slice.length > 0) {
              #{e << `slice`};
              slice = [];
            }

            slice.push(param);
          };
        }

        self.$each();

        if (slice.length > 0) {
          #{e << `slice`};
        }
      }
    end
  end

  def slice_after(pattern = undefined, &block)
    if `pattern === undefined && block === nil`
      ::Kernel.raise ::ArgumentError, 'both pattern and block are given'
    end

    if `pattern !== undefined && block !== nil || arguments.length > 1`
      ::Kernel.raise ::ArgumentError, "wrong number of arguments (#{`arguments.length`} expected 1)"
    end

    if `pattern !== undefined`
      block = ::Kernel.proc { |e| pattern === e }
    end

    ::Enumerator.new do |yielder|
      %x{
        let accumulate;

        self.$each.$$p = function() {
          let element = #{::Opal.destructure(`arguments`)},
              end_chunk = $yield1(block, element);

          if (accumulate == null) {
            accumulate = [];
          }

          if ($truthy(end_chunk)) {
            accumulate.push(element);
            #{yielder.yield(`accumulate`)};
            accumulate = null;
          } else {
            accumulate.push(element)
          }
        }

        self.$each();

        if (accumulate != null) {
          #{yielder.yield(`accumulate`)};
        }
      }
    end
  end

  def slice_when(&block)
    ::Kernel.raise ::ArgumentError, 'wrong number of arguments (0 for 1)' unless block_given?

    ::Enumerator.new do |yielder|
      %x{
        let slice = nil, last_after = nil;

        self.$each_cons.$$p = function() {
          let params = #{::Opal.destructure(`arguments`)},
              before = params[0],
              after = params[1],
              match = $yieldX(block, [before, after]);

          last_after = after;

          if (slice === nil) {
            slice = [];
          }

          if ($truthy(match)) {
            slice.push(before);
            #{yielder.yield(`slice`)};
            slice = [];
          } else {
            slice.push(before);
          }
        }

        self.$each_cons(2);

        if (slice !== nil) {
          slice.push(last_after);
          #{yielder.yield(`slice`)};
        }
      }
    end
  end

  def sort(&block)
    %x{
      let ary = self.$to_a();

      if (block !== nil) {
        ary.$sort.$$p = block;
      }

      return ary.$sort();
    }
  end

  def sort_by(&block)
    return enum_for(:sort_by) { enumerator_size } unless block_given?

    %x{
      let pairs = [];

      self.$each.$$p = function $$sort_by() {
        let arg = Opal.$destructure(arguments);
        pairs.push([$yield1(block, arg), arg]);
      };

      self.$each();

      // the same comparison Array#sort! does, without its two array copies
      pairs.sort(function $$sort_by_cmp(a, b) {
        let ret = a[0]['$<=>'](b[0]);

        if (ret === nil) {
          #{::Kernel.raise ::ArgumentError, "comparison of #{`a[0]`.inspect} with #{`b[0]`.inspect} failed"}
        }

        return ret > 0 ? 1 : (ret < 0 ? -1 : 0);
      });

      for (let i = 0, length = pairs.length; i < length; i++) {
        pairs[i] = pairs[i][1];
      }

      return pairs;
    }
  end

  # This method implements the Kahan summation algorithm if it is possible to apply one.
  def sum(initial = 0, &block)
    %x{
      let result = initial,
          compensation = 0;

      self.$each.$$p = function () {
        let item = (block !== nil) ? $yieldX(block, arguments) : #{::Opal.destructure(`arguments`)};

        if (typeof item === "number") {
          if (Number.isFinite(item) && typeof result === "number" && typeof compensation === "number") {
            let y = item - compensation,
                t = result + y;
            compensation = (t - result) - y;
            result = t;
          } else {
            result = #{`result` + `item`};
          }
        } else if (#{`item`.respond_to?(:-)} && !#{[::Float::INFINITY, -::Float::INFINITY].include?(`item`)}) {
          let y = #{`item` - `compensation`},
              t = #{`result` + `y`};
          compensation = #{(`t` - `result`) - `y`};
          result = t;
        } else {
          result = #{`result` + `item`};
        }
      };

      self.$each();

      return result;
    }
  end

  def take(num)
    `self.$first(num)`
  end

  def take_while(&block)
    return enum_for :take_while unless block

    result = []

    each do |*args|
      value = ::Opal.destructure(args)

      unless yield(value)
        return result
      end

      `result.push(value)`
    end
  end

  def uniq(&block)
    %x{
      let hash = Opal.hash_new(),
          result = [];

      self.$each.$$p = function () {
        let value = #{::Opal.destructure(`arguments`)},
            produced = (block !== nil) ? $yield1(block, value) : value;

        if (Opal.hash_get(hash, produced) === undefined) {
          Opal.hash_put(hash, produced, value);
          result.push(value);
        }
      };

      self.$each();

      return result;
    }
  end

  def tally(hash = undefined)
    if `hash !== undefined`
      hash = ::Opal.coerce_to!(hash, ::Hash, :to_hash)
      `$deny_frozen_access(hash)`
    end

    %x{
      let out = (hash !== undefined) ? hash : Opal.hash_new();

      self.$each.$$p = function () {
        let item = #{::Opal.destructure(`arguments`)},
            count = Opal.hash_get(out, item);

        if (count === undefined) {
          count = 0;
        }

        Opal.hash_put(out, item, #{`count` + 1});
      };

      self.$each();

      return out;
    }
  end

  def to_h(*args, &block)
    return map(&block).to_h(*args) if block_given?

    %x{
      let hash = #{{}};

      self.$each.$$p = function() {
        let param = #{::Opal.destructure(`arguments`)};
        let ary = Opal.coerce_to_or_nil(param, Opal.Array, "to_ary"), key, val;
        if (!ary.$$is_array) {
          #{::Kernel.raise ::TypeError, "wrong element type #{`param`.class} (expected array)"}
        }
        if (ary.length !== 2) {
          #{::Kernel.raise ::ArgumentError, "element has wrong array length (expected 2, was #{`ary`.length})"}
        }
        key = ary[0];
        val = ary[1];

        Opal.hash_put(hash, key, val);
      };

      self.$each(...args);

      return hash;
    }
  end

  def to_set(klass = ::Set, *args, &block)
    `$send(klass, 'new', [self].concat(args), block)`
  end

  def zip(*others, &block)
    %x{
      // the block is not forwarded, as before
      let ary = self.$to_a();

      return ary.$zip.apply(ary, others);
    }
  end

  alias find detect
  alias filter find_all
  alias flat_map collect_concat
  alias map collect
  alias member? include?
  alias reduce inject
  alias select find_all
  alias to_a entries
end

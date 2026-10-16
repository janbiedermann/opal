# helpers: freeze, deny_frozen_access, hash_put, send, truthy, yield1, hash_get, hash_delete, thrower, eqeq
# backtick_javascript: true
# use_strict: true

# Portions Copyright (c) 2002-2013 Akinori MUSHA <knu@iDaemons.org>
class ::Set
  include ::Enumerable

  def self.[](*ary)
    new(ary)
  end

  def initialize(enum = nil, &block)
    @hash = {}

    return if enum.nil?
    ::Kernel.raise ::ArgumentError, 'value must be enumerable' unless ::Enumerable === enum

    if block
      enum.each { |item| add(yield(item)) }
    else
      merge(enum)
    end
  end

  def dup
    result = self.class.new
    result.merge(self)
  end

  def -(enum)
    unless enum.respond_to? :each
      ::Kernel.raise ::ArgumentError, 'value must be enumerable'
    end

    dup.subtract(enum)
  end

  def inspect
    "#<Set: {#{to_a.join(',')}}>"
  end

  def ==(other)
    %x{
      if (self === other) {
        return true;
      }

      // other.instance_of?(self.class), and its own @hash instead of
      // instance_variable_get(:@hash)
      if ($truthy(other['$instance_of?'](self.$$class))) {
        return $eqeq(self.hash, other.hash);
      }

      // is_a? goes through the method: a Set-like object may fake it
      if ($truthy(other['$is_a?'](#{::Set})) && self.hash.size === other.$size()) {
        // other.all? { |o| @hash.include?(o) }, with Hash#include? inlined
        let $return = $thrower('return');

        try {
          $send(other, 'each', [], function $$set_eq(o) {
            if ($hash_get(self.hash, o) === undefined) {
              $return.$throw(false, false);
            }
          });
        } catch ($e) {
          if ($e === $return) return $e.$v;
          throw $e;
        } finally {
          $return.is_orphan = true;
        }

        return true;
      }

      return false;
    }
  end

  def add(o)
    # left in Ruby: `@hash[o] = true` already compiles to one Hash call, and
    # the JS body with $deny_frozen_access + $hash_put measured slower (97 -> 105 ns)
    @hash[o] = true
    self
  end

  def classify(&block)
    return enum_for(:classify) unless block_given?

    result = ::Hash.new { |h, k| h[k] = self.class.new }

    # left in Ruby: the JS body measured the same (1552 -> 1555 ns), the cost is
    # the default-proc Hash#[] and Set#add
    each { |item| result[yield(item)].add item }

    result
  end

  def collect!(&block)
    return enum_for(:collect!) unless block_given?
    # left in Ruby: the JS body measured the same (1839 -> 1882 ns)
    result = self.class.new
    each { |item| result << yield(item) }
    replace result
  end

  def compare_by_identity
    if @hash.respond_to?(:compare_by_identity)
      @hash.compare_by_identity
      self
    else
      raise NotImplementedError, "#{self.class.name}\##{__method__} is not implemented"
    end
  end

  def compare_by_identity?
    @hash.respond_to?(:compare_by_identity?) && @hash.compare_by_identity?
  end

  def delete(o)
    @hash.delete(o)
    self
  end

  def delete?(o)
    if include?(o)
      delete(o)
      self
    end
  end

  def delete_if(&block)
    return enum_for(:delete_if) unless block_given?
    # @hash.delete_if should be faster, but using it breaks the order
    # of enumeration in subclasses.
    %x{
      let doomed = [];

      $send(self, 'each', [], function $$delete_if(o) {
        if ($truthy($yield1(block, o))) {
          doomed.push(o);
        }
      });

      delete_keys(self, doomed);

      return self;
    }
  end

  def freeze
    return self if frozen?

    @hash.freeze
    `$freeze(self)`
  end

  def keep_if(&block)
    return enum_for(:keep_if) unless block_given?
    %x{
      let doomed = [];

      $send(self, 'each', [], function $$keep_if(o) {
        if (!$truthy($yield1(block, o))) {
          doomed.push(o);
        }
      });

      delete_keys(self, doomed);

      return self;
    }
  end

  def reject!(&block)
    return enum_for(:reject!) unless block_given?
    before = size
    delete_if(&block)
    size == before ? nil : self
  end

  def select!(&block)
    return enum_for(:select!) unless block_given?
    before = size
    keep_if(&block)
    size == before ? nil : self
  end

  def add?(o)
    if include?(o)
      nil
    else
      add(o)
    end
  end

  def each(&block)
    return enum_for(:each) unless block_given?
    @hash.each_key(&block)
    self
  end

  def empty?
    `self.hash.size === 0`
  end

  def eql?(other)
    # `other.instance_eval { @hash }` reads the same ivar; instance_eval is the
    # cost. A missing ivar reads as nil, as `instance_eval` would give.
    %x{
      let other_hash = other.hash === undefined ? nil : other.hash;

      return self.hash['$eql?'](other_hash);
    }
  end

  def clear
    @hash.clear
    self
  end

  def include?(o)
    # Hash#include? is `$hash_get(self, key) !== undefined`
    `$hash_get(self.hash, o) !== undefined`
  end

  # the parameter is named `enumerable`, not `enum`: `enum` is a JavaScript
  # reserved word, so a %x{} body cannot reference it
  def merge(enumerable)
    %x{
      $send(enumerable, 'each', [], function $$merge(item) {
        $deny_frozen_access(self.hash);
        $hash_put(self.hash, item, true);
      });

      return self;
    }
  end

  def replace(enum)
    clear
    merge(enum)

    self
  end

  def size
    # Hash#size is an alias of #length, whose body is `self.size`
    `self.hash.size`
  end

  # `enumerable`, not `enum`: `enum` is a JavaScript reserved word
  def subtract(enumerable)
    %x{
      $send(enumerable, 'each', [], function $$subtract(item) {
        $deny_frozen_access(self.hash);
        $hash_delete(self.hash, item);
      });

      return self;
    }
  end

  def |(enum)
    unless enum.respond_to? :each
      ::Kernel.raise ::ArgumentError, 'value must be enumerable'
    end
    dup.merge(enum)
  end

  %x{
    function is_set(set) {
      #{`set`.is_a?(::Set) || ::Kernel.raise(::ArgumentError, 'value must be a set')}
    }

    // the keys `delete_if` and `keep_if` decided to drop
    function delete_keys(set, keys) {
      for (let i = 0, length = keys.length; i < length; i++) {
        $hash_delete(set.hash, keys[i]);
      }
    }

    // every element of `from` is in the Set `into`; the thrower stops the
    // walk at the first miss, like the `all?` these methods used to call
    function all_included(from, into) {
      let $return = $thrower('return');

      try {
        $send(from, 'each', [], function $$all_included(o) {
          if (!$truthy(into['$include?'](o))) {
            $return.$throw(false, false);
          }
        });
      } catch ($e) {
        if ($e === $return) return $e.$v;
        throw $e;
      } finally {
        $return.is_orphan = true;
      }

      return true;
    }
  }

  def superset?(set)
    `is_set(set)`
    `self.hash.size < set.$size() ? false : all_included(set, self)`
  end

  def proper_superset?(set)
    `is_set(set)`
    `self.hash.size <= set.$size() ? false : all_included(set, self)`
  end

  def subset?(set)
    `is_set(set)`
    `set.$size() < self.hash.size ? false : all_included(self, set)`
  end

  def proper_subset?(set)
    `is_set(set)`
    `set.$size() <= self.hash.size ? false : all_included(self, set)`
  end

  def intersect?(set)
    `is_set(set)`
    # left in Ruby: both branches stop at the first hit, so the thrower a JS
    # body needs costs more than Enumerable#any? saves (2919 -> 3313 ns)
    if size < set.size
      any? { |o| set.include?(o) }
    else
      set.any? { |o| include?(o) }
    end
  end

  def disjoint?(set)
    !intersect?(set)
  end

  def to_a
    @hash.keys
  end

  alias + |
  alias < proper_subset?
  alias << add
  alias <= subset?
  alias > proper_superset?
  alias >= superset?
  alias difference -
  alias filter! select!
  alias length size
  alias map! collect!
  alias member? include?
  alias union |
end

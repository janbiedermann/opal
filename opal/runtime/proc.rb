# backtick_javascript: true
# use_strict: true
# opal_runtime_mode: true
# helpers: apply_blockopts, raise

module ::Opal
  %x{
    function call_lambda(block, arg, ret) {
      try {
        block(arg);
      } catch (e) {
        if (e === ret) {
          return ret.$v;
        }
        throw e;
      }
    }

    // The paths of Opal.yield1 for the blocks that expand the yielded value
    // into their parameters, or that catch a return. Keeping them out of yield1
    // keeps it small enough for its callers to inline the fast path.
    function yield1_expanding(block, arg) {
      var has_mlhs = block.$$has_top_level_mlhs_arg,
          has_trailing_comma = block.$$has_trailing_comma_in_args,
          is_returning_lambda = block.$$is_lambda && block.$$ret;

      if (block.length > 1 || ((has_mlhs || has_trailing_comma) && block.length === 1)) {
        arg = Opal.to_ary(arg);
      }

      if ((block.length > 1 || (has_trailing_comma && block.length === 1)) && arg.$$is_array) {
        if (is_returning_lambda) {
          return call_lambda(block.apply.bind(block, null), arg, block.$$ret);
        }
        return block.apply(null, arg);
      }
      else {
        if (is_returning_lambda) {
          return call_lambda(block, arg, block.$$ret);
        }
        return block(arg);
      }
    }
  }

  def self.lambda(block, blockopts)
    %x{
      block.$$is_lambda = true;
      block.$$p = nil;

      $apply_blockopts(block, blockopts);

      return block;
    }
  end

  # Arity count error dispatcher for blocks
  #
  # @param actual [Fixnum] number of arguments given to block
  # @param expected [Fixnum] expected number of arguments
  # @param context [Object] context of the block definition
  # @raise [ArgumentError]
  def self.block_ac(actual, expected, context)
    %x{
      var inspect = "`block in " + context + "'";

      $raise(Opal.ArgumentError, inspect + ': wrong number of arguments (given ' + actual + ', expected ' + expected + ')');
    }
  end

  # handles yield calls for 1 yielded arg
  def self.yield1(block, arg)
    %x{
      if (typeof(block) !== "function") {
        $raise(Opal.LocalJumpError, "no block given");
      }

      // A block that takes a single argument and needs no array expansion is
      // called directly. Every function inherits $$direct = true, and the
      // compiler marks the blocks that do not with $$direct = false.
      if (block.length < 2 && block.$$direct === true) {
        return block(arg);
      }

      return yield1_expanding(block, arg);
    }
  end

  # handles yield for > 1 yielded arg
  def self.yieldX(block, args)
    %x{
      if (typeof(block) !== "function") {
        $raise(Opal.LocalJumpError, "no block given");
      }

      if (block.length > 1 && args.length === 1) {
        if (args[0].$$is_array) {
          args = args[0];
        }
      }

      if (block.$$is_lambda && block.$$ret) {
        return call_lambda(block.apply.bind(block, null), args, block.$$ret);
      }
      return block.apply(null, args);
    }
  end
  `Opal.prop(Function.prototype, '$$direct', true)`
end

::Opal

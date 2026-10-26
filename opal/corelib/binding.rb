# backtick_javascript: true

class ::Binding
  # @private
  def initialize(jseval, scope_variables = [], receiver = undefined, source_location = nil, irb_vars: nil)
    @jseval, @scope_variables, @receiver, @source_location = \
      jseval, scope_variables, receiver, source_location
    @irb_vars = irb_vars

    receiver = js_eval('self') if `typeof receiver === "undefined"`
  end

  # @api private
  # Set on TOPLEVEL_BINDING: an eval through this binding compiles with the
  # compiler's irb: option, whose locals live in Opal.irb_vars and therefore
  # persist across evals - the semantics irb.rb has (and that Kernel#eval
  # and the local_variable_* methods below follow this flag).
  attr_reader :irb_vars

  def js_eval(*args)
    if @jseval
      args.map! { |arg| `(typeof arg === "object" && arg.$$is_string)` ? `arg.toString()` : arg }
      @jseval.call(*args)
    else
      ::Kernel.raise 'Evaluation on a Proc#binding is not supported'
    end
  end

  def local_variable_get(symbol)
    if @irb_vars
      name = symbol.to_s
      unless `Object.prototype.hasOwnProperty.call(Opal.irb_vars || {}, name)`
        ::Kernel.raise ::NameError, "local variable `#{symbol}' is not defined for #{inspect}"
      end
      return `Opal.irb_vars[name]`
    end
    js_eval(symbol)
  rescue ::Exception
    ::Kernel.raise ::NameError, "local variable `#{symbol}' is not defined for #{inspect}"
  end

  def local_variable_set(symbol, value)
    if @irb_vars
      %x{
        if (!Opal.irb_vars) { Opal.irb_vars = {}; }
        Opal.irb_vars[#{symbol.to_s}] = #{value};
      }
      return value
    end
    `Opal.Binding.tmp_value = value`
    js_eval("#{symbol} = Opal.Binding.tmp_value")
    `delete Opal.Binding.tmp_value`
    value
  end

  def local_variables
    return `Object.keys(Opal.irb_vars || {})` if @irb_vars
    @scope_variables
  end

  def local_variable_defined?(value)
    return `Object.prototype.hasOwnProperty.call(Opal.irb_vars || {}, #{value.to_s})` if @irb_vars
    @scope_variables.include?(value)
  end

  def eval(str, file = nil, line = nil)
    return receiver if str == 'self'

    ::Kernel.eval(str, self, file, line)
  end

  attr_reader :receiver, :source_location
end

module ::Kernel
  def binding
    ::Kernel.raise ::NotImplementedError, "Opal doesn't support dynamic calls to binding"
  end
end

TOPLEVEL_BINDING = ::Binding.new(
  %x{
    function(js) {
      return (new Function("self", "return " + js))(self);
    }
  },
  [], self, ['<main>', 0],
  irb_vars: true
)

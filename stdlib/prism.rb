# backtick_javascript: true

# Prism: the Ruby-level parser API, on top of Opal's vendored JavaScript
# port of Prism 1.9 (lib/opal/parser, reached through require of its
# index.mjs and the Opal.esm registry the builder links).
#
# This is the interface IRB (stdlib/irb) lexes and parses with:
# Prism.parse/lex/parse_lex (with the scopes: option), ParseResult
# (#value/#errors/#warnings/#comments/#success?/#source), Token,
# ParseError, Location and a Visitor over the converted node tree.
#
# Offset model: the JavaScript parser reports UTF-16 code-unit offsets,
# C Prism reports UTF-8 bytes. The wrappers keep the parser's numbers as
# start_offset/end_offset (IRB only ever compares them with each other),
# but compute start_column/end_column as UTF-8 byte columns, because IRB
# slices lines with String#byteslice. Node classes are created on demand
# (const_missing), so `when Prism::CallNode` works whether or not such a
# node was ever wrapped.

require 'opal/parser/index.mjs'

module Prism
  JS = `Opal.esm["opal/parser/index"]`

  # The parsed text with the newline table of one parse: everything
  # Location needs to turn the parser's UTF-16 offsets into lines,
  # byte columns and source slices.
  class Context
    attr_reader :code, :start_line, :line_starts

    def initialize(envelope, code)
      @code = code
      @line_starts = `envelope.offsets.map(function (x) { return x; })`
      @start_line = `envelope.start_line || 1`
    end

    def line_start_for(offset)
      starts = @line_starts
      lo = 0
      hi = `starts.length - 1`
      while lo < hi
        mid = (lo + hi + 1) >> 1
        if `starts[mid]` <= offset
          lo = mid
        else
          hi = mid - 1
        end
      end
      `starts[lo]`
    end

    def line_for(offset)
      starts = @line_starts
      index = 0
      index += 1 while `index < starts.length && starts[index] <= offset`
      index + @start_line - 1
    end

    def byte_column(offset)
      from = line_start_for(offset)
      code = @code
      `String(code).slice(from, offset)`.bytesize
    end

    def slice(from, to)
      code = @code
      # Offsets are UTF-16 code units: slice in JavaScript, where String#[]
      # in Opal would index characters and misread a surrogate pair.
      `String(code).slice(from, to)`
    end
  end

  class Location
    attr_reader :start_offset, :end_offset

    def initialize(start, ending, context)
      @start_offset = start
      @end_offset = ending
      @context = context
    end

    def start_line = @context.line_for(@start_offset)
    def end_line = @context.line_for(@end_offset)
    def start_column = @context.byte_column(@start_offset)
    def end_column = @context.byte_column(@end_offset)

    def slice = @context.slice(@start_offset, @end_offset)

    def ==(other)
      other.is_a?(Location) &&
        @start_offset == other.start_offset &&
        @end_offset == other.end_offset &&
        @context.code == other._context.code
    end
    alias eql? ==

    def hash = @start_offset * 31 + @end_offset

    def to_range = @start_offset..@end_offset

    def inspect
      "#<Prism::Location start_offset=#{@start_offset} end_offset=#{@end_offset}>"
    end

    protected

    def _context = @context
  end

  class Token
    attr_reader :value, :location, :start_offset, :end_offset

    def initialize(pojo, context)
      @type = `#{pojo}.type`
      @start_offset = `#{pojo}.start`
      @end_offset = `#{pojo}.end`
      @value = `#{pojo}.value`
      @location = Location.new(@start_offset, @end_offset, context)
    end

    # "PM_TOKEN_KEYWORD_IF" -> :KEYWORD_IF, the names IRB compares against.
    def type
      @type.sub(/\APM_TOKEN_/, '').to_sym
    end

    def inspect
      "#<Prism::Token type=#{type.inspect} value=#{@value.inspect}>"
    end
  end

  class ParseError < StandardError
    attr_reader :location, :type, :level

    def initialize(message, location, type, level)
      super(message)
      @location = location
      @type = type
      @level = level
    end
  end

  class ParseWarning < StandardError
    attr_reader :location, :type

    def initialize(message, location, type)
      super(message)
      @location = location
      @type = type
    end
  end

  class Comment
    attr_reader :location

    def initialize(start, ending, context)
      @location = Location.new(start, ending, context)
    end

    def text = @location.slice
    def inline? = true
    def __END__? = false
  end

  class Source
    attr_reader :source

    def initialize(source)
      @source = source
    end
  end

  class Node
    def initialize(pojo, context)
      @pojo = pojo
      @context = context
    end

    # "IfNode" -> :if_node, "XStringNode" -> :x_string_node: the Prism gem's
    # underscore split, both lower/digit-to-upper and acronym-to-word
    # boundaries (the first rule alone answers :xstring_node and the node
    # then escapes the visit_x_string_node overrides that name it).
    def type
      @type ||= `#{@pojo}.type`
        .gsub(/([a-z0-9])([A-Z])/) { "#{$1}_#{$2}" }
        .gsub(/([A-Z]+)([A-Z][a-z])/) { "#{$1}_#{$2}" }
        .downcase.to_sym
    end

    def location
      @location ||= Location.new(`#{@pojo}.location.start`, `#{@pojo}.location.end`, @context)
    end

    def accept(visitor)
      visitor.visit(self)
    end

    def inspect
      "#<Prism::#{self.class.name.split('::').last} #{location.inspect}>"
    end

    # @private used by Visitor#visit_child_nodes
    def _children
      pojo = @pojo
      children = `(function () { var out = []; for (var key in pojo) { var v = pojo[key]; if (v === null || v === undefined) continue; if (typeof v === 'object' && typeof v.type === 'string' && v.type.slice(-4) === 'Node') { out.push(v); } else if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { var e = v[i]; if (e !== null && typeof e === 'object' && typeof e.type === 'string' && e.type.slice(-4) === 'Node') out.push(e); } } } return out; })()`
      Node.wrap_all(children, @context)
    end

    def method_missing(name, *args, &block)
      pojo = @pojo
      key = name.to_s
      loc_key = "#{key}_loc"
      return Node.wrap(`pojo[key]`, @context, key) if `Object.prototype.hasOwnProperty.call(pojo, key)`
      # C Prism serializes only the keyword's location; the Ruby API
      # exposes the keyword text as well (if_keyword, end_keyword,
      # opening, closing, ...): the text at that location, nil if absent.
      if `Object.prototype.hasOwnProperty.call(pojo, loc_key)`
        loc = `pojo[loc_key]`
        return nil if `loc === null || loc === undefined`
        return @context.slice(`loc.start`, `loc.end`)
      end
      super
    end

    def respond_to_missing?(name, include_private = false)
      pojo = @pojo
      key = name.to_s
      `Object.prototype.hasOwnProperty.call(pojo, key) ||
       Object.prototype.hasOwnProperty.call(pojo, key + "_loc")` || super
    end

    # @private
    def self.wrap(value, context, key = nil)
      if `value === null || value === undefined`
        # Prism's Ruby API answers an empty Array for an absent statement
        # body; IRB does statements.body.last on every input.
        return [] if key == 'body'
        return nil
      end
      return value if `typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'`
      return wrap_all(value, context) if `Array.isArray(value)`
      return wrap_node(value, context) if `typeof value === 'object' && typeof value.type === 'string'`
      return Location.new(`value.start`, `value.end`, context) if `typeof value === 'object' && typeof value.start === 'number'`
      value
    end

    # @private
    def self.wrap_all(array, context)
      array.map { |value| wrap(value, context) }
    end

    # @private
    def self.wrap_node(pojo, context)
      type = `pojo.type`
      klass = ::Prism.const_defined?(type, false) ? ::Prism.const_get(type) : ::Prism.const_set(type, Class.new(Node))
      klass.new(pojo, context)
    end
  end

  # Node classes appear on demand: `Prism::CallNode`, `Prism::IfNode`, ...,
  # which keeps `case node when Prism::CallNode` and ruby-lex's
  # `node.class.name.match?(/WriteNode/)` working with nothing pre-generated.
  def self.const_missing(name)
    return const_set(name, Class.new(Node)) if name.to_s.match?(/\A[A-Z][A-Za-z0-9]*Node\z/)
    super
  end

  # Every node type the parser can emit, in the snake_case the visitor
  # methods dispatch on - the list of the vendored parser's node converters
  # (lib/opal/parser/convert.mjs) underscore-split like the Prism gem does.
  # Regenerate it if the parser is updated.
  NODE_TYPES = %w[
    alias_global_variable_node alias_method_node alternation_pattern_node and_node
    arguments_node array_node array_pattern_node assoc_node assoc_splat_node
    back_reference_read_node begin_node block_node block_argument_node
    block_local_variable_node block_parameter_node block_parameters_node
    break_node call_node call_and_write_node call_operator_write_node
    call_or_write_node call_target_node capture_pattern_node case_node
    case_match_node class_node class_variable_and_write_node
    class_variable_operator_write_node class_variable_or_write_node
    class_variable_read_node class_variable_target_node class_variable_write_node
    constant_and_write_node constant_operator_write_node constant_or_write_node
    constant_path_node constant_path_and_write_node
    constant_path_operator_write_node constant_path_or_write_node
    constant_path_target_node constant_path_write_node constant_read_node
    constant_target_node constant_write_node def_node defined_node else_node
    embedded_statements_node embedded_variable_node ensure_node false_node
    find_pattern_node flip_flop_node float_node for_node
    forwarding_arguments_node forwarding_parameter_node forwarding_super_node
    global_variable_and_write_node global_variable_operator_write_node
    global_variable_or_write_node global_variable_read_node
    global_variable_target_node global_variable_write_node hash_node
    hash_pattern_node if_node imaginary_node implicit_node implicit_rest_node
    in_node index_and_write_node index_operator_write_node index_or_write_node
    index_target_node instance_variable_and_write_node
    instance_variable_operator_write_node instance_variable_or_write_node
    instance_variable_read_node instance_variable_target_node
    instance_variable_write_node integer_node interpolated_match_last_line_node
    interpolated_regular_expression_node interpolated_string_node
    interpolated_symbol_node interpolated_x_string_node
    it_local_variable_read_node it_parameters_node keyword_hash_node
    keyword_rest_parameter_node lambda_node local_variable_and_write_node
    local_variable_operator_write_node local_variable_or_write_node
    local_variable_read_node local_variable_target_node local_variable_write_node
    match_last_line_node match_predicate_node match_required_node
    match_write_node missing_node module_node multi_target_node
    multi_write_node next_node nil_node no_keywords_parameter_node
    numbered_parameters_node numbered_reference_read_node
    optional_keyword_parameter_node optional_parameter_node or_node
    parameters_node parentheses_node pinned_expression_node
    pinned_variable_node post_execution_node pre_execution_node program_node
    range_node rational_node redo_node regular_expression_node
    required_keyword_parameter_node required_parameter_node rescue_node
    rescue_modifier_node rest_parameter_node retry_node return_node self_node
    shareable_constant_node singleton_class_node source_encoding_node
    source_file_node source_line_node splat_node statements_node string_node
    super_node symbol_node true_node undef_node unless_node until_node
    when_node while_node x_string_node yield_node
  ].freeze
  private_constant :NODE_TYPES

  class Visitor
    # Prism dispatches accept() to visit_<type>_node. The recursive base
    # method for every node type lives on Visitor from load time, so a
    # subclass override calling `super` always finds its parent - including
    # when reached under an alias name, where `super` binds the *defining*
    # method's name (IRB's NestingVisitor aliases visit_x_string_node to
    # visit_interpolated_x_string_node, whose super would miss a gate keyed
    # only on the dispatched name).
    NODE_TYPES.each do |type|
      define_method(:"visit_#{type}") { |node| visit_child_nodes(node) }
    end

    def visit(node)
      send(:"visit_#{node.type}", node)
    end

    def visit_all(nodes)
      nodes.map { |node| visit(node) }
    end

    def visit_child_nodes(node)
      node._children.each { |child| visit(child) }
    end
  end

  class ParseResult
    def initialize(envelope, code, mode)
      @envelope = envelope
      @code = code
      @mode = mode
      @context = Context.new(envelope, code)
      @source = Source.new(code)
    end

    attr_reader :source

    def data_loc
      loc = `#{@envelope}.data_loc`
      return nil if loc == nil
      Location.new(`loc.start`, `loc.end`, @context)
    end

    def value
      @value ||=
        case @mode
        when :parse     then Node.wrap(`#{@envelope}.ast`, @context)
        when :lex       then token_pairs
        when :parse_lex then [Node.wrap(`#{@envelope}.ast`, @context), token_pairs]
        end
    end

    def comments
      @comments ||= `#{@envelope}.comments || []`.map do |pojo|
        Comment.new(`pojo.start`, `pojo.end`, @context)
      end
    end

    def errors
      @errors ||= diagnostics(`#{@envelope}.errors`, ParseError)
    end

    def warnings
      @warnings ||= diagnostics(`#{@envelope}.warnings`, ParseWarning)
    end

    def success? = `#{@envelope}.errors.length === 0`

    private

    def token_pairs
      `#{@envelope}.tokens || []`.map do |pojo|
        token = Token.new(pojo, @context)
        [token, token.location]
      end
    end

    def diagnostics(list, klass)
      list.map do |pojo|
        klass.new(`pojo.message`,
                  Location.new(`pojo.start`, `pojo.end`, @context),
                  `pojo.type`.to_sym,
                  `pojo.level`.to_sym)
      end
    end
  end

  class << self
    def parse(source, **options)
      ParseResult.new(run(:parseWithMetadata, source, options, false), source, :parse)
    end

    def parse_lex(source, **options)
      ParseResult.new(run(:parseWithMetadata, source, options, true), source, :parse_lex)
    end

    def lex(source, **options)
      ParseResult.new(run(:lexWithMetadata, source, options, false), source, :lex)
    end

    def parse_success?(source, **options)
      parse(source, **options).success?
    end

    private

    def run(method_name, source, options, want_tokens)
      opts = js_options(options)
      source = `String(#{source})` # the parser wants a primitive string
      # lexWithMetadata ignores the third argument; parseWithMetadata wants it.
      return `#{JS}[#{method_name}](#{source}, opts, want_tokens)`
    end

    # The C port's pm_options shape: scopes are lists of local-variable
    # names, innermost scope first (IRB passes scopes: [local_variables]).
    def js_options(options)
      scopes = options[:scopes] || []
      line = options[:line]
      %x{
        var o = {};
        if (scopes.length > 0) {
          o.scopes_count = scopes.length;
          o.scopes = [];
          for (var si = 0; si < scopes.length; si++) {
            var locals = [];
            var given = [].concat(scopes[si] || []);
            for (var li = 0; li < given.length; li++) {
              var name = given[li];
              if (name === null || name === undefined || name === Opal.nil) continue;
              locals.push(String(name));
            }
            o.scopes.push({ locals_count: locals.length, locals: locals });
          }
        }
        if (line !== null && line !== undefined && line !== Opal.nil) o.line = Number(line);
        return o;
      }
    end
  end
end

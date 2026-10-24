# The indexer's AST listener: the one-pass walker that turns a document's
# tree into index records. It answers the same dispatcher events
# ruby-lsp's declaration_listener answers (on_class_node_enter etc), over
# this project's POJO Node, and builds plain string-keyed Ruby Hashes -
# the live workspace records; the bake driver serializes the same shape to
# POJO literals. Constant resolution is nesting-aware for declarations
# (`class Foo; class Bar` records "Foo::Bar") and deliberately simple for
# references (raw names - the references request matches on them).
# backtick_javascript: true
require 'opal/language-server/prism/dispatcher'

module Opal
  module LanguageServer
    class DeclarationListener
      # Index payload: name-keyed maps to record hashes (live shape).
      attr_reader :modules, :constants, :constant_references, :method_references

      # file: the record's file key (a document uri for live documents, a
      # checkout-relative path for the bake).
      def initialize(file, parse_result)
        @file = file
        @parse_result = parse_result
        @modules = {}          # fqcn => [module record]
        @constants = {}        # CONST => [location] (non-module constant writes)
        @constant_references = {} # NAME => [location]
        @method_references = {}   # name => [location]; live only - the bake
                                  # skips it (corelib call sites would triple
                                  # the payload for a scope the references
                                  # request does not cover)
        @nesting = []
        @comments_by_end_line = nil
      end

      def index!
        Dispatcher.new(self).walk(@parse_result.ast)
        self
      end

      # ---- declarations ----

      def on_class_node_enter(node)
        declare_module(node.name || const_path_name(node.child("constant_path")),
                       node, superclass_of(node), "class")
      end

      def on_module_node_enter(node)
        declare_module(const_path_name(node.child("constant_path")), node, nil, "module")
      end

      def on_class_node_leave(_node)
        @nesting.pop
      end
      alias on_module_node_leave on_class_node_leave

      def on_constant_write_node_enter(node)
        add_entry(@constants, node.name, node.to_range)
      end

      # ---- references ----

      def on_constant_read_node_enter(node)
        add_entry(@constant_references, node.name, node.to_range)
      end

      def on_constant_path_node_enter(node)
        name = node.name
        add_entry(@constant_references, name, @parse_result.range_for_loc(node.raw("name_loc")) || node.to_range) unless name.nil?
      end

      # ---- module body calls: includes and attribute methods ----

      def on_call_node_enter(node)
        add_entry(@method_references, node.name, @parse_result.range_for_loc(node.raw("message_loc")) || node.to_range)
        return unless @nesting.any?
        return if !node.absent?("receiver") # qualified calls never manage a module
        case node.name
        when "include", "extend", "prepend"
          args = node.child("arguments")
          return if args.nil?
          names = args.children("arguments").map(&:name).compact
          target = current_module
          key = { "include" => "includes", "extend" => "extends", "prepend" => "prepends" }[node.name]
          names.each { |name| (target[key] ||= []) << name }
        when "attr_accessor", "attr_reader", "attr_writer"
          add_attribute_methods(node)
        end
      end

      # ---- methods ----

      def on_def_node_enter(node)
        return if @nesting.empty?
        singleton = !node.absent?("receiver")
        record = current_module
        bucket = singleton ? (record["singleton_methods"] ||= {}) : (record["methods"] ||= {})
        (bucket[node.name] ||= []) << {
          "file" => @file,
          "range" => @parse_result.range_for_loc(node.raw("name_loc")) || node.to_range,
          "full_range" => node.to_range,
          "comments" => comments_above(node),
          "parameters" => parameters_of(node),
          "module" => record["name"],
        }
      end

      private

      def declare_module(raw_name, node, superclass, kind)
        return if raw_name.nil?
        fqcn = qualify(raw_name)
        path = node.child("constant_path")
        record = {
          "name" => fqcn,
          "kind" => kind,
          "file" => @file,
          "range" => node.to_range,
          # the name segment alone: definition/rename edits target it,
          # not the whole class body
          "name_range" => path ? path.to_range : node.to_range,
          "comments" => comments_above(node),
          "superclass" => superclass,
          "includes" => [],
          "prepends" => [],
          "extends" => [],
          "methods" => {},
          "singleton_methods" => {},
        }
        (@modules[fqcn] ||= []) << record
        @nesting.push(fqcn)
      end

      def current_module
        @modules[@nesting.last].last
      end

      # "Bar" under nesting ["Foo"] => "Foo::Bar"; absolute names pass
      # through, and the common top-level case is just the name.
      def qualify(name)
        return name.sub(/\A::/, "") if name.start_with?("::")
        return name if @nesting.empty?
        "#{@nesting.last}::#{name}"
      end

      def const_path_name(path)
        return nil if path.nil?
        path.name
      end

      def superclass_of(node)
        sup = node.child("superclass")
        return nil if sup.nil?
        name = sup.name
        return nil if name.nil? # a non-constant superclass (Struct.new(...)...)
        qualify(name)
      end

      def add_attribute_methods(node)
        record = current_module
        args = node.child("arguments")
        return if args.nil?
        names = args.children("arguments").map(&:unescaped).compact
        case node.name
        when "attr_reader"
          names.each { |n| add_generated_method(record, n, node) }
        when "attr_writer"
          names.each { |n| add_generated_method(record, "#{n}=", node) }
        when "attr_accessor"
          names.each do |n|
            add_generated_method(record, n, node)
            add_generated_method(record, "#{n}=", node)
          end
        end
      end

      def add_generated_method(record, name, node)
        (record["methods"][name] ||= []) << {
          "file" => @file,
          "range" => node.to_range,
          "full_range" => node.to_range,
          "comments" => nil,
          "parameters" => "(*)",
          "module" => record["name"],
          "generated" => true,
        }
      end

      def add_entry(map, name, range)
        return if name.nil?
        (map[name] ||= []) << { "file" => @file, "range" => range }
      end

      # RDoc-style doc: the run of comments ending just above the node's
      # line, joined back into one string (the baked records carry these,
      # so hover never re-parses corelib comments at run time).
      def comments_above(node)
        build_comment_index unless @comments_by_end_line
        line, = node.start_position
        found = []
        loop do
          comment = @comments_by_end_line[line - 1]
          break if comment.nil?
          found.unshift(comment["text"])
          line = comment["line"]
        end
        found.empty? ? nil : found.join("\n")
      end

      def build_comment_index
        @comments_by_end_line = {}
        text_of = source_lines
        @parse_result.comments.each do |comment|
          s_line, = @parse_result.position_at(comment["start"])
          e_line, = @parse_result.position_at(comment["end"])
          text = (s_line..e_line).map { |l| (text_of[l] || "").rstrip }.join("\n")
          @comments_by_end_line[e_line] = { "line" => s_line, "text" => text }
        end
      end

      def source_lines
        @source_lines ||= @parse_result.source.split("\n")
      end

      # "(a, b = 1, *rest, key:, **opts, &blk)" - enough for signature help
      # and hover; the details matter less than presence (P4 refines).
      def parameters_of(node)
        params = node.child("parameters")
        return "()" if params.nil?
        parts = []
        parts.concat(params.children("requireds").map(&:name).compact)
        parts.concat(params.children("optionals").map { |p| "#{p.name} = …" })
        rest = params.child("rest")
        parts << "*#{rest.name || ''}" unless rest.nil?
        parts.concat(params.children("posts").map(&:name).compact)
        params.children("keywords").each { |k| parts << "#{k.name}:" }
        krest = params.child("keyword_rest")
        parts << "**#{krest.name || ''}" unless krest.nil?
        block = params.child("block")
        parts << "&#{block.name || 'block'}" unless block.nil?
        "(#{parts.compact.join(', ')})"
      end
    end
  end
end

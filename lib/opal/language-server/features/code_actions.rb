# backtick_javascript: true
# textDocument/codeAction: mechanical quickfixes for the gate diagnostics
# (LSP.md §2 gate 3). The client hands the diagnostics back in the request
# context, so a fix only needs to recognize its code and re-locate the node
# that produced it by the diagnostic's exact range start.
#
# v1 fixes, all single-edit:
#  * unsupported.string-mutation -> drop the bang (the non-bang method is
#    the Opal answer: "a".gsub!(x, y) becomes "a".gsub(x, y) at the call).
#  * unsupported.require        -> remove the require call.
#  * compile-warning /o         -> delete the /o flag character (the flag
#    array says "once", the source ends with the o after the closer).
# Plus one refactor: a single-line selection extracts to a local named
# `extracted` (refactor.extract, P7) - only when the selection itself
# parses as exactly one expression.
require 'opal/language-server/features/navigation_target'

module Opal
  module LanguageServer
    module CodeActionsFeature
      class << self
        def perform(document, context, range, only = nil)
          diagnostics = (context || {})["diagnostics"] || []
          parse_result = document.parse!
          actions = []
          allowed = only.nil? || only.empty? ? nil : only
          if kind_allowed?(allowed, "quickfix")
            diagnostics.each do |diagnostic|
              case diagnostic["code"]
              when "unsupported.string-mutation"
                node = find_call_at(parse_result.ast, diagnostic["range"])
                actions << drop_bang(document, parse_result, diagnostic, node) unless node.nil?
              when "unsupported.string-append"
                node = find_call_at(parse_result.ast, diagnostic["range"])
                actions << append_to_plus(document, parse_result, diagnostic, node) unless node.nil?
              when "unsupported.require"
                node = find_call_at(parse_result.ast, diagnostic["range"])
                actions << remove_call(document, diagnostic, node, "Remove this require - Opal does not provide it") unless node.nil?
              when "unsupported.thread", "unsupported.fiber", "unsupported.data-define"
                # The call itself is the unsupported API; removal is offered
                # as a suggestion (the code cannot work as written anyway).
                node = find_call_at(parse_result.ast, diagnostic["range"])
                actions << remove_call(document, diagnostic, node, "Remove this call - Opal does not have it") unless node.nil?
              when "compile-warning"
                next unless diagnostic["message"].include?("Skipping the 'o' Regexp flag")
                node = find_once_regexp_at(parse_result.ast, diagnostic["range"]["start"]["line"])
                next if node.nil?
                fix = drop_o_flag(document, parse_result, diagnostic, node)
                actions << fix unless fix.nil?
              end
            end
          end
          if kind_allowed?(allowed, "refactor.extract")
            extract = extract_variable(document, parse_result, range)
            actions << extract unless extract.nil?
          end
          if kind_allowed?(allowed, "refactor.extract.method")
            extracted = extract_method(document, parse_result, range)
            actions << extracted unless extracted.nil?
          end
          actions
        end

        private

        # LSP `only` is exact-kind matching, but an advertised parent kind
        # asks for its subkinds too, so compare on the dot-separated prefix.
        def kind_allowed?(allowed, kind)
          allowed.nil? || allowed.any? { |a| kind == a || kind.start_with?("#{a}.") }
        end

        # refactor.extract.method (LSP.md §9 P7): v1 extracts only within
        # a method body, single-line selections, the new def spliced right
        # below the enclosing one. Bare identifiers in the selection that
        # are locals or parameters of the enclosing def become arguments;
        # uses of block parameters (their scope would not survive the
        # move), of keyword params, of return/break/next or of super all
        # refuse rather than mis-transform.
        def extract_method(document, parse_result, range)
          return nil if range.nil?
          start_at = range["start"]
          end_at = range["end"]
          return nil if start_at["line"] != end_at["line"] || start_at == end_at
          line = start_at["line"]
          from = parse_result.offset_for(line, start_at["character"])
          to = parse_result.offset_for(line, end_at["character"])
          selection = document.source[from...to]
          return nil if selection.nil? || selection.strip.empty?
          check = ParseResult.new(selection)
          return nil if check.syntax_error?
          return nil if `check.envelope.ast.statements.body.length !== 1`
          def_node = enclosing_def(parse_result.ast, start_at, end_at)
          return nil if def_node.nil?

          refuse = false
          free = []
          stack = [check.ast]
          while (node = stack.pop)
            case node.type
            when "ReturnNode", "BreakNode", "NextNode", "ZSuperNode", "SuperNode"
              refuse = true
            when "VCallNode"
              free << node.name
            when "CallNode"
              # Opal's parser answers a bare identifier as a receiverless
              # CallNode; names the enclosing def does not own are real
              # method calls and stay in the body untouched.
              free << node.name if node.child("receiver").nil?
            when "LocalVariableReadNode"
              free << node.name
            end
            stack.concat(node.child_nodes)
          end
          return nil if refuse
          return nil if free.any? { |name| def_block_param_names(def_node).include?(name) }

          names = def_own_names(def_node) # nil: keyword params in play
          return nil if names.nil?
          args = (free.uniq & names)

          indent = line_indent(document, parse_result, def_node)
          return nil if indent.nil?
          receiver = def_node.child("receiver")
          prefix = ""
          unless receiver.nil?
            return nil unless receiver.type == "SelfNode" # def on another object: out of scope
            prefix = "self."
          end

          name = "extracted"
          sig = args.empty? ? "" : "(#{args.join(', ')})"
          call = args.empty? ? name : "#{name}(#{args.join(', ')})"
          end_line = def_node.to_range["end"]["line"]
          at = { "line" => end_line, "character" => parse_result.line_range(end_line)["end"]["character"] }
          insert = {
            "range" => { "start" => at, "end" => at },
            "newText" => "\n#{indent}def #{prefix}#{name}#{sig}\n#{indent}  #{selection.strip}\n#{indent}end",
          }
          replace = { "range" => range, "newText" => call }
          {
            "title" => "Extract to method",
            "kind" => "refactor.extract.method",
            "edit" => { "changes" => { document.uri => [insert, replace] } },
          }
        end

        def enclosing_def(ast, start_at, end_at)
          found = nil
          stack = [ast]
          while (node = stack.pop)
            if node.type == "DefNode" && range_contains?(node.to_range, start_at, end_at)
              if found.nil? || range_contains?(found.to_range, node.to_range["start"], node.to_range["end"])
                found = node
              end
            end
            stack.concat(node.child_nodes)
          end
          found
        end

        def range_contains?(range, start_at, end_at)
          after_start = start_at["line"] > range["start"]["line"] ||
            (start_at["line"] == range["start"]["line"] && start_at["character"] >= range["start"]["character"])
          before_end = end_at["line"] < range["end"]["line"] ||
            (end_at["line"] == range["end"]["line"] && end_at["character"] <= range["end"]["character"])
          after_start && before_end
        end

        # The enclosing def's own name space: plain parameters plus every
        # assignment target. nil answers when keyword parameters are in
        # play (their extraction needs `key: key` plumbing v1 declines).
        def def_own_names(def_node)
          names = []
          params = def_node.child("parameters")
          unless params.nil?
            params.child_nodes.each do |p|
              next unless p.type.end_with?("ParameterNode")
              return nil if p.type.include?("Keyword")
              name = p.raw("name")
              names << name unless name.nil?
            end
          end
          stack = [def_node]
          while (node = stack.pop)
            names << node.raw("name") if node.type == "LocalVariableWriteNode"
            stack.concat(node.child_nodes)
          end
          names
        end

        def def_block_param_names(def_node)
          names = []
          stack = [def_node]
          while (node = stack.pop)
            if node.type == "BlockParametersNode"
              node.child_nodes.each do |params|
                params.child_nodes.each do |p|
                  next unless p.type.end_with?("ParameterNode")
                  name = p.raw("name")
                  names << name unless name.nil?
                end
              end
            end
            stack.concat(node.child_nodes)
          end
          names
        end

        # The blank (spaces/tabs) in front of the enclosing def's `def`
        # keyword, reused for the inserted one.
        def line_indent(document, parse_result, def_node)
          start_at = def_node.to_range["start"]
          from = parse_result.offset_for(start_at["line"], 0)
          to = parse_result.offset_for(start_at["line"], start_at["character"])
          indent = document.source[from...to]
          indent =~ /\A[ \t]*\z/ ? indent : nil
        end

        # refactor.extract (LSP.md §9 P7): pure-text, single-line only.
        # The selection must parse as exactly one expression (the check
        # assignment below has a single statement and no syntax error),
        # or there is no action: extracting part of a multiline
        # expression, or a statement list, would change the program.
        def extract_variable(document, parse_result, range)
          return nil if range.nil?
          start_at = range["start"]
          end_at = range["end"]
          return nil if start_at["line"] != end_at["line"] || start_at == end_at
          line = start_at["line"]
          from = parse_result.offset_for(line, start_at["character"])
          to = parse_result.offset_for(line, end_at["character"])
          selection = document.source[from...to]
          return nil if selection.nil? || selection.empty?
          check = ParseResult.new("x = #{selection}")
          return nil if check.syntax_error?
          return nil if `check.envelope.ast.statements.body.length !== 1`
          # Match the enclosing statement's indentation when the new line
          # is spliced in above it.
          indent = `(() => { var s = String(#{document.source}), i = #{parse_result.offset_for(line, 0)};
            while (i < s.length && s[i] === " ") i++; return s.slice(#{parse_result.offset_for(line, 0)}, i); })()`
          insert = {
            "range" => { "start" => { "line" => line, "character" => 0 },
                         "end" => { "line" => line, "character" => 0 } },
            "newText" => "extracted = #{selection}\n#{indent}",
          }
          replace = { "range" => range, "newText" => "extracted" }
          {
            "title" => "Extract to local variable",
            "kind" => "refactor.extract",
            "edit" => { "changes" => { document.uri => [insert, replace] } },
          }
        end

        # The CallNode whose range starts exactly where the diagnostic says
        # it does - to_range built the diagnostic, so the match is exact.
        def find_call_at(ast, range)
          line = range["start"]["line"]
          character = range["start"]["character"]
          stack = [ast]
          while (node = stack.pop)
            if node.type == "CallNode" && !node.absent?("message_loc")
              start_at = node.to_range["start"]
              return node if start_at["line"] == line && start_at["character"] == character
            end
            stack.concat(node.child_nodes)
          end
          nil
        end

        # A /.../ literal carrying the "once" flag on that line. The flag
        # list is a field of the wrapped POJO - read it through Node#raw,
        # never as a JS property of the wrapper.
        def find_once_regexp_at(ast, line)
          stack = [ast]
          while (node = stack.pop)
            if node.type == "RegularExpressionNode" && node.to_range["start"]["line"] == line
              flags = node.raw("flags")
              count = `flags == null || flags === nil ? 0 : flags.length`
              count.times do |i|
                return node if `flags[#{i}] === "once"`
              end
            end
            stack.concat(node.child_nodes)
          end
          nil
        end

        def drop_bang(document, parse_result, diagnostic, node)
          message = parse_result.range_for_loc(node.raw("message_loc"))
          end_at = message["end"]
          name = node.name
          edit = {
            "range" => { "start" => { "line" => end_at["line"], "character" => end_at["character"] - 1 },
                         "end" => end_at },
            "newText" => "",
          }
          action(document, diagnostic, "Use String##{name[0...-1]} - String is immutable in Opal", edit)
        end

        def remove_call(document, diagnostic, node, title)
          edit = { "range" => node.to_range, "newText" => "" }
          action(document, diagnostic, title, edit)
        end

        def append_to_plus(document, parse_result, diagnostic, node)
          message = parse_result.range_for_loc(node.raw("message_loc"))
          edit = { "range" => message, "newText" => "+=" }
          action(document, diagnostic, "Use += - String is immutable in Opal", edit)
        end

        def drop_o_flag(document, parse_result, diagnostic, node)
          # The character to delete is the "o" flag right after the closer;
          # when the flags end differently (an unusual /foi order), no fix.
          end_offset = node.location_end
          ok = `(() => { var s = String(#{document.source}), e = #{end_offset};
            return s[e - 1] === "o" && !/[A-Za-z0-9_]/.test(s[e - 2]) ? true : false; })()`
          return nil if `ok === false`
          end_at = parse_result.position_at(end_offset)
          start_at = parse_result.position_at(end_offset - 1)
          edit = {
            "range" => { "start" => { "line" => start_at[0], "character" => start_at[1] },
                         "end" => { "line" => end_at[0], "character" => end_at[1] } },
            "newText" => "",
          }
          action(document, diagnostic, "Drop the /o flag - Opal ignores it", edit)
        end

        def action(document, diagnostic, title, edit)
          {
            "title" => title,
            "kind" => "quickfix",
            "diagnostics" => [diagnostic],
            "edit" => { "changes" => { document.uri => [edit] } },
          }
        end
      end
    end
  end
end

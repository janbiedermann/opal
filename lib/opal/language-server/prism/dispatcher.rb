require 'opal/language-server/prism/node'

module Opal
  module LanguageServer
    # The Prism::Dispatcher shape this project can actually run: it walks the
    # POJO tree and calls on_<type>_enter / on_<type>_leave (snake_case Prism
    # names) on each listener that answers them, exactly the naming the
    # ruby-lsp listeners use, so those port without renaming (LSP.md §4.1).
    # The real prism gem's Dispatcher needs parse_lex tokens and C extensions;
    # this one needs only the envelope.
    class Dispatcher
      def initialize(*listeners)
        @listeners = listeners
      end

      # Depth-first, children in source order. `node` is already a
      # language-server Node (carries the ParseResult for position math).
      def walk(node)
        name = node.visitor_name
        enter = "on_#{name}_enter"
        leave = "on_#{name}_leave"

        @listeners.each { |l| l.send(enter, node) if l.respond_to?(enter) }
        node.child_nodes.each { |child| walk(child) }
        @listeners.each { |l| l.send(leave, node) if l.respond_to?(leave) }
      end
    end
  end
end

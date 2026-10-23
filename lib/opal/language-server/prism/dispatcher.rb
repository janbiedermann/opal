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
      # Listeners answer the Prism per-type names (on_class_node_enter, the
      # ruby-lsp porting shape) *or* the generic on_node_enter/on_node_leave
      # for whole-tree scans.
      def walk(node)
        name = node.visitor_name
        enter = "on_#{name}_enter"
        leave = "on_#{name}_leave"

        @listeners.each do |l|
          l.on_node_enter(node) if l.respond_to?(:on_node_enter)
          l.send(enter, node) if l.respond_to?(enter)
        end
        node.child_nodes.each { |child| walk(child) }
        @listeners.each do |l|
          l.on_node_leave(node) if l.respond_to?(:on_node_leave)
          l.send(leave, node) if l.respond_to?(leave)
        end
      end
    end
  end
end

# NOTE: run bin/format-filters after changing this file
# The compiler implements Ruby 4.0 syntax (Prism); these specs expect the
# behaviour or messages of older parsers (see POTCH.md).
opal_unsupported_filter "Ruby 4.0 syntax" do
  fails "A lambda literal -> () { } assigns variables from parameters with circular optional argument reference raises a SyntaxError if there is an existing method with the same name as the argument" # Ruby 3.4: no circular argument reference error
  fails "A lambda literal -> () { } assigns variables from parameters with circular optional argument reference raises a SyntaxError if using an existing local with the same name as the argument" # Ruby 3.4: no circular argument reference error
  fails "An instance method with a default argument raises a SyntaxError when there is an existing method with the same name as the local variable" # Ruby 3.4: no circular argument reference error
  fails "Post-args with optional args with a circular argument reference raises a SyntaxError if there is an existing method with the same name as the argument" # Ruby 3.4: no circular argument reference error
  fails "Post-args with optional args with a circular argument reference raises a SyntaxError if using an existing local with the same name as the argument" # Ruby 3.4: no circular argument reference error
  fails "Pattern matching Hash pattern does not support non-symbol keys" # Prism: "expected a label as the key in the hash pattern"
  fails "Pattern matching does not allow calculation or method calls in a pattern" # Prism: "expected a delimiter after the patterns of an `in` clause"
end

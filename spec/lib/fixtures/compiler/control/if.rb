if a; b; end
x = a ? b : c
unless a; b; else; c; end
if a; elsif b; c; end
x = if a; b; else; c; end
if a && b || c; d; end
if RUBY_ENGINE == "opal"; a; else; b; end
foo if bar

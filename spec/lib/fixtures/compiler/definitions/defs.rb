def m; end
def m(a, b = 1, *c, d, e:, f: 2, **g, &h); a; end
def m(a, b: 1); b; end
def self.m(a) = a
def m(*, **, &) = g(*, **, &)
def m(...) = g(...)
def m(_, _); end
def m((a, b)); end
def m(var); var; end

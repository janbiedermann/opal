# backtick_javascript: true
`foo`
x = `bar`
%x{
  baz(#@a);
}
@memo ||= begin
  a
  %x{
    var v = 1;
    return v;
  }
end
def m; `return 1;`; end
def n; `a + #{b}`; end

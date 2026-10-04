case x; when 1; a; when 2, 3; b; else; c; end
case x; when Foo; a; when *bar; b; end
y = case; when a; 1; end
def m(x)
  case x
  when "a" then 1
  when :b then 2
  else 3
  end
end

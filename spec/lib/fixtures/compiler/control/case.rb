# backtick_javascript: true
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
# a literal subject: JavaScript cannot take a property off `1`, and the
# `.valueOf()` has to apply to the whole subject
case 1; when 2; a; when 1; b; else; c; end
case -1; when -1; a; end
case 0x10; when 16; a; end
case 1.5; when 1.5; a; end
case :sym; when :sym; a; end
def n(str, i)
  case `str[i] || nil`
  when "a" then a
  when "b" then b
  end
end

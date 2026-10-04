"a\nb#{1}c
d"
'x
y'
%Q{p
q}
"a\
b"
x = <<-X
  one
  two
X
y = <<-'Y'
  raw\n
Y
z = <<~Z
  a #{1}
    b
Z

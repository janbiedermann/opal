class A::B < C; end
module ::M; 1; end
class A; def m; @a; end; end
module M; X = 1; def self.m; end; end
class << self; def m; end; end
class A; class B; def m; X; end; end; end
class D < `Error`; end

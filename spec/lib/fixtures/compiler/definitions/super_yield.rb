def m(a, *b, c:, **d); super; super(); super(1) { }; super { }; end
def m; yield; yield 1; yield 1, 2; yield *a; end
def m; [1].each { yield }; end
def m; [1].each { super }; end
def m(&b); b.call; yield; end
def m; defined?(super); end

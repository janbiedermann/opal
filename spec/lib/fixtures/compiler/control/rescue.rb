begin; a; rescue A, *B => e; b; rescue; c; else; d; ensure; f; end
x = (a rescue b)
a rescue b
x = begin; a; rescue => @e; b; ensure; c; end
begin; a; rescue; retry; end
begin; a; ensure; b; end
x = begin; end
begin; a; rescue; b; else; c; end
def m; a; rescue => e; e; ensure; b; end

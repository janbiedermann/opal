x = 1
obj.instance_eval("x + 1")
mod.class_eval(code, "file.rb")
obj.instance_eval { x }

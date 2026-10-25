# The Asciidoctor benchmark of tasks/performance.mjs, which appends
# asciidoctor/benchmark/sample-data/mdbasics.adoc after __END__.
# Opal: asciidoctor's path_resolver.rb reads ::JAVASCRIPT_IO_MODULE behind a
# folded `RUBY_ENGINE == 'opal' &&` guard, so the compiled run needs it set
# before the require; the task's CRuby reference run short-circuits past it
# and never evaluates it, so defining it there is inert.
JAVASCRIPT_IO_MODULE="nodejs"
require "asciidoctor"
# asciidoctor's BOM probe calls String#unpack("C3"); opal/mini keeps unpack
# lazy (only opal/full eager-loads it) and the old asciidoctor.js pin patched
# that exact call away, so the probe must name the lazy feature itself.
# The guard is folded away at compile time, but must not run under CRuby.
require "corelib/string/unpack" if RUBY_ENGINE == "opal"
data = DATA.read
100.times { Asciidoctor.convert(data) }
puts Asciidoctor.convert(data)

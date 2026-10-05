# The Asciidoctor benchmark of tasks/performance.mjs, which appends
# asciidoctor/benchmark/sample-data/mdbasics.adoc after __END__.
JAVASCRIPT_IO_MODULE="nodejs" if RUBY_ENGINE == 'opal'
require "asciidoctor"
data = DATA.read
100.times { Asciidoctor.convert(data) }
puts Asciidoctor.convert(data)

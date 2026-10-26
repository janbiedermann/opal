# The `irb` command: an IRB session from the vendored ruby/irb port
# (stdlib/irb.rb and stdlib/irb/), running inside this bundle.
#
# tasks/irb/bundle.mjs builds it into exe/irb with the same shape as
# exe/ruby: opal, opal/full, thread, the RubyGems port and opal-parser at
# boot, the whole stdlib as requirable modules - the irb, prism and reline
# ports included, every exe carries all of stdlib - and this script.
# IRB.start parses the irb options from ARGV itself (stdlib/irb/init.rb),
# loads the .irbrc files and runs Main#run in this process, so stdin is
# the session's input; requires that miss the bundle answer through the
# shared RuntimeLoader (installed below), the same as exe/ruby's.

require 'irb'
require 'opal/exe/runtime_loader'

RuntimeLoader.install_loader

IRB.start

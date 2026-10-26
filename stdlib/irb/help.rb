# frozen_string_literal: true
#
#   irb/help.rb - print usage module
#   	by Keiju ISHITSUKA(keiju@ishitsuka.com)

require "stringio"
#

module IRB
  # Opal port: help-message is a text file; exe bundles carry no file tree,
  # so the same text is embedded in irb/lc/help_message.rb for the fallback.
  require_relative "lc/help_message"

  # Outputs the irb help message, see IRB@Command-Line+Options.
  def IRB.print_usage # :nodoc:
    lc = IRB.conf[:LC_MESSAGES]
    path = lc.find("irb/help-message")
    space_line = false
    open_source = path ? proc { |&b| File.open(path, &b) } : proc { |&b| StringIO.new(HELP_MESSAGE).tap(&b) }
    open_source.call {|f|
      f.each_line do |l|
        if /^\s*$/ =~ l
          lc.puts l unless space_line
          space_line = true
          next
        end
        space_line = false

        l.sub!(/#.*$/, "")
        next if /^\s*$/ =~ l
        lc.puts l
      end
    }
  end
end

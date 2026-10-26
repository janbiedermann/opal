# Opal port of CRuby's io/console/size: IO.console_size on top of
# IO#winsize (opal/io/console.rb, answered on node by the platform's
# tty_winsize primitive).
require 'io/console'

class IO
  def self.console_size
    console = self.console
    unless console
      begin
        console = $stdin
      rescue ArgumentError
      end
    end
    if console
      begin
        ws = console.winsize
      rescue SystemCallError, NotImplementedError
        # Opal: a platform without the tty primitives answers
        # NotImplementedError where CRuby raises ENOTTY.
      end
    end
    ws || [24, 80]
  end
end

# backtick_javascript: true
# frozen_string_literal: true

# The deadline is not enforced here. CRuby's Timeout runs a watcher thread
# that raises into the block's thread when the time is up, and Opal has no
# threads to watch with: there is one thread, and while it is inside the
# block nothing else runs, so a watcher would either fire before the block
# starts or after it ends. `timeout` therefore runs the block and returns its
# value, and a long-running block runs to completion.
#
# Code that needs a real deadline has to get it where the waiting happens -
# for instance a fetch through a worker, which can be given an AbortSignal
# with a timeout.
module Timeout
  # The error a timeout raises. It carries the thread that timed out in CRuby;
  # here there is only one, so it is a plain RuntimeError.
  class Error < ::RuntimeError
    def initialize(message = nil, thread = nil)
      super(message || 'timed out')
      @thread = thread
    end

    attr_reader :thread
  end

  class TimeoutError < Error
  end

  # Runs the block and returns its value. `sec` is accepted (and nil means no
  # deadline, as in CRuby) but not acted on; `klass` and `message` would name
  # the error to raise, so they are validated to catch a bad call early.
  def self.timeout(sec = nil, klass = nil, message = nil, do_something: nil)
    raise ArgumentError, 'must be called with a block' unless block_given?

    unless klass.nil?
      unless ::Module === klass || ::Exception === klass
        raise ArgumentError, 'wrong exception class or object'
      end
      unless message.nil? || ::String === message
        raise ArgumentError, 'wrong message class'
      end
    end

    yield
  end
end

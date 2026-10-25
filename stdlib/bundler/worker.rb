# frozen_string_literal: true

module Bundler
  # Opal: upstream's Worker is a pool of Thread-backed queue consumers. Opal
  # has no preemptive threads (stdlib/thread.rb runs handlers cooperatively
  # and its Queue offers no blocking deq), so the pool becomes a sequential
  # queue behind the same enq/deq/stop surface: enq stores the object, deq
  # runs the job function on the next stored object and answers its result
  # (raising the job's exception, wrapped on the way, exactly as the threads
  # did). Callers that enqueue a batch and then drain get the same values,
  # one at a time. The size argument is kept for the interface.
  class Worker
    POISON = Object.new

    class WrappedException < StandardError
      attr_reader :exception
      def initialize(exn)
        @exception = exn
      end
    end

    # @return [String] the name of the worker
    attr_reader :name

    # Creates a sequential worker with the pool's interface.
    #
    # @param size [Integer] ignored - there is a single inline "worker"
    # @param name [String] name the name of the worker
    # @param func [Proc] job to run inside the worker
    # @param response_queue [Object] ignored - results answer from deq
    def initialize(size, name, func, response_queue: nil)
      @name = name
      @func = func
      @size = size
      @requests = []
      @priority_requests = []
    end

    # Enqueue a request to be executed by the worker
    #
    # @param obj [String] mostly it is name of spec that should be downloaded
    def enq(obj, priority: false)
      (priority ? @priority_requests : @requests) << obj
    end

    # Retrieves results of job function being executed by the worker
    def deq
      return nil if @priority_requests.empty? && @requests.empty?

      obj = @priority_requests.empty? ? @requests.shift : @priority_requests.shift
      result = apply_func(obj, 0)
      raise result.exception if result.is_a?(WrappedException)
      result
    end

    def stop
      # nothing runs in the background, there is nothing to stop
    end

    private

    def apply_func(obj, i)
      @func.call(obj, i)
    rescue Exception => e # rubocop:disable Lint/RescueException
      WrappedException.new(e)
    end
  end
end

# backtick_javascript: true
# The one accessor module over index records (LSP.md §5): every reader of
# the record graph goes through Record, so the storage shape - the baked
# POJO literals vs a Map/Hash graph (the §10.6 benchmark question) and the
# live workspace records (plain Ruby Hashes) - stays a swappable detail.
# A record is a name-keyed structure {name, file, range, comments,
# superclass, includes, prepends, extends, methods, ...}: the baked form is
# a frozen JS POJO, the live form a Ruby Hash with String keys; Record
# branches on that shape once per record, not per read.
module Opal
  module LanguageServer
    class Record
      # Baked ranges are POJOs, and the transport's JSON encoder (stdlib
      # json) sends #to_json to every value - which POJOs do not answer.
      # Response builders copy a POJO range into a real Ruby hash with this.
      def self.ruby_range(range)
        return range if `#{range}.$$is_hash === true`
        {
          "start" => { "line" => `#{range}.start.line`, "character" => `#{range}.start.character` },
          "end" => { "line" => `#{range}.end.line`, "character" => `#{range}.end.character` },
        }
      end

      def initialize(raw)
        @raw = raw
        # Ruby Hash for live records, JS POJO for baked ones. POJOs answer
        # no Ruby methods - not even #is_a? - so the shape test reads the
        # corelib marker flag in JS.
        @hash = `#{raw}.$$is_hash === true` ? true : false
      end

      attr_reader :raw

      def get(key)
        if @hash
          @raw[key]
        else
          v = `#{@raw}[#{key}]`
          `v == null ? nil : v`
        end
      end

      def name
        get("name")
      end

      def file
        get("file")
      end

      def comments
        get("comments")
      end

      def superclass
        get("superclass")
      end

      def includes
        list(get("includes"))
      end

      def prepends
        list(get("prepends"))
      end

      def extends
        list(get("extends"))
      end

      # {method_name => [record, ...]} - one list per name, multiple
      # definitions (corelib reopens classes across files) all listed.
      def methods(singleton = false)
        out = {}
        each_pair(get(singleton ? "singleton_methods" : "methods")) do |name, defs|
          out[name] = defs.map { |d| Record.new(d) }
        end
        out
      end

      def method_definitions(name, singleton = false)
        bucket_key = singleton ? "singleton_methods" : "methods"
        defs = if @hash
                 (@raw[bucket_key] || {})[name]
               else
                 `#{get(bucket_key)}[#{name}] || []`
               end
        return [] if `defs == null || defs === nil`
        defs.map { |d| Record.new(d) }
      end

      # Sub-record collections: JS arrays for POJOs, Ruby arrays for hashes;
      # wrap_all turns either into an array of Records.
      def sub(key)
        wrap_all(get(key) || [])
      end

      def range
        get("range")
      end

      def locations
        wrap_all(get("locations") || [])
      end

      private

      def list(value)
        return [] if `value == null || value === nil` # baked arrays are JS: no Ruby sends
        n = `value.length`
        out = []
        n.times { |i| out << `value[#{i}]` }
        out
      end

      def each_pair(hash)
        # hash is a POJO (baked) or a Ruby Hash (live) or nil: POJOs answer
        # no Ruby methods, so the presence test is a JS one covering both
        # nulls (Opal nil is not JS null).
        return {} if `hash == null || hash === nil`
        out = {}
        if `hash.$$is_hash === true`
          hash.each_pair { |k, v| key, value = yield(k, v); out[key] = value }
        else
          %x{
            var h = #{hash};
            for (var k in h) {
              var pair = #{yield(`k`, `h[k]`)};
              out[pair[0]] = pair[1];
            }
          }
        end
        out
      end

      def wrap_all(array)
        out = []
        n = `#{array}.length`
        n.times { |i| out << Record.new(`#{array}[#{i}]`) }
        out
      end
    end
  end
end

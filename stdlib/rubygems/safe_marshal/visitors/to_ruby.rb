# frozen_string_literal: true
# backtick_javascript: true

# Opal: the magic comment above is what makes the %x{} in #decode_utf8 below
# JavaScript rather than a shell call; upstream files need no such comment.

require_relative "visitor"

module Gem::SafeMarshal
  module Visitors
    class ToRuby < Visitor
      def initialize(permitted_classes:, permitted_symbols:, permitted_ivars:)
        @permitted_classes = permitted_classes
        @permitted_symbols = ["E"].concat(permitted_symbols).concat(permitted_classes)
        @permitted_ivars = permitted_ivars

        @objects = []
        @symbols = []
        @class_cache = {}

        @stack = ["root"]
        @stack_idx = 1
      end

      def inspect # :nodoc:
        format("#<%s permitted_classes: %p permitted_symbols: %p permitted_ivars: %p>",
          self.class, @permitted_classes, @permitted_symbols, @permitted_ivars)
      end

      def visit(target)
        stack_idx = @stack_idx
        super
      ensure
        @stack_idx = stack_idx - 1
      end

      private

      def push_stack(element)
        @stack[@stack_idx] = element
        @stack_idx += 1
      end

      def visit_Gem_SafeMarshal_Elements_Array(a)
        array = register_object([])

        elements = a.elements
        size = elements.size
        idx = 0
        # not idiomatic, but there's a huge number of IMEMOs allocated here, so we avoid the block
        # because this is such a hot path when doing a bundle install with the full index
        while idx < size
          push_stack idx
          array << visit(elements[idx])
          idx += 1
        end

        array
      end

      def visit_Gem_SafeMarshal_Elements_Symbol(s)
        name = s.name
        raise UnpermittedSymbolError.new(symbol: name, stack: formatted_stack) unless @permitted_symbols.include?(name)
        visit_symbol_type(s)
      end

      def map_ivars(klass, ivars)
        stack_idx = @stack_idx
        ivars.map.with_index do |(k, v), i|
          @stack_idx = stack_idx

          push_stack "ivar_"
          push_stack i
          k = resolve_ivar(klass, k)

          @stack_idx = stack_idx
          push_stack k

          next k, visit(v)
        end
      end

      def visit_Gem_SafeMarshal_Elements_WithIvars(e)
        object_offset = @objects.size
        push_stack "object"
        object = visit(e.object)
        ivars = map_ivars(object.class, e.ivars)

        case e.object
        when Elements::UserDefined
          if object.class == ::Time
            # Opal: upstream rebuilds the marshal stream for the Time and hands
            # it back to Marshal.load, because a Time's ivars - @offset, @zone,
            # the nanoseconds - are its internal representation and can only be
            # applied while it is read. Marshal here has no Time support at all,
            # so the port reads the body itself, see #time_from_dump. The ivars
            # that body came with are part of that representation: the
            # microseconds are already in the two packed words, and the ones
            # beyond them - @nano_num, @nano_den, @submicro - are out of reach
            # for a Time backed by a JavaScript Date, which stops at
            # milliseconds; @offset and @zone say how the writing process
            # displayed the instant, and this Time has no zone to display it in.
            ivars.reject! do |k, _|
              case k
              when :offset, :zone, :nano_num, :nano_den, :submicro
                true
              else
                false
              end
            end
          end
        when Elements::String
          enc = nil

          ivars.reject! do |k, v|
            case k
            when :E
              case v
              when TrueClass
                enc = "UTF-8"
              when FalseClass
                enc = "US-ASCII"
              else
                raise FormatError, "Unexpected value for String :E #{v.inspect}"
              end
            when :encoding
              enc = v
            else
              next false
            end
            true
          end

          # Opal: the reader hands back the stream's bytes, one character per
          # byte, while an Opal String holds characters - a force_encoding only
          # retags them, so "café" would stay caf\xC3\xA9. The stream says
          # UTF-8 with the :E ivar (or an :encoding ivar), and TextDecoder
          # turns those bytes into characters; a string tagged US-ASCII or
          # BINARY keeps its bytes, which is what keeps "\xff" one byte rather
          # than a replacement character. A plain stream string (no ivars) is
          # ASCII-only, so its bytes are already its characters.
          if enc == "UTF-8"
            object = @objects[object_offset] = decode_utf8(object)
          elsif enc
            object = @objects[object_offset] = object.force_encoding(enc)
          end
        end

        ivars.each do |k, v|
          object.instance_variable_set k, v
        end
        object
      end

      def visit_Gem_SafeMarshal_Elements_Hash(o)
        hash = register_object({})

        o.pairs.each_with_index do |(k, v), i|
          push_stack i
          k = visit(k)
          push_stack k
          hash[k] = visit(v)
        end

        hash
      end

      def visit_Gem_SafeMarshal_Elements_HashWithDefaultValue(o)
        hash = visit_Gem_SafeMarshal_Elements_Hash(o)
        push_stack :default
        hash.default = visit(o.default)
        hash
      end

      def visit_Gem_SafeMarshal_Elements_Object(o)
        register_object(resolve_class(o.name).allocate)
      end

      def visit_Gem_SafeMarshal_Elements_ObjectLink(o)
        @objects.fetch(o.offset)
      end

      def visit_Gem_SafeMarshal_Elements_SymbolLink(o)
        @symbols.fetch(o.offset)
      end

      SAFE_USER_DEFINED_CLASSES = [::Time, ::Gem::Specification].freeze
      private_constant :SAFE_USER_DEFINED_CLASSES

      # The two packed words every CRuby Time dump is made of, see
      # #time_from_dump; a year outside 1900..2099 appends a tail this port does
      # not need and refuses.
      TIME_DUMP_SIZE = 8
      private_constant :TIME_DUMP_SIZE

      def visit_Gem_SafeMarshal_Elements_UserDefined(o)
        klass = resolve_class(o.name)
        unless SAFE_USER_DEFINED_CLASSES.include?(klass)
          raise UnsupportedError.new("Unsupported user-defined class #{klass} in marshal stream", stack: formatted_stack)
        end
        # Opal: a Time's user-defined body is not something a Time here could
        # be handed - there is no Time._load, and the method Marshal's reader
        # would call does not exist - so the packed body is decoded below
        # instead (#time_from_dump); every other permitted user-defined class
        # answers its own _load, as upstream does.
        if klass == ::Time
          register_object(time_from_dump(o.binary_string))
        else
          register_object(call_method(klass, :_load, o.binary_string))
        end
      end

      def visit_Gem_SafeMarshal_Elements_UserMarshal(o)
        klass = resolve_class(o.name)
        compat = COMPAT_CLASSES.fetch(klass, nil)
        idx = @objects.size
        object = register_object(call_method(compat || klass, :allocate))

        push_stack :data
        ret = call_method(object, :marshal_load, visit(o.data))

        if compat
          object = @objects[idx] = ret
        end

        object
      end

      def visit_Gem_SafeMarshal_Elements_Integer(i)
        i.int
      end

      def visit_Gem_SafeMarshal_Elements_Nil(_)
        nil
      end

      def visit_Gem_SafeMarshal_Elements_True(_)
        true
      end

      def visit_Gem_SafeMarshal_Elements_False(_)
        false
      end

      def visit_Gem_SafeMarshal_Elements_String(s)
        register_object(+s.str)
      end

      def visit_Gem_SafeMarshal_Elements_Float(f)
        register_object(
          case f.string
          when "inf"
            ::Float::INFINITY
          when "-inf"
            -::Float::INFINITY
          when "nan"
            ::Float::NAN
          else
            f.string.to_f
          end
        )
      end

      def visit_Gem_SafeMarshal_Elements_Bignum(b)
        result = 0
        b.data.each_byte.with_index do |byte, exp|
          result += (byte * 2**(exp * 8))
        end

        case b.sign
        when 43 # ?+
          result
        when 45 # ?-
          -result
        else
          raise FormatError, "Unexpected sign for Bignum #{b.sign.chr.inspect} (#{b.sign})"
        end
      end

      def visit_Gem_SafeMarshal_Elements_UserClass(r)
        if resolve_class(r.name) == ::Hash && r.wrapped_object.is_a?(Elements::Hash)

          hash = register_object({}.compare_by_identity)

          o = r.wrapped_object
          o.pairs.each_with_index do |(k, v), i|
            push_stack i
            k = visit(k)
            push_stack k
            hash[k] = visit(v)
          end

          if o.is_a?(Elements::HashWithDefaultValue)
            push_stack :default
            hash.default = visit(o.default)
          end

          hash
        else
          raise UnsupportedError.new("Unsupported user class #{resolve_class(r.name)} in marshal stream", stack: formatted_stack)
        end
      end

      def resolve_class(n)
        @class_cache[n] ||= begin
          to_s = resolve_symbol_name(n)
          raise UnpermittedClassError.new(name: to_s, stack: formatted_stack) unless @permitted_classes.include?(to_s)
          visit_symbol_type(n)
          begin
            ::Object.const_get(to_s)
          rescue NameError
            raise ArgumentError, "Undefined class #{to_s.inspect}"
          end
        end
      end

      class RationalCompat
        def marshal_load(s)
          num, den = s
          raise ArgumentError, "Expected 2 ints" unless s.size == 2 && num.is_a?(Integer) && den.is_a?(Integer)
          Rational(num, den)
        end
      end
      private_constant :RationalCompat

      COMPAT_CLASSES = {}.tap do |h|
        h[Rational] = RationalCompat
      end.compare_by_identity.freeze
      private_constant :COMPAT_CLASSES

      # Opal: an Opal String holds characters, the stream holds bytes, and
      # force_encoding only retags - so the UTF-8 bytes of a stream string are
      # decoded here with TextDecoder, which Node.js and both browser runners
      # have. fatal: false keeps a damaged stream readable instead of raising
      # over one bad sequence.
      def decode_utf8(bytes)
        %x{
          const characters = new TextDecoder('utf-8', { fatal: false })
            .decode(Uint8Array.from(#{bytes}.valueOf(), (character) => character.charCodeAt(0)));
          return Opal.str(characters, 'UTF-8');
        }
      end

      # Opal: CRuby dumps a Time as a user-defined object whose body is two
      # little-endian words of packed calendar fields, the format time.c's
      # rb_time_mdump writes:
      #
      #   first word  - a marker bit, whether the instant was kept in UTC,
      #                 the year minus 1900, the month, the day and the hour
      #   second word - the minute, the second and the microsecond
      #
      # Upstream rebuilds a marshal stream around that body and asks Marshal to
      # read it; Marshal here has no Time at all, which is why every
      # "Marshal.load for a Time" example sits in spec/filters/bugs/marshal.rb.
      # So the words are unpacked here and the instant is answered with the Time
      # this Opal has: milliseconds at best, and the process's own zone, because
      # an Opal Time carries no zone to display the instant in - which is also
      # why the offset, zone and nanosecond ivars are dropped above.
      #
      # The fields are read with division and remainder rather than shifts and
      # masks: a JavaScript shift first squeezes its operand into a *signed*
      # 32-bit integer, so shifting a word with its top bit set answers a
      # negative number.
      def time_from_dump(payload)
        bytes = payload.bytes
        raise FormatError, "Invalid Time dump: #{payload.bytesize} bytes" if bytes.size < TIME_DUMP_SIZE

        # A year outside 1900..2099 appends an extended-year tail to the words,
        # which upstream lets Marshal read. No gem timestamp has ever needed it,
        # so the port names it instead of decoding a form it cannot test.
        if bytes.size > TIME_DUMP_SIZE
          raise TimeTooLargeError.new("Time dump of #{bytes.size} bytes: an extended year", stack: formatted_stack)
        end

        first = bytes[0] + bytes[1] * 256 + bytes[2] * 65_536 + bytes[3] * 16_777_216
        second = bytes[4] + bytes[5] * 256 + bytes[6] * 65_536 + bytes[7] * 16_777_216

        # Ruby 1.9 and older wrote the time_t and the microseconds straight out.
        return Time.at(first + second / 1_000_000.0) if first < 0x8000_0000

        first -= 0x8000_0000
        utc = first >= 0x4000_0000
        first -= 0x4000_0000 if utc

        year = first / 0x4000 + 1900
        month = first % 0x4000 / 0x400
        # The month has four bits, so a December of the older encoding spills
        # into the next year - the same fix Ruby's own reader applies.
        if month >= 12
          month -= 12
          year += 1
        end

        rest = first % 0x400
        seconds = Time.utc(year, month + 1, rest / 32, rest % 32, second / 0x4000_000, second % 0x4000_000 / 0x10_0000).to_i
        time = Time.at(seconds + second % 0x10_0000 / 1_000_000.0)
        utc ? time.utc : time
      end

      def resolve_ivar(klass, name)
        to_s = resolve_symbol_name(name)

        raise UnpermittedIvarError.new(symbol: to_s, klass: klass, stack: formatted_stack) unless @permitted_ivars.fetch(klass.name, [].freeze).include?(to_s)

        visit_symbol_type(name)
      end

      def visit_symbol_type(element)
        case element
        when Elements::Symbol
          sym = element.name.to_sym
          @symbols << sym
          sym
        when Elements::SymbolLink
          visit_Gem_SafeMarshal_Elements_SymbolLink(element)
        end
      end

      def resolve_symbol_name(element)
        case element
        when Elements::Symbol
          element.name
        when Elements::SymbolLink
          visit_Gem_SafeMarshal_Elements_SymbolLink(element).name
        else
          raise FormatError, "Expected symbol or symbol link, got #{element.inspect} @ #{formatted_stack.join(".")}"
        end
      end

      def register_object(o)
        @objects << o
        o
      end

      def call_method(receiver, method, *args)
        receiver.__send__(method, *args)
      rescue NoMethodError => e
        raise unless e.receiver == receiver

        raise MethodCallError, "Unable to call #{method.inspect} on #{receiver.inspect}, perhaps it is a class using marshal compat, which is not visible in ruby? #{e}"
      end

      def formatted_stack
        formatted = []
        @stack[0, @stack_idx].each do |e|
          if e.is_a?(Integer)
            if formatted.last == "ivar_"
              formatted[-1] = "ivar_#{e}"
            else
              formatted << "[#{e}]"
            end
          else
            formatted << e
          end
        end
        formatted
      end

      class Error < StandardError
      end

      class TimeTooLargeError < Error
        def initialize(message, stack:)
          super "#{message} @ #{stack.join "."}"
        end
      end

      class UnpermittedSymbolError < Error
        def initialize(symbol:, stack:)
          @symbol = symbol
          @stack = stack
          super "Attempting to load unpermitted symbol #{symbol.inspect} @ #{stack.join "."}"
        end
      end

      class UnpermittedIvarError < Error
        def initialize(symbol:, klass:, stack:)
          @symbol = symbol
          @klass = klass
          @stack = stack
          super "Attempting to set unpermitted ivar #{symbol.inspect} on object of class #{klass} @ #{stack.join "."}"
        end
      end

      class UnpermittedClassError < Error
        def initialize(name:, stack:)
          @name = name
          @stack = stack
          super "Attempting to load unpermitted class #{name.inspect} @ #{stack.join "."}"
        end
      end

      class UnsupportedError < Error
        def initialize(message, stack:)
          super "#{message} @ #{stack.join "."}"
        end
      end

      class FormatError < Error
      end

      class MethodCallError < Error
      end
    end
  end
end

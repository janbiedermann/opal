# backtick_javascript: true
# helpers: coerce_to_or_raise, str

class ::Encoding
  class << self
    attr_reader :default_external, :default_internal

    def register(name, options = {}, &block)
      names = if options.key?(:aliases)
                options[:aliases].each do |a|
                  aliases[a] = name
                end
                [name] + options[:aliases]
              else
                [name]
              end

      ascii = options[:ascii] || false
      dummy = options[:dummy] || false

      if options[:inherits]
        encoding = options[:inherits].clone
        encoding.initialize(name, names, ascii, dummy)
      else
        encoding = new(name, names, ascii, dummy)
      end
      encoding.instance_exec(&block) if block_given?

      register = `Opal.encodings`
      names.each do |encoding_name|
        const_set encoding_name.tr('-', '_'), encoding
        register.JS[encoding_name] = encoding
      end
    end

    def aliases
      @aliases ||= {}
    end

    def compatible?(obj1, obj2)
      # Opal is different from Ruby and enables a more universal comatibility
      # of encodings, because the representation of a Ruby String with a JS String
      # makes them all UTF-16 "internally". This makes them all concatenable.
      # However, what matters is the binary representation. If the concatenated
      # string is written and source strings would not have a compatible binary
      # encoding, writing the concatened string into one file would lead to
      # different bytes written than writing each string to the same file,
      # concatenating them in the file.
      # If following the facts, Opal fails specs, because its encodings are
      # compatible in a different way than Ruby specs assume.
      # Also when comparing the #binary_encoding of strings here to ensure compatibility,
      # it makes no sense to return the #encoding. If later on the same #encoding is used
      # for a new string, it may still not be compatible if the #binary_encoding differs.
      # We should ideally return a encoding pair (#encoding and #binary_encoding) instead,
      # to ensure compatible strings can be constructed.
      # But thats way outside of Ruby specs for this method.

      # Maybe we can provide a Opal specific API in the future in ::Opal space.

      # For the moment just return nil (meaning: not compatible), still passes a few specs ;-)
      nil
    end

    def default_external=(enc)
      raise(ArgumentError, 'enc must be given') if enc.nil?
      unless enc.is_a?(::Encoding)
        enc = `$coerce_to_or_raise(enc, Opal.String, "to_str")`
        enc = find(enc)
      end
      aliases['external'] = enc.name
      `Opal.encodings["EXTERNAL"] = enc`
      @default_external.names.delete('external') if @default_external
      enc.names << 'external' unless enc.names.include?('external')
      @default_external	= enc
    end

    def default_internal=(enc)
      return @default_internal = nil if enc.nil?
      unless enc.is_a?(::Encoding)
        enc = `$coerce_to_or_raise(enc, Opal.String, "to_str")`
        enc = find(enc)
      end
      @default_internal	= enc
    end

    def find(name)
      return name if name.is_a?(::Encoding)
      name = `$coerce_to_or_raise(name, Opal.String, "to_str")`
      return default_external if %w[external filesystem locale].include?(name)
      return default_internal if name == 'internal'
      `Opal.find_encoding(name)`
    end

    def chr(value)
      if value <= 127
        ::Encoding::US_ASCII.chr(value)
      elsif value <= 255
        ::Encoding::ASCII_8BIT.chr(value)
      elsif default_internal
        default_internal.chr(value)
      else
        raise RangeError, "#{value} out of char range"
      end
    end

    def list
      constants.map! { |e| const_get(e) }.uniq!.select! { |e| e.is_a?(::Encoding) }
    end

    def locale_charmap
      nil
    end

    def name_list
      list.map(&:names).flatten
    end
  end

  attr_reader :name, :names

  def initialize(name, names, ascii, dummy)
    @name  = name
    @names = names
    @ascii = ascii
    @dummy = dummy
  end

  def ascii_compatible?
    @ascii
  end

  def dummy?
    @dummy
  end

  def to_s
    @name
  end

  def inspect
    "#<Encoding:#{@name}#{' (dummy)' if @dummy}>"
  end

  # methods to implement per encoding
  def chr(value)
    __not_implemented__
  end

  def bytes(str)
    __not_implemented__
  end

  def bytesize(str, index)
    __not_implemented__
  end

  def byteslice(str, index, length)
    __not_implemented__
  end

  def decode(io_buffer)
    __not_implemented__
  end

  def decode!(io_buffer)
    __not_implemented__
  end

  def each_byte(str, &block)
    __not_implemented__
  end

  # Fills io_buffer with bytes of str and yields the number
  # of valid bytes in io_buffer to the block.
  # Repeats until end of str while reusing io_buffer.
  # In other words: io_buffer is used as a sliding window over str.
  def each_byte_buffer(str, io_buffer, &block)
    __not_implemented__
  end

  def scrub(str, replacement, &block)
    __not_implemented__
  end

  def valid_encoding?(str)
    __not_implemented__
  end

  # The byte at the byte index of the binary representation of str, nil when
  # the string has no such byte. This is what String#getbyte asks for.
  def byte_at(str, index)
    __not_implemented__
  end

  # The sum of the bytes of str, which is what String#sum adds up.
  def bytes_sum(str)
    __not_implemented__
  end

  # The byte offset of the character at the UTF-16 index char_index of str.
  def byte_index(str, char_index)
    __not_implemented__
  end

  # The UTF-16 index of the character a byte offset lands on, -1 when the
  # offset is inside a character and -2 when it is past the string.
  def char_index(str, byte_offset)
    __not_implemented__
  end

  # Whether String#dump escapes a character with a \x byte escape.
  def dump_byte_escape?(code_point)
    __not_implemented__
  end

  class ::EncodingError < ::StandardError; end
  class ::CompatibilityError < ::EncodingError; end
  class InvalidByteSequenceError < ::EncodingError; end
  class UndefinedConversionError < ::EncodingError; end
end

%x{
  const SFCP = String.fromCodePoint;
  const SFCC = String.fromCharCode;

  function scrubbing_decoder(enc, label) {
    return enc.scrubbing_decoder ??= new TextDecoder(label, { fatal: false });
  }

  function validating_decoder(enc, label) {
    return enc.validating_decoder ??= new TextDecoder(label, { fatal: true });
  }

  function encoding_chr_invalid(enc, value) {
    Opal.raise(Opal.RangeError, 'invalid codepoint 0x' + value.toString(16) + ' in ' + enc.name);
  };

  function encoding_chr_codepoint(enc, value) {
    if (value > 0x10ffff) Opal.raise(Opal.RangeError, value + ' out of char range');
    if (value >= 0xd800 && value <= 0xdfff) encoding_chr_invalid(enc, value);
    return $str(String.fromCodePoint(value), enc);
  };
}

::Encoding.register 'UTF-8', aliases: ['CP65001'], ascii: true do
  %x{
    // The number of UTF-8 bytes of a code point. A lone surrogate encodes to
    // the 3 bytes of the replacement character.
    function utf8_size(code_point) {
      if (code_point < 0x80) return 1;
      if (code_point < 0x800) return 2;
      if (code_point < 0x10000) return 3;
      return 4;
    }

    // The byte at the byte_index offset of the UTF-8 encoding of code_point.
    function utf8_byte_at(code_point, byte_index) {
      if (code_point < 0x80) return code_point;
      if (code_point < 0x800) {
        return byte_index === 0 ? code_point >> 0x6 | 0xC0 : code_point & 0x3F | 0x80;
      }
      if (code_point >= 0xD800 && code_point <= 0xDFFF) {
        return byte_index === 0 ? 0xEF : byte_index === 1 ? 0xBF : 0xBD;
      }
      if (code_point < 0x10000) {
        return byte_index === 0 ? code_point >> 0xC | 0xE0
          : byte_index === 1 ? code_point >> 0x6 & 0x3F | 0x80
          : code_point & 0x3F | 0x80;
      }
      return byte_index === 0 ? code_point >> 0x12 | 0xF0
        : byte_index === 1 ? code_point >> 0xC & 0x3F | 0x80
        : byte_index === 2 ? code_point >> 0x6 & 0x3F | 0x80
        : code_point & 0x3F | 0x80;
    }
  }

  def bytes(str)
    %x{
      const string = str.valueOf(), length = string.length;
      // Array#push is a Ruby method, so the arrays are filled by index here.
      if (!/[\u0080-\uFFFF]/.test(string)) {
        // Every character of the string is one byte.
        const bytes = new Array(length);
        for (let i = 0; i < length; i++) bytes[i] = string.charCodeAt(i);
        return bytes;
      }
      const bytes = [];
      let count = 0, code_point;
      for (let i = 0; i < length; i++) {
        code_point = string.charCodeAt(i);
        if (code_point >= 0xD800 && code_point <= 0xDBFF) {
          code_point = string.codePointAt(i);
          if (code_point > 0xFFFF) i++;
        }
        if (code_point < 0x80) {
          bytes[count++] = code_point;
        } else if (code_point < 0x800) {
          bytes[count++] = code_point >> 0x6 | 0xC0;
          bytes[count++] = code_point & 0x3F | 0x80;
        } else if (code_point < 0xD800) {
          bytes[count++] = code_point >> 0xC | 0xE0;
          bytes[count++] = code_point >> 0x6 & 0x3F | 0x80;
          bytes[count++] = code_point & 0x3F | 0x80;
        } else if (code_point < 0xE000) {
          bytes[count++] = 0xEF;
          bytes[count++] = 0xBF;
          bytes[count++] = 0xBD;
        } else if (code_point < 0x10000) {
          bytes[count++] = code_point >> 0xC | 0xE0;
          bytes[count++] = code_point >> 0x6 & 0x3F | 0x80;
          bytes[count++] = code_point & 0x3F | 0x80;
        } else {
          bytes[count++] = code_point >> 0x12 | 0xF0;
          bytes[count++] = code_point >> 0xC & 0x3F | 0x80;
          bytes[count++] = code_point >> 0x6 & 0x3F | 0x80;
          bytes[count++] = code_point & 0x3F | 0x80;
        }
      }
      return bytes;
    }
  end

  def bytesize(str, index = undefined)
    %x{
      const string = str.valueOf(), length = string.length;
      if (index === undefined) index = length - 1;
      let size = 0;
      for (let i = 0; i < length && index >= 0; i++, index--) {
        const code_point = string.codePointAt(i);
        size += utf8_size(code_point);
        if (code_point > 0xFFFF) i++;
      }
      return size;
    }
  end

  # The byte at the byte index of the string, walking its code points.
  def byte_at(str, index)
    %x{
      const string = str.valueOf();
      let code_point, size, bytes_at = 0;
      if (index >= 0) {
        for (let i = 0, length = string.length; i < length; i++) {
          code_point = string.codePointAt(i);
          size = utf8_size(code_point);
          if (code_point > 0xFFFF) i++;
          if (bytes_at + size > index) return utf8_byte_at(code_point, index - bytes_at);
          bytes_at += size;
        }
      } else {
        for (let i = string.length - 1; i >= 0; i--) {
          code_point = string.codePointAt(i);
          if (code_point >= 0xDC00 && code_point <= 0xDFFF && i > 0 &&
              string.charCodeAt(i - 1) >= 0xD800 && string.charCodeAt(i - 1) <= 0xDBFF) {
            // the low surrogate of a pair, taken with its high surrogate
            i--;
            code_point = string.codePointAt(i);
          }
          size = utf8_size(code_point);
          if (index >= -(bytes_at + size)) return utf8_byte_at(code_point, index + bytes_at + size);
          bytes_at += size;
        }
      }
      return nil;
    }
  end

  def bytes_sum(str)
    %x{
      const string = str.valueOf(), length = string.length;
      let sum = 0, i = 0, code_point;
      // The ASCII run, where every character is one byte.
      for (; i < length; i++) {
        code_point = string.charCodeAt(i);
        if (code_point > 0x7f) break;
        sum += code_point;
      }
      for (; i < length; i++) {
        code_point = string.charCodeAt(i);
        if (code_point >= 0xD800 && code_point <= 0xDBFF) {
          code_point = string.codePointAt(i);
          if (code_point > 0xFFFF) i++;
        }
        if (code_point < 0x80) {
          sum += code_point;
        } else if (code_point < 0x800) {
          sum += (code_point >> 0x6 | 0xC0) + (code_point & 0x3F | 0x80);
        } else if (code_point < 0xD800) {
          sum += (code_point >> 0xC | 0xE0) + (code_point >> 0x6 & 0x3F | 0x80) + (code_point & 0x3F | 0x80);
        } else if (code_point < 0xE000) {
          sum += 0xEF + 0xBF + 0xBD;
        } else if (code_point < 0x10000) {
          sum += (code_point >> 0xC | 0xE0) + (code_point >> 0x6 & 0x3F | 0x80) + (code_point & 0x3F | 0x80);
        } else {
          sum += (code_point >> 0x12 | 0xF0) + (code_point >> 0xC & 0x3F | 0x80) + (code_point >> 0x6 & 0x3F | 0x80) + (code_point & 0x3F | 0x80);
        }
      }
      return sum;
    }
  end

  def byte_index(str, char_index)
    %x{
      const string = str.valueOf();
      let bytes = 0;
      for (let i = 0; i < char_index; i++) {
        const code_point = string.codePointAt(i);
        bytes += utf8_size(code_point);
        if (code_point > 0xFFFF) i++;
      }
      return bytes;
    }
  end

  def char_index(str, byte_offset)
    %x{
      const string = str.valueOf(), length = string.length;
      let bytes = 0, i = 0, code_point;
      while (bytes < byte_offset && i < length) {
        code_point = string.codePointAt(i);
        bytes += utf8_size(code_point);
        i += code_point > 0xFFFF ? 2 : 1;
      }
      if (bytes < byte_offset) return -2;
      return bytes === byte_offset ? i : -1;
    }
  end

  def dump_byte_escape?(code_point)
    # Only the characters below 0x80 are a single byte of UTF-8.
    code_point < 0x80
  end

  def byteslice(str, index, length)
    # Must handle negative index and length, with length being negative indicating a negative range end.
    # This slices at UTF-16 character boundaries, as required by specs.
    # However, some specs require slicing UTF-16 characters into its bytes, which won't work.
    %x{
      let result = "", code_point, idx, max;
      if (index < 0) {
        // negative index, walk from the end of the string,
        const string = str.valueOf();
        let i = string.length - 1;
        idx = -1;
        if (length < 0) max = length; // a negative index
        else if (length === 0) max = index;
        else if ((index + length) >= 0) max = -1; // from end of string
        else max = index + length - 1;
        let broken = false;
        for (; i >= 0; i--) {
          code_point = string.codePointAt(i);
          if (code_point >= 0xDC00 && code_point <= 0xDFFF && i > 0 &&
              string.charCodeAt(i - 1) >= 0xD800 && string.charCodeAt(i - 1) <= 0xDBFF) {
            // the low surrogate of a pair, walked by its high surrogate
            continue;
          }
          // a lone surrogate encodes to the 3 bytes of the replacement char
          const size = utf8_size(code_point);
          if (length >= 0 || length === -1 || (length < 0 && idx <= length)) {
            if (idx >= index && idx <= max) result = SFCP(code_point) + result;
            idx -= size;
          }
          if (idx < index) { broken = true; break; }
        }
        if (idx > index || (result.length === 0 &&
            (length !== 0 || (!broken && index < idx + 1)))) return nil;
      } else {
        // 0 or positive index, walk from beginning
        idx = 0;
        if (length < 0) max = Infinity; // to end of string
        else if (length === 0) max = index + 1;
        else max = index + length;
        const string = str.valueOf(), slen = string.length;
        for (let ci = 0; ci < slen; ci++) {
          code_point = string.codePointAt(ci);
          if (code_point > 0xFFFF) ci++;
          if (code_point < 0x80) {
            if (idx >= index && idx <= max) result += SFCP(code_point);
            idx++;
          } else if (code_point < 0x800) {
            // 2 byte surrogates
            if (idx >= index && idx <= max) result += SFCP(code_point);
            idx += 2;
          } else if (code_point < 0xD800) {
            // 3 byte surrogates
            if (idx >= index && idx <= max) result += SFCP(code_point);
            idx += 3;
          } else if (code_point < 0xE000) {
            if (idx >= index && idx <= max) result += SFCP(0xEF); idx++;
            if (idx >= index && idx <= max) result += SFCP(0xBF); idx++;
            if (idx >= index && idx <= max) result += SFCP(0xBD); idx++;
          } else if (code_point < 0x10000) {
            // 3 byte surrogates
            if (idx >= index && idx <= max) result += SFCP(code_point);
            idx += 3;
          } else if (code_point < 0x110000) {
            // 4 byte surrogates
            if (idx >= index && idx <= max) result += SFCP(code_point);
            idx += 4;
          }
          if (idx >= max) break;
        }
        if (result.length === 0) {
          if (idx === index) result = "";
          else return nil;
        }
        if (length < 0) {
          // if length is a negative index from a range, we walked to the end,
          // so shorten the result accordingly
          // result has the bytes already spread out as chars so we can simply slice
          if ((idx + length) > 0) result = result.slice(0, result.length + length);
          else result = "";
        }
      }
      if (length === 0) result = "";
      return result;
    }
  end

  def decode(io_buffer)
    %x{
      let result = scrubbing_decoder(self, 'utf-8').decode(io_buffer.data_view);
      return $str(result, self);
    }
  end

  def decode!(io_buffer)
    %x{
      let result = validating_decoder(self, 'utf-8').decode(io_buffer.data_view);
      return $str(result, self);
    }
  end

  def each_byte(str)
    %x{
      const string = str.valueOf(), length = string.length;
      let i = 0, code_point;
      // The ASCII run, where every character is one byte.
      for (; i < length; i++) {
        code_point = string.charCodeAt(i);
        if (code_point > 0x7f) break;
        #{yield `code_point`};
      }
      if (i === length) return;
      for (; i < length; i++) {
        code_point = string.charCodeAt(i);
        if (code_point >= 0xD800 && code_point <= 0xDBFF) {
          code_point = string.codePointAt(i);
          if (code_point > 0xFFFF) i++;
        }
        if (code_point < 0x80) {
          #{yield `code_point`};
        } else if (code_point < 0x800) {
          #{yield `code_point >> 0x6 | 0xC0`};
          #{yield `code_point & 0x3F | 0x80`};
        } else if (code_point < 0xD800) {
          #{yield `code_point >> 0xC | 0xE0`};
          #{yield `code_point >> 0x6 & 0x3F | 0x80`};
          #{yield `code_point & 0x3F | 0x80`};
        } else if (code_point < 0xE000) {
          #{yield `0xEF`};
          #{yield `0xBF`};
          #{yield `0xBD`};
        } else if (code_point < 0x10000) {
          #{yield `code_point >> 0xC | 0xE0`};
          #{yield `code_point >> 0x6 & 0x3F | 0x80`};
          #{yield `code_point & 0x3F | 0x80`};
        } else {
          #{yield `code_point >> 0x12 | 0xF0`};
          #{yield `code_point >> 0xC & 0x3F | 0x80`};
          #{yield `code_point >> 0x6 & 0x3F | 0x80`};
          #{yield `code_point & 0x3F | 0x80`};
        }
      }
    }
  end

  def each_byte_buffer(str, io_buffer)
    b_size = io_buffer.size
    pos = 0
    %x{
      let code_point,
          dv = io_buffer.data_view;

      function set_byte(byte) {
        if (pos === b_size) {
          #{yield pos}
          pos = 0;
        }
        dv.setUint8(pos++, byte);
      }

      for (const c of str) {
        code_point = c.codePointAt(0);
        if (code_point < 0x80) {
          set_byte(code_point);
        } else if (code_point < 0x800) {
          set_byte(code_point >> 0x6 | 0xC0);
          set_byte(code_point & 0x3F | 0x80);
        } else if (code_point < 0xD800) {
          set_byte(code_point >> 0xC | 0xE0);
          set_byte(code_point >> 0x6 & 0x3F | 0x80);
          set_byte(code_point & 0x3F | 0x80);
        } else if (code_point < 0xE000) {
          set_byte(0xEF);
          set_byte(0xBF);
          set_byte(0xBD);
        } else if (code_point < 0x10000) {
          set_byte(code_point >> 0xC | 0xE0);
          set_byte(code_point >> 0x6 & 0x3F | 0x80);
          set_byte(code_point & 0x3F | 0x80);
        } else if (code_point < 0x110000) {
          set_byte(code_point >> 0x12 | 0xF0);
          set_byte(code_point >> 0xC & 0x3F | 0x80);
          set_byte(code_point >> 0x6 & 0x3F | 0x80);
          set_byte(code_point & 0x3F | 0x80);
        }
      }

      if (pos > 0) { #{yield pos} }
    }
    str
  end

  def scrub(str, replacement, &block)
    %x{
      // The bytes of a String are always valid UTF-8, and the lone surrogates
      // decode to the replacement character, which is what toWellFormed does.
      if (block === nil && (replacement === nil || replacement === undefined)) {
        const scrubbed = new String(str.valueOf().toWellFormed());
        scrubbed.encoding = self;
        scrubbed.binary_encoding = self;
        return scrubbed;
      }

      let result = scrubbing_decoder(self, 'utf-8').decode(new Uint8Array(self.$bytes(str)));
      if (block !== nil) {
        // dont know the bytes anymore ... ¯\_(ツ)_/¯
        result = result.replace(/�/g, (byte) => #{yield `byte`});
      } else if (replacement !== nil && replacement !== undefined) {
        // this may replace valid � that have existed in the string before,
        // but there currently is no way to specify a other replacement character for TextDecoder
        result = result.replace(/�/g, replacement);
      }
      return $str(result, self);
    }
  end

  def valid_encoding?(str)
    %x{
      // The bytes of a String are always valid UTF-8, only the lone surrogates
      // need the decoder.
      if (str.valueOf().isWellFormed()) return true;

      try { validating_decoder(self, 'utf-8').decode(new Uint8Array(self.$bytes(str))); }
      catch { return false; }
      return true;
    }
  end

  def chr(value)
    `encoding_chr_codepoint(self, value)`
  end
end

::Encoding.register 'UTF-16LE', aliases: ['UTF-16'] do
  def bytes(str)
    res = []
    %x{
      for (let char_code, i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        res.push(char_code & 0xff);
        res.push(char_code >> 8);
      }
    }
    res
  end

  def bytesize(str, index = undefined)
    %x{
      if (index < str.length) return (index + 1) * 2;
      return str.length * 2;
    }
  end

  def byte_at(str, index)
    %x{
      const length = str.length * 2;
      if (index < 0) index += length;
      if (index < 0 || index >= length) return nil;
      const code = str.charCodeAt(index >> 1);
      return (index & 1) ? code >> 8 : code & 0xff;
    }
  end

  def bytes_sum(str)
    %x{
      let sum = 0;
      for (let i = 0, length = str.length; i < length; i++) {
        const code = str.charCodeAt(i);
        sum += (code & 0xff) + (code >> 8);
      }
      return sum;
    }
  end

  def byte_index(str, char_index)
    `char_index * 2`
  end

  def char_index(str, byte_offset)
    %x{
      if (byte_offset > str.length * 2) return -2;
      return (byte_offset & 1) ? -1 : byte_offset >> 1;
    }
  end

  def dump_byte_escape?(code_point)
    # The characters String#dump escapes as \xNN, the others as \uXXXX.
    code_point <= 0xff
  end

  def byteslice(str, index, length)
    # Must handle negative index and length, with length being negative indicating a negative range end.
    %x{
      let result = "", char_code, idx, max, i;
      if (index < 0) {
        // negative index, walk from the end of the string,
        idx = -1;
        if (length < 0) max = length; // a negative index
        else if (length === 0) max = index;
        else if ((index + length) >= 0) max = -1; // from end of string
        else max = index + length - 1;
        for (i = str.length - 1; i >= 0; i--) {
          char_code = str.charCodeAt(i);
          if (length >= 0 || length === -1 || (length < 0 && idx <= length)) {
            if (idx >= index && idx <= max) result = SFCC(char_code) + result;
          }
          idx -= 2;
          if (idx < index) break;
        }
        if (idx > index || (result.length === 0 && (length !== 0 || index < -str.length * 2))) return nil;
      } else {
        // 0 or positive index, walk from beginning
        idx = 0;
        if (length < 0) max = Infinity;
        else if (length === 0) max = index + 1;
        else max = index + length;
        for (i = 0, length = str.length; i < length; i++) {
          char_code = str.charCodeAt(i);
          if (idx >= index && idx <= max) result += SFCC(char_code);
          idx += 2;
          if (idx >= max) break;
        }
        if (result.length === 0) {
          if (idx === index) result = "";
          else return nil;
        }
        if (length < 0) {
          // if length is a negative index from a range, we walked to the end, so shorten the result
          if ((idx + length) > 0) result = result.slice(0, result.length + length);
          else result = "";
        }
      }
      if (length === 0) result = "";
      return result;
    }
  end

  def decode(io_buffer)
    %x{
      let result = scrubbing_decoder(self, 'utf-16le').decode(io_buffer.data_view);
      return $str(result, self);
    }
  end

  def decode!(io_buffer)
    %x{
      let result = validating_decoder(self, 'utf-16le').decode(io_buffer.data_view);
      return $str(result, self);
    }
  end

  def each_byte(str)
    %x{
      for (let i = 0, length = str.length; i < length; i++) {
        let char_code = str.charCodeAt(i);

        #{yield `char_code & 0xff`};
        #{yield `char_code >> 8`};
      }
    }
  end

  def each_byte_buffer(str, io_buffer)
    b_size = io_buffer.size
    pos = 0
    %x{
      let char_code,
          dv = io_buffer.data_view;

      function set_byte(byte) {
        if (pos === b_size) {
          #{yield pos}
          pos = 0;
        }
        dv.setUint8(pos++, byte);
      }

      for (let i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        set_byte(char_code & 0xff);
        set_byte(char_code >> 8);
      }

      if (pos > 0) { #{yield pos} }
    }
    str
  end

  def scrub(str, replacement, &block)
    %x{
      let result = scrubbing_decoder(self, 'utf-16le').decode(new Uint8Array(self.$bytes(str)));
      if (block !== nil) {
        // dont know the bytes anymore ... ¯\_(ツ)_/¯
        result = result.replace(/�/g, (byte) => #{yield `byte`});
      } else if (replacement !== nil && replacement !== undefined) {
        // this may replace valid � that have existed in the string before,
        // but there currently is no way to specify a other replacement character for TextDecoder
        result = result.replace(/�/g, replacement);
      }
      return $str(result, self);
    }
  end

  def valid_encoding?(str)
    %x{
      try { validating_decoder(self, 'utf-16le').decode(new Uint8Array(self.$bytes(str))); }
      catch { return false; }
      return true;
    }
  end

  def chr(value)
    `encoding_chr_codepoint(self, value)`
  end
end

::Encoding.register 'UTF-16BE', inherits: ::Encoding::UTF_16LE do
  def bytes(str)
    res = []
    %x{
      for (let char_code, i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        res.push(char_code >> 8);
        res.push(char_code & 0xff);
      }
    }
    res
  end

  def byte_at(str, index)
    %x{
      const length = str.length * 2;
      if (index < 0) index += length;
      if (index < 0 || index >= length) return nil;
      const code = str.charCodeAt(index >> 1);
      return (index & 1) ? code & 0xff : code >> 8;
    }
  end

  def decode(io_buffer)
    %x{
      let result = scrubbing_decoder(self, 'utf-16be').decode(io_buffer.data_view);
      return $str(result, self);
    }
  end

  def decode!(io_buffer)
    %x{
      let result = validating_decoder(self, 'utf-16be').decode(io_buffer.data_view);
      return $str(result, self);
    }
  end

  def each_byte(str)
    %x{
      for (let i = 0, length = str.length; i < length; i++) {
        const char_code = str.charCodeAt(i);
        #{yield `char_code >> 8`};
        #{yield `char_code & 0xff`};
      }
    }
  end

  def each_byte_buffer(str, io_buffer)
    b_size = io_buffer.size
    pos = 0
    %x{
      let char_code,
          dv = io_buffer.data_view;

      function set_byte(byte) {
        if (pos === b_size) {
          #{yield pos}
          pos = 0;
        }
        dv.setUint8(pos++, byte);
      }

      for (let i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        set_byte(char_code >> 8);
        set_byte(char_code & 0xff);
      }

      if (pos > 0) { #{yield pos} }
    }
    str
  end

  def scrub(str, replacement, &block)
    %x{
      let result = scrubbing_decoder(self, 'utf-16be').decode(new Uint8Array(self.$bytes(str)));
      if (block !== nil) {
        // dont know the bytes anymore ... ¯\_(ツ)_/¯
        result = result.replace(/�/g, (byte) => #{yield `byte`});
      } else if (replacement !== nil && replacement !== undefined) {
        // this may replace valid � that have existed in the string before,
        // but there currently is no way to specify a other replacement character for TextDecoder
        result = result.replace(/�/g, replacement);
      }
      return $str(result, self);
    }
  end

  def valid_encoding?(str)
    %x{
      try { validating_decoder(self, 'utf-16be').decode(new Uint8Array(self.$bytes(str))); }
      catch { return false; }
      return true;
    }
  end
end

::Encoding.register 'UTF-32LE' do
  def bytes(str)
    res = []
    %x{
      for (let char_code, i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        res.push(char_code & 0xff);
        res.push(char_code >> 8);
        res.push(0);
        res.push(0);
      }
    }
    res
  end

  def bytesize(str, index = undefined)
    %x{
      if (index < str.length) return (index + 1) * 4;
      return str.length * 4;
    }
  end

  def byte_at(str, index)
    %x{
      const length = str.length * 4;
      if (index < 0) index += length;
      if (index < 0 || index >= length) return nil;
      const code = str.charCodeAt(index >> 2), at = index & 3;
      if (at === 0) return code & 0xff;
      if (at === 1) return code >> 8;
      return 0;
    }
  end

  def bytes_sum(str)
    %x{
      let sum = 0;
      for (let i = 0, length = str.length; i < length; i++) {
        const code = str.charCodeAt(i);
        sum += (code & 0xff) + (code >> 8);
      }
      return sum;
    }
  end

  def byte_index(str, char_index)
    `char_index * 4`
  end

  def char_index(str, byte_offset)
    %x{
      if (byte_offset > str.length * 4) return -2;
      return (byte_offset & 3) === 0 ? byte_offset >> 2 : -1;
    }
  end

  def dump_byte_escape?(code_point)
    # The characters String#dump escapes as \xNN, the others as \uXXXX.
    code_point <= 0xff
  end

  def byteslice(str, index, length)
    # Must handle negative index and length, with length being negative indicating a negative range end.
    %x{
      let result = "", char_code, idx, max, i;
      if (index < 0) {
        // negative index, walk from the end of the string,
        idx = -1;
        if (length < 0) max = length; // a negative index
        else if (length === 0) max = index;
        else if ((index + length) >= 0) max = -1; // from end of string
        else max = index + length - 1;
        for (i = str.length - 1; i >= 0; i--) {
          char_code = str.charCodeAt(i);
          if (length > 0 || length === -1 || (length < 0 && idx <= length)) {
            if (idx >= index && idx <= max) result = SFCC(char_code) + result;
          }
          idx -= 4;
          if (idx < index) break;
        }
        if (idx > index || (result.length === 0 && (length !== 0 || index < -str.length * 4))) return nil;
      } else {
        // 0 or positive index, walk from beginning
        idx = 0;
        if (length < 0) max = Infinity;
        else if (length === 0) max = index + 1;
        else max = index + length;
        for (let i = 0, length = str.length; i < length; i++) {
          char_code = str.charCodeAt(i);
          if (idx >= index && idx <= max) result += SFCC(char_code);
          idx += 4;
          if (idx >= max) break;
        }
        if (result.length === 0) {
          if (idx === index) result = "";
          else return nil;
        }
        if (length < 0) {
          // if length is a negative index from a range, we walked to the end, so shorten the result
          if ((idx + length) > 0) result = result.slice(0, result.length + length);
          else result = "";
        }
      }
      if (length === 0) result = "";
      return result;
    }
  end

  def decode(io_buffer)
    %x{
      let i = 0, o = 0,
          io_dv = io_buffer.data_view,
          io_dv_bl = io_dv.byteLength,
          data_view = new DataView(new ArrayBuffer(Math.ceil(io_dv_bl / 2)));
      while (i < io_dv_bl) {
        data_view.setUint8(o++, io_dv.getUint8(i++));
        if (i < io_dv_bl) data_view.setUint8(o++, io_dv.getUint8(i++));
        i += 2;
      }
      let result = scrubbing_decoder(self, 'utf-16').decode(data_view);
      return $str(result, self);
    }
  end

  def decode!(io_buffer)
    %x{
      let i = 0, o = 0,
          io_dv = io_buffer.data_view,
          io_dv_bl = io_dv.byteLength,
          data_view = new DataView(new ArrayBuffer(Math.ceil(io_dv_bl / 2)));
      while (i < io_dv_bl) {
        data_view.setUint8(o++, io_dv.getUint8(i++));
        if (i < io_dv_bl) data_view.setUint8(o++, io_dv.getUint8(i++));
        i += 2;
      }
      let result = validating_decoder(self, 'utf-16').decode(data_view);
      return $str(result, self);
    }
  end

  def each_byte(str)
    %x{
      for (let i = 0, length = str.length; i < length; i++) {
        const char_code = str.charCodeAt(i);

        #{yield `char_code & 0xff`};
        #{yield `char_code >> 8`};
        #{yield 0};
        #{yield 0};
      }
    }
  end

  def each_byte_buffer(str, io_buffer)
    b_size = io_buffer.size
    pos = 0
    %x{
      let char_code,
          dv = io_buffer.data_view;

      function set_byte(byte) {
        if (pos === b_size) {
          #{yield pos}
          pos = 0;
        }
        dv.setUint8(pos++, byte);
      }

      for (let i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        set_byte(char_code & 0xff);
        set_byte(char_code >> 8);
        set_byte(0);
        set_byte(0);
      }

      if (pos > 0) { #{yield pos} }
    }
    str
  end

  def scrub(str, replacement)
    str
  end

  def valid_encoding?(str)
    true
  end

  def chr(value)
    `encoding_chr_codepoint(self, value)`
  end
end

::Encoding.register 'UTF-32BE', inherits: ::Encoding::UTF_32LE do
  def bytes(str)
    res = []
    %x{
      for (let char_code, i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        res.push(0);
        res.push(0);
        res.push(char_code >> 8);
        res.push(char_code & 0xff);
      }
    }
    res
  end

  def byte_at(str, index)
    %x{
      const length = str.length * 4;
      if (index < 0) index += length;
      if (index < 0 || index >= length) return nil;
      const code = str.charCodeAt(index >> 2), at = index & 3;
      if (at === 2) return code >> 8;
      if (at === 3) return code & 0xff;
      return 0;
    }
  end

  def decode(io_buffer)
    %x{
      let i = 0, o = 0,
          io_dv = io_buffer.data_view,
          io_dv_bl = io_dv.byteLength,
          data_view = new DataView(new ArrayBuffer(Math.floor(io_dv_bl / 2)));
      while (i < io_dv_bl) {
        i += 2;
        if (i < io_dv_bl) data_view.setUint8(o++, io_dv.getUint8(i++));
        if (i < io_dv_bl) data_view.setUint8(o++, io_dv.getUint8(i++));
      }
      let result = scrubbing_decoder(self, 'utf-16be').decode(data_view);
      return $str(result, self);
    }
  end

  def decode!(io_buffer)
    %x{
      let i = 0, o = 0,
          io_dv = io_buffer.data_view,
          io_dv_bl = io_dv.byteLength,
          data_view = new DataView(new ArrayBuffer(Math.floor(io_dv_bl / 2)));
      while (i < io_dv_bl) {
        i += 2;
        if (i < io_dv_bl) data_view.setUint8(o++, io_dv.getUint8(i++));
        if (i < io_dv_bl) data_view.setUint8(o++, io_dv.getUint8(i++));
      }
      let result = validating_decoder(self, 'utf-16be').decode(data_view);
      return $str(result, self);
    }
  end

  def each_byte(str)
    %x{
      for (let i = 0, length = str.length; i < length; i++) {
        const char_code = str.charCodeAt(i);
        #{yield 0};
        #{yield 0};
        #{yield `char_code >> 8`};
        #{yield `char_code & 0xff`};
      }
    }
  end

  def each_byte_buffer(str, io_buffer)
    b_size = io_buffer.size
    pos = 0
    %x{
      let char_code,
          dv = io_buffer.data_view;

      function set_byte(byte) {
        if (pos === b_size) {
          #{yield pos}
          pos = 0;
        }
        dv.setUint8(pos++, byte);
      }

      for (let i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        set_byte(0);
        set_byte(0);
        set_byte(char_code >> 8);
        set_byte(char_code & 0xff);
      }

      if (pos > 0) { #{yield pos} }
    }
    str
  end
end

::Encoding.register 'ASCII-8BIT', aliases: ['BINARY'], ascii: true do
  def bytes(str)
    %x{
      const string = str.valueOf(), length = string.length;
      if (!/[\u0100-\uFFFF]/.test(string)) {
        // Every character of the string is one byte, and Array#push is a Ruby
        // method, so the array is filled by index.
        const bytes = new Array(length);
        for (let i = 0; i < length; i++) bytes[i] = string.charCodeAt(i);
        return bytes;
      }
      const bytes = [];
      let count = 0, char_code;
      for (let i = 0; i < length; i++) {
        char_code = string.charCodeAt(i);
        if (char_code > 0xff) bytes[count++] = char_code >> 8;
        bytes[count++] = char_code & 0xff;
      }
      return bytes;
    }
  end

  def bytesize(str, index = undefined)
    %x{
      const string = str.valueOf(), length = string.length;
      if (index === undefined) index = length;
      if (index >= length) return self.$bytes_sum(str);
      if (!/[\u0100-\uFFFF]/.test(string)) return index + 1;
      // A character above 0xff is written as two bytes.
      let bytes = 0;
      for (let i = 0; i <= index; i++) {
        if (string.charCodeAt(i) > 0xff) bytes++;
        bytes++;
      }
      return bytes;
    }
  end

  def byte_at(str, index)
    %x{
      const string = str.valueOf(), length = string.length;
      if (!/[\u0100-\uFFFF]/.test(string)) {
        // Every character of the string is one byte.
        if (index < 0) index += length;
        if (index < 0 || index >= length) return nil;
        return string.charCodeAt(index);
      }
      // A character above 0xff is written as two bytes, so the bytes are
      // built and walked.
      const bytes = self.$bytes(str);
      if (index < 0) index += bytes.length;
      if (index < 0 || index >= bytes.length) return nil;
      return bytes[index];
    }
  end

  def bytes_sum(str)
    %x{
      const string = str.valueOf();
      let sum = 0, code;
      for (let i = 0, length = string.length; i < length; i++) {
        code = string.charCodeAt(i);
        if (code > 0xff) sum += code >> 8;
        sum += code & 0xff;
      }
      return sum;
    }
  end

  def byte_index(str, char_index)
    %x{
      const string = str.valueOf();
      if (!/[\u0100-\uFFFF]/.test(string)) return char_index;
      // A character above 0xff is written as two bytes.
      let bytes = 0;
      for (let i = 0; i < char_index; i++) {
        if (string.charCodeAt(i) > 0xff) bytes++;
        bytes++;
      }
      return bytes;
    }
  end

  def char_index(str, byte_offset)
    %x{
      const string = str.valueOf(), length = string.length;
      if (!/[\u0100-\uFFFF]/.test(string)) {
        if (byte_offset > length) return -2;
        return byte_offset;
      }
      let bytes = 0, index = 0;
      for (let i = 0; i < length; i++) {
        if (bytes >= byte_offset) break;
        if (string.charCodeAt(i) > 0xff) bytes++;
        bytes++; index++;
      }
      if (bytes < byte_offset) return -2;
      return bytes === byte_offset ? index : -1;
    }
  end

  def dump_byte_escape?(code_point)
    # Every character up to 0xff is a whole byte of the encoding, and String#dump
    # escapes it as \xNN.
    code_point <= 0xff
  end

  def byteslice(str, index, length)
    # Must handle negative index and length, with length being negative indicating a negative range end.
    %x{
      const string = str.valueOf();
      let i;
      if (/[\u0100-\uFFFF]/.test(string)) {
        // A character above 0xff is written as two bytes, so the bytes are
        // built and sliced.
        const bytes = self.$bytes(str);
        if (index < 0) index += bytes.length;
        if (index < 0) return nil;
        if (length < 0) length = (bytes.length + length) - index;
        if (length < 0) return nil;
        let sliced = '';
        for (i = 0; i < length && index + i < bytes.length; i++) sliced += SFCC(bytes[index + i]);
        return sliced.length === 0 ? nil : sliced;
      }
      if (index < 0) index = string.length + index;
      if (index < 0) return nil;
      if (length < 0) length = (string.length + length) - index;
      if (length < 0) return nil;
      // must produce the same result as each_byte, so we cannot simply use slice()
      let result = '';
      for (i = 0; i < length && (index + i) <= string.length; i++) {
        result += SFCC(string.charCodeAt(index + i) & 0xff);
      }
      if (result.length === 0) return nil;
      return result;
    }
  end

  def decode(io_buffer)
    %x{
      // TextDecoder labels "ascii"/"latin1" mean windows-1252 in WHATWG,
      // so bytes 0x80..0xFF must be mapped to the same code points here.
      let bytes = new Uint8Array(io_buffer.data_view.buffer, io_buffer.data_view.byteOffset, io_buffer.data_view.byteLength), result = '';
      for (let i = 0, length = bytes.length; i < length; i += 8192)
        result += SFCC(...bytes.subarray(i, Math.min(i + 8192, length)));
      return $str(result, self);
    }
  end

  def decode!(io_buffer)
    %x{
      let bytes = new Uint8Array(io_buffer.data_view.buffer, io_buffer.data_view.byteOffset, io_buffer.data_view.byteLength), result = '';
      for (let i = 0, length = bytes.length; i < length; i += 8192)
        result += SFCC(...bytes.subarray(i, Math.min(i + 8192, length)));
      return $str(result, self);
    }
  end

  def each_byte(str)
    %x{
      const string = str.valueOf();
      for (let char_code, i = 0, length = string.length; i < length; i++) {
        char_code = string.charCodeAt(i);
        if (char_code > 0xff) #{yield `char_code >> 8`};
        #{yield `char_code & 0xff`};
      }
    }
  end

  def each_byte_buffer(str, io_buffer)
    b_size = io_buffer.size
    pos = 0
    %x{
      let dv = io_buffer.data_view;

      function set_byte(byte) {
        if (pos === b_size) {
          #{yield pos}
          pos = 0;
        }
        dv.setUint8(pos++, byte);
      }

      for (let char_code, i = 0, length = str.length; i < length; i++) {
        char_code = str.charCodeAt(i);
        if (char_code > 0xff) set_byte(char_code >> 8);
        set_byte(char_code & 0xff);
      }

      if (pos > 0) { #{yield pos} }
    }
    str
  end

  def scrub(str, replacement, &block)
    # Every byte of a binary string is valid, there is nothing to replace.
    str
  end

  def valid_encoding?(str)
    # Every byte of a binary string is valid.
    true
  end

  def chr(value)
    %x{
      if (value > 0xff) Opal.raise(Opal.RangeError, value + ' out of char range');
      return $str(String.fromCharCode(value), self);
    }
  end
end

::Encoding.register 'ISO-8859-1', aliases: ['ISO8859-1'], ascii: true, inherits: ::Encoding::ASCII_8BIT

::Encoding.register 'US-ASCII', aliases: ['ASCII'], ascii: true, inherits: ::Encoding::ASCII_8BIT do
  def scrub(str, replacement, &block)
    %x{
      const string = str.valueOf();
      let result = null, char_code;
      for (let i = 0, length = string.length; i < length; i++) {
        char_code = string.charCodeAt(i);
        if (char_code > 0x7f) {
          if (result === null) result = string.slice(0, i);
          if (block !== nil) result += String(#{yield `char_code`});
          else if (replacement !== nil && replacement !== undefined) result += String(replacement);
          else result += '?';
        } else if (result !== null) {
          result += string[i];
        }
      }
      if (result === null) return $str(string, self);
      return $str(result, self);
    }
  end

  def valid_encoding?(str)
    %x{
      const string = str.valueOf();
      for (let i = 0, length = string.length; i < length; i++)
        if (string.charCodeAt(i) > 0x7f) return false;
      return true;
    }
  end

  def chr(value)
    %x{
      if (value > 0xff) Opal.raise(Opal.RangeError, value + ' out of char range');
      if (value > 0x7f) encoding_chr_invalid(self, value);
      return $str(String.fromCharCode(value), self);
    }
  end
end

::Encoding.default_external = __ENCODING__

`Opal.prop(String.prototype, 'encoding', #{::Encoding::UTF_8})`
`Opal.prop(String.prototype, 'binary_encoding', #{::Encoding::UTF_8})`

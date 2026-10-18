# backtick_javascript: true
# helpers: coerce_to_or_raise
# frozen_string_literal: true

# Zlib over node:zlib. The one-shot methods (Zlib.deflate, Zlib.gunzip,
# Zlib.crc32) go straight to that module. The streaming classes keep their
# input in a buffer instead: node's zlib streams are asynchronous, and a
# synchronous reader would have to drive them by hand, so a chunk is
# compressed or released when the stream says it is complete.
module Zlib
  VERSION = '1.3.1'
  ZLIB_VERSION = '1.3.1'

  NO_COMPRESSION = 0
  BEST_SPEED = 1
  BEST_COMPRESSION = 9
  DEFAULT_COMPRESSION = -1
  DEFAULT_STRATEGY = 0
  FILTERED = 1
  HUFFMAN_ONLY = 2
  RLE = 3
  FIXED = 4

  NO_FLUSH = 0
  SYNC_FLUSH = 1
  FULL_FLUSH = 2
  FINISH = 4

  # What ZStream#data_type answers with.
  BINARY = 0
  ASCII = 1
  TEXT = 1
  UNKNOWN = 2

  class Error < ::StandardError
  end

  class BufError < Error
  end

  class DataError < Error
  end

  class NeedDict < Error
  end

  class MemError < Error
  end

  %x{
    function $zlib() {
      var modules = Opal.platform && Opal.platform.modules;
      if (!modules || !modules.zlib) {
        #{::Kernel.raise ::NotImplementedError, 'Zlib needs a zlib module, which this platform does not provide'};
      }
      return modules.zlib;
    }

    // A Ruby String to a Buffer, through #bytes so the encoding is respected:
    // a binary String holds one byte per character, text holds its own bytes.
    function $buffer(str) {
      return Buffer.from(str.$bytes());
    }

    // A Buffer to a binary Ruby String, one byte per character.
    function $binary(buffer) {
      var bytes = new Array(buffer.length);
      for (var i = 0; i < buffer.length; i++) bytes[i] = buffer[i];
      return bytes;
    }

    function $crc32(str) {
      return $zlib().crc32($buffer(str)) >>> 0;
    }

    function $adler32_buffer(buf, adler) {
      var sum1 = (adler === undefined || adler === nil) ? 1 : (adler & 0xffff),
          sum2 = (adler === undefined || adler === nil) ? 0 : ((adler >>> 16) & 0xffff);
      for (var i = 0; i < buf.length; i++) {
        sum1 = (sum1 + buf[i]) % 65521;
        sum2 = (sum2 + sum1) % 65521;
      }
      return ((sum2 << 16) | sum1) >>> 0;
    }

    function $adler32(str, adler) {
      return $adler32_buffer($buffer(str), adler);
    }

    function $adler32_buffers(buffers) {
      return $adler32_buffer(Buffer.concat(buffers), 1);
    }

    // Inflates what has been collected so far, or returns null while the
    // stream is still incomplete.
    // A Buffer back into a binary Ruby String. Building it in chunks keeps a
    // large buffer from costing one concatenation per byte.
    function $binary_string(buffer) {
      var parts = [], i = 0, size = 8192;
      for (; i < buffer.length; i += size) {
        parts.push(String.fromCharCode.apply(null, buffer.subarray(i, i + size)));
      }
      return Opal.str(parts.join(''), 'ASCII-8BIT');
    }

    // The initial value a checksum starts from: Ruby takes it as an unsigned
    // 32-bit integer and raises when it doesn't fit.
    function $checksum_value(value) {
      if (typeof value !== 'number' || !Number.isInteger(value) ||
          value < -0x100000000 || value > 0xffffffff) {
        #{::Kernel.raise ::RangeError, 'integer too big to convert'};
      }
      return value >>> 0;
    }

    // The CRC-32 table, the one zlib's get_crc_table() returns.
    function $crc_table() {
      var table = new Array(256), c, n, k;
      for (n = 0; n < 256; n++) {
        c = n;
        for (k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
      }
      return table;
    }

    function $bytes_index(buffer, byte, from) {
      return buffer.indexOf(byte, from);
    }

    function $inflate_try(buffers) {
      try {
        return $zlib().inflateSync(Buffer.concat(buffers));
      } catch {
        return null;
      }
    }
  }

  def self.zlib_version
    ZLIB_VERSION
  end

  def self.version
    ZLIB_VERSION
  end

  # The CRC-32 of the string, or of the string appended to a running value.
  def self.crc32(string = '', crc = 0)
    crc = `$checksum_value(#{crc})`
    `($zlib().crc32($buffer(#{string}), #{crc}) >>> 0)`
  end

  def self.adler32(string = '', adler = 1)
    adler = `$checksum_value(#{adler})`
    `$adler32(#{string}, #{adler})`
  end

  def self.crc_table
    `$crc_table()`
  end

  def self.deflate(string, level = DEFAULT_COMPRESSION)
    `$binary_string($zlib().deflateSync($buffer(#{string}), { level: #{level} }))`
  end

  def self.inflate(string, buffer = nil)
    result = `$binary_string($zlib().inflateSync($buffer(#{string})))`
    return result if buffer.nil?
    buffer.replace(result)
    buffer
  end

  def self.gzip(string, level = DEFAULT_COMPRESSION)
    `$binary_string($zlib().gzipSync($buffer(#{string}), { level: #{level} }))`
  end

  def self.gunzip(string)
    `$binary_string($zlib().gunzipSync($buffer(#{string})))`
  end

  # The base of the stream classes: the input buffer and the counters that
  # report on it.
  class ZStream
    def initialize
      @input = []
      @adler = 1
      @closed = false
    end

    # Bytes waiting in the input buffer.
    def avail_in
      `Buffer.concat(#{@input}).length`
    end

    # Nothing waits on the output side: the output comes out in one go.
    def avail_out
      0
    end

    # The Adler-32 of everything fed to the stream so far.
    def adler
      @adler
    end

    def close
      @closed = true
      self
    end

    def closed?
      @closed
    end

    def eof?
      true
    end

    def inspect
      "#<#{self.class}>"
    end

    private

    # Feeds the input buffer and keeps the running Adler-32.
    def feed(string)
      buffer = `$buffer(#{string})`
      @input << buffer
      @adler = `$adler32_buffer(#{buffer}, #{@adler})`
      buffer
    end
  end

  # Compresses on #deflate and #finish. node's deflate is a synchronous
  # one-shot, so a call without a flush request only buffers: the bytes come
  # out when the stream is flushed or finished.
  class Deflate < ZStream
    def self.deflate(string, level = DEFAULT_COMPRESSION)
      new(level).deflate(string, FINISH)
    end

    def initialize(level = DEFAULT_COMPRESSION, window_bits = 15, strategy = DEFAULT_STRATEGY)
      super()
      @level = level
      @strategy = strategy
    end

    attr_reader :level, :strategy

    # What a deflate stream holds is never text.
    def data_type
      UNKNOWN
    end

    def <<(string)
      feed(string) if string
      self
    end

    def deflate(string = nil, flush = NO_FLUSH)
      feed(string) if string
      return '' if flush == NO_FLUSH
      flush_next_out
    end

    # Compresses everything buffered so far and empties the input.
    def flush_next_out
      return '' if @input.empty?
      result = `$binary_string($zlib().deflateSync(Buffer.concat(#{@input}), { level: #{@level} }))`
      @input = []
      result
    end

    def finish
      result = flush_next_out
      close
      result
    end

    def reset
      @input = []
      @adler = 1
      self
    end
  end

  # Decompresses on #inflate; #<< only buffers, so the output of a stream fed
  # with #<< comes out at #finish, as in Ruby.
  class Inflate < ZStream
    def self.inflate(string, buffer = nil)
      new.inflate(string, buffer)
    end

    def initialize(window_bits = 15)
      super()
      @window_bits = window_bits
      @pass = []
    end

    def data_type
      BINARY
    end

    def inflate(string = nil, buffer = nil)
      if @closed
        # Past #finish the stream passes its input through unchanged.
        result = string.nil? ? '' : string.to_s
      else
        feed(string) if string
        out = `$inflate_try(#{@input})`
        result = `out === null ? '' : $binary_string(out)`
        @input = [] unless result == ''
      end
      return result if buffer.nil?
      buffer.replace(result)
      buffer
    end

    # nil marks the end of the compressed data: what follows is passed through.
    def <<(string)
      if string.nil?
        @ended = true
      else
        @ended ? (@pass << `$buffer(#{string})`) : feed(string)
      end
      self
    end

    # Releases the output of everything still buffered. A stream that stops
    # short of its end raises, as Ruby's does.
    def finish
      result = ''
      unless @ended || @closed || @input.empty?
        out = `$inflate_try(#{@input})`
        ::Kernel.raise ::Zlib::BufError, 'inflating is incomplete' if `out === null`
        result = `$binary_string(#{out})`
        @input = []
      end
      result += `$binary_string(Buffer.concat(#{@pass}))` unless @pass.empty?
      @pass = []
      @ended = true
      close
      result
    end

    def flush_next_out
      out = `$inflate_try(#{@input})`
      return '' if `out === null`
      @input = []
      `$binary_string(#{out})`
    end

    def reset
      @input = []
      @pass = []
      @adler = 1
      @ended = false
      self
    end
  end

  # The gzip header fields a reader and a writer share.
  class GzipFile
    def mtime
      @mtime
    end

    def mtime=(time)
      @mtime = time
    end

    attr_reader :name, :comment

    def close
      @closed = true
      self
    end

    def closed?
      @closed
    end

    def inspect
      "#<#{self.class}>"
    end
  end

  # Reads a gzip stream. The whole input is taken from the wrapped IO and
  # inflated at once, then served from the buffer.
  class GzipReader < GzipFile
    def initialize(io, external_encoding: nil, encoding: nil)
      super()
      @io = io
      @external_encoding = external_encoding || encoding
      data = ::String === io ? io : io.read
      data = '' if data.nil?
      @mtime = self.class.gzip_mtime(data)
      @pos = 0
      @unget = []
      @data = `$zlib().gunzipSync($buffer(#{data}))`
    end

    # The bytes read so far, tagged with the encoding the stream was opened with.
    def tag(string)
      return string if @external_encoding.nil?
      string.force_encoding(@external_encoding.name)
    end

    # The mtime a gzip stream carries, in its fourth to seventh bytes.
    def self.gzip_mtime(data)
      bytes = data.bytes
      return nil if bytes.length < 8
      seconds = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)
      ::Time.at(seconds)
    end

    def self.wrap(io)
      new(io)
    end

    def size
      `#{@data}.length`
    end

    def read(length = nil, outbuf = nil)
      return '' if length == 0
      return nil if eof?
      count = length.nil? ? `#{@data}.length - #{@pos}` : length
      result = tag(`$binary_string(#{take(count)})`)
      return outbuf.replace(result) if outbuf
      result
    end

    def readpartial(maxlen, outbuf = nil)
      ::Kernel.raise ::EOFError if eof?
      read(maxlen, outbuf)
    end

    def getbyte
      return @unget.shift unless @unget.empty?
      return nil if @pos >= `#{@data}.length`
      byte = `#{@data}[#{@pos}]`
      @pos += 1
      byte
    end

    alias getc getbyte

    def each_byte
      return to_enum(:each_byte) unless block_given?
      while (byte = getbyte)
        yield byte
      end
      self
    end

    alias each_char each_byte

    def gets(sep = $/)
      return read(nil) if sep.nil?
      return nil if eof?
      unless @unget.empty?
        # The ungot bytes come first, so the line has to be built from them.
        line = @unget.shift.chr
        @unget = @unget[1..-1].to_a
        return tag(line)
      end
      index = `$bytes_index(#{@data}, #{sep.ord}, #{@pos})`
      stop = `index === -1 ? #{@data}.length : index`
      count = `stop - #{@pos} + (index === -1 ? 0 : 1)`
      result = tag(`$binary_string(#{@data}.subarray(#{@pos}, #{@pos} + #{count}))`)
      @pos += count
      result
    end

    def each_line(sep = $/)
      return to_enum(:each_line) unless block_given?
      while (line = gets(sep))
        yield line
      end
      self
    end

    alias each each_line

    def ungetbyte(byte)
      @unget.unshift(byte.is_a?(::Integer) ? byte : byte.ord)
      @pos -= 1 if @pos > 0
      nil
    end

    alias ungetc ungetbyte

    def eof?
      @pos >= `#{@data}.length` && @unget.empty?
    end

    def pos
      @pos
    end

    def rewind
      @pos = 0
      @unget = []
      0
    end

    def seek(offset, whence = ::IO::SEEK_SET)
      target = case whence
      when ::IO::SEEK_SET then offset
      when ::IO::SEEK_CUR then @pos + offset
      when ::IO::SEEK_END then `#{@data}.length` + offset
      else ::Kernel.raise ::ArgumentError, "invalid whence: #{whence.inspect}"
      end
      @pos = target
      @unget = []
      0
    end

    def finish
      close
    end

    private

    # Takes the next count bytes, ungot ones first, and moves the position.
    def take(count)
      bytes = []
      bytes << @unget.shift while !@unget.empty? && bytes.length < count
      buffer = `Buffer.from(#{bytes})`
      rest = count - `buffer.length`
      return buffer unless rest > 0
      slice = `#{@data}.subarray(#{@pos}, #{@pos} + #{rest})`
      @pos += `slice.length`
      `Buffer.concat([#{buffer}, #{slice}])`
    end
  end

  # Writes a gzip stream. The data is collected and compressed when the writer
  # is closed, which is what a .gem or a log file needs.
  class GzipWriter < GzipFile
    def initialize(io, level = DEFAULT_COMPRESSION, strategy = DEFAULT_STRATEGY)
      super()
      @io = io
      @level = level
      @strategy = strategy
      @data = []
      @mtime = ::Time.now
    end

    attr_accessor :level, :strategy

    def name=(name)
      @name = name
    end

    def comment=(comment)
      @comment = comment
    end

    def write(string)
      string = string.to_s
      @data << `$buffer(#{string})`
      string.length
    end

    def <<(string)
      write(string)
      self
    end

    def print(*args)
      args.each { |arg| write(arg) }
      nil
    end

    def puts(*args)
      args.each do |arg|
        string = arg.to_s
        write(string)
        write("\n") unless string.end_with?("\n")
      end
      nil
    end

    # Writes the compressed stream and detaches from the IO; the IO stays open.
    def finish
      return self if @finished
      @finished = true
      gzip = `$binary_string($zlib().gzipSync(Buffer.concat(#{@data}), { level: #{@level}, mtime: #{@mtime.to_i} }))`
      @io.write(gzip)
      @data = []
      self
    end

    def close
      finish
      @io.close if @io.respond_to?(:close)
      super
    end
  end
end

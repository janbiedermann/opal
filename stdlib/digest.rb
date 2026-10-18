# backtick_javascript: true
# helpers: coerce_to_or_raise
# frozen_string_literal: true

require 'corelib/array/pack'

# The digest classes wrap node:crypto's createHash, so the algorithms available
# are the ones that module offers, and a platform without a crypto module (a
# browser, say) raises NotImplementedError rather than answering with a wrong
# digest.
module Digest
  class Error < ::StandardError
  end

  # The hex form of a binary String, the inverse of a digest's #hexdigest.
  def self.hexencode(str, separator = '')
    bytes = `$coerce_to_or_raise(#{str}, Opal.String, 'to_str')`.bytes
    hex = bytes.map { |byte| '%02x' % byte }
    hex.join(separator)
  end

  %x{
    function $crypto() {
      var modules = Opal.platform && Opal.platform.modules;
      if (!modules || !modules.crypto) {
        #{::Kernel.raise ::NotImplementedError, 'Digest needs a crypto module, which this platform does not provide'};
      }
      return modules.crypto;
    }

    // An Opal string is a JS string: a binary one holds one byte per unit and
    // must reach the hash as latin1, text as utf8.
    function $hash_feed(hash, str) {
      // #bytes gives the bytes the string's own encoding holds: the UTF-8
      // bytes of a text string, and one byte per character of a binary one.
      // Asking the encoding after String() would unbox the string first and
      // lose the tag a binary string carries.
      hash.update(Buffer.from(str.$bytes()));
    }
  }

  # The instance side of a digest. A class that only mixes this module in has
  # no algorithm, and its digest methods raise, as CRuby's do.
  module Instance
    # The node:crypto name of the algorithm, or nil when this class isn't one.
    def digest_algorithm
      nil
    end

    def initialize
      algorithm = digest_algorithm
      `self.$$digestState = (#{algorithm} === nil) ? null : $crypto().createHash(String(#{algorithm}))`
    end

    def reset
      initialize
      self
    end

    # A fresh instance of the same class, as CRuby's Digest::Instance#new.
    def new
      self.class.new
    end

    def update(*args)
      case args.length
      when 1
        feed(args[0])
      when 2
        feed(args[0])
        feed(args[1])
      when 3
        string, start, length = args
        feed(string[start, length]) if length
      else
        ::Kernel.raise ::ArgumentError, "wrong number of arguments (#{args.length} for 1..3)"
      end
      self
    end

    def <<(string)
      feed(string)
      self
    end

    def digest(string = nil)
      return binary_digest if string.nil?
      reset
      feed(string)
      result = binary_digest
      reset
      result
    end

    def hexdigest(string = nil)
      return `#{state}.copy().digest('hex')` unless string
      reset
      feed(string)
      result = `#{state}.digest('hex')`
      reset
      result
    end

    def base64digest(string = nil)
      return `#{state}.copy().digest('base64')` unless string
      reset
      feed(string)
      result = `#{state}.digest('base64')`
      reset
      result
    end

    # Digs the digest and resets, so the instance is blank afterwards.
    def digest!
      result = binary_digest
      reset
      result
    end

    def hexdigest!
      result = `#{state}.digest('hex')`
      reset
      result
    end

    def base64digest!
      result = `#{state}.digest('base64')`
      reset
      result
    end

    def block_length
      self.class::BLOCK_LENGTH
    end

    def digest_length
      self.class::DIGEST_LENGTH
    end

    alias size digest_length
    alias length digest_length

    def ==(other)
      return hexdigest == other.hexdigest if Instance === other
      hexdigest == `$coerce_to_or_raise(#{other}, Opal.String, 'to_str')`
    end

    def inspect
      "#<#{self.class}: #{hexdigest}>"
    end

    def to_s
      hexdigest
    end

    private

    def state
      state = `self.$$digestState`
      ::Kernel.raise ::RuntimeError, "#{self.class} has no digest algorithm" if `#{state} === null`
      state
    end

    def feed(string)
      `$hash_feed(#{state}, #{string.to_str})`
    end

    def binary_digest
      `Array.from(#{state}.copy().digest())`.pack('C*')
    end
  end

  # The superclass of the digest classes, holding the one-shot class methods.
  class Class
    class << self
      def digest(string)
        new.digest(string)
      end

      def hexdigest(string)
        new.hexdigest(string)
      end

      def base64digest(string)
        new.base64digest(string)
      end

      def block_length
        self::BLOCK_LENGTH
      end

      def digest_length
        self::DIGEST_LENGTH
      end

      alias size digest_length
      alias length digest_length

      # Returns an instance holding the digest of the file's contents.
      def file(filename)
        path = `$coerce_to_or_raise(#{filename}, Opal.String, 'to_str')`
        new.tap { |digest| digest.update(::File.binread(path)) }
      end

      # Same as #file; CRuby's version also resets the receiver, which for a
      # class-level call has nothing to reset.
      def file!(filename)
        self.file(filename)
      end
    end

    include Instance
  end

  class Base < Class
  end

  class MD5 < Base
    BLOCK_LENGTH = 64
    DIGEST_LENGTH = 16

    def digest_algorithm
      'md5'
    end
  end

  class SHA1 < Base
    BLOCK_LENGTH = 64
    DIGEST_LENGTH = 20

    def digest_algorithm
      'sha1'
    end
  end

  class SHA256 < Base
    BLOCK_LENGTH = 64
    DIGEST_LENGTH = 32

    def digest_algorithm
      'sha256'
    end
  end

  class SHA224 < Base
    BLOCK_LENGTH = 64
    DIGEST_LENGTH = 28

    def digest_algorithm
      'sha224'
    end
  end

  class SHA384 < Base
    BLOCK_LENGTH = 128
    DIGEST_LENGTH = 48

    def digest_algorithm
      'sha384'
    end
  end

  class SHA512 < Base
    BLOCK_LENGTH = 128
    DIGEST_LENGTH = 64

    def digest_algorithm
      'sha512'
    end
  end

  # The SHA2 family; a bare Digest::SHA2 digests with SHA256.
  class SHA2 < Base
    BLOCK_LENGTH = 64
    DIGEST_LENGTH = 32

    def initialize(bitlength = nil)
      @bitlength = bitlength.nil? ? 256 : bitlength
      super()
    end

    def digest_algorithm
      "sha#{@bitlength}"
    end
  end
end

module ::Kernel
  # Digest("SHA256") names the digest class.
  def Digest(algorithm = 'SHA1')
    algorithm = algorithm.name if ::Digest::Class === algorithm
    ::Digest.const_get(algorithm.to_s.upcase)
  end

  module_function :Digest
end

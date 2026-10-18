# backtick_javascript: true
# helpers: coerce_to_or_raise
# frozen_string_literal: true

require 'digest'

# The Bubble Babble encoding of a digest, a sequence of vowel/consonant pairs
# chosen so a human can read a hash back over the phone. Ported from CRuby's
# ext/digest/bubblebabble/bubblebabble.c.
module Digest
  BUBBLEBABBLE_VOWELS = %w[a e i o u y]
  BUBBLEBABBLE_CONSONANTS = %w[b c d f g h k l m n p r s t v z x]

  # Encodes the bytes of the given string.
  def self.bubblebabble(str)
    digest = `$coerce_to_or_raise(#{str}, Opal.String, 'to_str')`
    bytes = digest.bytes
    digest_len = bytes.length

    out = ['x']
    i = 0
    seed = 1

    loop do
      if i >= digest_len
        out << BUBBLEBABBLE_VOWELS[seed % 6]
        out << BUBBLEBABBLE_CONSONANTS[16]
        out << BUBBLEBABBLE_VOWELS[seed / 6]
        break
      end

      byte1 = bytes[i]
      i += 1
      out << BUBBLEBABBLE_VOWELS[(((byte1 >> 6) & 3) + seed) % 6]
      out << BUBBLEBABBLE_CONSONANTS[(byte1 >> 2) & 15]
      out << BUBBLEBABBLE_VOWELS[((byte1 & 3) + (seed / 6)) % 6]

      break if i >= digest_len

      byte2 = bytes[i]
      i += 1
      out << BUBBLEBABBLE_CONSONANTS[(byte2 >> 4) & 15]
      out << '-'
      out << BUBBLEBABBLE_CONSONANTS[byte2 & 15]

      seed = (seed * 5 + byte1 * 7 + byte2) % 36
    end

    out << 'x'
    out.join
  end

  class Class
    class << self
      # The bubble babble form of this digest of the given strings.
      def bubblebabble(*strings)
        ::Digest.bubblebabble(new.digest(*strings))
      end
    end

    # The bubble babble form of the digest so far.
    def bubblebabble
      ::Digest.bubblebabble(digest)
    end
  end
end

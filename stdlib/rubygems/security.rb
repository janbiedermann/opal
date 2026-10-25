# frozen_string_literal: true

# Opal's Gem::Security: the checksums of a package, and nothing more.
#
# The upstream file is seven hundred lines of OpenSSL: signing a gem, its
# certificate chain, the trust store and the four security policies that
# decide whether an unsigned or a wrongly signed gem may be installed. None
# of it is possible without an OpenSSL, and none of it is what makes an
# install safe here: what a --verify run can check is that the bytes of the
# package still hash to the checksums its own checksums.yaml.gz carries, and
# that is what this file does. A gem that carries a signature is installed
# with the signature unread, and `gem cert` and `gem sign` say so.

require "digest"

module Gem
  module Security
    ##
    # Raised for the signing and certificate commands this port refuses.

    class Exception < Gem::Exception; end

    ##
    # The algorithm a package's checksums are written with.

    DIGEST_NAME = "SHA256"

    DIGEST_ALGORITHM = Digest::SHA256

    ##
    # The algorithms a checksums.yaml.gz may name.

    SUPPORTED_DIGESTS = {
      "MD5" => Digest::MD5,
      "SHA1" => Digest::SHA1,
      "SHA256" => Digest::SHA256,
      "SHA384" => Digest::SHA384,
      "SHA512" => Digest::SHA512,
    }.freeze

    ##
    # A digest of one named algorithm, which both feeds bytes to a running
    # digest and hands out fresh ones: Gem::Package#digest feeds it the bytes
    # of an entry, while Gem::Package::TarWriter#add_file_digest asks it for a
    # new digest per file. OpenSSL::Digest does both, which is why upstream
    # can call .new on what create_digest answers.

    class Digester
      attr_reader :name

      def initialize(name)
        @name = name
        @algorithm = Security.digest_algorithm(name)
        @digest = @algorithm.new
      end

      def new
        digest = @algorithm.new
        # TarWriter names a digest by #name, falling back to the class name;
        # OpenSSL::Digest answers name, a Digest class here does not, so the
        # digest gets the name it was created under. Without it every digest
        # of a package lands under the same key.
        name = @name
        digest.define_singleton_method(:name) { name }
        digest
      end

      def <<(data)
        @digest << data
        self
      end

      def digest(*args)
        @digest.digest(*args)
      end

      def hexdigest(*args)
        @digest.hexdigest(*args)
      end

      def reset
        @digest = @algorithm.new
        self
      end
    end

    ##
    # The Digest class of an algorithm name, or nil when there is none.

    def self.digest_algorithm(digest_name)
      algorithm = SUPPORTED_DIGESTS[digest_name] ||
        (Digest.const_defined?(digest_name.upcase) && Digest.const_get(digest_name.upcase))

      raise ArgumentError, "unsupported digest algorithm: #{digest_name}" unless algorithm

      algorithm
    end

    ##
    # The digest of +data+, named the way checksums.yaml.gz names it.

    def self.create_digest(digest_name = DIGEST_NAME, data = nil)
      digester = Digester.new(digest_name)
      return digester unless data

      digester.new.digest data
    end

    ##
    # There is no trust store to look certificates up in.

    def self.trust_dir
      nil
    end

    def self.create_cert_store(_chain)
      raise Gem::OperationNotSupportedError, "Opal cannot verify gem signatures: there is no OpenSSL"
    end

    ##
    # A signer without a key, which is what a gem built here has: the
    # package asks it for the digest to write checksums with, and only reaches
    # for #sign when there is a key, which there cannot be. Upstream's Signer
    # builds keys and signs with OpenSSL.

    class Signer
      attr_reader :key, :cert_chain, :passphrase, :digest_name, :digest_algorithm

      def initialize(key = nil, cert_chain = nil, passphrase = nil, options = {})
        if key
          raise Gem::OperationNotSupportedError,
            "Opal cannot sign a gem: there is no OpenSSL"
        end

        @key = nil
        @cert_chain = cert_chain || []
        @passphrase = passphrase
        @digest_name = DIGEST_NAME
        @digest_algorithm = Gem::Security.create_digest(@digest_name)
      end

      def sign(data)
        raise Gem::OperationNotSupportedError,
          "Opal cannot sign a gem: there is no OpenSSL"
      end

      def verify(*args)
        raise Gem::OperationNotSupportedError,
          "Opal cannot verify a gem signature: there is no OpenSSL"
      end
    end

    class Verifier
      def initialize(*args)
        raise Gem::OperationNotSupportedError,
          "Opal cannot verify a gem signature: there is no OpenSSL"
      end
    end

    ##
    # The digest of one file of a package, checked against its checksums.

    class DigestOptions
      attr_reader :none

      def initialize(options = {})
        @none = false
        @tar_steam = nil

        return if options.nil?
        return self.none = true if options[:none]
        return self.none = true if options == :none

        self.tar_stream = options[:tar_stream]
      end

      def self.from_options(options)
        return nil if options.nil?
        return nil if options == :none
        return nil if options[:none]

        new options
      end

      def none?
        @none
      end

      attr_writer :none

      ##
      # The stream the digests are read from, in the order the package was
      # written: a gem's checksums are only right for the byte order it ships.

      attr_reader :tar_stream

      def tar_stream=(stream)
        @tar_stream = stream
      end
    end
  end
end

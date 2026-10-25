# frozen_string_literal: true

require "zlib"

# On RubyGems versions too old to vendor Gem::Net (when this file is loaded
# from the copy shipped inside the Bundler gem), Bundler's own
# vendored_net_http shim has already defined it before this file is loaded.
#
# Opal: upstream rescues LoadError and falls back to the standard library's
# net/http; there is no net/http here (the port's stand-in is the file above,
# see its header), and a require the builder cannot resolve is a build error
# rather than a LoadError a rescue could reach, so that fallback is out.
require "rubygems/vendored_net_http" unless defined?(Gem::Net::HTTP)

class Gem::CompactIndexClient
  # Updates the cached files on disk, keeping them in sync with the server
  # using conditional requests (ETag) and ranged requests where possible.
  class Updater
    class MismatchedChecksumError < Error
      def initialize(path, message)
        super "The checksum of /#{path} does not match the checksum provided by the server! Something is wrong. #{message}"
      end
    end

    def initialize(fetcher)
      @fetcher = fetcher
    end

    def update(remote_path, local_path, etag_path)
      append(remote_path, local_path, etag_path) || replace(remote_path, local_path, etag_path)
    rescue CacheFile::DigestMismatchError => e
      raise MismatchedChecksumError.new(remote_path, e.message)
    rescue Zlib::GzipFile::Error
      raise Error, "invalid gzip response while fetching /#{remote_path}"
    end

    private

    def append(remote_path, local_path, etag_path)
      return false unless local_path.file? && local_path.size.nonzero?

      CacheFile.copy(local_path) do |file|
        # Opal: upstream reads the ETag and chomps it in place (tap(&:chomp!));
        # the copy is taken instead, which is what the value needs to be anyway.
        etag = etag_path.read.chomp if etag_path.file?

        # Subtract a byte to ensure the range won't be empty.
        # Avoids 416 (Range Not Satisfiable) responses.
        response = @fetcher.call(remote_path, request_headers(etag, file.size - 1))
        break true if response.is_a?(Gem::Net::HTTPNotModified)

        file.digests = parse_digests(response)
        # server may ignore Range and return the full response
        if response.is_a?(Gem::Net::HTTPPartialContent)
          tail = response.body.byteslice(1..-1)
          break false unless tail && file.append(tail)
        else
          file.write(response.body)
        end
        CacheFile.write(etag_path, etag_from_response(response))
        true
      end
    end

    # request without range header to get the full file or a 304 Not Modified
    def replace(remote_path, local_path, etag_path)
      etag = etag_path.read.chomp if etag_path.file?
      response = @fetcher.call(remote_path, request_headers(etag))
      return true if response.is_a?(Gem::Net::HTTPNotModified)
      CacheFile.write(local_path, response.body, parse_digests(response))
      CacheFile.write(etag_path, etag_from_response(response))
    end

    def request_headers(etag, range_start = nil)
      headers = {}
      headers["Range"] = "bytes=#{range_start}-" if range_start
      headers["If-None-Match"] = %("#{etag}") if etag
      headers
    end

    def etag_from_response(response)
      return unless response["ETag"]
      etag = response["ETag"].delete_prefix("W/")
      # Opal: the bang pair upstream uses here (delete_prefix! / delete_suffix!)
      # both shaves a wrapping character and says whether it was there, which is
      # how it refuses an ETag whose quotes are unbalanced. String is immutable
      # here, so #unwrap does the test and the cut together.
      unwrap(etag, '"')
    end

    # Unwraps and returns a Hash of digest algorithms and base64 values
    # according to RFC 8941 Structured Field Values for HTTP.
    # https://www.rfc-editor.org/rfc/rfc8941#name-parsing-a-byte-sequence
    # Ignores unsupported algorithms.
    def parse_digests(response)
      return unless header = response["Repr-Digest"] || response["Digest"]
      digests = {}
      # Opal: split takes no block here, and the bangs on algorithm have no
      # counterpart, so the name is normalised in one expression.
      header.split(",").each do |param|
        algorithm, value = param.split("=", 2)
        algorithm = algorithm.strip.downcase
        next unless SUPPORTED_DIGESTS.key?(algorithm)
        next unless value
        next unless value = byte_sequence(value)
        digests[algorithm] = value
      end
      digests.empty? ? nil : digests
    end

    # Unwrap surrounding colons (byte sequence)
    # The wrapping characters must be matched or we return nil.
    # Also handles quotes because right now rubygems.org sends them.
    def byte_sequence(value)
      value = unwrap(value, ":")
      return if value.nil?
      unwrap(value, '"')
    end

    # Opal-only helper: the pair of bangs upstream leans on, cut into one. It
    # answers the string untouched when +wrapper+ does not open it, nil when it
    # opens it without closing it, and what is between them otherwise.
    def unwrap(value, wrapper)
      return value unless value.start_with?(wrapper)
      return nil unless value.length >= 2 && value.end_with?(wrapper)
      value[1..-2]
    end
  end
end

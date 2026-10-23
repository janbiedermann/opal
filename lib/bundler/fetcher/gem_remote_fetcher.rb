# frozen_string_literal: true

require "rubygems/remote_fetcher"

module Bundler
  class Fetcher
    class GemRemoteFetcher < Gem::RemoteFetcher
      # Opal: upstream's initialize then sets @pool_size (the Gem::Request
      # pool width) and appends ssl_ca_cert to @cert_files; the port's
      # RemoteFetcher has neither - the transport (http.cjs) keeps its
      # connections on the Worker and Node verifies TLS against its own
      # trust store - so those two lines drop and the call stays.
      def initialize(*)
        super
      end

      def request(*args)
        super do |req|
          req.delete("User-Agent") if headers["User-Agent"]
          yield req if block_given?
        end
      end
    end
  end
end

# frozen_string_literal: true

require "rubygems/remote_fetcher"

# Opal: upstream's ConnectionPools keeps a pool of Gem::Net::HTTP connections
# per host, configures TLS and finds the environment's proxy. The port's
# transport (lib/opal/gems/http.cjs) owns connection reuse (one pool for the
# process, on the Worker), TLS (Node's trust store) and proxies
# (NODE_USE_ENV_PROXY, see Gem::HTTPTransport.enable_env_proxy), and every
# request of this stack goes through Gem::RemoteFetcher#request anyway - so
# the pool keeps only what that request cannot know: Bundler's override
# headers (User-Agent, X-Gemfile-Source) and the shape of the call. The
# size:/timeout: arguments stay in the signature; the transport decides both.
# The cert_files/SSL block and the Pool class have no counterpart here.
module Bundler
  class Fetcher
    class ConnectionPools
      attr_reader :override_headers

      def initialize(size:, timeout:)
        @override_headers = {}
        @fetcher = Gem::RemoteFetcher.new(nil)
      end

      # Performs one GET and answers the Gem::Net::HTTPResponse the transport
      # wrapped. A request that never completed arrives as a
      # Gem::RemoteFetcher::FetchError, which Downloader#request turns into
      # the Bundler error classes, as upstream's stale-connection retry does.
      def request(uri, headers = nil)
        headers ||= {}
        @fetcher.request(uri, Gem::Net::HTTP::Get) do |request|
          # A nil value in the passed headers drops the pool's override
          # header, which is what upstream's `request[name] = nil` does; the
          # shim's Request only assigns, so the skip happens here.
          override_headers.each do |key, value|
            next if headers.key?(key) && headers[key].nil?
            request[key] = value
          end
          headers.each do |key, value|
            next if value.nil?
            request[key] = value
          end
        end
      end

      # Opal: Node's fetch obeys HTTP_PROXY/HTTPS_PROXY/NO_PROXY through
      # NODE_USE_ENV_PROXY, so there is no per-URI proxy for the port to
      # report, and nil is the honest answer. Gem.configuration's
      # http_proxy has no transport to hand it to.
      def proxy_for(uri)
        nil
      end
    end
  end
end

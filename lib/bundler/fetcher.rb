# frozen_string_literal: true

# Opal: upstream vendors net-http, timeout and secure_random here. The port
# loads the gem side's Net shim and its timeouts through rubygems/remote_fetcher
# (which pulls rubygems/vendored_net_http.rb), and uses the stdlib securerandom
# under its real name. The autoloads become eager requires: this port resolves
# every require at compile time anyway, and the bundle always carries these
# small files. Bundler::Retry and Bundler::CIDetector join them (upstream
# autoloads them from the bundler root, which this port does not autoload).
require "rubygems/remote_fetcher"
require "securerandom"
require "zlib"
require_relative "retry"
require_relative "ci_detector"
require_relative "fetcher/base"
require_relative "fetcher/compact_index"
require_relative "fetcher/connection_pools"
require_relative "fetcher/downloader"
require_relative "fetcher/dependency"
require_relative "fetcher/index"

module Bundler
  # Handles all the fetching with the rubygems server
  class Fetcher
    # This error is raised when it looks like the network is down
    class NetworkDownError < HTTPError; end
    # This error is raised if we should rate limit our requests to the API
    class TooManyRequestsError < HTTPError; end
    # This error is raised if the API returns a 413 (only printed in verbose)
    class FallbackError < HTTPError; end

    # This is the error raised if OpenSSL fails the cert verification
    class CertificateFailureError < HTTPError
      def initialize(remote_uri)
        remote_uri = filter_uri(remote_uri)
        super "Could not verify the SSL certificate for #{remote_uri}.\nThere" \
          " is a chance you are experiencing a man-in-the-middle attack, but" \
          " most likely your system doesn't have the CA certificates needed" \
          " for verification. For information about OpenSSL certificates, see" \
          " https://railsapps.github.io/openssl-certificate-verify-failed.html."
      end
    end

    # This error is raised if HTTP authentication is required, but not provided.
    class AuthenticationRequiredError < HTTPError
      def initialize(remote_uri)
        remote_uri = filter_uri(remote_uri)
        super "Authentication is required for #{remote_uri}.\n" \
          "Please supply credentials for this source. You can do this by running:\n" \
          "`bundle config set --global #{remote_uri} username:password`\n" \
          "or by storing the credentials in the `#{Settings.key_for(remote_uri)}` environment variable"
      end
    end

    # This error is raised if HTTP authentication is provided, but incorrect.
    class BadAuthenticationError < HTTPError
      def initialize(remote_uri)
        remote_uri = filter_uri(remote_uri)
        super "Bad username or password for #{remote_uri}.\n" \
          "Please double-check your credentials and correct them."
      end
    end

    # This error is raised if HTTP authentication is correct, but lacks
    # necessary permissions.
    class AuthenticationForbiddenError < HTTPError
      def initialize(remote_uri)
        remote_uri = filter_uri(remote_uri)
        super "Access token could not be authenticated for #{remote_uri}.\n" \
          "Make sure it's valid and has the necessary scopes configured."
      end
    end

    HTTP_ERRORS = (Downloader::HTTP_RETRYABLE_ERRORS + Downloader::HTTP_NON_RETRYABLE_ERRORS).freeze

    NET_ERRORS = [
      :HTTPBadGateway,
      :HTTPBadRequest,
      :HTTPFailedDependency,
      :HTTPForbidden,
      :HTTPInsufficientStorage,
      :HTTPMethodNotAllowed,
      :HTTPMovedPermanently,
      :HTTPNoContent,
      :HTTPNotFound,
      :HTTPNotImplemented,
      :HTTPPreconditionFailed,
      :HTTPRequestEntityTooLarge,
      :HTTPRequestURITooLong,
      :HTTPUnauthorized,
      :HTTPUnprocessableEntity,
      :HTTPUnsupportedMediaType,
      :HTTPVersionNotSupported,
    ].freeze

    # Exceptions classes that should bypass retry attempts. If your password didn't work the
    # first time, it's not going to the third time.
    #
    # Opal: the status classes come from the response shim
    # (rubygems/vendored_net_http.rb), which defines the codes the ported
    # readers branch on; the upstream list's HTTPFailedDependency,
    # HTTPInsufficientStorage, HTTPPreconditionFailed, HTTPRequestURITooLong,
    # HTTPUnsupportedMediaType and HTTPVersionNotSupported have no class there
    # and drop out. A response with one of those codes still stops the retries:
    # Downloader#fetch answers it as an HTTPError subclass in its else arm, and
    # the Fetcher's fetchers treat a raised HTTPError as fatal for themselves.
    FAIL_ERRORS = [
      AuthenticationRequiredError,
      BadAuthenticationError,
      AuthenticationForbiddenError,
      FallbackError,
      SecurityError,
      Gem::Requirement::BadRequirementError,
      Gem::Net::HTTPBadGateway,
      Gem::Net::HTTPBadRequest,
      Gem::Net::HTTPForbidden,
      Gem::Net::HTTPMethodNotAllowed,
      Gem::Net::HTTPMovedPermanently,
      Gem::Net::HTTPNoContent,
      Gem::Net::HTTPNotFound,
      Gem::Net::HTTPNotImplemented,
      Gem::Net::HTTPRequestEntityTooLarge,
      Gem::Net::HTTPUnauthorized,
      Gem::Net::HTTPUnprocessableEntity,
    ].freeze

    class << self
      attr_accessor :disable_endpoint, :api_timeout, :redirect_limit, :max_retries
    end

    self.redirect_limit = Bundler.settings[:redirect] # How many redirects to allow in one request
    self.api_timeout    = Bundler.settings[:timeout] # How long to wait for each API call
    self.max_retries    = Bundler.settings[:retry] # How many retries for the API call

    def initialize(remote)
      @cis = nil
      @remote = remote

      # Opal: Socket.do_not_reverse_lookup belongs to the socket layer the
      # transport runs behind, not to this Ruby.
      connection # set up the connection pools eagerly so SSL support is checked upfront
    end

    def uri
      @remote.anonymized_uri
    end

    # fetch a gem specification
    def fetch_spec(spec)
      spec -= [nil, "ruby", ""]
      spec_file_name = "#{spec.join "-"}.gemspec"

      uri = Gem::URI.parse("#{remote_uri}#{Gem::MARSHAL_SPEC_DIR}#{spec_file_name}.rz")
      spec = if uri.scheme == "file"
        path = Gem::Util.correct_for_windows_path(uri.path)
        Bundler.safe_load_marshal Bundler.rubygems.inflate(Gem.read_binary(path))
      elsif cached_spec_path = gemspec_cached_path(spec_file_name)
        Bundler.load_gemspec(cached_spec_path)
      else
        Bundler.safe_load_marshal Bundler.rubygems.inflate(downloader.fetch(uri).body)
      end
      raise MarshalError, "is #{spec.inspect}" unless spec.is_a?(Gem::Specification)
      spec
    rescue MarshalError
      raise HTTPError, "Gemspec #{spec} contained invalid data.\n" \
        "Your network or your gem server is probably having issues right now."
    end

    # return the specs in the bundler format as an index with retries
    def specs_with_retry(gem_names, source)
      Bundler::Retry.new("fetcher", FAIL_ERRORS).attempts do
        specs(gem_names, source)
      end
    end

    # return the specs in the bundler format as an index
    def specs(gem_names, source)
      index = Bundler::Index.new

      fetch_specs(gem_names).each do |name, version, suffix, dependencies, metadata|
        spec = if dependencies
          EndpointSpecification.new(name, version, suffix, self, dependencies, metadata).tap do |es|
            source.checksum_store.replace(es, es.checksum)
          end
        else
          RemoteSpecification.new(name, version, suffix, self)
        end
        spec.source = source
        spec.remote = @remote
        index << spec
      end

      index
    rescue CertificateFailureError
      Bundler.ui.info "" if gem_names && api_fetcher? # newline after dots
      raise
    end

    def user_agent
      @user_agent ||= begin
        ruby = Bundler::RubyVersion.system

        # Opal: corelib has no mutable String#<<, so the agent concatenates.
        agent = "bundler/#{Bundler::VERSION}"
        agent += " rubygems/#{Gem::VERSION}"
        agent += " ruby/#{ruby.versions_string(ruby.versions)}"
        agent += " (#{ruby.host})"
        agent += " command/#{ARGV.first}"

        if ruby.engine != "ruby"
          # engine_version raises on unknown engines
          engine_version = begin
                             ruby.engine_versions
                           rescue RuntimeError
                             "???"
                           end
          agent += " #{ruby.engine}/#{ruby.versions_string(engine_version)}"
        end

        # Some settings keys embed a URI (e.g. `mirror.<uri>`) whose userinfo can
        # carry credentials. Strip the userinfo before advertising the setting
        # names so we don't leak secrets to every gem source we talk to.
        options = Bundler.settings.all.map do |key|
          key.include?("://") ? key.gsub(%r{//[^/@]+@}, "//") : key
        end
        agent += " options/#{options.join(",")}"

        agent += " ci/#{cis.join(",")}" if cis.any?

        # add a random ID so we can consolidate runs server-side
        agent += " #{::SecureRandom.hex(8)}"

        # add any user agent strings set in the config
        extra_ua = Bundler.settings[:user_agent]
        agent += " #{extra_ua}" if extra_ua

        agent
      end
    end

    def http_proxy
      return unless uri = connection.proxy_for(remote_uri)
      uri.to_s
    end

    def inspect
      "#<#{self.class}:0x#{object_id} uri=#{uri}>"
    end

    def api_fetcher?
      fetchers.first.api_fetcher?
    end

    def release_resolution_memory!
      @fetchers&.each(&:release_resolution_memory!)
    end

    def gem_remote_fetcher
      @gem_remote_fetcher ||= begin
        require_relative "fetcher/gem_remote_fetcher"
        fetcher = GemRemoteFetcher.new Gem.configuration[:http_proxy]
        fetcher.headers["User-Agent"] = user_agent
        fetcher.headers["X-Gemfile-Source"] = @remote.original_uri.to_s if @remote.original_uri
        fetcher
      end
    end

    private

    def available_fetchers
      if Bundler::Fetcher.disable_endpoint
        [Index]
      elsif remote_uri.scheme == "file"
        Bundler.ui.debug("Using a local server, bundler won't use the CompactIndex API")
        [Index]
      else
        [CompactIndex, Dependency, Index]
      end
    end

    def fetchers
      @fetchers ||= available_fetchers.map {|f| f.new(downloader, @remote, uri, gem_remote_fetcher) }.drop_while {|f| !f.available? }
    end

    def fetch_specs(gem_names)
      fetchers.reject!(&:api_fetcher?) unless gem_names
      fetchers.reject! do |f|
        specs = f.specs(gem_names)
        return specs if specs
        true
      end
      []
    end

    def cis
      @cis ||= Bundler::CIDetector.ci_strings
    end

    def connection
      @connection ||= begin
        # Opal: the upstream openssl probe here decided whether an https source
        # could work at all. Node's fetch speaks https on its own, so the
        # probe - and the SSLError class it raised - go; a TLS failure answers
        # a Gem::RemoteFetcher::FetchError from the transport instead.
        con = ConnectionPools.new(size: Bundler.settings.processor_count, timeout: Fetcher.api_timeout)
        con.override_headers["User-Agent"] = user_agent
        con.override_headers["X-Gemfile-Source"] = @remote.original_uri.to_s if @remote.original_uri
        con
      end
    end

    # cached gem specification path, if one exists
    def gemspec_cached_path(spec_file_name)
      paths = Bundler.rubygems.spec_cache_dirs.map {|dir| File.join(dir, spec_file_name) }
      paths.find {|path| File.file? path }
    end

    def remote_uri
      @remote.uri
    end

    def downloader
      @downloader ||= Downloader.new(connection, self.class.redirect_limit)
    end
  end
end

# frozen_string_literal: true

# RemoteFetcher handles the details of fetching gems and gem information from
# a remote source.
#
# Opal: upstream does the HTTP through Gem::Request - a Net::HTTP connection
# taken from a per-host pool, with certificate files, a proxy and its own
# timeouts. None of that is here: #request below builds one of the
# Gem::Net::HTTP request objects and hands it to Gem::HTTPTransport, described
# in vendored_net_http.rb, which keeps one Node Worker (and with it one set of
# keep-alive connections) and does the TLS and the timeout. So:
#
# * #initialize keeps the same shape, but +proxy+ and +dns+ are not acted on -
#   a proxy comes from HTTP_PROXY / HTTPS_PROXY / NO_PROXY, which the transport
#   hands to Node (see Gem::HTTPTransport.enable_env_proxy);
# * there is no #proxy_for / #pools_for, and #close_all only stops the Worker;
# * +s3+ stays in REMOTE_SCHEMES so the code paths that name it read as they do
#   upstream, but #fetch_s3 refuses: signing an S3 request is what
#   Gem::S3URISigner does, and it is not ported (§1);
# * no global gem cache: Gem.configuration.global_gem_cache is not part of this
#   port's configuration file, so #download picks its cache directory from the
#   install directory alone;
# * #atomic_copy sets the mode on the destination after the writer has moved
#   the file, because Opal's IO has no #chmod;
# * the rescue lists drop SocketError (Opal has no Socket, and naming a missing
#   constant in a rescue list stops the rescue itself); the
#   OpenSSL::SSL::SSLError splat stays and stays empty, because
#   Gem::HAVE_OPENSSL is nil here - Node does the TLS and the transport answers
#   a fetch that never completed as a FetchError already.

require_relative "../rubygems"
require_relative "vendored_net_http"
require_relative "openssl"
require_relative "uri_formatter"
require_relative "uri"
require_relative "user_interaction"

##
# RemoteFetcher handles the details of fetching gems and gem information from
# a remote source.

class Gem::RemoteFetcher
  include Gem::UserInteraction

  ##
  # A FetchError exception wraps up the various possible IO and HTTP failures
  # that could happen while downloading from the internet.

  class FetchError < Gem::Exception
    ##
    # The URI which was being accessed when the exception happened.

    attr_accessor :uri, :original_uri

    def initialize(message, uri)
      uri = Gem::Uri.new(uri)

      super uri.redact_credentials_from(message)

      @original_uri = uri.to_s
      @uri = uri.redacted.to_s
    end

    def to_s # :nodoc:
      "#{super} (#{uri})"
    end
  end

  ##
  # A FetchError that indicates that the reason for not being
  # able to fetch data was that the host could not be contacted

  class UnknownHostError < FetchError
  end
  deprecate_constant(:UnknownHostError)

  # Schemes fetched over the network, as opposed to copied from a local path.
  REMOTE_SCHEMES = %w[http https s3].freeze
  private_constant :REMOTE_SCHEMES

  @fetcher = nil

  ##
  # Cached RemoteFetcher instance.

  def self.fetcher
    @fetcher ||= new Gem.configuration[:http_proxy]
  end

  attr_accessor :headers

  ##
  # Initialize a remote fetcher using the source URI and possible proxy
  # information.
  #
  # +proxy+
  # * [String]: explicit specification of proxy; overrides any environment
  #             variable setting
  # * nil: respect environment variables (HTTP_PROXY, HTTP_PROXY_USER,
  #        HTTP_PROXY_PASS)
  # * <tt>:no_proxy</tt>: ignore environment variables and _don't_ use a proxy
  #
  # +headers+: A set of additional HTTP headers to be sent to the server when
  #            fetching the gem.

  def initialize(proxy = nil, dns = nil, headers = {})
    # Opal: +proxy+ and +dns+ are kept for the shape of the call; the transport
    # has neither a pool nor a proxy agent to hand them to (see the header of
    # this file). Socket.do_not_reverse_lookup, the connection pools and
    # Gem::Request.get_cert_files have no counterpart here either.
    @proxy = proxy
    @headers = headers
  end

  ##
  # Given a name and requirement, downloads this gem into cache and returns the
  # filename. Returns nil if the gem cannot be located.

  def download_to_cache(dependency)
    found, _ = Gem::SpecFetcher.fetcher.spec_for_dependency dependency

    return if found.empty?

    spec, source = found.max_by {|(s,_)| s.version }

    download spec, source.uri
  end

  ##
  # Moves the gem +spec+ from +source_uri+ to the cache dir unless it is
  # already there.  If the source_uri is local the gem cache dir copy is
  # always replaced.

  def download(spec, source_uri, install_dir = Gem.dir)
    gem_file_name = File.basename spec.cache_file

    source_uri = Gem::Uri.new(source_uri)

    scheme = source_uri.scheme

    # Gem::URI.parse gets confused by MS Windows paths with forward slashes.
    scheme = nil if /^[a-z]$/i.match?(scheme)

    remote_source = REMOTE_SCHEMES.include?(scheme)

    install_cache_dir = File.join install_dir, "cache"
    cache_dir =
      if File.identical?(".", install_dir) # gem fetch asks for it this way
        install_dir
      elsif File.writable?(install_cache_dir) || (File.writable?(install_dir) && !File.exist?(install_cache_dir))
        install_cache_dir
      else
        File.join Gem.user_dir, "cache"
      end

    local_gem_path = File.join cache_dir, gem_file_name

    require "fileutils"
    begin
      FileUtils.mkdir_p cache_dir
    rescue StandardError
      nil
    end unless File.exist? cache_dir

    case scheme
    when *REMOTE_SCHEMES then
      if File.exist? local_gem_path
        verbose "Using local gem #{local_gem_path}"
      else
        begin
          verbose "Downloading gem #{gem_file_name} to #{cache_dir}"

          remote_gem_path = source_uri + "gems/#{gem_file_name}"

          cache_update_path remote_gem_path, local_gem_path
        rescue FetchError
          raise if Gem::ContentAddress.content_addressed?(spec, validate_ruby_abi: false)
          raise if spec.original_platform.to_s == spec.platform.to_s

          alternate_name = "#{spec.original_name}.gem"

          verbose "Failed, downloading gem #{alternate_name} to #{cache_dir}"

          remote_gem_path = source_uri + "gems/#{alternate_name}"

          cache_update_path remote_gem_path, local_gem_path
        end
      end
    when "file" then
      begin
        path = source_uri.path
        path = File.dirname(path) if File.extname(path) == ".gem"

        remote_gem_path = Gem::Util.correct_for_windows_path(File.join(path, "gems", gem_file_name))

        atomic_copy(remote_gem_path, local_gem_path)
      rescue Errno::EACCES
        local_gem_path = source_uri.to_s
      end

      verbose "Using local gem #{local_gem_path}"
    when nil then
      source_path = if Gem.win_platform? && source_uri.scheme &&
                       !source_uri.path.include?(":")
        "#{source_uri.scheme}:#{source_uri.path}"
      else
        source_uri.path
      end

      source_path = Gem::UriFormatter.new(source_path).unescape

      begin
        atomic_copy(source_path, local_gem_path) unless
          File.identical?(source_path, local_gem_path)
      rescue Errno::EACCES
        local_gem_path = source_uri.to_s
      end

      verbose "Using local gem #{local_gem_path}"
    else
      raise ArgumentError, "unsupported URI scheme #{source_uri.scheme}"
    end

    local_gem_path
  end

  ##
  # File Fetcher. Dispatched by +fetch_path+. Use it instead.

  def fetch_file(uri, *_)
    Gem.read_binary Gem::Util.correct_for_windows_path uri.path
  end

  ##
  # HTTP Fetcher. Dispatched by +fetch_path+. Use it instead.

  def fetch_http(uri, last_modified = nil, head = false, depth = 0, headers = self.headers)
    fetch_type = head ? Gem::Net::HTTP::Head : Gem::Net::HTTP::Get
    response   = request uri, fetch_type, last_modified do |req|
      headers.each {|k,v| req.add_field(k,v) }
    end

    case response
    when Gem::Net::HTTPOK, Gem::Net::HTTPNotModified then
      response.uri = uri
      head ? response : response.body
    when Gem::Net::HTTPMovedPermanently, Gem::Net::HTTPFound, Gem::Net::HTTPSeeOther,
         Gem::Net::HTTPTemporaryRedirect, Gem::Net::HTTPPermanentRedirect then
      raise FetchError.new("too many redirects", uri) if depth > 10

      unless location = response["Location"]
        raise FetchError.new("redirecting but no redirect location was given", uri)
      end
      location = uri + location

      if https?(uri) && !https?(location)
        raise FetchError.new("redirecting to non-https resource: #{Gem::Uri.redact(location)}", uri)
      end
      # see Gem::CompactIndexClient::HTTPFetcher#fetch
      same_origin = [location.scheme, location.host, location.port] == [uri.scheme, uri.host, uri.port]
      location.userinfo = uri.userinfo if same_origin && !location.userinfo
      # X-Gemfile-Source carries the source URI that Bundler mirrors,
      # credentials included, and is meant for the mirror's origin only.
      headers = headers.except("X-Gemfile-Source") unless same_origin

      fetch_http(location, last_modified, head, depth + 1, headers)
    else
      custom_error = response["X-Error-Message"]
      error_detail = custom_error || response.message
      raise FetchError.new("Bad response #{error_detail} #{response.code}", uri)
    end
  end

  alias_method :fetch_https, :fetch_http

  ##
  # Downloads +uri+ and returns it as a String.

  def fetch_path(uri, mtime = nil, head = false)
    uri = Gem::Uri.new uri

    method = {
      "http" => "fetch_http",
      "https" => "fetch_http",
      "s3" => "fetch_s3",
      "file" => "fetch_file",
    }.fetch(uri.scheme) { raise ArgumentError, "uri scheme is invalid: #{uri.scheme.inspect}" }

    data = send method, uri, mtime, head

    if data && !head && uri.to_s.end_with?(".gz")
      begin
        data = Gem::Util.gunzip data
      rescue Zlib::GzipFile::Error
        raise FetchError.new("server did not return a valid file", uri)
      end
    end

    data
  # Opal: SocketError is out of the list, see this file's header; the OpenSSL
  # splat is upstream's and stays, empty while Gem::HAVE_OPENSSL is nil.
  rescue Gem::Timeout::Error, IOError, SystemCallError,
         *(OpenSSL::SSL::SSLError if Gem::HAVE_OPENSSL) => e
    raise FetchError.new("#{e.class}: #{e}", uri)
  end

  def fetch_s3(uri, mtime = nil, head = false)
    # Opal: Gem::S3URISigner, which signs the request with the AWS SDK's
    # credential chain, is not part of this port.
    raise FetchError.new("s3 sources are not supported", "s3://#{uri.host}")
  end

  ##
  # Downloads +uri+ to +path+ if necessary. If no path is given, it just
  # passes the data.

  def cache_update_path(uri, path = nil, update = true)
    mtime = begin
              path && File.stat(path).mtime
            rescue StandardError
              nil
            end

    data = fetch_path(uri, mtime)

    if data.nil? # indicates the server returned 304 Not Modified
      return Gem.read_binary(path)
    end

    if update && path
      Gem.write_binary(path, data)
    end

    data
  end

  ##
  # Performs a request of type +request_class+ on +uri+ returning a
  # Gem::Net::HTTP response object.
  #
  # Opal: upstream asks a Gem::Request for a connection out of a pool; this
  # builds the request the way Request#fetch does - the userinfo as basic auth,
  # the User-Agent, the keep-alive pair and If-Modified-Since - and gives it to
  # the transport, which keeps its connections on the Worker rather than here.

  def request(uri, request_class, last_modified = nil)
    request = request_class.new uri.request_uri

    unless uri.user.nil? || uri.user.empty?
      request.basic_auth Gem::UriFormatter.new(uri.user).unescape,
                         Gem::UriFormatter.new(uri.password).unescape
    end

    request.add_field "User-Agent", user_agent
    request.add_field "Connection", "keep-alive"
    request.add_field "Keep-Alive", "30"

    if last_modified
      require "time"
      request.add_field "If-Modified-Since", last_modified.httpdate
    end

    yield request if block_given?

    Gem::HTTPTransport.fetch(request_url(uri),
      method: request.http_method_name, headers: request.headers)
  end

  def https?(uri)
    uri.scheme.casecmp("https").zero?
  end

  # Opal: upstream closes the pooled connections; the Worker is the only thing
  # to stop, and the transport remembers it.
  def close_all
    Gem::HTTPTransport.close
  end

  private

  # Creates +cache_dir+ so its writability can be probed, since File.writable?
  # is false for a path that does not exist yet.

  def ensure_writable_cache_dir(cache_dir)
    require "fileutils"
    begin
      FileUtils.mkdir_p cache_dir
    rescue SystemCallError
      return false
    end

    File.writable?(cache_dir)
  end

  def atomic_copy(source_path, destination_path)
    File.open(source_path, "rb") do |source|
      # FileUtils.cp passed the source mode to File.open, so it only reached a
      # file being created and the umask still applied to it. The writer
      # already carries over the mode of a file it replaces.
      mode = source.stat.mode & 0o777 & ~File.umask
      replacing = File.exist?(destination_path)

      Gem::AtomicFileWriter.open(destination_path) do |io|
        IO.copy_stream(source, io)
      end

      # Opal: upstream reaches the temporary file through the writer's IO,
      # which has no #chmod here, so the mode goes on the destination after the
      # writer has moved the file into place.
      unless replacing
        begin
          File.chmod(mode, destination_path)
        rescue Errno::EPERM, Errno::EACCES
          # the filesystem does not carry permissions
        end
      end
    end
  end

  # The header upstream builds in Gem::Request#user_agent.
  #
  # Opal: upstream grows the string with String#<<, which Opal's String does
  # not have (the mutable String methods are not implemented), so the pieces
  # are joined instead and the string comes out the same.
  def user_agent
    ruby_version = RUBY_VERSION
    ruby_version += "dev" if RUBY_PATCHLEVEL == -1

    detail =
      if RUBY_PATCHLEVEL >= 0
        "patchlevel #{RUBY_PATCHLEVEL}"
      else
        "revision #{RUBY_REVISION}"
      end

    parts = ["RubyGems/#{Gem::VERSION}", Gem::Platform.local,
      "Ruby/#{ruby_version} (#{RUBY_RELEASE_DATE} #{detail})"]
    parts << RUBY_ENGINE if RUBY_ENGINE != "ruby"
    parts.join " "
  end

  # The URL as the transport sees it: the userinfo has become an Authorization
  # header (see #request), so it is taken out of the authority, and the
  # query part stays where request_uri put it.
  def request_url(uri)
    url = uri.to_s
    url = url.sub(%r{(://)[^/@]*@}, '\1') if url.include?("@")
    url
  end
end

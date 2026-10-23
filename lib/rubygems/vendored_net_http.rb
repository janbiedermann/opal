# backtick_javascript: true
# frozen_string_literal: true

# The HTTP transport of the gem port (GEMS.md §6.3) plus the Gem::Net::HTTP
# names the ported RubyGems code reads a response through.
#
# Opal: this is where upstream loads the net-http it vendors. The port runs no
# Net::HTTP at all: #request in remote_fetcher.rb hands the request to
# http.cjs (see the last bullet below), which runs it on a Node Worker and
# parks this thread with Atomics.wait until it answers - Opal's Ruby side is
# synchronous and Node's fetch is not - and wraps the answer in the response
# classes here, which carry the shape remote_fetcher.rb and
# compact_index_client/* read it in: `case response when
# Gem::Net::HTTPNotModified`, response["Location"], response.body,
# response.class.body_permitted?.
#
# What that moves out of Ruby, and where it went:
#
# * connection pooling: the Worker keeps one agent, and with it one set of
#   keep-alive connections, for the life of the process;
# * TLS: Node verifies against its own trust store, so upstream's
#   Gem::Request#get_cert_files and Gem.configuration.ssl_verify_mode have
#   nothing to configure (§1 leaves signature verification out as well);
# * proxies: HTTP_PROXY / HTTPS_PROXY / NO_PROXY work through Node's own
#   NODE_USE_ENV_PROXY=1, which is how undici is told to obey them, rather
#   than through Gem::Request::get_proxy_from_env;
# * timeouts: the transport aborts the fetch it started, so Gem::Timeout is
#   only the error name the ported rescue lists mention;
# * the transport's own file lives under lib/opal/gems/ (GEMS.md D2), and the
#   require below reaches it by path rather than by name: `opal/...` is the
#   runtime's require namespace, so a Ruby file under lib/opal/ is not a name
#   a program can require.

require "timeout"
require_relative "exceptions"

module Gem
  # The name upstream's rescue lists use (it comes from the timeout library it
  # vendors); the timeout itself is raised by the transport.
  Timeout = ::Timeout

  module Net
    class HTTP
      ##
      # The request the ported code builds: Gem::Net::HTTP::Get and
      # Gem::Net::HTTP::Head, carrying the headers it adds.

      class Request
        attr_reader :path, :headers

        def initialize(path, headers = nil)
          @path = path
          @headers = {}
          headers&.each {|name, value| add_field(name, value) }
        end

        # Net::HTTP's spelling, which upstream's code calls. The names are
        # stored lower case, as the response stores them, because HTTP reads a
        # header the same way whatever case it was given.
        def add_field(name, value)
          @headers[name.to_s.downcase] = value.to_s
        end

        alias_method :[]=, :add_field

        def [](name)
          @headers[name.to_s.downcase]
        end

        # Net::HTTP's spelling, which Bundler's GemRemoteFetcher calls to drop
        # the RubyGems User-Agent when its own is set.
        def delete(name)
          @headers.delete(name.to_s.downcase)
        end

        # Upstream fills this from the URI's userinfo; the base64 is done here
        # because Opal has neither Base64 nor String#pack.
        def basic_auth(user, password)
          add_field "Authorization", "Basic #{`Buffer.from(#{user} + ':' + #{password}).toString('base64')`}"
        end
      end

      class Get < Request
        def http_method_name
          "GET"
        end
      end

      class Head < Request
        def http_method_name
          "HEAD"
        end
      end
    end

    ##
    # The response: code, message, headers, body. The hierarchy and the
    # per-class body_permitted? are Net::HTTP's, and so are the names - the
    # status classes are siblings of Net::HTTP, not constants of it, because
    # the ported code branches on them: `when Gem::Net::HTTPNotModified`,
    # `when Gem::Net::HTTPSuccess`, `response.class.body_permitted?`.

    class HTTPResponse
      class << self
        def body_permitted?
          true
        end
      end

      attr_accessor :uri
      attr_reader :code, :message, :headers

      def initialize(code, message, headers, body)
        @code = code.to_s
        @message = message.to_s
        # Net::HTTP keeps its response header names lower case and reads them
        # that way whatever case they were given in; the transport hands this
        # class the names Node had already lower-cased, but a response built by
        # hand - a spec's fixture, mostly - arrives with the spelling HTTP
        # writes on the wire, and has to read the same way.
        @headers = {}
        headers&.each {|name, value| @headers[name.to_s.downcase] = value }
        @body = body
      end

      def [](name)
        @headers[name.to_s.downcase]
      end

      # A response whose class forbids a body answers nil rather than the
      # empty string: upstream reads that nil as "the server said 304, keep
      # the cached copy" (Gem::RemoteFetcher#cache_update_path).
      def body
        self.class.body_permitted? ? @body : nil
      end

      def read_body
        body
      end

      # Net::HTTP's spelling: the body when the response is a success, the
      # status line as the error when it is not.
      def value
        raise "#{@code} #{@message}" unless @code.start_with?("2")
        body
      end

      def http_version
        "1.1"
      end

      def inspect
        "#<#{self.class.name} code=#{@code} message=#{@message.inspect}>"
      end
    end

    class HTTPInformation < HTTPResponse
      def self.body_permitted?
        false
      end
    end

    class HTTPSuccess < HTTPResponse; end

    class HTTPRedirection < HTTPResponse; end

    class HTTPClientError < HTTPResponse; end

    class HTTPServerError < HTTPResponse; end

    class HTTPContinue < HTTPInformation; end                 # 100
    class HTTPLocalSwitchingProtocol < HTTPInformation; end   # 101 - Net::HTTP's odd name

    class HTTPOK < HTTPSuccess; end                           # 200
    class HTTPCreated < HTTPSuccess; end                      # 201
    class HTTPAccepted < HTTPSuccess; end                     # 202
    class HTTPNonAuthoritativeInformation < HTTPSuccess; end  # 203
    class HTTPNoContent < HTTPSuccess                         # 204
      def self.body_permitted?
        false
      end
    end
    class HTTPResetContent < HTTPSuccess                      # 205
      def self.body_permitted?
        false
      end
    end
    class HTTPPartialContent < HTTPSuccess; end               # 206
    class HTTPMultiStatus < HTTPSuccess; end                  # 207

    class HTTPMovedPermanently < HTTPRedirection; end         # 301
    class HTTPFound < HTTPRedirection; end                    # 302
    class HTTPSeeOther < HTTPRedirection; end                 # 303
    class HTTPNotModified < HTTPRedirection                   # 304
      def self.body_permitted?
        false
      end
    end
    class HTTPTemporaryRedirect < HTTPRedirection; end        # 307
    class HTTPPermanentRedirect < HTTPRedirection; end        # 308

    class HTTPBadRequest < HTTPClientError; end               # 400
    class HTTPUnauthorized < HTTPClientError; end             # 401
    class HTTPPaymentRequired < HTTPClientError; end          # 402
    class HTTPForbidden < HTTPClientError; end                # 403
    class HTTPNotFound < HTTPClientError; end                 # 404
    class HTTPMethodNotAllowed < HTTPClientError; end         # 405
    class HTTPRequestEntityTooLarge < HTTPClientError; end    # 413
    class HTTPRangeNotSatisfiable < HTTPClientError; end      # 416
    class HTTPUnprocessableEntity < HTTPClientError; end      # 422
    class HTTPTooManyRequests < HTTPClientError; end          # 429

    class HTTPInternalServerError < HTTPServerError; end      # 500
    class HTTPNotImplemented < HTTPServerError; end           # 501
    class HTTPBadGateway < HTTPServerError; end               # 502
    class HTTPServiceUnavailable < HTTPServerError; end       # 503
    class HTTPGatewayTimeout < HTTPServerError; end           # 504

    class HTTP
      # The transport's answer, turned into one of the response classes above.
      # Its body arrives as one character per byte - the way Opal holds a binary
      # String, the way File.binread answers one - so it is labelled, not
      # decoded.
      def self.response_from(result)
        folded = {}
        # A header that appears more than once is joined, as Net::HTTP does it,
        # because that is what the ported code reads back with response[name].
        `result.headers`.each do |name, value|
          name = name.downcase
          folded[name] = folded.key?(name) ? "#{folded[name]}, #{value}" : value
        end
        status = `result.status`
        message = `result.statusText || ""`
        # The transport hands back one character per byte; Opal.str with the
        # BINARY label is exactly what File.binread answers (force_encoding
        # would retag the string but keep its binary_encoding at UTF-8, and a
        # String#bytes would turn each of those characters into two bytes).
        body = `Opal.str(result.body === undefined || result.body === null ? "" : result.body, "BINARY")`
        response_for(status, message, folded, body)
      end

      CODE_TO_CLASS = {
        100 => HTTPContinue,
        101 => HTTPLocalSwitchingProtocol,
        200 => HTTPOK,
        201 => HTTPCreated,
        202 => HTTPAccepted,
        203 => HTTPNonAuthoritativeInformation,
        204 => HTTPNoContent,
        205 => HTTPResetContent,
        206 => HTTPPartialContent,
        207 => HTTPMultiStatus,
        301 => HTTPMovedPermanently,
        302 => HTTPFound,
        303 => HTTPSeeOther,
        304 => HTTPNotModified,
        307 => HTTPTemporaryRedirect,
        308 => HTTPPermanentRedirect,
        400 => HTTPBadRequest,
        401 => HTTPUnauthorized,
        402 => HTTPPaymentRequired,
        403 => HTTPForbidden,
        404 => HTTPNotFound,
        405 => HTTPMethodNotAllowed,
        413 => HTTPRequestEntityTooLarge,
        416 => HTTPRangeNotSatisfiable,
        422 => HTTPUnprocessableEntity,
        429 => HTTPTooManyRequests,
        500 => HTTPInternalServerError,
        501 => HTTPNotImplemented,
        502 => HTTPBadGateway,
        503 => HTTPServiceUnavailable,
        504 => HTTPGatewayTimeout,
      }.freeze
      private_constant :CODE_TO_CLASS

      # Net::HTTP answers the class for a code it knows and the class of its
      # range for one it does not; this does the same, and calls anything
      # outside the ranges a server error.
      def self.response_for(code, message, headers, body)
        code = code.to_i
        klass = CODE_TO_CLASS[code] ||
          case code
          when 100..199 then HTTPInformation
          when 200..299 then HTTPSuccess
          when 300..399 then HTTPRedirection
          when 400..499 then HTTPClientError
          when 500..599 then HTTPServerError
          else HTTPServerError
          end
        klass.new(code, message, headers, body)
      end
    end
  end

  ##
  # The seam every remote read goes through: the embedded http.cjs, run once,
  # and the response wrapped as a Gem::Net::HTTPResponse.

  module HTTPTransport
    DEFAULT_TIMEOUT = 30_000 # ms, what a fetch may take before it is aborted

    class TransportMissing < Gem::Exception; end

    class << self
      ##
      # Fetches +url+ and answers a Gem::Net::HTTPResponse. A request that
      # never completed answers a Gem::RemoteFetcher::FetchError, which is what
      # upstream's callers rescue around a read.

      def fetch(url, method: "GET", headers: {}, body: nil, timeout: nil)
        request = build_request(url, method, headers, body, timeout)
        # The transport is a plain JavaScript module, so its methods are called
        # in JavaScript: a Ruby send would look for $fetch and find nothing.
        result = `#{transport}.fetch(request)`
        response_for_result(result, url)
      end

      ##
      # A whole batch in one Worker round trip: the compact index update asks
      # for names, info and versions one after another. Each request is a Hash
      # of the same keys #fetch takes.

      def fetch_all(requests)
        built = requests.map do |request|
          build_request(request[:url], request.fetch(:method, "GET"),
            request.fetch(:headers, {}), request[:body], request[:timeout])
        end

        results = `#{transport}.fetchAll(built)`
        results.map do |result|
          response_for_result(result, `result.url || ""`)
        end
      end

      def close
        # The truthiness test is on purpose: #nil? would be a send, and the
        # transport is a JavaScript module rather than an Opal object.
        return unless @transport
        `#{@transport}.close()`
        @transport = nil
      end

      # A platform with neither the embedded transport nor the file beside it
      # (a browser runner) cannot fetch at all; the specs use this to say so
      # rather than fail.
      def available?
        !transport_source.nil?
      end

      private

      def response_for_result(result, url)
        if `result.error !== undefined && result.error !== null`
          name = `result.error.name || "Error"`
          problem = `result.error.message || "fetch failed"`
          # undici's own message for a socket failure is "fetch failed"; the
          # cause carries what actually went wrong (ECONNREFUSED, ENOTFOUND).
          detail = `result.error.cause ? (result.error.cause.code || result.error.cause.message || "") : ""`
          raise Gem::RemoteFetcher::FetchError.new("#{name}: #{problem}#{detail.empty? ? "" : " (#{detail})"}", url)
        end
        Gem::Net::HTTP.response_from(result)
      end

      def transport
        @transport ||= begin
          enable_env_proxy
          src = transport_source
          unless src
            raise TransportMissing,
              "no HTTP transport: lib/opal/gems/http.cjs is neither embedded in this program nor readable from here"
          end
          # Opal: the transport arrives as source text - embedded by the bundle
          # tasks, or read off the file in a source-tree run - and runs through
          # `new Function`, because a `require` of it would work in neither
          # place: a single-file executable's require() answers only built-in
          # modules, and a compiled bundle has no directory to resolve a path
          # against either. The module is CommonJS and its only require is
          # node:worker_threads, which even the executable's require answers.
          `((function (src) { var mod = { exports: {} }; new Function("require", "module", "exports", src)(require, mod, mod.exports); return mod.exports })(String(#{src})))`
        end
      end

      # Node's fetch obeys the proxy variables only when it is told to, and
      # upstream RubyGems obeys them by default, so the port turns the switch on
      # when one of them is set. It has to happen before the Worker is created,
      # which is what reads the environment.
      def enable_env_proxy
        return if ENV["NODE_USE_ENV_PROXY"]
        return unless ENV.keys.any? {|name| /\A(?:http|https|no)_proxy\z/i.match?(name) }
        ENV["NODE_USE_ENV_PROXY"] = "1"
      end

      # The source arrives one of two ways: a compiled bundle embeds it as the
      # OPAL_HTTP_TRANSPORT constant (tasks/{ruby,gem,bundler}/bundle.mjs bake
      # it beside OPAL_COMPILER_KEY), and a source-tree run - exe/opal, the
      # runners, MSpec - reads the file.
      def transport_source
        return OPAL_HTTP_TRANSPORT if defined?(OPAL_HTTP_TRANSPORT)
        path = transport_path
        path && File.read(path)
      end

      # Which file to read when nothing is embedded. A program compiled from
      # source no longer knows where its libraries sat: `__dir__` inside a
      # required file names the load path's entry ("rubygems"), not a
      # directory. The node runner exports OPAL_HOME for this checkout, and the
      # current directory is the repository in most development runs.
      def transport_path
        home = ENV["OPAL_HOME"]
        paths = [File.join(".", "lib", "opal", "gems", "http.cjs")]
        paths.unshift File.join(home, "lib", "opal", "gems", "http.cjs") if home
        paths.find {|path| File.exist?(path) }
      end

      # fetch answers UND_ERR_INVALID_ARG for a header it keeps hold of itself,
      # and the two upstream's Request#fetch adds - Connection and Keep-Alive -
      # are exactly that here: the Worker's agent is what stays connected, so
      # the pair is dropped on the way out rather than sent.
      FORBIDDEN_HEADERS = %w[
        connection keep-alive content-length transfer-encoding upgrade te trailer
        via proxy-connection date host referer sec-websocket-key sec-websocket-version
      ].freeze
      private_constant :FORBIDDEN_HEADERS

      def build_request(url, method, headers, body, timeout)
        pairs = headers.to_a.filter_map do |name, value|
          [name.to_s, value.to_s] unless FORBIDDEN_HEADERS.include?(name.to_s.downcase)
        end
        %x{
          return {
            url: url,
            method: method,
            headers: Object.fromEntries(pairs),
            body: body === nil ? undefined : body,
            timeout: timeout === nil ? #{DEFAULT_TIMEOUT} : timeout,
          };
        }
      end
    end
  end
end

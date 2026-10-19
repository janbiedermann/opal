# frozen_string_literal: true
module URI
  class RFC3986_Parser # :nodoc:
    # URI defined in RFC3986. Ported from RubyGems' vendored uri
    # (lib/rubygems/vendor/uri/lib/uri/rfc3986_parser.rb).
    #
    # Opal: three things upstream builds these patterns with have no
    # JavaScript equivalent, so the patterns lose them and keep matching
    # the same language (§6.1 of GEMS.md):
    #
    # * possessive quantifiers and the atomic groups built from them: the
    #   quantified fragments are short and the patterns are anchored, so
    #   plain greedy ones match the same and cannot wander.
    # * hyphens in group names: a JavaScript group name must be an
    #   identifier, so path-abempty becomes path_abempty and so on.
    # * named backreferences: when the referenced group did not
    #   participate, Ruby refuses the match and JavaScript matches an
    #   empty string; the IPv4address/ls32/seg references depend on Ruby's
    #   behaviour, so every one is replaced by a non-capturing copy of the
    #   fragment - those groups were captures upstream only to be named.
    #
    DEC_OCTET = '(?:[1-9]\d|1\d{2}|2[0-4]\d|25[0-5]|\d)'
    IPV4_SRC = "(?:#{DEC_OCTET}\.){3}#{DEC_OCTET}"
    HEX = '\h{1,4}'
    LS32 = "(?:#{HEX}:#{HEX}|#{IPV4_SRC})"
    IPV6_SRC = [
      "(?:#{HEX}:){6}#{LS32}",
      "::(?:#{HEX}:){5}#{LS32}",
      "(?:#{HEX})?::(?:#{HEX}:){4}#{LS32}",
      "(?:(?:#{HEX}:)?#{HEX})?::(?:#{HEX}:){3}#{LS32}",
      "(?:(?:#{HEX}:){0,2}#{HEX})?::(?:#{HEX}:){2}#{LS32}",
      "(?:(?:#{HEX}:){0,3}#{HEX})?::#{HEX}:#{LS32}",
      "(?:(?:#{HEX}:){0,4}#{HEX})?::#{LS32}",
      "(?:(?:#{HEX}:){0,5}#{HEX})?::#{HEX}",
      "(?:(?:#{HEX}:){0,6}#{HEX})?::",
    ].join('|')
    HOST =
      '(?<IP_literal>\[(?:' \
        "(?<IPv6address>#{IPV6_SRC})" \
        '|(?<IPvFuture>v\h+\.[!$&-.0-9:;=A-Z_a-z~]+))\])' \
      "|(?<IPv4address>#{IPV4_SRC})" \
      '|(?<reg_name>(?:%\h\h|[!$&-.0-9;=A-Z_a-z~])*)'

    USERINFO = '(?:%\h\h|[!$&-.0-9:;=A-Z_a-z~])*'

    SCHEME = '[A-Za-z][+\-.0-9A-Za-z]*'
    SEG = '(?:%\h\h|[!$&-.0-9:;=@A-Z_a-z~/])'
    SEG_NC = '(?:%\h\h|[!$&-.0-9;=@A-Z_a-z~])'
    FRAGMENT = '(?:%\h\h|[!$&-.0-9:;=@A-Z_a-z~/?])*'

    RFC3986_URI = %r[\A
      (?<URI>
        (?<scheme>#{SCHEME}):
        (?<hier_part>//
          (?<authority>
            (?:(?<userinfo>#{USERINFO})@)?
            (?<host>#{HOST})
            (?::(?<port>\d*))?
          )
          (?<path_abempty>(?:/#{SEG}*)?)
        | (?<path_absolute>/(?:(?!/)#{SEG}+)?)
        | (?<path_rootless>(?!/)#{SEG}+)
        | (?<path_empty>)
        )
        (?:\?(?<query>[^#]*))?
        (?:\#(?<fragment>#{FRAGMENT}))?
      )\z]x

    RFC3986_relative_ref = %r[\A
      (?<relative_ref>
        (?<relative_part>//
          (?<authority>
            (?:(?<userinfo>#{USERINFO})@)?
            (?<host>#{HOST}(?<!/))?
            (?::(?<port>\d*))?
          )
          (?<path_abempty>(?:/#{SEG}*)?)
        | (?<path_absolute>/#{SEG}+)
        | (?<path_noscheme>#{SEG_NC}+(?:/#{SEG}*)?)
        | (?<path_empty>)
        )
        (?:\?(?<query>[^#]*))?
        (?:\#(?<fragment>#{FRAGMENT}))?
      )\z]x

    attr_reader :regexp

    def initialize
      @regexp = default_regexp.each_value(&:freeze).freeze
    end

    def split(uri) #:nodoc:
      begin
        uri = uri.to_str
      rescue NoMethodError
        raise InvalidURIError, "bad URI (is not URI?): #{uri.inspect}"
      end
      uri.ascii_only? or
        raise InvalidURIError, "URI must be ascii only #{uri.dump}"
      if m = RFC3986_URI.match(uri)
        query = m["query"]
        scheme = m["scheme"]
        opaque = m["path_rootless"]
        if opaque
          opaque << "?#{query}" if query
          [ scheme,
            nil, # userinfo
            nil, # host
            nil, # port
            nil, # registry
            nil, # path
            opaque,
            nil, # query
            m["fragment"]
          ]
        else # normal
          [ scheme,
            m["userinfo"],
            m["host"],
            m["port"],
            nil, # registry
            (m["path_abempty"] ||
             m["path_absolute"] ||
             m["path_empty"]),
            nil, # opaque
            query,
            m["fragment"]
          ]
        end
      elsif m = RFC3986_relative_ref.match(uri)
        [ nil, # scheme
          m["userinfo"],
          m["host"],
          m["port"],
          nil, # registry,
          (m["path_abempty"] ||
           m["path_absolute"] ||
           m["path_noscheme"] ||
           m["path_empty"]),
          nil, # opaque
          m["query"],
          m["fragment"]
        ]
      else
        raise InvalidURIError, "bad URI (is not URI?): #{uri.inspect}"
      end
    end

    def parse(uri) # :nodoc:
      URI.for(*self.split(uri), self)
    end

    def join(*uris) # :nodoc:
      uris[0] = convert_to_uri(uris[0])
      uris.inject :merge
    end

    @@to_s = Kernel.instance_method(:to_s)
    if @@to_s.respond_to?(:bind_call)
      def inspect
        @@to_s.bind_call(self)
      end
    else
      def inspect
        @@to_s.bind(self).call
      end
    end

    private

    def default_regexp # :nodoc:
      {
        SCHEME: %r[\A#{SCHEME}\z],
        USERINFO: %r[\A#{USERINFO}\z],
        HOST: %r[\A#{HOST}\z],
        ABS_PATH: %r[\A/#{SEG}*\z],
        REL_PATH: %r[\A(?!/)#{SEG}+\z],
        QUERY: %r[\A(?:%\h\h|[!$&-.0-9:;=@A-Z_a-z~/?])*\z],
        FRAGMENT: %r[\A#{FRAGMENT}\z],
        OPAQUE: %r[\A(?:[^/].*)?\z],
        PORT: /\A[\x09\x0a\x0c\x0d ]*\d*[\x09\x0a\x0c\x0d ]*\z/,
      }
    end

    def convert_to_uri(uri)
      if uri.is_a?(URI::Generic)
        uri
      elsif uri = String.try_convert(uri)
        parse(uri)
      else
        raise ArgumentError,
          "bad argument (expected URI object or URI string)"
      end
    end

  end # class Parser
end # module URI

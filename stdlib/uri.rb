# frozen_string_literal: false
# = uri.rb
#
# URI: classes to handle Uniform Resource Identifiers (RFC 3986). Ported
# from RubyGems' vendored uri library (lib/rubygems/vendor/uri), with the
# name back from Gem::URI to URI, so the same code reads the same metadata
# as RubyGems does (GEMS.md M1).
#
# == Features
#
# * Uniform way of handling URIs.
# * Flexibility to introduce custom URI schemes.
# * Flexibility to have an alternate URI::Parser (or just different patterns
#   and regexp's).
#
# == Basic example
#
#   require 'uri'
#
#   uri = URI("http://foo.com/posts?id=30&limit=5#time=1305298413")
#   #=> #<URI::HTTP http://foo.com/posts?id=30&limit=5#time=1305298413>
#
#   uri.scheme    #=> "http"
#   uri.host      #=> "foo.com"
#   uri.path      #=> "/posts"
#   uri.query     #=> "id=30&limit=5"
#   uri.fragment  #=> "time=1305298413"
#
#   uri.to_s      #=> "http://foo.com/posts?id=30&limit=5#time=1305298413"
#
# == Adding custom URIs
#
#   module URI
#     class RSYNC < Generic
#       DEFAULT_PORT = 873
#     end
#     register_scheme 'RSYNC', RSYNC
#   end
#   #=> URI::RSYNC
#
#   uri = URI("rsync://rsync.foo.com")
#   #=> #<URI::RSYNC rsync://rsync.foo.com>
#
# == Class tree
#
# - URI::Generic (in uri/generic.rb)
#   - URI::File - (in uri/file.rb)
#   - URI::HTTP - (in uri/http.rb)
#     - URI::HTTPS - (in uri/https.rb)
# - URI::Parser - (in uri/common.rb)
# - URI::Util - (in uri/common.rb)
# - URI::Error - (in uri/common.rb)
#   - URI::InvalidURIError - (in uri/common.rb)
#   - URI::InvalidComponentError - (in uri/common.rb)
#   - URI::BadURIError - (in uri/common.rb)
#
# == Copyright Info
#
# Author:: Akira Yamada <akira@ruby-lang.org>
# License::
#  Copyright (c) 2001 akira yamada <akira@ruby-lang.org>
#  You can redistribute it and/or modify it under the same term as Ruby.
#
# Opal: only the RFC 3986 parser is ported (the RFC 2396 parser and its
# obsolete constants are out), and of the schemes only file, http, https,
# and the generic one - RubyGems and Bundler use no other. The regexp
# patterns lose the possessive quantifiers and the hyphenated group names
# JavaScript has no equivalent for; they match the same language, at the
# cost of the linear-time guarantee Ruby's give.

module URI
  # The version of the ported uri library, kept at the one RubyGems vendors.
  # :stopdoc:
  VERSION = '1.1.2'.freeze
  VERSION_CODE = VERSION.split('.').map { |s| s.rjust(2, '0') }.join.freeze
  # :startdoc:
end

require_relative 'uri/common'
require_relative 'uri/generic'
require_relative 'uri/file'
require_relative 'uri/http'
require_relative 'uri/https'

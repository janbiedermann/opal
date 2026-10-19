# frozen_string_literal: true

##
# The UriFormatter handles URIs from user-input and escaping.
#
#   uf = Gem::UriFormatter.new 'example.com'
#
#   p uf.normalize #=> 'http://example.com'
#
# Opal: upstream requires cgi/escape and cgi/util, the two pieces the standard
# library splits CGI over; here that is one require of stdlib/cgi.rb, which
# pulls cgi/util in. Its CGI.escape and CGI.unescape are Ruby's
# form-urlencoded pair (the fix that let the two ruby/spec examples for them
# come out of the filter list), so the basic-auth credentials #unescape hands
# to Gem::RemoteFetcher#request are the ones the URI carries.

class Gem::UriFormatter
  ##
  # The URI to be formatted.

  attr_reader :uri

  ##
  # Creates a new URI formatter for +uri+.

  def initialize(uri)
    require "cgi"
    require "cgi/util" unless defined?(CGI::Util)

    @uri = uri
  end

  ##
  # Escapes the #uri for use as a CGI parameter

  def escape
    return unless @uri
    CGI.escape @uri
  end

  ##
  # Normalize the URI by adding "http://" if it is missing.

  def normalize
    /^(https?|ftp|file):/i.match?(@uri) ? @uri : "http://#{@uri}"
  end

  ##
  # Unescapes the #uri which came from a CGI parameter

  def unescape
    return unless @uri
    CGI.unescape @uri
  end
end

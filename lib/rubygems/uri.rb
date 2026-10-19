# frozen_string_literal: true

# The Uri handles rubygems source URIs.
#
# Opal: upstream parses with its own vendored copy of the uri library and
# calls it Gem::URI; here the same library lives in stdlib/uri.rb and keeps
# its upstream name, URI (see the note there). The RFC 2396 parser, which
# upstream only uses to escape a source URI that failed to parse, is not
# ported, so the RFC 3986 escape does that job: for the source URIs RubyGems
# reads - a scheme, a host and a path, sometimes with a space or a brace -
# both escape the same characters.

require "uri"

class Gem::Uri
  ##
  # Parses and redacts uri

  def self.redact(uri)
    new(uri).redacted
  end

  ##
  # Parses uri, raising if it's invalid

  def self.parse!(uri)
    raise URI::InvalidURIError unless uri

    return uri unless uri.is_a?(String)

    # Always escape URI's to deal with potential spaces and such
    # It should also be considered that source_uri may already be
    # a valid URI with escaped characters. e.g. "{DESede}" is encoded
    # as "%7BDESede%7D". If this is escaped again the percentage
    # symbols will be escaped.
    begin
      URI.parse(uri)
    rescue URI::InvalidURIError
      URI.parse(escape(uri))
    end
  end

  # Opal: upstream hands the string to its vendored uri's RFC 2396 parser,
  # whose #escape encodes whatever its pattern calls unsafe. This port carries
  # the RFC 3986 parser only (see the header of stdlib/uri.rb), so URI::Util
  # escapes what RFC 3986 refuses: for the source URIs RubyGems reads - a
  # scheme, a host, a path, a space or a brace now and then - the answer is
  # the same.
  def self.escape(uri)
    URI::Util.escape uri
  end

  ##
  # Parses uri, returning the original uri if it's invalid

  def self.parse(uri)
    parse!(uri)
  rescue URI::InvalidURIError
    uri
  end

  def initialize(source_uri)
    @parsed_uri = parse(source_uri)
  end

  def redacted
    return self unless valid_uri?

    if token? || oauth_basic?
      with_redacted_user
    elsif password?
      with_redacted_password
    else
      self
    end
  end

  def to_s
    @parsed_uri.to_s
  end

  def redact_credentials_from(text)
    return text unless valid_uri? && password? && text.include?(to_s)

    text.sub(password, "REDACTED")
  end

  def method_missing(method_name, *args, &blk)
    if @parsed_uri.respond_to?(method_name)
      @parsed_uri.send(method_name, *args, &blk)
    else
      super
    end
  end

  def respond_to_missing?(method_name, include_private = false)
    @parsed_uri.respond_to?(method_name, include_private) || super
  end

  protected

  # Add a protected reader for the cloned instance to access the original object's parsed uri
  attr_reader :parsed_uri

  private

  def parse!(uri)
    self.class.parse!(uri)
  end

  def parse(uri)
    self.class.parse(uri)
  end

  def with_redacted_user
    clone.tap {|uri| uri.user = "REDACTED" }
  end

  def with_redacted_password
    clone.tap {|uri| uri.password = "REDACTED" }
  end

  def valid_uri?
    !@parsed_uri.is_a?(String)
  end

  def password?
    !password.nil? && !password.empty?
  end

  def oauth_basic?
    password == "x-oauth-basic"
  end

  def token?
    !user.nil? && !password?
  end

  def initialize_copy(original)
    @parsed_uri = original.parsed_uri.clone
  end
end

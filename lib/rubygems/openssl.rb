# frozen_string_literal: true

# Opal: upstream asks whether the openssl library is loaded so that the rescue
# lists of the code that reads over HTTP can name OpenSSL::SSL::SSLError when it
# is. There is no OpenSSL here - Node does the TLS and the transport answers a
# fetch that never completed as a Gem::RemoteFetcher::FetchError - so the
# constant is nil and those splats stay empty, which is what they do on a Ruby
# built without OpenSSL.
#
# Upstream's `autoload :OpenSSL, "openssl"` is out: it makes the lookup below
# load the library, and there is nothing to load - Opal's autoload reaches
# require even inside defined?, which CRuby's does not.

module Gem
  HAVE_OPENSSL = defined? OpenSSL::SSL # :nodoc:
end

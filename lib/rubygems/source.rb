# frozen_string_literal: true

require_relative "text"
require_relative "uri"

##
# A Source knows how to list and fetch gems from a RubyGems marshal index.
#
# There are other Source subclasses for installed gems, local gems, the
# Compact Index API and so-forth.
#
# Opal: what a remote source does - reading the compact index or the marshal
# spec indexes, downloading a .gem - needs the fetcher and the resolver, which
# are milestone M5; here those answers say so. The identity, the ordering and
# the cache layout of a source are upstream's, so a source can be named,
# compared and cached the same way before M5 lands.

class Gem::Source
  include Comparable
  include Gem::Text

  FILES = { # :nodoc:
    released: "specs",
    latest: "latest_specs",
    prerelease: "prerelease_specs",
  }.freeze

  ##
  # The URI this source will fetch gems from.

  attr_reader :uri

  ##
  # Creates a new Source which will use the index located at +uri+.

  def initialize(uri)
    @uri = Gem::Uri.parse!(uri)
    @update_cache = nil
  end

  ##
  # Sources are ordered by installation preference.
  #
  # Opal: upstream also sorts Git, Lock and Vendor sources, which this port
  # has no equivalent of (GEMS.md §1).

  def <=>(other)
    case other
    when Gem::Source::Installed,
         Gem::Source::Local,
         Gem::Source::SpecificFile then
      -1
    when Gem::Source then
      unless @uri
        return 0 unless other.uri
        return 1
      end

      return -1 unless other.uri

      # Returning 1 here ensures that when sorting a list of sources, the
      # original ordering of sources supplied by the user is preserved.
      return 1 unless @uri.to_s == other.uri.to_s

      0
    end
  end

  def ==(other) # :nodoc:
    self.class === other && @uri == other.uri
  end

  alias_method :eql?, :== # :nodoc:

  def hash # :nodoc:
    @uri.hash
  end

  ##
  # Returns the local directory to write +uri+ to.

  def cache_dir(uri)
    # Correct for windows paths
    escaped_path = uri.path.sub(%r{^/([a-z]):/}i, '/\\1-/')

    File.join Gem.spec_cache_dir, "#{uri.host}%#{uri.port}", File.dirname(escaped_path)
  end

  ##
  # Returns true when it is possible and safe to update the cache directory.

  def update_cache?
    return @update_cache unless @update_cache.nil?
    @update_cache =
      begin
        File.stat(Gem.user_home).uid == Process.uid
      rescue Errno::ENOENT
        false
      end
  end

  ##
  # Downloads +spec+ and writes it to +dir+.  See also
  # Gem::RemoteFetcher#download.

  def download(spec, dir = Dir.pwd)
    remote_not_available
  end

  ##
  # The name tuples +type+ of this remote index, see upstream. M5.

  def load_specs(type)
    remote_not_available
  end

  ##
  # Fetches the specification +name_tuple+ from this remote index. M5.

  def fetch_spec(name_tuple)
    remote_not_available
  end

  private

  def remote_not_available
    raise Gem::Exception, "remote sources are not available yet: #{@uri}" # M5
  end

  def enforce_trailing_slash(uri)
    uri.merge(uri.path.gsub(%r{/+$}, "") + "/")
  end
end

require_relative "source/installed"
require_relative "source/specific_file"
require_relative "source/local"

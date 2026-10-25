# frozen_string_literal: true

##
# Represents an installed gem.  This is used for dependency resolution.

class Gem::Source::Installed < Gem::Source
  def initialize # :nodoc:
    @uri = nil
  end

  ##
  # Installed sources sort before all other sources.
  #
  # Opal: upstream also sorts Git, Lock and Vendor sources, which this port
  # has no equivalent of (GEMS.md §1).

  def <=>(other)
    case other
    when Gem::Source::Installed then
      0
    when Gem::Source then
      1
    end
  end

  ##
  # We don't need to download an installed gem

  def download(spec, path)
    nil
  end

  def inspect # :nodoc:
    "#<#{self.class} Installed>"
  end
end

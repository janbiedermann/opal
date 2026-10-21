# frozen_string_literal: true

require_relative "../command"
require_relative "../local_remote_options"
require_relative "../spec_fetcher"
require_relative "../version_option"

# Opal: upstream's OutdatedCommand also carries the cooldown cache -
# Gem::Cooldown, its --cooldown option from Gem::CooldownOption, and the half
# of the command that chooses the newest version outside that period while
# annotating the ones inside it. Gem::Cooldown is not part of this port (§1
# leaves that cache out, and Gem::Source#created_at_for_tuple reads with it),
# so the option and the two cooldown methods are what is dropped. The listing
# itself is upstream's, through
# Gem::Specification.outdated_and_latest_version, which this port had not
# needed until now.
class Gem::Commands::OutdatedCommand < Gem::Command
  include Gem::LocalRemoteOptions
  include Gem::VersionOption

  def initialize
    super "outdated", "Display all gems that need updates"

    add_local_remote_options
    add_platform_option
  end

  def description # :nodoc:
    <<-EOF
The outdated command lists gems you may wish to upgrade to a newer version.

You can check for dependency mismatches using the dependency command and
update the gems with the install command.
    EOF
  end

  def execute
    Gem::Specification.outdated_and_latest_version.each do |spec, remote_version|
      say "#{spec.name} (#{spec.version} < #{remote_version})"
    end
  end
end

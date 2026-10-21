# frozen_string_literal: true

# Opal: upstream writes `-dependency[0]`, Ruby 3.x's unary minus on a String,
# which hands back the same string deduplicated against the internal one. There
# is no counterpart here, and the element keeps the value it was given without
# it, so that one line is out.

class Gem::Resolver::APISet::GemParser
  def parse(line)
    version_and_platform, rest = line.split(" ", 2)
    version, platform = version_and_platform.split("-", 2)
    dependencies, requirements = rest.split("|", 2).map! {|s| s.split(",") } if rest
    dependencies = dependencies ? dependencies.map! {|d| parse_dependency(d) } : []
    requirements = requirements ? requirements.map! {|d| parse_dependency(d) } : []
    [version, platform, dependencies, requirements]
  end

  private

  def parse_dependency(string)
    dependency = string.split(":", 2)
    dependency[-1] = dependency[-1].split("&") if dependency.size > 1
    dependency
  end
end

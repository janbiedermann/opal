# frozen_string_literal: true

require "rubygems/dependency"
require "rubygems/stub_specification"

# Opal: a partial port of upstream's rubygems_ext.rb. Upstream patches a host
# RubyGems it does not control; the port sits on the ported one, so only the
# additions Bundler's own files expect go on top. The Platform, Specification,
# BasicSpecification, NameTuple and compact-index sections arrive with their
# consumers (M8.1's sources and lockfile, M8.4's remote index), and the
# FilterIgnoredSpecs backport goes: the port's Gem is 4.1, beyond the version
# that needed it.
module Gem
  module BetterPermissionError
    def data
      super
    rescue Errno::EACCES
      raise Bundler::PermissionError.new(loaded_from, :read)
    end
  end

  class StubSpecification
    prepend BetterPermissionError
  end

  class Dependency
    require_relative "force_platform"

    include ::Bundler::ForcePlatform

    attr_reader :force_ruby_platform

    attr_accessor :source, :groups

    alias_method :eql?, :==

    # Opal: corelib's method_defined? answers for inherited methods too and
    # takes no second argument; the ported Dependency defines encode_with
    # itself, so the guard reads false here either way.
    unless method_defined?(:encode_with)
      def encode_with(coder)
        [:@name, :@requirement, :@type, :@prerelease, :@version_requirements].each do |ivar|
          coder[ivar.to_s.sub(/^@/, "")] = instance_variable_get(ivar)
        end
      end
    end

    def to_lock
      # Opal: corelib has no mutable String#<< (see unsupported.rb), so the
      # appends go through concatenation.
      out = String.new("  #{name}")
      unless requirement.none?
        reqs = requirement.requirements.map {|o, v| "#{o} #{v}" }.sort.reverse
        out += " (#{reqs.join(", ")})"
      end
      out
    end
  end
end

# frozen_string_literal: true

# Opal: upstream's git source drives the `git` command (clone, checkout,
# per-revision install paths) and is not ported yet (GEMS.md scope for M8:
# the Gemfile DSL answers `git:` gems with a GitError instead of a
# NoMethodError; a Gemfile.lock GIT section raises the same way). The class
# must exist: SourceList#source_list_for and the lockfile parser's TYPES
# dispatch on it.
module Bundler
  class Source
    class Git < Source
      NOT_PORTED = "Bundler's git source is not ported to Opal: " \
        "`git:` gems need a git checkout at install time"

      def self.from_lock(options)
        raise GitError, NOT_PORTED
      end

      def initialize(options)
        raise GitError, NOT_PORTED
      end
    end
  end
end

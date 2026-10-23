# frozen_string_literal: true

module Opal
  # The single source of the version is opal/corelib/version.mjs, which
  # RUBY_ENGINE_VERSION answers.
  VERSION = ::RUBY_ENGINE_VERSION

  # Only major and minor parts of version
  VERSION_MAJOR_MINOR = VERSION.split('.').first(2).join('.').freeze
end

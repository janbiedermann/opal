# backtick_javascript: true
require 'corelib/version.mjs'
::RUBY_PLATFORM       = `Opal.platform.ruby_platform`
::RUBY_ENGINE         = 'opal'
::RUBY_VERSION        = '3.2.0'
# The single source of the version is opal/corelib/version.mjs.
::RUBY_ENGINE_VERSION = `Opal.esm["corelib/version"].OPAL_VERSION`
::RUBY_RELEASE_DATE   = '2026-10-23'
::RUBY_PATCHLEVEL     = 0
::RUBY_REVISION       = '0'
::RUBY_COPYRIGHT      = 'opal - Copyright (C) 2011-2023 Adam Beynon and the Opal contributors'
::RUBY_DESCRIPTION    = "opal #{::RUBY_ENGINE_VERSION} (#{::RUBY_RELEASE_DATE} revision #{::RUBY_REVISION})"

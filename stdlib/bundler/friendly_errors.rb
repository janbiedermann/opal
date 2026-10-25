# frozen_string_literal: true

module Bundler
  # Opal: two deviations from upstream's file. The `Thor::Error` arms (in
  # log_error and exit_status) go, since the port's CLI raises InvalidOption
  # (a BundlerError, whose status_code the BundlerError arm already reads)
  # where Thor raised; and the report template names the version where
  # upstream embeds Bundler::Env.report - env.rb, the `bundle env` command's
  # body, waits for a later slice.
  module FriendlyErrors
    module_function

    def enable!
      @disabled = false
    end

    def disabled?
      @disabled
    end

    def disable!
      @disabled = true
    end

    def log_error(error)
      case error
      when YamlSyntaxError
        Bundler.ui.error error.message
        Bundler.ui.trace error.orig_exception
      when Dsl::DSLError, GemspecError
        Bundler.ui.error error.message
      when GemRequireError
        Bundler.ui.error error.message
        Bundler.ui.trace error.orig_exception
      when BundlerError
        if Bundler.ui.debug?
          Bundler.ui.trace error
        else
          Bundler.ui.error error.message, wrap: true
        end
      # Opal: the `when Thor::Error` arm goes; the port's CLI raises
      # InvalidOption (a BundlerError) where Thor raised.
      when Interrupt
        Bundler.ui.error "\nQuitting..."
        Bundler.ui.trace error
      when Gem::InvalidSpecificationException
        Bundler.ui.error error.message, wrap: true
      when SystemExit
      else request_issue_report_for(error)
      end
    end

    def exit_status(error)
      case error
      when BundlerError then error.status_code
      when SystemExit then error.status
      else 1
      end
    end

    def request_issue_report_for(e)
      # Opal: the report template names this build where upstream embeds
      # Bundler::Env.report (env.rb, the `bundle env` command body, waits
      # for a later slice).
      Bundler.ui.error <<~EOS, nil, nil
        --- ERROR REPORT TEMPLATE -------------------------------------------------------

        ```
        #{exception_message(e)}
        ```

        Bundler #{Bundler.verbose_version}, ruby #{RUBY_VERSION} (#{RUBY_PLATFORM})
        --- TEMPLATE END ----------------------------------------------------------------

      EOS

      Bundler.ui.error "Unfortunately, an unexpected error occurred, and Bundler cannot continue."

      Bundler.ui.error <<~EOS, nil, :yellow

        First, try this link to see if there are any existing issue reports for this error:
        #{issues_url(e)}

        If there aren't any reports for this error yet, please fill in the new issue form located at #{new_issue_url}. Make sure to copy and paste the full output of this command under the "What happened instead?" section.
      EOS
    end

    def exception_message(error)
      message = serialized_exception_for(error)
      cause = error.cause
      return message unless cause

      message + serialized_exception_for(cause)
    end

    def serialized_exception_for(e)
      <<~EOS
        #{e.class}: #{e.message}
          #{e.backtrace&.join("\n          ")&.chomp}
      EOS
    end

    def issues_url(exception)
      message = exception.message.lines.first.tr(":", " ").chomp
      message = message.split("-").first if exception.is_a?(Errno)
      # Opal: upstream requires CRuby's cgi/escape and falls back to
      # cgi/util; the port's stdlib cgi is a single file, cgi/util, and its
      # CGI.escape is there, so that one require does it.
      require "cgi/util"
      "https://github.com/ruby/rubygems/search?q=" \
        "#{CGI.escape(message)}&type=Issues"
    end

    def new_issue_url
      "https://github.com/ruby/rubygems/issues/new?labels=Bundler&template=bundler-related-issue.md"
    end
  end

  def self.with_friendly_errors
    FriendlyErrors.enable!
    yield
  rescue SignalException
    raise
  rescue Exception => e # rubocop:disable Lint/RescueException
    raise if FriendlyErrors.disabled?

    FriendlyErrors.log_error(e)
    exit FriendlyErrors.exit_status(e)
  end
end

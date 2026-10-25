# frozen_string_literal: true

require_relative "../current_ruby"

# Opal: the spawn story reads differently here. Kernel.exec has no node
# shim (a node process cannot exec over itself), so kernel_exec below
# emulates it through Kernel#system - the synchronous shape of the same
# spawn: standard streams inherited, and the child inherits the
# environment set_bundle_environment has already written - then exits
# with the child's status. Node cannot tell ENOENT from EACCES when the
# spawn fails, so the port answers one "command not found" where upstream
# split 126 and 127. kernel_load provisions the compiler first: the file
# it loads is Ruby source this process compiles on the fly (the dynamic
# require of eval_gemspec's shape, so bundles that never exec stay
# parser-free).
module Bundler
  class CLI::Exec
    attr_reader :options, :args, :cmd

    TRAPPED_SIGNALS = %w[INT].freeze

    def initialize(options, args)
      @options = options
      @cmd = args.shift
      @args = args
      # Opal: Thor answered options.keep_file_descriptors? off its options
      # hash; the port's options are a plain hash under the flag's spelled
      # name. The flag itself is rejected below, so this reads the default.
      # Upstream skipped the hash on JRuby, whose spawn options differ.
      @args << { close_others: !options["keep-file-descriptors"] }
    end

    def run
      validate_cmd!
      SharedHelpers.set_bundle_environment
      if bin_path = Bundler.which(cmd)
        if !Bundler.settings[:disable_exec_load] && directly_loadable?(bin_path)
          bin_path.delete_suffix!(".bat") if Gem.win_platform?
          kernel_load(bin_path, *args)
        else
          bin_path = explicit_path(bin_path)
          kernel_exec(bin_path, *args)
        end
      else
        # exec using the given command
        kernel_exec(cmd, *args)
      end
    end

    private

    def validate_cmd!
      return unless cmd.nil?
      Bundler.ui.error "bundler: exec needs a command to run"
      exit 128
    end

    def kernel_exec(*args)
      # Opal: the emulation named in the file header. A nil answer is the
      # runtime's "nothing to spawn"; false carries the child's status in
      # $?. A successful spawn returns the process exit status, and this
      # process then ends with 0 like the child did.
      succeeded = system(*args)
      if succeeded.nil?
        Bundler.ui.error "bundler: command not found: #{cmd}"
        Bundler.ui.warn "Install missing gem executables with `bundle install`"
        exit 127
      end
      exit($?.exitstatus) unless succeeded
    end

    def kernel_load(file, *args)
      args.pop if args.last.is_a?(Hash)
      ARGV.replace(args)
      $0 = file
      Process.setproctitle(process_title(file, args)) if Process.respond_to?(:setproctitle)
      Kernel.require "opal-parser" # Opal: the loaded file compiles in this process
      require_relative "../setup"
      TRAPPED_SIGNALS.each {|s| trap(s, "DEFAULT") }
      # Opal: Kernel#load hands the path to Opal.load, whose normalize drops
      # the leading "/" - an absolute binstub path then gets searched as a
      # relative one and answered with a ".rb" miss (exe/ruby's own loader
      # compensates; the plain platform one does not). Upstream load means
      # "run this file now", so the port reads it and evaluates it against
      # the toplevel binding.
      eval(File.read(file), TOPLEVEL_BINDING, file)
    rescue SystemExit, SignalException
      raise
    rescue Exception # rubocop:disable Lint/RescueException
      Bundler.ui.error "bundler: failed to load command: #{cmd} (#{file})"
      Bundler::FriendlyErrors.disable!
      raise
    end

    def process_title(file, args)
      "#{file} #{args.join(" ")}".strip
    end

    def explicit_path(path)
      if File.absolute_path?(path) || explicit_relative_path?(path)
        path
      else
        ".#{File::SEPARATOR}#{path}"
      end
    end

    def explicit_relative_path?(path)
      [File::SEPARATOR, File::ALT_SEPARATOR].compact.any? do |separator|
        path.start_with?(".#{separator}", "..#{separator}")
      end
    end

    def directly_loadable?(file)
      if Gem.win_platform?
        script_wrapper?(file)
      else
        ruby_shebang?(file)
      end
    end

    def script_wrapper?(file)
      script_file = file.delete_suffix(".bat")
      return false unless File.exist?(script_file)

      if File.zero?(script_file)
        Bundler.ui.warn "#{script_file} is empty"
        return false
      end

      header = File.open(file, "r") {|f| f.read(32) }
      ruby_exe = "#{RbConfig::CONFIG["RUBY_INSTALL_NAME"]}#{RbConfig::CONFIG["EXEEXT"]}"
      ruby_exe = "ruby.exe" if ruby_exe.empty?
      header.include?(ruby_exe)
    end

    def ruby_shebang?(file)
      possibilities = [
        "#!/usr/bin/env ruby\n",
        "#!/usr/bin/env jruby\n",
        "#!/usr/bin/env truffleruby\n",
        "#!#{Gem.ruby}\n",
      ]

      if File.zero?(file)
        Bundler.ui.warn "#{file} is empty"
        return false
      end

      first_line = File.open(file, "rb") {|f| f.read(possibilities.map(&:size).max) }
      possibilities.any? {|shebang| first_line.start_with?(shebang) }
    end
  end
end

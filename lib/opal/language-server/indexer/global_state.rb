# backtick_javascript: true
# The server's long-lived state (LSP.md §5): the Index with the baked
# corelib/stdlib payload loaded at startup, the live records of open and
# workspace documents, and the client info the features read (opalHome
# from initializationOptions decides whether navigation into corelib lands
# in the checkout or on a dumped copy).
require 'opal/language-server/baked_index.mjs'
require 'opal/language-server/indexer/index'
require 'opal/language-server/indexer/file_resolver'

module Opal
  module LanguageServer
    class GlobalState
      WORKSPACE_FILE_LIMIT = 300

      attr_reader :index, :client_capabilities, :client_name, :opal_home, :formatter

      def initialize
        @client_capabilities = {}
        @client_name = ""
        @opal_home = nil
        baked = `Opal.esm["opal/language-server/baked_index"].default`
        @index = Index.new(`baked === undefined ? nil : baked`)
      end

      # Answered from initialize: client info, the optional opalHome, and
      # the workspace index of the client's folders. Answers a summary
      # string for the logMessage.
      def client_initialized(params)
        @client_capabilities = params["capabilities"] || {}
        @client_name = (params["clientInfo"] || {})["name"] || ""
        init = params["initializationOptions"] || {}
        @opal_home = init["opalHome"]
        # External formatter command (LSP.md §9 P7): none configured, none
        # advertised. The environment is the fallback for clients that
        # cannot send initializationOptions.
        @formatter = init["formatter"] || ENV["OPAL_LSP_FORMATTER"]

        summary = []
        stale = @opal_home ? reindex_stale_corelib : 0
        # Only a notable outcome gets a logMessage: an empty or all-quiet
        # summary sends no notification at all (a stray message would shift
        # the publish/response sequence for clients and tests).
        summary << "#{stale} stale corelib files re-indexed" if stale && stale.positive?
        count, skipped = index_workspace_folders(params["workspaceFolders"])
        summary << "#{count} workspace files indexed#{skipped ? " (limit hit)" : ""}" if count && count.positive?
        summary.join("; ")
      end

      # A checkout beside the exe beats the bake when files moved: the
      # digest of every baked file is recomputed and changed files are
      # indexed live under their checkout-relative key (live records
      # shadow baked ones in every query).
      def reindex_stale_corelib
        return 0 if @opal_home.nil?
        digests = @index.baked ? `#{@index.baked}.digests` : nil
        return 0 if `digests == null || digests === nil`
        fs = `Opal.platform.modules.fs`
        names = `Object.keys(digests)`
        count = 0
        count_names = `names.length`
        count_names.times do |i|
          rel = `names[#{i}]`
          path = FileResolver.join_paths(@opal_home, rel)
          # IIFE, not a %x{} block: an x-string in assignment position must
          # splice as a single JS expression.
          source = `(() => { try { return String(#{fs}.readFileSync(String(#{path}), "utf8")); } catch (e) { return null; } })()`
          next if `source == null`
          baked_digest = `digests[#{rel}]`
          computed = digest(source)
          next if `#{computed} === #{baked_digest}`
          @index.index_source(rel, source)
          count += 1
        end
        count
      end

      # The client's workspaceFolders: every *.rb under them (bounded) joins
      # the live index keyed by its uri, so references/rename see closed
      # files too.
      def index_workspace_folders(folders)
        return [nil, false] if folders.nil? || folders.empty?
        fs = `Opal.platform.modules.fs`
        indexed = 0
        @workspace_limit_hit = false
        folders.each do |folder|
          uri = folder["uri"]
          next unless uri&.start_with?("file://")
          root = `decodeURIComponent(#{uri}.slice(7))`
          walk_ruby(fs, root, 0) do |abs_path, file_uri|
            break if indexed >= WORKSPACE_FILE_LIMIT
            source = `(() => { try { return String(#{fs}.readFileSync(String(#{abs_path}), "utf8")); } catch (e) { return null; } })()`
            next if `source == null`
            @index.index_source(file_uri, source)
            indexed += 1
          end
        end
        [indexed, @workspace_limit_hit]
      end

      def workspace_limit_hit?
        @workspace_limit_hit
      end

      # One workspace file from disk (workspace/didChangeWatchedFiles):
      # index_source replaces its live records whole. Answers whether the
      # file was readable (a Created event can race a file that is already
      # gone again).
      def index_workspace_file(uri)
        return false unless uri&.start_with?("file://")
        fs = `Opal.platform.modules.fs`
        path = `decodeURIComponent(#{uri}.slice(7))`
        source = `(() => { try { return String(#{fs}.readFileSync(String(#{path}), "utf8")); } catch (e) { return null; } })()`
        return false if `source == null`
        @index.index_source(uri, source)
        true
      end

      private

      # depth-bounded so a workspace never drags in node_modules-scale
      # trees; .rb only, hidden dirs skipped.
      def walk_ruby(fs, dir, depth, &block)
        return if depth > 6
        list = `(() => { try { return #{fs}.readdirSync(String(#{dir}), {withFileTypes: true}); } catch (e) { return []; } })()`
        n = `list.length`
        n.times do |i|
          name = `list[#{i}].name`
          next if name.start_with?(".")
          full = `#{dir} + "/" + list[#{i}].name`
          if `list[#{i}].isDirectory()`
            walk_ruby(fs, full, depth + 1, &block)
          elsif name.end_with?(".rb")
            yield full, "file://" + full
          end
        end
      end

      # Keep digest in sync with indexer/driver.rb's (the bake wrote the
      # other half of these digests).
      def digest(source)
        %x{
          var s = String(#{source}), h = 2166136261 >>> 0;
          for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
          return (h >>> 0).toString(16) + "-" + s.length;
        }
      end
    end
  end
end

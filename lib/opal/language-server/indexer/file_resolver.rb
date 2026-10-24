# backtick_javascript: true
# Resolving an index record's file key to a uri the editor can open
# (LSP.md §5). Baked records carry checkout-relative paths ("opal/corelib/
# string.rb"), live records carry document uris. With opalHome (the
# initialization option pointing at an Opal checkout) relative paths
# resolve into the checkout; without one the file is dumped once from the
# baked corelib_sources.mjs into ~/.cache/opal-lsp/sources, so a bare exe
# still has something for F12 to open.
require 'opal/language-server/corelib_sources.mjs'

module Opal
  module LanguageServer
    module FileResolver
      class << self
        def uri_for(file, opal_home)
          return file if file.start_with?("file://")
          if opal_home
            "file://" + join_paths(opal_home, file)
          else
            "file://" + dump(file)
          end
        end

        def join_paths(home, rel)
          home = home.end_with?("/") ? home[0...-1] : home
          home + "/" + rel # JS concatenation: never a boxed corelib String
        end

        # The cached copy of one baked file; writes it on first use.
        # Returns the absolute path.
        def dump(file)
          sources = `Opal.esm["opal/language-server/corelib_sources"].default`
          src = `#{sources}[#{file}]`
          return nil if `src == null || src === undefined`
          cache = `String(process.env.HOME || process.env.USERPROFILE || process.env.TMPDIR || "/tmp")`
          # built with JS concatenation: a primitive path for node's fs, and
          # a Ruby local that the %x{} below interpolates (inside #{} the
          # text is RUBY: a JS-only variable name would read as a method).
          path = `#{cache} + "/.cache/opal-lsp/sources/" + #{file}`
          %x{
            var fs = Opal.platform.modules.fs;
            var p = #{path};
            if (!fs.existsSync(p)) {
              fs.mkdirSync(p.slice(0, p.lastIndexOf("/")), {recursive: true});
              fs.writeFileSync(p, #{src});
            }
          }
          path
        end
      end
    end
  end
end

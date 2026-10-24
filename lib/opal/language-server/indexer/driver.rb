# The index bake driver (LSP.md §5): run at exe BUILD time by
# tasks/language-server/update_baked_index.mjs, never at server start.
# It walks the Ruby sources of the checkout (corelib, opal entrypoints,
# stdlib) with the same DeclarationListener that indexes live documents,
# and writes two committed generated modules:
#   baked_index.mjs      - the finished record graph as literals + per-file
#                          content digests (for staleness re-indexing);
#   corelib_sources.mjs  - path -> source, dumped to ~/.cache/opal-lsp
#                          only when someone navigates into corelib with no
#                          checkout beside the exe.
# backtick_javascript: true

require 'opal/language-server/prism/parser'
require 'opal/language-server/indexer/declaration_listener'

module Opal
  module LanguageServer
    module Indexer
      module Driver
        # The files that make Opal's Ruby (LSP.md §5) - not the specs, not
        # the toolchain's own .rb ports.
        ROOTS = [
          "opal/corelib/**/*.rb",
          "opal/opal/*.rb",
          "stdlib/**/*.rb",
          "stdlib/opal/**/*.rb",
        ].freeze

        class << self
          def run
            home = `process.env.OPAL_HOME`
            out_dir = `process.env.BAKED_OUT_DIR || (process.env.OPAL_HOME + "/lib/opal/language-server")`
            fs = `Opal.platform.modules.fs`

            payload = { "modules" => {}, "constants" => {}, "constant_references" => {}, "digests" => {} }
            sources = {}
            files = collect_files(home, fs)

            files.each do |rel|
              source = `#{fs}.readFileSync(#{home} + "/" + #{rel}, "utf8")`
              result = ParseResult.new(source)
              listener = DeclarationListener.new(rel, result).index!
              merge_map(payload["modules"], listener.modules)
              merge_map(payload["constants"], listener.constants)
              merge_map(payload["constant_references"], listener.constant_references)
              payload["digests"][rel] = digest(source)
              sources[rel] = source
            end

            write_module(fs, "#{out_dir}/baked_index.mjs", payload)
            write_module(fs, "#{out_dir}/corelib_sources.mjs", sources)
            puts "baked #{files.size} files: #{payload['modules'].size} modules, #{payload['constants'].size} constants, #{undefined_count} undefined->null"
          end

          # A dependency-free walk (the bake bundle carries no Dir/File
          # globbing): "dir/**/*.rb" recurses, "dir/*.rb" is one level.
          def collect_files(home, fs)
            out = {}
            ROOTS.each do |pattern|
              ext = pattern[/\.rb\z/]
              if pattern.include?("**")
                dir = pattern.split("/**").first # "opal/corelib"
                walk_recursive(fs, home + "/" + dir, home, dir, ext, out)
              else
                dir = pattern.slice(0, pattern.rindex("/")) # "opal/opal"
                read_dir(fs, home + "/" + dir).each do |name, is_dir|
                  next if is_dir || !name.end_with?(ext)
                  out["#{dir}/#{name}"] = true
                end
              end
            end
            out.keys.sort
          end

          def walk_recursive(fs, dir, home, keep_prefix, ext, out)
            stack = [dir]
            until stack.empty?
              current = stack.pop
              read_dir(fs, current).each do |name, is_dir|
                full = current + "/" + name
                if is_dir
                  stack.push(full)
                else
                  rel = `#{full}.slice(#{home}.length + 1)`
                  out[rel] = true if name.end_with?(ext) && rel.start_with?(keep_prefix)
                end
              end
            end
          end

          # [[name, is_directory], ...]; a missing directory reads empty.
          # String(...): a Ruby-built path arrives boxed (corelib String#+
          # and interpolation produce String objects with encoding tags),
          # and node's fs rejects them.
          def read_dir(fs, dir)
            list = `(() => { try { return #{fs}.readdirSync(String(#{dir}), {withFileTypes: true}); } catch (e) { return []; } })()`
            entries = []
            n = `list.length`
            n.times do |i|
              entries << [`list[#{i}].name`, `list[#{i}].isDirectory()`]
            end
            entries
          end

          def merge_map(into, from)
            from.each_pair do |name, records|
              (into[name] ||= []).concat(records)
            end
          end

          # FNV-1a over UTF-16 units plus the length: cheap on both sides
          # (the staleness check recomputes it on the live file at boot)
          # and enough for "did this file change since the bake".
          # %x{} + explicit return: a MULTILINE backtick in assignment
          # position compiles as a statement and drops the value (only a
          # single-line backtick splices as an expression).
          def digest(source)
            %x{
              var s = String(#{source}), h = 2166136261 >>> 0;
              for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
              return (h >>> 0).toString(16) + "-" + s.length;
            }
          end

          # Not stdlib json: the payload mixes Ruby hashes/arrays with JS
          # primitives, and json.rb sends #to_json to every value - a raw
          # undefined (an absent node field that skipped a guard) dies
          # there. This encoder answers undefined with null, counts them,
          # and String()-guards boxed corelib strings, which JSON.stringify
          # would otherwise emit as {}.
          def undefined_count
            @undefined_count ||= 0
          end

          def serialize(value, path = "")
            kind = `(() => {
              var v = #{value};
              if (v === undefined) return "undefined";
              if (v === null || v === nil) return "null";
              if (Array.isArray(v) || v.$$is_array) return "array";
              if (v.$$is_hash) return "hash";
              if (typeof v === "string" || v instanceof String) return "string";
              if (typeof v === "number" || typeof v === "boolean") return "scalar";
              return "other";
            })()`
            case kind
            when "undefined"
              @undefined_count += 1
              warn "bake: undefined at #{path}" if @undefined_count <= 10
              "null"
            when "null"
              "null"
            when "array"
              items = []
              n = `#{value}.length`
              n.times { |i| items << serialize(`#{value}[#{i}]`, "#{path}[#{i}]") }
              "[" + items.join(",") + "]"
            when "hash"
              parts = []
              value.each_pair do |k, v|
                parts << `JSON.stringify(String(#{k}))` + ":" + serialize(v, "#{path}.#{k}")
              end
              "{" + parts.join(",") + "}"
            when "string"
              `JSON.stringify(String(#{value}))`
            when "scalar"
              `String(#{value})`
            else
              raise "bake: unexpected #{kind} at #{path}: #{value.inspect}"
            end
          end

          def write_module(fs, path, data)
            json = serialize(data)
            `#{fs}.writeFileSync(String(#{path}), "export default " + #{json} + ";\n")`
          end
        end
      end
    end
  end
end

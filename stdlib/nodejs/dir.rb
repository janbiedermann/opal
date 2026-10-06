# backtick_javascript: true

class Dir
  # (picomatch, an npm package, is loaded when a glob needs it: a program
  # without one also works where only Node's own modules can be required,
  # as in a single executable application)
  `var __pm_module__ = null, __pm__ = function() { return __pm_module__ || (__pm_module__ = require('picomatch')); }`
  @__fs__ = `require('fs')`
  @__path__ = `require('path')`
  @__os__ = `require('os')`
  `var __fs__ = #{@__fs__}`
  `var __path__ = #{@__path__}`
  `var __os__ = #{@__os__}`

  %x{
    function pwd() {
      return process.cwd().split(__path__.sep).join(__path__.posix.sep)
    }

    function readdirRecursive(dir, agg) {
      try {
        const files = __fs__.readdirSync(dir, {withFileTypes: true})
        for (const file of files) {
          agg.push(__path__.join(dir, file.name))
          if (file.isDirectory()) {
            readdirRecursive(__path__.join(dir, file.name), agg)
          }
        }
        return agg
      } catch (e) {
        if (e.code === 'ENOENT' || e.code === 'EACCES' || e.code === 'ENOTDIR') {
           // ignore
        } else {
            throw e
        }
      }
    }
  }

  class << self
    def [](pattern)
      glob(pattern)
    end

    def pwd
      `pwd()`
    end

    def home
      `__os__.homedir()`
    end

    # As in CRuby: the home directory without a path; with a block, the
    # previous directory again after it, and the block's value.
    def chdir(path = home)
      path = path.to_path if path.respond_to?(:to_path)
      unless block_given?
        `process.chdir(#{path})`
        return 0
      end
      previous = pwd
      `process.chdir(#{path})`
      begin
        yield path
      ensure
        `process.chdir(#{previous})`
      end
    end

    def mkdir(path)
      `__fs__.mkdirSync(#{path}, { recursive: true })`
    end

    def entries(dirname)
      %x{
        var result = [];
        var entries = __fs__.readdirSync(#{dirname});
        for (var i = 0, ii = entries.length; i < ii; i++) {
          result.push(entries[i]);
        }
        return result;
      }
    end

    def glob(pattern)
      pattern = [pattern] unless pattern.respond_to? :each
      pattern = pattern.map do |subpattern|
        subpattern = subpattern.to_path if subpattern.respond_to? :to_path
        ::Opal.coerce_to!(subpattern, String, :to_str)
      end
      %x{
        return #{pattern}.flatMap((subpattern) => {
            const scanResult = __pm__().scan(subpattern, { tokens: true })
            // (a pattern without a base is relative to the current
            // directory, and so are the paths it gives)
            const relativeToCwd = scanResult.negated || scanResult.base === ''
            const cwd = process.cwd().split(__path__.sep).join(__path__.posix.sep)
            let base = relativeToCwd ? cwd : scanResult.base
            try {
                const stat = __fs__.statSync(base)
                if (scanResult.glob === '' && stat.isDirectory()) {
                    return [base]
                }
                if (stat.isFile()) {
                    base = __path__.dirname(base)
                }
            } catch (e) {
                if (e.code === 'ENOENT' || e.code === 'EACCES' || e.code === 'ENOTDIR') {
                    return []
                }
            }
            try {
                const recursive = (scanResult.glob.includes('**') && scanResult.glob.includes('/*'))
                  || scanResult.glob.includes('*/')
                  || scanResult.glob.includes('**/')
                let files = []
                if (recursive) {
                    files = readdirRecursive(base, [])
                } else {
                    files = __fs__.readdirSync(base).map(f => __path__.join(base, f))
                }
                if (relativeToCwd) files = files.map(f => __path__.relative(cwd, f).split(__path__.sep).join(__path__.posix.sep))
                const isMatch = __pm__()(subpattern, {windows: true})
                return files.filter(f => isMatch(f));
            } catch (e) {
                if (e.code === 'ENOENT' || e.code === 'EACCES' || e.code === 'ENOTDIR') {
                    return []
                }
                throw e
            }
        })
      }
    end

    alias getwd pwd
  end
end

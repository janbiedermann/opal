# backtick_javascript: true
# use_strict: true
# opal_runtime_mode: true
# helpers: mbinc, platform, raise, truthy

module ::Opal
  # helper to convert ::File/::IO string open modes to flags
  def self.mode_to_flags(mode)
    %x{
      const o = Opal.File.Constants;
      if (mode === nil) return nil;
      let a = mode.includes('a'),
          r = mode.includes('r'),
          w = mode.includes('w'),
          x = mode.includes('x'),
          p = mode.includes('+');
      if ( a && !r && !w &&  p &&  x) return o.APPEND | o.CREAT | o.EXCL | o.RDWR;   // ax+
      if ( a && !r && !w &&  p && !x) return o.APPEND | o.CREAT | o.RDWR;            // a+
      if ( a && !r && !w && !p &&  x) return o.APPEND | o.CREAT | o.EXCL | o.WRONLY; // ax
      if ( a && !r && !w && !p && !x) return o.APPEND | o.CREAT | o.WRONLY;          // a
      if (!a && !r &&  w &&  p &&  x) return o.RDWR   | o.CREAT | o.EXCL | o.TRUNC;  // wx+
      if (!a && !r &&  w &&  p && !x) return o.RDWR   | o.CREAT | o.TRUNC;           // w+
      if (!a && !r &&  w && !p &&  x) return o.WRONLY | o.CREAT | o.EXCL | o.TRUNC;  // wx
      if (!a && !r &&  w && !p && !x) return o.WRONLY | o.CREAT | o.TRUNC;           // w
      if (!a &&  r && !w &&  p && !x) return o.RDWR;   // r+
      if (!a &&  r && !w && !p && !x) return o.RDONLY; // r
      return nil;
    }
  end

  # glob_brace_expand, original name ruby_brace_expand and ported from ruby/dir.c,
  # used by ::File.fnmatch and ::Dir.glob
  def self.glob_brace_expand(str, func, escape, arg)
    %x{
      let pi = 0,
          nest = 0,
          lbrace = null,
          rbrace = null,
          status = false;

      while (str[pi]) {
        if (str[pi] === '{' && nest++ === 0) {
          lbrace = pi;
        } else if (str[pi] === '}' && lbrace !== null && --nest === 0) {
          rbrace = pi;
          break;
        } else if (escape && str[pi] === '\\' && !str[++pi]) {
          break;
        }
        pi = $mbinc(str, pi);
      }

      if (lbrace !== null && rbrace !== null) {
        pi = lbrace;
        while (pi < rbrace) {
          const t = ++pi;
          nest = 0;
          while (pi < rbrace && !(str[pi] === ',' && nest === 0)) {
            if (str[pi] === '{') nest += 1;
            else if (str[pi] === '}') nest -= 1;
            else if (escape && str[pi] === '\\' && ++pi === rbrace) break;
            pi = $mbinc(str, pi);
          }
          const buf = str.slice(0, lbrace) + str.slice(t, pi) + str.slice(rbrace + 1);
          status = Opal.glob_brace_expand(buf, func, escape, arg);
          if ($truthy(status)) break;
        }
      } else if (lbrace === null && rbrace === null) {
        status = func(str, arg);
      }

      return status;
    }
  end

  def self.is_dirsep(chr)
    `chr == '/' || (!!$platform.windows && chr == '\\')`
  end

  def self.is_star_star_slash(str, idx)
    `(str[idx] === '*' && str[idx+1] === '*' && str[idx+2] === '/') ? true : false`
  end

  # methods for ::File.expand_path, ::File.absolute_path and ::File.dirname
  # straightforward port of rb_file_expand_path_internal from ruby/file.c, more or less

  # just like in ruby/file.c
  def self.bufcopy(fname, srcptr, srclen, result, pi)
    %x{
      pi += 1; // skippathsep(pi) only matters on Apple
      result += fname.slice(srcptr, srcptr + srclen);
      pi += srclen;
      return [result, pi];
    }
  end

  # just like in ruby/file.c
  def self.bufinit(result)
    [0, 0, `result.length`]
  end

  # just like in ruby/file.c
  def self.chompdirsep(pth, idx)
    %x{
      let last;
      while (pth[idx]) {
        if (pth[idx] === '/' || ($platform.windows && pth[idx] === '\\')) {
          idx++;
          last = idx;
          while (pth[idx] && (pth[idx] === '/' || ($platform.windows && pth[idx] === '\\')))
            idx++;
          if (!pth[idx]) return last;
        } else {
          idx = $mbinc(pth, idx);
        }
      }
      return idx;
    }
  end

  # just like in ruby/file.c, yet, there is no guarantee that it works
  # like intended with the various JS engines
  def self.getcwdofdrv(drv)
    drive = drv + ':'
    ::Dir.chdir(drive) do
      # the only way that I know to get the current directory
      # of a particular drive is to change chdir() to that drive
      ::Dir.pwd
    end
  rescue
    drive
  end

  # just like in ruby/file.c
  def self.has_drive_letter(pd)
    pd.match?(/^[[:alpha:]]:/)
  end

  # just like in ruby/file.c
  def self.istrailinggarbage(x)
    `x == '.' || x == ' '`
  end

  # just like in ruby/file.c
  def self.not_same_drive(pd, drive)
    %x{
      const windows = $platform.windows,
            dirsep = (c) => c === '/' || (windows && c === '\\');
      if (pd.length < 2) return false;
      if (Opal.has_drive_letter(pd)) return pd[0] !== drive;
      return dirsep(pd[0]) && dirsep(pd[1]);
    }
  end

  # just like in ruby/file.c
  def self.rb_enc_path_next(pth, idx)
    %x{
      const windows = $platform.windows;
      while (pth[idx] && !(pth[idx] === '/' || (windows && pth[idx] === '\\')))
        idx = $mbinc(pth, idx);
      return idx;
    }
  end

  # rb_enc_path_skip_prefix, just like in ruby/file.c
  def self.skipprefix(pth, idx)
    %x{
      const windows = $platform.windows,
            dirsep = (c) => c === '/' || (windows && c === '\\');
      if (windows) {
        if (pth[idx + 1] && dirsep(pth[idx]) && dirsep(pth[idx + 1])) {
          idx += 2;
          while (pth[idx] && dirsep(pth[idx])) idx += 1;
          idx = Opal.rb_enc_path_next(pth, idx);
          if (pth[idx] && pth[idx + 1] && !dirsep(pth[idx + 1]))
            idx = Opal.rb_enc_path_next(pth, idx + 1);
          return idx;
        }
        if (Opal.has_drive_letter(idx > 0 ? pth.slice(idx) : pth)) return idx + 2;
      }
      return idx;
    }
  end

  # just like in ruby/file.c
  def self.skiproot(pth, d)
    %x{
      const windows = $platform.windows;
      let idx = 0;
      if (windows && 2 <= d && Opal.has_drive_letter(pth)) idx += 2;
      while (idx < d && (pth[idx] === '/' || (windows && pth[idx] === '\\'))) idx += 1;
      return idx;
    }
  end

  # rb_enc_path_last_separator, just like in ruby/file.c
  def self.strrdirsep(pth, d)
    %x{
      const windows = $platform.windows,
            dirsep = (c) => c === '/' || (windows && c === '\\');
      let last = nil,
          idx = 0;
      while (idx < d) {
        if (dirsep(pth[idx])) {
          const tmp = idx;
          idx += 1;
          while (idx < d && dirsep(pth[idx])) idx += 1;
          if (idx >= d) break;
          last = tmp;
        } else {
          idx = $mbinc(pth, idx);
        }
      }
      return last;
    }
  end

  # the label 'endpath' split into 2 stages
  def self.endpath_stage1(fname, b, s, result, pi)
    bufcopy(fname, b, s - b, result, pi)
  end

  def self.endpath_stage2(result, pi, buf, enc)
    %x{
      if (pi === Opal.skiproot(result, pi + (result[pi] ? 1 : 0)) - 1) pi += 1;
      result = result.slice(0, pi - buf);
      return Opal.str(result, enc);
    }
  end

  # just like in ruby/file.c
  def self.rb_file_expand_path_internal(fname, dname, abs_mode, long_name, result)
    %x{
      const $File = #{::File}, $Dir = #{::Dir}, windows = $platform.windows,
            dirsep = (c) => c === '/' || (windows && c === '\\');
      let enc = fname.$encoding(),
          user = null,
          b = null,
          s = 0,
          buf, pi, pend, e;

      ;[buf, pi, pend] = Opal.bufinit(result);

      if (!abs_mode && fname[s] === '~') {
        if (dirsep(fname[1]) || !fname[1]) {
          buf = 0;
          b = 0;
          s += 1;
          if (fname[s]) s += 1;
          result += $Dir.$home(); // rb_default_home_dir
        } else {
          b = s;
          while (fname[s] && !dirsep(fname[s])) s += 1; // nextdirsep
          b += 1;
          const userlen = s - b;
          user = fname.slice(b, s);
          result += $Dir.$home(user);
          buf = pi + 1;
          pi += userlen;
        }
        if (!$truthy($File['$absolute_path?'](result))) {
          if (user !== null) $raise(Opal.ArgumentError, 'non-absolute home of ' + user);
          $raise(Opal.ArgumentError, 'non-absolute home');
        }
        ;[buf, pi, pend] = Opal.bufinit(result);
        pi = pend;
      } else if (windows && Opal.has_drive_letter(fname)) {
        if (dirsep(fname[2])) {
          // specified drive letter, and full path
          // skip drive letter
          pi += 2;
          s += 2;
          result += fname.slice(0, 2);
        } else {
          // specified drive, but not full path
          let same = false;

          if (dname !== nil && dname != null && Opal.not_same_drive(dname, fname[0])) {
            result = Opal.rb_file_expand_path_internal(dname, nil, abs_mode, long_name, result);
            same = Opal.has_drive_letter(fname) && result[0]['$downcase']() === fname[0]['$downcase']();
          }
          if (!same) {
            result += Opal.getcwdofdrv(fname[0]);
          }
          // else: leave result unchanged
          pi = Opal.chompdirsep(result, Opal.skiproot(result, pi));
          s += 2;
        }
      } else if (!$truthy($File['$absolute_path?'](fname))) {
        if (dname !== nil && dname != null) {
          result = Opal.rb_file_expand_path_internal(dname, nil, abs_mode, long_name, result);
          ;[buf, pi, pend] = Opal.bufinit(result);
          pi = pend;
        } else {
          const dir = $Dir.$pwd();
          result += dir;
          e = dir.length;
          ;[buf, pi, pend] = Opal.bufinit(result);
          pi = e;
        }
        if (windows && dirsep(fname[s])) {
          pi = Opal.skipprefix(result, 0);
          result = result.slice(0, pi);
        } else {
          pi = Opal.chompdirsep(Opal.skiproot(result, pi), pi);
        }
      } else {
        b = s;
        s += 1;
        while (dirsep(fname[s])) s += 1;
        const len = s - b;
        pi = buf + len;
        result += '/'.repeat(len);
      }
      if (pi > buf && result[pi - 1] === '/') {
        pi -= 1;
      } else {
        result += '/';
      }
      // root = skipprefix(result)
      b = s;
      while (fname[s]) {
        const c = fname[s];
        if (c === '.') {
          const s1 = s;
          s += 1;
          if (b === s1) {
            // beginning of path element
            const c2 = fname[s] || '';
            if (c2 === '') {
              b = s;
            } else if (c2 === '.') {
              if (!fname[s + 1] || dirsep(fname[s + 1])) {
                // We must go back to the parent
                const n = Opal.strrdirsep(result, pi);
                result = result.slice(0, pi);
                if (n === nil || n == null) {
                  result += '/';
                } else {
                  result = result.slice(0, n + 1);
                  pi = n;
                }
                s += 1;
                b = s;
              } else if (windows) {
                s += 1;
                while (Opal.istrailinggarbage(fname[s])) s += 1;
              }
            } else if (c2 === '/') {
              s += 1;
              b = s;
            } else if (c2 === '\\') {
              if (windows) {
                s += 1;
                b = s;
              } else {
                s += 1;
              }
            }
          }
        } else if (c === ' ') {
          if (windows) {
            e = s;
            while (Opal.istrailinggarbage(fname[s])) s += 1;
            if (!fname[s]) {
              s = e;
              ;[result, pi] = Opal.endpath_stage1(fname, b, s, result, pi);
              return Opal.endpath_stage2(result, pi, buf, enc);
            }
          } else {
            s += 1;
          }
        } else if (c === '/') {
          if (s > b) {
            ;[result, pi] = Opal.bufcopy(fname, b, s - b, result, pi);
            result += '/';
          }
          s += 1;
          b = s;
        } else if (c === '\\') {
          if (windows) {
            if (s > b) {
              ;[result, pi] = Opal.bufcopy(fname, b, s - b, result, pi);
              result += '/';
            }
            s += 1;
            b = s;
          } else {
            s += 1;
          }
        } else {
          s = $mbinc(fname, s);
        }
      }

      if (s > b) {
        ;[result, pi] = Opal.endpath_stage1(fname, b, s, result, pi);
      }
      return Opal.endpath_stage2(result, pi, buf, enc);
    }
  end
end

::Opal

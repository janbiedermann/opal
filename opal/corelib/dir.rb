# backtick_javascript: true
# helpers: platform, str, glob_brace_expand, is_star_star_slash, mbinc, is_dirsep, coerce_to_or_raise, raise, send, yield1, hash_new, gvars

class ::Dir
  include ::Enumerable

  class << self
    def [](*patterns, base: `undefined`, sort: true)
      # Calls Dir.glob with argument patterns and the values of keyword arguments base and sort;
      # returns the array of selected entry names.
      glob(*patterns, flags: nil, base: base, sort: sort)
    end

    if `$platform.chdir`
      def chdir(dir = nil)
        # Changes the current working directory.
        unless dir
          dir = ::ENV['HOME'] || ::ENV['LOGDIR']
          return 0 unless dir
        end
        dir = `Opal.coerce_to_or_nil(dir, Opal.String, "to_path")` || `$coerce_to_or_raise(dir, Opal.String, "to_str")`
        unless block_given?
          `$platform.chdir(#{dir}.toString())`
          return 0
        end
        cwd = pwd
        begin
          `$platform.chdir(#{dir}.toString())`
          yield dir
        ensure
          `$platform.chdir(#{cwd}.toString())`
        end
      end
    else
      alias chdir __not_implemented__
    end

    def children(dirpath, encoding: nil)
      # Returns an array of the entry names in the directory at dirpath except for '.' and '..';
      # sets the given encoding onto each returned entry name
      each_child(dirpath, encoding: encoding).to_a
    end

    if `$platform.dir_chroot`
      def chroot(dirpath)
        # Changes the root directory of the calling process to that specified in dirpath.
        # The new root directory is used for pathnames beginning with '/'.
        # The root directory is inherited by all children of the calling process.
        # Only a privileged process may call chroot.
        dirpath = `$coerce_to_or_raise(dirpath, Opal.String, "to_path")`
        `$platform.dir_chroot(dirpath)`
        0
      end
    else
      alias chroot __not_implemented__
    end

    if `$platform.rmdir`
      def delete(dirpath)
        # Removes the directory at dirpath from the underlying file system.
        dirpath = `$coerce_to_or_raise(dirpath, Opal.String, "to_path")`
        `$platform.rmdir(dirpath.toString())`
        0
      end
    else
      alias delete __not_implemented__
    end

    def each_child(dirpath, encoding: nil, &block)
      # Like Dir.foreach, except that entries '.' and '..' are not included.
      return enum_for(:each_child, dirpath, encoding: encoding) unless block_given?
      Dir.new(dirpath, encoding: encoding).each_child(&block)
      nil
    end

    def empty?(dirpath)
      # Returns whether dirpath specifies an empty directory.
      children(dirpath).empty?
    rescue Errno::ENOTDIR
      false
    end

    def entries(dirpath, encoding: nil)
      # Returns an array of the entry names in the directory at dirpath;
      # sets the given encoding onto each returned entry name.^
      foreach(dirpath, encoding: encoding).to_a
    end


    if `$platform.lstat`
      def exist?(dirpath)
        # Returns whether dirpath is a directory in the underlying file system.
        ::File.lstat(dirpath).directory?
      rescue
        false
      end
    else
      alias exist? __not_implemented__
    end

    if `$platform.dir_path`
      def fchdir(fd)
        # Changes the current working directory to the directory specified by the integer file descriptor fd.
        # When passing a file descriptor over a UNIX socket or to a child process, using fchdir instead of
        # chdir avoids the time-of-check to time-of-use vulnerability. With no block,
        # changes to the directory given by fd.
        chdir(`$platform.dir_path(fd)`)
      end

      def for_fd(fd)
        # Returns a new Dir object representing the directory specified by the given integer directory
        # file descriptor fd.
        new(`$platform.dir_path(fd)`)
      end
    else
      alias fchdir __not_implemented__
      alias for_fd __not_implemented__
    end

    def foreach(dirpath, encoding: nil, &block)
      # Calls the block with each entry name in the directory at dirpath;
      # sets the given encoding onto each passed entry_name.
      return enum_for(:foreach, dirpath, encoding: encoding) unless block_given?
      new(dirpath, encoding: encoding).each(&block)
      nil
    end

    def getwd
      # Returns the path to the current working directory.
      wd = `$platform.dir_wd()`
      wd = wd.gsub('\\', '/') if `$platform.windows`
      `$str(wd)`
    end

    if `$platform.stat && $platform.lstat`
      def glob(*patterns, flags: nil, base: `undefined`, sort: true, &block)
        # Forms an array entry_names of the entry names selected by the arguments.
        # Argument patterns is a string pattern or an array of string patterns;
        # note that these are not regexps.

        # This is a port of dir_s_glob and related functions from ruby/dir.c,
        # kept in JavaScript for size and speed.
        %x{
          let FNM_DOTMATCH = #{::File::FNM_DOTMATCH},
              FNM_NOESCAPE = #{::File::FNM_NOESCAPE},
              FNM_SYSCASE = #{::File::FNM_SYSCASE},
              FNM_GLOB_NOSORT = #{::File::FNM_GLOB_NOSORT},
              FNM_GLOB_SKIPDOT = #{::File::FNM_GLOB_SKIPDOT},
              ENOENT = #{::Errno::ENOENT},
              ENOTDIR = #{::Errno::ENOTDIR},
              EACCES = #{::Errno::EACCES},
              windows = $platform.windows,
              dir_class = self,

              // some constant values which are specific to glob
              glob_verboseC = 1 << 24,

              path_unknownC = -2,
              path_noentC = -1,
              path_existC = 0,
              path_directoryC = 4,
              path_regularC = 8,
              path_symlinkC = 10,

              plainC = 1,
              alphaC = 2,
              braceC = 3,
              magicalC = 4,
              recursiveC = 5,
              match_allC = 6,
              match_dirC = 7;

          if (base === undefined) {
            base = nil;
          } else if (base === nil) {
            base = self.$getwd();
          } else {
            base = $coerce_to_or_raise(base, Opal.String, "to_path");
            if (base === '.' || base === '') base = self.$getwd();
          }

          if (patterns.length === 2 && patterns[1].$$is_number) flags = patterns.pop();
          flags = (flags === nil || !flags) ? 0 : $coerce_to_or_raise(flags, Opal.Integer, "to_int");

          if (sort !== true && sort !== false) {
            $raise(Opal.ArgumentError, "expected true or false as sort: " + sort.$inspect());
          }

          let period = (flags & FNM_DOTMATCH) !== FNM_DOTMATCH, // as used in #fnmatch
              escape = (flags & FNM_NOESCAPE) !== FNM_NOESCAPE;

          // just like in ruby/dir.c
          function find_dirsep(pat, pi) {
            let op = null, c;
            while ((c = pat[pi])) {
              switch (c) {
              case '[': op = true; break;
              case ']': op = false; break;
              case '\x7b': op = true; break;
              case '\x7d': op = false; break;
              case '/': if (!op) return pi; break;
              case '\\': if (escape && !(c = pat[pi++])) return pi; break;
              case '\x00': $raise(Opal.ArgumentError, 'nul-separated pattern');
              }
              pi = $mbinc(pat, pi);
            }
            return pi;
          }

          // just like in ruby/dir.c
          function has_magic(pat, pi, pe) {
            let hasalpha = false, hasmagical = false, c;
            while (pi < pe && (c = pat[pi]) && c !== '\x00') {
              switch (c) {
              case '\x7b': return braceC;
              case '*': case '?': case '[': hasmagical = true; break;
              case '\\': if (escape && (pi++ >= pe)) break; break;
              case '.': break;
              case '~': if (windows) hasalpha = true; break;
              default: if (windows || /[a-zA-Z]/.test(c)) hasalpha = true;
              }
              pi = $mbinc(pat, pi);
            }
            return hasmagical ? magicalC : (hasalpha ? alphaC : plainC);
          }

          // just like in ruby/dir.c
          function glob_make_pattern(pat) {
            let dirsep = false, recursive = false,
                list = null, tail = null, tmp = null,
                pi = 0;

            while (pat[pi]) {
              if ($is_star_star_slash(pat, pi)) {
                pi += 3;
                while (pat[pi] === '/') pi++;
                while ($is_star_star_slash(pat, pi)) {
                  pi += 3;
                  while (pat[pi] === '/') pi++;
                }
                tmp = { str: null, type: recursiveC };
                dirsep = true;
                recursive = true;
              } else {
                let m = find_dirsep(pat, pi),
                    magic = has_magic(pat, pi, m),
                    non_magic = FNM_SYSCASE > 0 || windows ? plainC : alphaC;
                if (!(FNM_SYSCASE > 0 || magic > non_magic) && !recursive && pat[m]) {
                  let m2;
                  while (has_magic(pat, m + 1, m2 = find_dirsep(pat, m + 1)) <= non_magic && pat[m2]) {
                    m = m2;
                  }
                }
                tmp = { str: pat.slice(pi, m),
                        type: magic > magicalC ? magicalC : (magic > non_magic ? magic : plainC) };
                if (pat[m]) {
                  dirsep = true;
                  pi = m + 1;
                } else {
                  dirsep = false;
                  pi = m;
                }
              }

              if (!list) {
                list = tail = tmp;
              } else {
                tail = tail.next = tmp;
              }
            }

            tmp = { str: null, type: dirsep ? match_dirC : match_allC, next: null };

            if (!tail) return tmp;

            tail.next = tmp;

            return list;
          }

          // just like in ruby/dir.c
          function join_path_from_pattern(pl) {
            let path = null, str = null;
            while (pl) {
              switch (pl.type) {
              case recursiveC: str = '**'; break;
              case match_dirC: str = ''; break;
              default:
                str = pl.str;
                if (!str) { pl = pl.next; continue; }
              }
              path = path === null ? str : path + '/' + str;
              pl = pl.next;
            }
            return path;
          }

          // just like in ruby/dir.c
          function join_path(path, len, dirsep, name, namelen) {
            path = len < path.length ? path.slice(0, len) : path;
            if (dirsep) path += '/';
            path += namelen < name.length ? name.slice(0, namelen) : name;
            return path;
          }

          let glob_helper = null;

          // just like in ruby/dir.c
          function push_caller(path, args) {
            let list = glob_make_pattern(path);
            if (!list) return null;
            return glob_helper(args.path, args.baselen, args.namelen, args.dirsep,
                               args.pathtype, [list], args.flags, args.arg);
          }

          // unlike in ruby/dir.c, this is used together with File.lstat and File.stat
          // instead of having do_lstat or do_stat
          function detect_pathtype(st) {
            if (!st) return path_noentC;
            if (st['$directory?']()) return path_directoryC;
            if (st['$symlink?']()) return path_symlinkC;
            if (st['$file?']()) return path_regularC;
            return path_existC;
          }

          // just like in ruby/dir.c
          function glob_open_dir(dirp, flgs) {
            let entries = dirp.$to_a();
            if (flgs % FNM_GLOB_NOSORT === FNM_GLOB_NOSORT) return entries;
            return entries.$sort();
          }

          // just like in ruby/dir.c
          function remove_backslashes(name) {
            return name.replaceAll(/\\(.)/g, '$1');
          }

          // the literally label extracted from glob_helper, because we dont have goto
          function literally(path, baselen, namelen, dirsep, list, flgs, arg) {
            let status = false,
                pathlen = baselen + namelen;

            let copy_list = list.map((pl) => pl.type <= alphaC ? pl : null);

            for (let cur = 0; cur < copy_list.length; cur++) {
              let pl = copy_list[cur];
              if (pl) {
                let name = pl.str;
                if (escape) name = remove_backslashes(name);
                let new_list = [pl.next];

                for (let cur2 = cur + 1; cur2 < copy_list.length; cur2++) {
                  let pl2 = copy_list[cur2];
                  if (pl2 && Opal.File.$fnmatch(pl2.str, name, flgs)) {
                    new_list.push(pl2.next);
                    cur2 = 0;
                  }
                }

                let buf = join_path(path, pathlen, dirsep, name, name.length);

                // this is probably correctly done by js engines on windows, so we dont need to,
                // we couldn't do it anyway, unless we would have access to getattrlist on windows

                status = glob_helper(buf, baselen, namelen + buf.length - pathlen, true,
                                     path_unknownC, new_list, flgs, arg);

                if (status) break;
              }
            }

            return status;
          }

          // just like in ruby/dir.c
          function dirent_match(pat, name, flgs) {
            return Opal.File.$fnmatch(pat, name, flgs);
          }

          // just like in ruby/dir.c
          function dirent_match_brace(pat, arg) { return dirent_match(pat, arg.name, arg.flags); }

          // just like in ruby/dir.c
          glob_helper = function (path, baselen, namelen, dirsep, pathtype, list, flgs, arg) {
            let brace = false, magical = false, match_all = false, match_dir = false,
                plain = false, recursive = false, status = false,
                pathlen = baselen + namelen;

            for (let pl of list) {
              if (pl.type === recursiveC) {
                recursive = true;
                pl = pl.next;
              }

              switch (pl.type) {
              case plainC: plain = true; break;
              case alphaC:
                if (windows) plain = true; else magical = 1;
                break;
              case braceC:
                if (!recursive || pl.str.indexOf('/') !== -1) brace = true;
                break;
              case magicalC: magical = 2; break;
              case match_allC: match_all = true; break;
              case match_dirC: match_dir = true; break;
              case recursiveC: throw new Error('BUG! continuous RECURSIVEs');
              }
            }

            if (brace) {
              let brace_path = join_path_from_pattern(list[0]);
              if (!brace_path) return null;
              let args = {
                path: path,
                baselen: baselen,
                namelen: namelen,
                dirsep: dirsep,
                pathtype: pathtype,
                flags: flgs,
                arg: arg
              };
              return $glob_brace_expand(brace_path, push_caller, escape, args);
            }

            if (path.length > 0) {
              if (match_all && pathtype === path_unknownC) {
                let st = null;
                try { st = Opal.File.$lstat(path); } catch { $gvars['!'] = nil; }
                pathtype = detect_pathtype(st);
              }

              if ((match_dir && pathtype === path_unknownC) || pathtype === path_symlinkC) {
                let st = null;
                try { st = Opal.File.$stat(path); } catch { $gvars['!'] = nil; }
                pathtype = detect_pathtype(st);
              }

              if (match_all && pathtype > path_noentC) {
                let subpath = path.slice(baselen + (baselen > 0 && path[baselen] === '/' ? 1 : 0));
                if (subpath.length > 0) {
                  status = arg.match_func(subpath, arg);
                  if (status) return status;
                }
              }

              if (match_dir && pathtype === path_directoryC) {
                let seplen = baselen > 0 && path[baselen] === '/' ? 1 : 0,
                    subpath = path.slice(baselen + seplen),
                    tmp = join_path(subpath, namelen - seplen, dirsep, '', 0);
                status = arg.match_func(tmp, arg);
                if (status) return status;
              }
            }

            if (pathtype === path_noentC) return false;

            if (magical || recursive) {
              // this would be the call to do_opendir
              let dirp;
              try {
                dirp = dir_class.$new(path === '' ? '.' : path);
              } catch (e) {
                $gvars['!'] = nil;
                if (e.$$class === ENOENT || e.$$class === ENOTDIR) {
                  dirp = null;
                } else if (e.$$class === EACCES) {
                  if (FNM_SYSCASE > 0 && !recursive) return literally(path, baselen, namelen, dirsep, list, flgs, arg);
                  dirp = null;
                } else {
                  return arg.err_func(path, e);
                }
              }

              if (!dirp) return status;

              try {
                let glob_entries = glob_open_dir(dirp, flgs),
                    skipdot = (flgs & FNM_GLOB_SKIPDOT) === FNM_GLOB_SKIPDOT;

                flgs |= FNM_GLOB_SKIPDOT;

                for (let name of glob_entries) {
                  let new_pathtype = path_unknownC,
                      dotfile = 0,
                      namlen = name.length;

                  if (name[0] === '.') {
                    dotfile += 1;
                    if (namlen === 1) {
                      // unless DOTMATCH, skip current directories not to recurse infinitely
                      if (recursive && period) continue;
                      if (skipdot) continue;
                      dotfile += 1;
                      new_pathtype = path_directoryC;
                    } else if (namlen === 2 && name[1] === '.') {
                      // always skip parent directories not to recurse infinitely
                      continue;
                    }
                  }

                  let buf = join_path(path, pathlen, dirsep, name, namlen),
                      n = dirsep ? 1 : 0;

                  let st = Opal.File.$lstat(buf);
                  new_pathtype = detect_pathtype(st);

                  if (recursive && dotfile < (period ? 1 : 2) && new_pathtype === path_unknownC) {
                    new_pathtype = path_noentC;
                  }

                  let new_list = [];

                  for (let pl of list) {
                    if (pl.type === recursiveC) {
                      if (path_existC <= new_pathtype && new_pathtype < path_symlinkC) {
                        if (dotfile < (period ? 1 : 2)) new_list.push(pl);
                      }
                      pl = pl.next;
                    }

                    switch (pl.type) {
                    case braceC: {
                      let args = { name: name, flags: flgs };
                      if ($glob_brace_expand(pl.str, dirent_match_brace, escape, args)) new_list.push(pl.next);
                      break;
                    }
                    case alphaC: case plainC: case magicalC:
                      if (dirent_match(pl.str, name, flgs)) new_list.push(pl.next);
                      break;
                    }
                  }

                  status = glob_helper(buf, baselen, pathlen + n - baselen + namlen, true,
                                       new_pathtype, new_list, flgs, arg);

                  if (status) break;
                }
              } finally {
                dirp.$close();
              }
            } else if (plain) {
              // literally:
              status = literally(path, baselen, namelen, dirsep, list, flgs, arg);
            }

            return status;
          };

          // just like in ruby/file.c
          function rb_path_skip_prefix(path) {
            if (path[0] && /[a-zA-Z]/.test(path[0]) && path[1] === ':') {
              return 2;
            } else if ($is_dirsep(path[0]) && $is_dirsep(path[1])) {
              let i = 1;
              while ($is_dirsep(path[i + 1])) i++;
              return i;
            }
            return 0;
          }

          // just like in ruby/dir.c
          // this function is passed on to Opal.glob_brace_expand, hence using the call signature with arg
          function ruby_glob0(pat, arg) {
            let base = arg.base,
                baselen = 0,
                root = 0, start = 0,
                dirsep = false;

            if (pat[root] === '\x7b') return $glob_brace_expand(pat, ruby_glob0, escape, arg);

            let flgs = arg.flags | FNM_SYSCASE;

            if (windows) root = rb_path_skip_prefix(pat.slice(root));

            if (pat[root] === '/') root++;

            let n = root,
                buf;
            if (n === 0 && base !== nil) {
              dirsep = true;
              baselen = n = base.length;
              buf = base;
            } else {
              buf = pat.slice(start, start + n);
            }

            let list = glob_make_pattern(root > 0 ? pat.slice(root) : pat);

            if (!list) return null;

            return glob_helper(buf, baselen, n - baselen, dirsep, path_unknownC, [list], flgs, arg);
          }

          // just like in ruby/dir.c
          function push_pattern(path, arg) {
            arg.res.push(path);
            return false; // indicating no error
          }

          // just like in ruby/dir.c
          function rb_glob_error(path, exc) {
            if (exc.$$class === EACCES) $gvars['stderr'].$puts('glob warning ' + path);
            throw exc;
          }

          let res = [];

          for (let pattern of patterns) {
            if (pattern.$$is_array) {
              res = res.concat(Opal.send(self, 'glob', [...pattern, $hash_new('flags', flags, 'base', base)]));
            } else {
              try {
                pattern = $coerce_to_or_raise(pattern, Opal.String, "to_path");
                let arg = {
                  base: base,
                  flags: flags | glob_verboseC,
                  res: res,
                  match_func: push_pattern,
                  err_func: rb_glob_error
                };
                ruby_glob0(pattern, arg);
              } catch (e) {
                if (e.$$class === ENOENT || e.$$class === ENOTDIR) return [];
                if (e.$$class === EACCES) return nil;
                throw e;
              }
            }
          }

          if (block === nil) return res;
          for (let r of res) $yield1(block, r);
          return nil;
        }
      end
    else
      alias glob __not_implemented__
    end

    def home(user_name = nil)
      # Returns the home directory path of the user specified with user_name if it is not nil, or the current login user
      if user_name
        # once we have a platform that provides the required apis, this best be move to drivers
        if `$platform.windows`
          if `!user_name.match(/['"()]/)`
            h = ::Kernel.send('`', "powershell.exe -Command \"(Get-CimInstance Win32_UserProfile -Filter \"\"\"SID = '$((Get-LocalUser #{user_name}).Sid)'\"\"\").LocalPath\" 2>&1").lines[0].chomp
            return `$str(#{h.gsub('\\', '/')})` unless h.empty? || h.start_with?('Get-')
          end
        else
          # On macOS we need to check /etc/passwd, which contains some system internal users but not regular users
          # and the directory service, which contains regular users but not all system internal users.
          # We need to check /etc/passwd first, because otherwise there may be an error.
          if ::File.exist?('/etc/passwd')
            ::File.open('/etc/passwd', 'r') do |passwd_file|
              passwd_file.each_line do |entry|
                next if entry.start_with?('#')
                name_s, _passwd, _uid_s, _gid_s, _gecos, h, _shell = entry.split(':')
                return h if name_s == user_name
              end
            end
          end
          if `$platform.macos`
            if `!user_name.match(/[\.\/\\]/)`
              # Users may have multiple home directories registered in the directory service on macOS, take the first.
              h_lines = ::Kernel.send('`', "dscl . read /Users/#{user_name} NFSHomeDirectory 2>&1").lines
              info, h = h_lines[0].chomp.split(':')
              if `!info.match(/error/i)`
                # multiple directories may come in one line or in multiple lines, in any case, take the first
                h = h.sub(/^\s+/, '').sub(/\s$/, '')
                h, _ = h.split(' ') if h_lines.size == 1
                return `$str(h)`
              end
            end
          end
        end
        raise(::ArgumentError, "user #{user_name} not found")
      else
        h = ::ENV['HOME']
        if `$platform.windows`
          h ||= ENV['USERPROFILE']
          h = ENV['HOMEDRIVE'] + ENV['HOMEPATH'] if !h && ENV['HOMEDRIVE'] && ENV['HOMEPATH']
        end
        h ||= `$platform.dir_home ? $platform.dir_home() : '.'` || '.'
        h = h.gsub('\\', '/') if `$platform.windows`
        `$str(h)`
      end
    end

    if `$platform.mkdir`
      def mkdir(path, permissions = 0o775)
        # Creates a directory in the underlying file system at dirpath with the given permissions; returns zero.
        path = `$coerce_to_or_raise(path, Opal.String, "to_path")`
        permissions = `$coerce_to_or_raise(permissions, Opal.Integer, "to_int")`
        `$platform.mkdir(path.toString(), permissions)`
        0
      end
    else
      alias mkdir __not_implemented__
    end

    def open(dirpath, encoding: nil)
      dir = new(dirpath, encoding: encoding)
      return dir unless block_given?
      begin
        yield dir
      ensure
        dir.close
      end
    end

    alias pwd getwd

    alias rmdir delete

    alias unlink delete
  end

  %x{
    function check_open(io) {
      if (io.closed) #{raise IOError, 'closed stream'};
    }
  }

  if `$platform.dir_open`
    def initialize(dirpath, encoding: nil)
      # Returns a new Dir object for the directory at dirpath.
      dirpath = `$coerce_to_or_raise(dirpath, Opal.String, "to_path")`
      @fileno = `$platform.dir_open(dirpath.toString())`
      @closed = false
      @path = dirpath
      @pos = 0
      @encoding = if encoding && encoding.is_a?(::Encoding)
                    encoding
                  elsif encoding
                    ::Encoding.find(encoding)
                  elsif ::Encoding.default_internal != ::Encoding::UTF_8
                    ::Encoding.default_internal
                  end
    end
  else
    alias initialize __not_implemented__
  end

  if `$platform.chdir`
    def chdir
      # Changes the current working directory to self.
      `$platform.chdir(self.path.toString())`
    end
  else
    alias chdir __not_implemented__
  end

  def children
    # Returns an array of the entry names in self except for '.' and '..'.
    each_child.to_a
  end

  if `$platform.dir_close`
    def close
      # Closes the stream in self, if it is open, and returns nil; ignored if self is already closed.
      `$platform.dir_close(self.fileno)` unless @closed
      @closed = true
      nil
    end
  else
    alias close __not_implemented__
  end

  def each
    # Calls the block with each entry name in self.
    `check_open(self)`
    return enum_for :each unless block_given?
    while (name = read)
      yield name
    end
    self
  end

  def each_child
    # Calls the block with each entry name in self except '.' and '..'.
    `check_open(self)`
    return enum_for :each_child unless block_given?
    while (name = read)
      next if name == '.' || name == '..'
      yield name
    end
    self
  end

  # Returns the file descriptor used in dir.
  attr_reader :fileno

  def inspect
    # Returns a string description of self. Dir.new('example').inspect # => "#<Dir:example>"
    "#<#{self.class.name}:#{@path}>"
  end

  # Returns the dirpath string that was used to create self (or nil if created by method Dir.for_fd).
  attr_reader :path

  def pos
    # Returns the current position of self
    `check_open(self)`
    @pos
  end

  def pos=(position)
    # Sets the position in self and returns position.
    # The value of position should have been returned from an earlier call to tell;
    # if not, the return values from subsequent calls to read are unspecified.
    rewind
    while @pos < position
      break unless read
    end
    @pos
  end

  if `$platform.dir_next`
    def read
      # Reads and returns the next entry name from self; returns nil if at end-of-stream.
      `check_open(self)`
      @pos += 1
      res = `$platform.dir_next(self.fileno)`
      return nil unless res
      @encoding ? `$str(res, self.encoding)` : `res`
    end
  else
    alias read __not_implemented__
  end

  if `$platform.dir_rewind`
    def rewind
      # Sets the position in self to zero.
      `check_open(self)`
      `$platform.dir_rewind(self.fileno)`
      @pos = 0
      self
    end
  else
    alias rewind __not_implemented__
  end

  def seek(position)
    rewind
    while @pos < position
      break unless read
    end
    self
  end

  alias tell pos
  alias to_path path
end

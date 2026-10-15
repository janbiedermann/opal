# helpers: platform, truthy, str, is_star_star_slash, mbinc, mbclen, is_dirsep, coerce_to_or_raise, raise, glob_brace_expand, pop_exception, yield1
# backtick_javascript: true

class ::File < ::IO
  # for constants see corelib/file/constants

  windows_root_rx = %r{^[a-zA-Z]:(?:\\|\/)}

  %x{
    function check_writable(io) {
      if (io.closed === "write" || io.closed === "both" ) #{raise IOError, 'not opened for writing'};
    }

    function coerce_to_path(path) {
      if ($truthy(#{`path`.respond_to?(:to_path)})) path = path.$to_path();
      return $coerce_to_or_raise(path, Opal.String, "to_str");
    }

    // Return a RegExp compatible char class
    function $sep_chars() {
      if (#{ALT_SEPARATOR} === nil) {
        return Opal.escape_regexp(#{SEPARATOR});
      } else {
        return Opal.escape_regexp(#{SEPARATOR + ALT_SEPARATOR});
      }
    }

    function time_at_ms(ms) {
      let s = Math.floor(ms / 1000);
      return #{::Time.at(`s`, `ms - s * 1000`, :millisecond)};
    }

    // Calls File.stat(file_name).public_send(mid), returning fallback on Errno::ENOENT.
    function stat_pred(recv, file_name, mid, fallback) {
      try {
        return recv.$stat(file_name)['$' + mid]();
      } catch (e) {
        if (e && e.$$is_exception && e['$is_a?'](#{::Errno::ENOENT})) { $pop_exception(e); return fallback; }
        throw e;
      }
    }
  }

  class Stat
    include ::Comparable

    if `$platform.stat`
      def initialize(path, alt_stat = nil)
        # Create a File::Stat object for the given file name (raising an exception if the file doesn’t exist).
        # The alt_stat param is not official Ruby, but used internally for fstat/lstat.
        %x{
          if (alt_stat !== nil && alt_stat != null) {
            self.path = path; // may be nil
            self.stat = alt_stat;
          } else {
            self.path = coerce_to_path(path);
            self.stat = $platform.stat(self.path.toString());
          }
          if (self.stat === nil || self.stat == null) $raise(#{::Errno::ENOENT});
          return nil;
        }
      end

      def <=>(other)
        # Compares File::Stat objects by comparing their respective modification times.
        `self.$mtime()['$<=>'](other.$mtime())`
      end

      def atime
        # Returns the last access time for this file as an object of class Time.
        `time_at_ms(self.stat.atimeMs)`
      end

      def birthtime
        # Returns the birth time for stat.
        # If the platform doesn’t have birthtime, raises NotImplementedError.
        `time_at_ms(self.stat.birthtimeMs)`
      end

      def blksize
        # Returns the native file system’s block size.
        # Will return nil on platforms that don’t support this information.
        `self.stat.blksize != null ?  self.stat.blksize : nil`
      end

      def blockdev?
        # Returns true if the file is a block device, false if it isn’t or
        # if the operating system doesn’t support this feature.
        `self.stat.isBlockDevice()`
      end

      def blocks
        # Returns the number of native file system blocks allocated for this file,
        # or nil if the operating system doesn’t support this feature.
        `self.stat.blocks != null ?  self.stat.blocks : nil`
      end

      def chardev?
        # Returns true if the file is a character device, false if it isn’t or
        # if the operating system doesn’t support this feature.
        `self.stat.isCharacterDevice()`
      end

      def ctime
        # Returns the change time for stat (that is, the time directory information
        # about the file was changed, not the file itself).
        `time_at_ms(self.stat.ctimeMs)`
      end

      def dev
        # Returns an integer representing the device on which stat resides.
        `self.stat.dev != null ? self.stat.dev : nil`
      end

      def dev_major
        # Returns the major part of File_Stat#dev or nil.
        (((dev >> 8) & 0xfff) | ((dev >> 32) & ~0xfff)) if dev
      end

      def dev_minor
        # Returns the minor part of File_Stat#dev or nil.
        ((dev & 0xff) | ((dev >> 12) & ~0xff)) if dev
      end

      def directory?
        # Returns true if stat is a directory, false otherwise.
        `self.stat.isDirectory()`
      end

      def executable?
        # Returns true if stat is executable or if the operating system doesn’t
        # distinguish executable files from nonexecutable files.
        # The tests are made using the effective owner of the process.
        %x{
          let mode = self.$mode();
          return (self['$owned?']() && 0o100 === (mode & 0o100)) ||
            (self['$grpowned?']() && 0o10 === (mode & 0o10)) ||
            (0o1 === (mode & 0o1));
        }
      end

      def executable_real?
        # Same as executable?, but tests using the real owner of the process.
        %x{
          let uid = self.$uid(), gid = self.$gid(), mode = self.$mode();
          return (uid === #{::Process.uid} && 0o100 === (mode & 0o100)) ||
            (gid === #{::Process.gid} && 0o10 === (mode & 0o10)) ||
            (0o1 === (mode & 0o1));
        }
      end

      def file?
        # Returns true if stat is a regular file (not a device file, pipe, socket, etc.).
        `self.stat?.isFile()`
      end

      def ftype
        # Identifies the type of stat. The return string is one of:
        %x{
          if (self['$file?']()) return 'file';
          if (self['$symlink?']()) return 'link';
          if (self['$directory?']()) return 'directory';
          if (self['$chardev?']()) return 'characterSpecial';
          if (self['$blockdev?']()) return 'blockSpecial';
          if (self['$socket?']()) return 'socket';
          if (self['$pipe?']()) return 'fifo';
          return 'unknown';
        }
      end

      def gid
        # Returns the numeric group id of the owner of stat.
        `self.stat.gid != null ? self.stat.gid : -1`
      end

      def grpowned?
        # Returns true if the effective group id of the process is the same as
        # the group id of stat. On Windows, returns false.
        %x{
          let gid = self.$gid();
          if (gid === #{::Process.egid}) return true;
          return #{::Process}.$groups()['$include?'](gid);
        }
      end

      def ino
        # Returns the inode number for stat.
        `self.stat.ino != null ? self.stat.ino : nil`
      end

      def inspect
        # Produce a nicely formatted description of stat.
        "#<File::Stat dev=#{dev.to_s(16)}, ino=#{ino}, mode=#{mode.to_s(16)}," \
        " nlink=#{nlink}, uid=#{uid}, gid=#{gid}, rdev=#{rdev.to_s(16)}, size=#{size}, blksize=#{blksize}," \
        " blocks=#{blocks}, atime=#{atime}, mtime=#{mtime}, ctime=#{ctime}, birthtime=#{birthtime}"
      end

      def mode
        # Returns an integer representing the permission bits of stat.
        # The meaning of the bits is platform dependent.
        `self.stat.mode`
      end

      def mtime
        # Returns the modification time of stat.
        `time_at_ms(self.stat.mtimeMs)`
      end

      def nlink
        # Returns the number of hard links to stat.
        `self.stat.nlink != null ? self.stat.nlink : nil`
      end

      def owned?
        # Returns true if the effective user id of the process is the same as the owner of stat.
        `self.$uid() === #{::Process.euid}`
      end

      def pipe?
        # Returns true if the operating system supports pipes and stat is a pipe; false otherwise.
        `self.stat.isFIFO()`
      end

      def rdev
        # Returns an integer representing the device type on which stat resides.
        # Returns nil if the operating system doesn’t support this feature.
        `self.stat.rdev != null ? self.stat.rdev : nil`
      end

      def rdev_major
        # Returns the major part of File_Stat#rdev or nil
        (((rdev >> 8) & 0xfff) | ((rdev >> 32) & ~0xfff)) if rdev
      end

      def rdev_minor
        # Returns the minor part of File_Stat#rdev or nil.
        ((rdev & 0xff) | ((rdev >> 12) & ~0xff)) if rdev
      end

      def readable?
        # Returns true if stat is readable by the effective user id of this process.
        %x{
          let mode = self.$mode();
          return (self['$owned?']() && 0o400 === (mode & 0o400)) ||
            (self['$grpowned?']() && 0o40 === (mode & 0o40)) ||
            (0o4 === (mode & 0o4));
        }
      end

      def readable_real?
        # Returns true if stat is readable by the real user id of this process.
        %x{
          let uid = self.$uid(), gid = self.$gid(), mode = self.$mode();
          return (uid === #{::Process.uid} && 0o400 === (mode & 0o400)) ||
            (gid === #{::Process.gid} && 0o40 === (mode & 0o40)) ||
            (0o4 === (mode & 0o4));
        }
      end

      def setgid?
        # Returns true if stat has the set-group-id permission bit set, false if
        # it doesn’t or if the operating system doesn’t support this feature.
        `1024 === (self.$mode() & 0o2000)`
      end

      def setuid?
        # Returns true if stat has the set-user-id permission bit set, false if
        # it doesn’t or if the operating system doesn’t support this feature.
        `2048 === (self.$mode() & 0o4000)`
      end

      def size
        # Returns the size of stat in bytes.
        `self.stat.size`
      end

      def size?
        # Returns nil if stat is a zero-length file, the size of the file otherwise.
        `self['$zero?']() ? nil : self.$size()`
      end

      def socket?
        # Returns true if stat is a socket, false if it isn’t or
        # if the operating system doesn’t support this feature.
        `self.stat.isSocket()`
      end

      def sticky?
        # Returns true if stat has its sticky bit set, false if it doesn’t or
        # if the operating system doesn’t support this feature.
        `512 === (self.$mode() & 0o1000)`
      end

      def symlink?
        # Returns true if stat is a symbolic link, false if it isn’t
        # or if the operating system doesn’t support this feature.
        %x{
          try {
            return self.stat.isSymbolicLink();
          } catch (e) {
            if (!e || !e.$$is_exception) throw e;
            $pop_exception(e);
            return false;
          }
        }
      end

      def uid
        # Returns the numeric user id of the owner of stat.
        `self.stat.uid != null ? self.stat.uid : -1`
      end

      def world_readable?
        # If stat is readable by others, returns an integer representing the file permission bits of stat.
        # Returns nil otherwise.
        %x{
          let mode = self.$mode();
          return 4 === (mode & 0o4) ? (mode & 0o777) : nil;
        }
      end

      def world_writable?
        # If stat is writable by others, returns an integer representing the file permission bits of stat.
        # Returns nil otherwise.
        %x{
          let mode = self.$mode();
          return 2 === (mode & 0o2) ? (mode & 0o777) : nil;
        }
      end

      def writable?
        # Returns true if stat is writable by the effective user id of this process.
        %x{
          let mode = self.$mode();
          return (self['$owned?']() && 0o200 === (mode & 0o200)) ||
            (self['$grpowned?']() && 0o20 === (mode & 0o20)) ||
            (0o2 === (mode & 0o2));
        }
      end

      def writable_real?
        # Returns true if stat is writable by the real user id of this process.
        %x{
          let uid = self.$uid(), gid = self.$gid(), mode = self.$mode();
          return (uid === #{::Process.uid} && 0o200 === (mode & 0o200)) ||
            (gid === #{::Process.gid} && 0o20 === (mode & 0o20)) ||
            (0o2 === (mode & 0o2));
        }
      end

      def zero?
        `self.stat.size === 0`
      end
    else
      alias initialize __not_implemented__
      alias <=> __not_implemented__
      alias atime __not_implemented__
      alias birthtime __not_implemented__
      alias blksize __not_implemented__
      alias blockdev? __not_implemented__
      alias blocks __not_implemented__
      alias chardev? __not_implemented__
      alias ctime __not_implemented__
      alias dev __not_implemented__
      alias dev_major __not_implemented__
      alias dev_minor __not_implemented__
      alias directory? __not_implemented__
      alias executable? __not_implemented__
      alias executable_real? __not_implemented__
      alias file? __not_implemented__
      alias ftype __not_implemented__
      alias gid __not_implemented__
      alias grpowned? __not_implemented__
      alias ino __not_implemented__
      alias inspect __not_implemented__
      alias mode __not_implemented__
      alias mtime __not_implemented__
      alias nlink __not_implemented__
      alias owned? __not_implemented__
      alias pipe? __not_implemented__
      alias rdev __not_implemented__
      alias rdev_major __not_implemented__
      alias rdev_minor __not_implemented__
      alias readable? __not_implemented__
      alias readable_real? __not_implemented__
      alias setgid? __not_implemented__
      alias setuid? __not_implemented__
      alias size __not_implemented__
      alias size? __not_implemented__
      alias socket? __not_implemented__
      alias sticky? __not_implemented__
      alias symlink? __not_implemented__
      alias uid __not_implemented__
      alias world_readable? __not_implemented__
      alias world_writable? __not_implemented__
      alias writable? __not_implemented__
      alias writable_real? __not_implemented__
      alias zero? __not_implemented__
    end
  end

  class << self
    def absolute_path(path, basedir = nil)
      # Converts a pathname to an absolute pathname.
      path = `coerce_to_path(path)`
      basedir = `coerce_to_path(basedir)` if basedir
      `Opal.rb_file_expand_path_internal(path, basedir, true, true, '')`
    end

    def absolute_path?(path)
      # Returns true if file_name is an absolute path, and false otherwise.
      path = `coerce_to_path(path)`
      %x{
        if ($platform.windows) {
          if (Opal.has_drive_letter(path) && $is_dirsep(path[2])) return true;
          if ($is_dirsep(path[0]) && $is_dirsep(path[1])) return true;
        } else {
          if (path[0] == '/') return true;
        }
        return false;
      }
    end

    if `$platform.stat`
      # methods that require stat
      def atime(file_name)
        # Returns the last access time for the named file as a Time object.
        `self.$stat(file_name)['$atime']()`
      end

      def birthtime(file_name)
        # Returns the birth time for the named file. file_name can be an IO object.
        `self.$stat(file_name)['$birthtime']()`
      end

      def blockdev?(file_name)
        # Returns true if filepath points to a block device, false otherwise.
        `stat_pred(self, file_name, 'blockdev?', false)`
      end

      def chardev?(file_name)
        # Returns true if filepath points to a character device, false otherwise.
        `stat_pred(self, file_name, 'chardev?', false)`
      end

      def ctime(file_name)
        # Returns the change time for the named file (the time at which directory information about
        # the file was changed, not the file itself).
        `self.$stat(file_name)['$ctime']()`
      end

      def directory?(file_name)
        # With string object given, returns true if path is a string path leading to a directory,
        # or to a symbolic link to a directory; false otherwise.
        %x{
          try {
            if (file_name['$respond_to?']("to_io")) {
              let io = file_name.$to_io();
              file_name = io['$path']();
              if (file_name === nil || file_name === false) return io.$stat()['$directory?']();
            } else {
              file_name = coerce_to_path(file_name);
            }
            return self.$stat(file_name)['$directory?']();
          } catch (e) {
            if (e && e.$$is_exception && e['$is_a?'](#{::Errno::ENOENT})) { $pop_exception(e); return false; }
            throw e;
          }
        }
      end

      def empty?(file_name)
        # Returns true if the named file exists and has a zero size.
        `stat_pred(self, file_name, 'zero?', false)`
      end

      def executable?(file_name)
        # Returns true if the named file is executable by the effective user and group id of this process.
        `stat_pred(self, file_name, 'executable?', false)`
      end

      def executable_real?(file_name)
        # Returns true if the named file is executable by the real user and group id of this process.
        `stat_pred(self, file_name, 'executable_real?', false)`
      end

      def exist?(file_name)
        # Return true if the named file exists.
        %x{
          try {
            self.$stat(file_name);
            return true;
          } catch (e) {
            if (e && e.$$is_exception) {
              if (e['$is_a?'](Opal.TypeError)) throw e;
              $pop_exception(e);
              return false;
            }
            throw e;
          }
        }
      end

      def file?(file_name)
        # Returns true if the named file exists and is a regular file.
        # file can be an IO object.
        `stat_pred(self, file_name, 'file?', false)`
      end

      def grpowned?(file_name)
        # Returns true if the named file exists and the effective group id of
        # the calling process is the owner of the file.
        `stat_pred(self, file_name, 'grpowned?', false)`
      end

      def identical?(file1, file2)
        # Returns true if the named files are identical.
        %x{
          try {
            let stat1 = self.$stat(file1), stat2 = self.$stat(file2);
            if (stat1.$dev() !== stat2.$dev()) return false;
            if (stat1.$ino() !== stat2.$ino()) return false;
            return true;
          } catch (e) {
            if (e && e.$$is_exception && e['$is_a?'](#{::Errno::ENOENT})) { $pop_exception(e); return false; }
            throw e;
          }
        }
      end

      def mtime(file_name)
        # Returns the modification time for the named file as a Time object.
        `self.$stat(file_name)['$mtime']()`
      end

      def owned?(file_name)
        # Returns true if the named file exists and the effective used id
        # of the calling process is the owner of the file.
        `stat_pred(self, file_name, 'owned?', false)`
      end

      def pipe?(file_name)
        # Returns true if filepath points to a pipe, false otherwise.
        `stat_pred(self, file_name, 'pipe?', false)`
      end

      def readable?(file_name)
        # Returns true if the named file is readable by the effective user
        # and group id of this process.
        %x{
          try {
            file_name = coerce_to_path(file_name);
            return self.$stat(file_name)['$readable?']();
          } catch (e) {
            if (!e || !e.$$is_exception) throw e;
            $pop_exception(e);
            return false;
          }
        }
      end

      def readable_real?(file_name)
        # Returns true if the named file is readable by the real user
        # and group id of this process.
        %x{
          try {
            file_name = coerce_to_path(file_name);
            return self.$stat(file_name)['$readable_real?']();
          } catch (e) {
            if (!e || !e.$$is_exception) throw e;
            $pop_exception(e);
            return false;
          }
        }
      end

      def setgid?(file_name)
        # Returns true if the named file has the setgid bit set.
        `stat_pred(self, file_name, 'setgid?', false)`
      end

      def setuid?(file_name)
        # Returns true if the named file has the setuid bit set.
        `stat_pred(self, file_name, 'setuid?', false)`
      end

      def size(file_name)
        # Returns the size of file_name.
        %x{
          if (file_name['$respond_to?']("to_io")) file_name = file_name.$to_io()['$path']();
          else file_name = coerce_to_path(file_name);
          return self.$stat(file_name)['$size']();
        }
      end

      def size?(file_name)
        # Returns nil if file_name doesn’t exist or has zero size, the size of the file otherwise.
        %x{
          try {
            if (file_name['$respond_to?']("to_io")) file_name = file_name.$to_io()['$path']();
            else file_name = coerce_to_path(file_name);
            return self.$stat(file_name)['$size?']();
          } catch (e) {
            if (e && e.$$is_exception && e['$is_a?'](#{::Errno::ENOENT})) { $pop_exception(e); return nil; }
            throw e;
          }
        }
      end

      def socket?(file_name)
        # Returns true if filepath points to a socket, false otherwise.
        `stat_pred(self, file_name, 'socket?', false)`
      end

      def stat(path)
        # Returns a File::Stat object for the file at filepath (see File::Stat)
        `#{Stat}.$new(path)`
      end

      def sticky?(file_name)
        # Returns true if the named file has the sticky bit set.
        `stat_pred(self, file_name, 'sticky?', false)`
      end

      def world_readable?(file_name)
        # If file_name is readable by others, returns an integer representing the file permission bits of file_name.
        # Returns nil otherwise.
        `stat_pred(self, file_name, 'world_readable?', nil)`
      end

      def world_writable?(file_name)
        # If stat is writable by others, returns an integer representing the file permission bits of stat.
        # Returns nil otherwise.
        `stat_pred(self, file_name, 'world_writable?', nil)`
      end

      def writable?(file_name)
        # Returns true if the named file is writable by the effective user and group id of this process.
        `stat_pred(self, file_name, 'writable?', false)`
      end

      def writable_real?(file_name)
        # Returns true if the named file is writable by the real user and group id of this process.
        `stat_pred(self, file_name, 'writable_real?', false)`
      end
    else
      alias atime __not_implemented__
      alias birthtime __not_implemented__
      alias blockdev? __not_implemented__
      alias chardev? __not_implemented__
      alias ctime __not_implemented__
      alias directory? __not_implemented__
      alias empty? __not_implemented__
      alias executable? __not_implemented__
      alias executable_real? __not_implemented__
      alias exist? __not_implemented__
      alias file? __not_implemented__
      alias grpowned? __not_implemented__
      alias identical? __not_implemented__
      alias mtime __not_implemented__
      alias owned? __not_implemented__
      alias pipe? __not_implemented__
      alias readable? __not_implemented__
      alias readable_real? __not_implemented__
      alias setgid? __not_implemented__
      alias setuid? __not_implemented__
      alias size __not_implemented__
      alias size? __not_implemented__
      alias socket? __not_implemented__
      alias stat __not_implemented__
      alias sticky? __not_implemented__
      alias world_readable? __not_implemented__
      alias world_writable? __not_implemented__
      alias writable? __not_implemented__
      alias writable_real? __not_implemented__
    end

    def basename(name, suffix = nil)
      # Returns the last component of the filename given in file_name
      # (after first stripping trailing separators), which can be formed
      # using both File::SEPARATOR and File::ALT_SEPARATOR as the separator
      # when File::ALT_SEPARATOR is not nil. If suffix is given and present
      # at the end of file_name, it is removed.
      # If suffix is “.*”, any extension will be removed.
      sep_chars = `$sep_chars()`
      name = `coerce_to_path(name)`
      suffix = `$coerce_to_or_raise(suffix, Opal.String, "to_str")` if suffix
      enc = name.encoding
      %x{
        if (name.length == 0) return $str('', enc);

        if (suffix === nil) suffix = null;

        if ($platform.windows) name = name.replace(/^[a-zA-Z]:/, '');

        name = name.replace(new RegExp(#{"(.)[#{sep_chars}]*$"}), '$1');
        name = name.replace(new RegExp(#{"^(?:.*[#{sep_chars}])?([^#{sep_chars}]+)$"}), '$1');

        if (suffix === ".*") {
          name = name.replace(/\.[^\.]+$/, '');
        } else if(suffix !== null) {
          suffix = Opal.escape_regexp(suffix);
          name = name.replace(new RegExp(#{"#{suffix}$"}), '');
        }

        return $str(name, enc);
      }
    end

    if `$platform.chmod`
      def chmod(mode_int, *file_names)
        # Changes permission bits on the named file(s) to the bit pattern represented by mode_int.
        %x{
          if (!Number.isInteger(mode_int)) mode_int = $coerce_to_or_raise(mode_int, Opal.Integer, "to_int");
          if (mode_int < 0 || mode_int > 4294967295) $raise(Opal.RangeError, 'mode_int out of range');
          for (let file_name of file_names) {
            file_name = coerce_to_path(file_name);
            $platform.chmod(file_name.toString(), mode_int);
          }
          return file_names.length;
        }
      end
    else
      alias chmod __not_implemented__
    end

    if `$platform.stat && $platform.chown`
      def chown(owner_int, group_int, *file_names)
        # Changes the owner and group of the named file(s) to the given numeric owner and group id’s.
        %x{
          if (owner_int !== nil && owner_int !== false) owner_int = $coerce_to_or_raise(owner_int, Opal.Integer, "to_int");
          if (group_int !== nil && group_int !== false) group_int = $coerce_to_or_raise(group_int, Opal.Integer, "to_int");
          if (owner_int !== nil && owner_int < 0) owner_int = nil;
          if (group_int !== nil && group_int < 0) group_int = nil;
          for (let file_name of file_names) {
            file_name = coerce_to_path(file_name);
            let oi, gi;
            if (owner_int === nil || group_int === nil) {
              let s = self.$stat(file_name);
              oi = owner_int !== nil ? owner_int : s.$uid();
              gi = group_int !== nil ? group_int : s.$gid();
            } else {
              oi = owner_int;
              gi = group_int;
            }
            $platform.chown(file_name.toString(), oi, gi);
          }
          return file_names.length;
        }
      end
    else
      alias chown __not_implemented__
    end

    if `$platform.unlink`
      def delete(*file_names)
        # Deletes the named files, returning the number of names passed as arguments.
        %x{
          for (let file_name of file_names) {
            file_name = coerce_to_path(file_name);
            $platform.unlink(file_name.toString());
          }
          return file_names.length;
        }
      end
    else
      alias delete __not_implemented__
    end

    def dirname(file_name, level = nil)
      # Returns all components of the filename given in file_name except the last one
      # (after first stripping trailing separators).
      level = `$coerce_to_or_raise(level, Opal.Integer, "to_int")` if level
      level ||= 1
      ::Kernel.raise(::ArgumentError, "negative level: #{level}") if level < 0
      file_name = `coerce_to_path(file_name)`
      enc = file_name.encoding
      %x{
        let d = file_name.length, n = 0;
        let root = Opal.skiproot(file_name, d);
        if ($platform.windows) {
          if (root > 1 && $is_dirsep(file_name[n])) {
            n = root - 2;
            root = Opal.skipprefix(file_name, n);
          }
        } else if (root > 1) {
          n = root - 1;
        }
        let pi;
        if (level > Math.floor((d - root + 1) / 2)) {
          pi = root;
        } else if (level === 0) {
          pi = d;
        } else if (level === 1) {
          pi = Opal.strrdirsep(file_name, d);
          if (pi === nil || pi === 0) pi = root;
        } else {
          let i = 0, seps = [];
          while (i < level) { seps[i] = root; i++; }
          i = 0; pi = root;
          while (pi < d) {
            if ($is_dirsep(file_name[pi])) {
              let tmp = pi;
              pi++;
              while (pi < d && $is_dirsep(file_name[pi])) pi++;
              if (pi >= d) break;
              seps[i] = tmp; i++;
              if (i === level) i = 0;
            } else {
              pi = $mbinc(file_name, pi);
            }
          }
          pi = seps[i];
        }
        if (pi === n) return '.';
        let dirname;
        if ($platform.windows) {
          if (Opal.has_drive_letter(n > 0 ? file_name.slice(n) : file_name) && $is_dirsep(file_name[n + 2])) {
            let top = Opal.skiproot(file_name.slice(2), d) + 2;
            dirname = file_name.slice(n, n + 3);
            dirname += file_name.slice(top, pi);
          } else {
            dirname = file_name.slice(n, pi);
          }
        } else {
          dirname = file_name.slice(n, pi);
        }
        if ($platform.windows && Opal.has_drive_letter(file_name.slice(n)) && root === (n + 2) && (pi - n) === 2) {
          dirname += '.';
        }
        return $str(dirname, enc);
      }
    end

    def expand_path(path, basedir = nil)
      # Converts a pathname to an absolute pathname. Relative paths are referenced from the current
      # working directory of the process unless dir_string is given, in which case it will be used
      # as the starting point. The given pathname may start with a “~”, which expands to the process
      # owner’s home directory (the environment variable HOME must be set correctly).
      # “~user” expands to the named user’s home directory.
      path = `coerce_to_path(path)`
      basedir = `coerce_to_path(basedir)` if basedir
      `Opal.rb_file_expand_path_internal(path, basedir, false, true, '')`
    end

    def extname(path)
      # Returns the extension (the portion of file name in path starting from the last period).
      %x{
        path = coerce_to_path(path);
        let filename = self.$basename(path);
        if (filename.length === 0) return $str('');
        let last_dot_idx = filename['$rindex']('.');
        if (last_dot_idx === nil) return $str('');
        // a leading run of dots is not an extension ("..", ".bashrc")
        let run_start = last_dot_idx;
        while (run_start > 0 && filename[run_start - 1] == '.') run_start--;
        if (run_start === 0) return $str('');
        return $str(filename.slice(last_dot_idx));
      }
    end

    %x{
      function e_peek(et) {
        try { return et.$peek(); } catch { return nil; }
      }
      function e_next(et, cnt) {
        try {
          let ch, i = 0;
          while (cnt > i++) { ch = et.$next(); }
          return ch;
        } catch {
          return nil;
        }
      }
      function is_end(pathname, str, idx) {
        return !str[idx] || (pathname && str[idx] == '/');
      }
      function mbeql(str1, idx1, str2, idx2, len) {
        if (str1[idx1] != str2[idx2]) return false;
        if (len == 2 && str1[idx1+1] && str2[idx2+1] && str1[idx1+1] != str2[idx2+1]) return false;
        return true;
      }
      function unescape(escape, str, idx) {
        return (escape && str[idx] == '\\') ? idx + 1 : idx;
      }
    }

    def fnmatch(pattern, string, flags = 0)
      # Returns true if path matches against pattern. The pattern is not a regular expression;
      # instead it follows rules similar to shell filename globbing.

      # This is a straightforward port from ruby/dir.c, kinda sort of.

      pattern = `$coerce_to_or_raise(pattern, Opal.String, "to_str")`
      string = `coerce_to_path(string)`
      flags = `$coerce_to_or_raise(flags, Opal.Integer, "to_int")`
      %x{
        let period = (flags & #{::File::FNM_DOTMATCH}) !== #{::File::FNM_DOTMATCH},
            pathname = (flags & #{::File::FNM_PATHNAME}) === #{::File::FNM_PATHNAME},
            extglob = (flags & #{::File::FNM_EXTGLOB}) === #{::File::FNM_EXTGLOB},
            escape = (flags & #{::File::FNM_NOESCAPE}) !== #{::File::FNM_NOESCAPE};
        let p = 0, s = 0;

        function fnmatch_helper(pat) {
          let nocase = (flags & #{::File::FNM_CASEFOLD}) === #{::File::FNM_CASEFOLD};

          // Just like in ruby/dir.c.
          // And because its only used by fnmatch_helper, its embedded in it here.
          function bracket(pi) {
            if (!pat[pi]) return nil;
            let r1 = 0, r2 = 0, ok = false, noot = false;
            if (pat[pi] == '!' || pat[pi] == '^') {
              noot = true;
              pi++;
            }
            while (pat[pi] != ']') {
              let t1 = pi;
              if (escape && pat[t1] == '\\') t1++;
              if (!pat[t1]) return nil;
              pi = t1 + (r1 = $mbclen(pat, t1));
              if (pi >= pat.length) return nil;
              if (pat[pi] == '-' && pat[pi+1] != ']') {
                let t2 = pi + 1;
                if (escape && pat[t2] == '\\') t2++;
                if (!pat[t2]) return nil;
                pi = t2 + (r2 = $mbclen(pat, t2));
                if (ok) continue;
                if (mbeql(pat, t1, string, s, r1) || mbeql(pat, t2, string, s, r2)) {
                  ok = true;
                  continue;
                }
                let c1 = string.codePointAt(s), c2 = pat.codePointAt(t1);
                if (nocase) {
                  c1 = String.fromCodePoint(c1).toUpperCase().codePointAt(0);
                  c2 = String.fromCodePoint(c2).toUpperCase().codePointAt(0);
                }
                if (c1 < c2) continue;
                c2 = pat.codePointAt(t2);
                if (nocase) c2 = String.fromCodePoint(c2).toUpperCase().codePointAt(0);
                if (c1 > c2) continue;
              } else {
                if (ok) continue;
                if (mbeql(pat, t1, string, s, r1)) {
                  ok = true;
                  continue;
                }
                if (nocase) {
                  let c1 = String.fromCodePoint(string.codePointAt(s)).toUpperCase().codePointAt(0),
                      c2 = String.fromCodePoint(pat.codePointAt(p)).toUpperCase().codePointAt(0);
                  if (c1 != c2) continue;
                } else {
                  continue;
                }
              }
              ok = true;
            }
            return ok == noot ? nil : pi + 1;
          }

          let ptmp = nil, stmp = nil, r = nil;

          if (period && string[s] == '.' && pat[unescape(escape, pat, p)] != '.') return false;

          function failed() {
            if (ptmp !== nil && stmp !== nil) {
              p = ptmp;
              stmp = $mbinc(string, stmp);
              s = stmp;
              return false;
            }
            return true;
          }

          while (true) {
            if (pat[p]) {
              let ch = pat[p];
              if (ch === '*') {
                p++;
                while (pat[p] == '*') p++;
                if (is_end(pathname, pat, unescape(escape, pat, p))) {
                  p = unescape(escape, pat, p);
                  return true;
                }
                if (is_end(pathname, string, s)) return false;
                ptmp = p;
                stmp = s;
                continue;
              } else if (ch === '?') {
                if (is_end(pathname, string, s)) return false;
                p++;
                s = $mbinc(string, s);
                continue;
              } else if (ch === '[') {
                if (is_end(pathname, string, s)) return false;
                let t = bracket(p + 1);
                if (t !== nil) {
                  p = t;
                  s = $mbinc(string, s);
                  continue;
                }
                if (failed()) return false;
                continue;
              }
            }

            p = unescape(escape, pat, p);
            if (is_end(pathname, string, s)) return is_end(pathname, pat, p) ? true : false;
            if (is_end(pathname, pat, p)) {
              if (failed()) return false;
              continue;
            }
            r = $mbclen(pat, p);
            if (r === 0) {
              if (failed()) return false;
              continue;
            }
            if (mbeql(pat, p, string, s, r)) {
              p += r;
              s += r;
              continue;
            }
            if (!nocase) {
              if (failed()) return false;
              continue;
            }
            let c1 = String.fromCodePoint(string.codePointAt(s)).toUpperCase().codePointAt(0),
                c2 = String.fromCodePoint(pat.codePointAt(p)).toUpperCase().codePointAt(0);
            if (c1 != c2) {
              if (failed()) return false;
              continue;
            }
            p += r;
            s = $mbinc(string, s);
          }
        }

        // In ruby/dir.c this would be the fnmatch() function.
        function fnmatch_internal(pat, _arg) {
          let ptmp = nil, stmp = nil;

          if (pathname) {
            while (true) {
              if ($is_star_star_slash(pat, p)) {
                p += 3;
                while ($is_star_star_slash(pat, p)) p += 3;
                ptmp = p;
                stmp = s;
              }
              if (fnmatch_helper(pat)) {
                let sc;
                while ((sc = string[s]) && sc != '/') s = $mbinc(string, s);
                if (pat[p] && string[s]) {
                  p++;
                  s++;
                  continue;
                }
                if (!pat[p] && !string[s]) return true;
              }
              if (ptmp !== nil && stmp !== nil && !(period && string[stmp] == '.')) {
                let sc;
                while ((sc = string[stmp]) && sc != '/') stmp = $mbinc(string, stmp);
                if (string[stmp]) {
                  p = ptmp;
                  stmp++;
                  s = stmp;
                  continue;
                }
              }
              return false;
            }
          }
          return fnmatch_helper(pat);
        }

        if (extglob) {
          return $glob_brace_expand(pattern, fnmatch_internal, escape, nil);
        } else {
          return fnmatch_internal(pattern, nil);
        }
      }
    end

    alias fnmatch? fnmatch

    if `$platform.lstat`
      # methods requiring lstat
      def ftype(file_name)
        # Identifies the type of the named file.
        `self.$lstat(file_name)['$ftype']()`
      end

      def lstat(file_name)
        # Like File::stat, but does not follow the last symbolic link;
        # instead, returns a File::Stat object for the link itself.
        %x{
          file_name = coerce_to_path(file_name);
          return #{Stat}.$new(file_name, $platform.lstat(file_name.toString()));
        }
      end

      def symlink?(file_name)
        # Returns true if filepath points to a symbolic link, false otherwise.
        %x{
          try {
            return self.$lstat(file_name)['$symlink?']();
          } catch (e) {
            if (!e || !e.$$is_exception) throw e;
            $pop_exception(e);
            return false;
          }
        }
      end
    else
      alias ftype __not_implemented__
      alias lstat __not_implemented__
      alias symlink? __not_implemented__
    end

    def join(*paths)
      # Returns a new string formed by joining the strings using "/".
      %x{
        if (paths.length === 0) return '';
        let enc = nil, sep = #{SEPARATOR};
        paths = paths.$flatten();
        for (let i = 0; i < paths.length; i++) {
          let path = coerce_to_path(paths[i]);
          if (path.indexOf('\x00') !== -1) $raise(Opal.ArgumentError, 'string contains null byte');
          if (enc === nil) enc = path.encoding;
          if (#{ALT_SEPARATOR} !== nil) { // Windows
            if (sep === #{SEPARATOR} && path.indexOf(#{ALT_SEPARATOR}) !== -1) {
              sep = #{ALT_SEPARATOR};
            } else if (path.indexOf(#{SEPARATOR}) !== -1) {
              sep = #{SEPARATOR};
            }
          }
          paths[i] = path;
        }
        if (#{ALT_SEPARATOR} !== nil) { // Windows
          if (sep === #{ALT_SEPARATOR}) {
            // Oh my ...
            for (let i = 0; i < paths.length; i++) {
              paths[i] = paths[i].replace(/\/+$/, '\\').replace(/^(\w:)\//, '$1\\').replace(/^\/\//, '\\\\').replace(/^\//, '\\');
            }
          } else {
            // Sigh ...
            for (let i = 0; i < paths.length; i++) {
              paths[i] = paths[i].replace(/\\+$/, '/').replace(/^(\w:)\\/, '$1/').replace(/^\\\\/, '//').replace(/^\\/, '/');
            }
          }
        }
        let result = $str('', enc);
        let sep_rx = new RegExp(Opal.escape_regexp(sep) + '+$');
        for (let i = 0; i < paths.length; i++) {
          let item = paths[i];
          if (item.endsWith(sep)) item = item.replace(sep_rx, '/');
          if (i !== 0) {
            if (result.endsWith(sep)) {
              if (item.startsWith(sep)) item = item.slice(1);
            } else if (!item.startsWith(sep)) {
              result += '/';
            }
          }
          result += item;
        }
        return result;
      }
    end

    if `$platform.lchmod`
      def lchmod(mode_int, *file_names)
        # Equivalent to File::chmod, but does not follow symbolic links
        # (so it will change the permissions associated with the link,
        # not the file referenced by the link).
        %x{
          if (!Number.isInteger(mode_int)) mode_int = $coerce_to_or_raise(mode_int, Opal.Integer, "to_int");
          if (mode_int < 0 || mode_int > 4294967295) $raise(Opal.RangeError, 'mode_int out of range');
          for (let file_name of file_names) {
            file_name = coerce_to_path(file_name);
            $platform.lchmod(file_name.toString(), mode_int);
          }
          return file_names.length;
        }
      end
    else
      alias lchmod __not_implemented__
    end

    if `$platform.stat && $platform.file_lchown`
      def lchown(owner_int, group_int, *file_names)
        # Equivalent to File::chown, but does not follow symbolic links
        # (so it will change the owner associated with the link,
        # not the file referenced by the link).
        %x{
          if (owner_int !== nil && owner_int !== false) owner_int = $coerce_to_or_raise(owner_int, Opal.Integer, "to_int");
          if (group_int !== nil && group_int !== false) group_int = $coerce_to_or_raise(group_int, Opal.Integer, "to_int");
          for (let file_name of file_names) {
            file_name = coerce_to_path(file_name);
            let oi, gi;
            if (owner_int === nil || group_int === nil) {
              let s = self.$stat(file_name);
              oi = owner_int !== nil ? owner_int : s.$uid();
              gi = group_int !== nil ? group_int : s.$gid();
            } else {
              oi = owner_int;
              gi = group_int;
            }
            $platform.file_lchown(file_name, oi, gi);
          }
          return file_names.length;
        }
      end
    else
      alias lchown __not_implemented__
    end

    if `$platform.link`
      def link(path, new_path)
        # Creates a new name for an existing file using a hard link.
        # Will not overwrite new_name if it already exists
        # (raising a subclass of SystemCallError).
        %x{
          path = coerce_to_path(path);
          new_path = coerce_to_path(new_path);
          $platform.link(path.toString(), new_path.toString());
          return 0;
        }
      end
    else
      alias link __not_implemented__
    end

    if `$platform.file_lutime`
      def lutime(atime, mtime, *file_names)
        # Sets the access and modification times of each named file to the first two arguments.
        # If a file is a symlink, this method acts upon the link itself as opposed to its referent
        %x{
          for (let file_name of file_names) {
            file_name = coerce_to_path(file_name);
            $platform.file_lutime(file_name.toString(), atime, mtime);
          }
          return file_names.length;
        }
      end
    else
      alias lutime __not_implemented__
    end

    if `$platform.file_mkfifo`
      def mkfifo(file_name, mode = nil)
        # Creates a FIFO special file with name file_name. mode specifies the FIFO’s permissions.
        # It is modified by the process’s umask in the usual way: the permissions of the
        # created file are (mode & ~umask).
        %x{
          file_name = coerce_to_path(file_name);
          if (mode === nil || mode === false) mode = 0o666 & ~self.$umask();
          let status = $platform.file_mkfifo(file_name.toString(), mode);
          if (status === 1) $raise(#{::Errno::ENOENT}, "No such file or directory " + file_name);
          return 0;
        }
      end
    else
      alias mkfifo __not_implemented__
    end

    def open(path, mode = nil, perm = 0o666, **opts, &block)
      # Creates a new File object, via File.new with the given arguments.
      %x{
        function close_ignoring_closed(file) {
          try {
            file.$close();
          } catch (e) {
            if (!(e && e.$$is_exception && e['$is_a?'](Opal.IOError) && e.$message() === 'closed stream')) throw e;
            $pop_exception(e);
          }
        }
        let file = self.$new(path, mode, perm, opts);
        if (block === nil) return file;
        try {
          return $yield1(block, file);
        } finally {
          close_ignoring_closed(file);
        }
      }
    end

    def path(path)
      # Returns the string representation of the path
      `coerce_to_path(path)`
    end

    if `$platform.readlink`
      def readlink(link_name)
        # Returns the name of the file referenced by the given link.
        # Not available on all platforms.
        link_name = `coerce_to_path(link_name)`
        `$platform.readlink(link_name.toString())`
      end
    else
      alias readlink __not_implemented__
    end

    if `$platform.file_realpath`
      def realdirpath(pathname, dir_string = nil)
        # Returns the real (absolute) pathname of pathname in the actual filesystem.
        # The real pathname doesn’t contain symlinks or useless dots.
        %x{
          pathname = coerce_to_path(pathname);
          if (dir_string !== nil && dir_string !== false) pathname = self.$join(dir_string, pathname);
          try {
            return $platform.file_realpath(pathname.toString(), #{::File::SEPARATOR}.toString());
          } catch (e) {
            if (!(e && e.$$is_exception && e['$is_a?'](#{::Errno::ENOENT}))) throw e;
            $pop_exception(e);
            if (self['$symlink?'](pathname)) pathname = self.$readlink(pathname);
            let parts = self.$split(pathname);
            let dirname = parts[0], file = parts[1];
            // may correctly raise ENOENT again
            dirname = $platform.file_realpath(dirname.toString(), #{::File::SEPARATOR}.toString());
            return self.$join(dirname, file);
          }
        }
      end

      def realpath(pathname, dir_string = nil)
        # Returns the real (absolute) pathname of pathname in the actual filesystem
        # not containing symlinks or useless dots. If dir_string is given, it is used
        # as a base directory for interpreting relative pathname instead of the current directory.
        # All components of the pathname must exist when this method is called.
        %x{
          pathname = coerce_to_path(pathname);
          if (dir_string !== nil && dir_string !== false) pathname = self.$join(dir_string, pathname);
          return $platform.file_realpath(pathname.toString(), #{::File::SEPARATOR}.toString());
        }
      end
    else
      alias realdirpath __not_implemented__
      alias realpath __not_implemented__
    end

    if `$platform.rename`
      def rename(old_name, new_name)
        # Renames the given file to the new name. Raises a SystemCallError if the file cannot be renamed.
        old_name = `$coerce_to_or_raise(old_name, Opal.String, "to_str")`
        new_name = `$coerce_to_or_raise(new_name, Opal.String, "to_str")`
        `$platform.rename(old_name.toString(), new_name.toString())`
        0
      end
    else
      alias rename __not_implemented__
    end

    def split(path)
      # Splits the given string into a directory and a file component and returns them in a two-element array.
      %x{
        path = coerce_to_path(path);
        if (path.length === 0) return ['.', ''];
        let parts, sep;
        if (path.indexOf(#{SEPARATOR}) !== -1) {
          parts = path.split(#{SEPARATOR}); sep = #{SEPARATOR};
        } else if (#{ALT_SEPARATOR} !== nil && path.indexOf(#{ALT_SEPARATOR}) !== -1) {
          parts = path.split(#{ALT_SEPARATOR}); sep = #{ALT_SEPARATOR};
        } else {
          return ['.', path];
        }
        // Ruby's String#split discards trailing empty fields
        while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
        let file = parts.pop();
        return [parts.join(sep), file];
      }
    end

    if `$platform.symlink`
      def symlink(path, new_path)
        # Creates a symbolic link called new_name for the existing file old_name.
        %x{
          path = coerce_to_path(path);
          new_path = coerce_to_path(new_path);
          $platform.symlink(path.toString(), new_path.toString());
          return 0;
        }
      end
    else
      alias symlink __not_implemented__
    end

    if `$platform.truncate`
      def truncate(file_name, integer)
        # Truncates the file file_name to be at most integer bytes long.
        %x{
          file_name = coerce_to_path(file_name);
          integer = $coerce_to_or_raise(integer, Opal.Integer, "to_int");
          if (integer < 0) $raise(#{::Errno::EINVAL}, 'integer must be >= 0');
          $platform.truncate(file_name.toString(), integer);
          return 0;
        }
      end
    else
      alias truncate __not_implemented__
    end

    if `$platform.umask`
      def umask(integer = nil)
        # Returns the current umask value for this process. If the optional argument is given,
        # set the umask to that value and return the previous value.
        %x{
          if (integer !== nil && integer !== false) {
            integer = $coerce_to_or_raise(integer, Opal.Integer, "to_int");
            if (integer < 0 || integer > 4294967295) {
              $raise(Opal.RangeError,
                "The value of \"mask\" is out of range. It must be >= 0 && <= 4294967295. Received " + integer);
            }
            return $platform.umask(integer);
          } else {
            let u = $platform.umask(0);
            $platform.umask(u);
            return u;
          }
        }
      end
    else
      alias umask __not_implemented__
    end

    alias unlink delete

    if `$platform.file_utime`
      def utime(atime, mtime, *file_names)
        # Sets the access and modification times of each named file to the first two arguments.
        # If a file is a symlink, this method acts upon its referent rather than the link itself.
        %x{
          if (atime === nil || mtime === nil) {
            let t = #{::Time}.$now();
            if (atime === nil) atime = t;
            if (mtime === nil) mtime = t;
          }
          for (let file_name of file_names) {
            if (!file_name.$$is_string) file_name = $coerce_to_or_raise(file_name, Opal.String, "to_path");
            $platform.file_utime(file_name.toString(), atime, mtime);
          }
          return file_names.length;
        }
      end
    else
      alias utime __not_implemented__
    end

    alias zero? empty?
  end

  def initialize(path, mode = nil, perm = nil, **opts)
    # Opens the file at the given path according to the given mode;
    # creates and returns a new File object for that file.
    %x{
      if (mode.$$is_hash) { opts = mode; mode = nil; }

      let ag_mode = mode;
      mode = nil;
      let flags = 0;
      let ext_enc = nil, int_enc = nil;

      let ms = [ag_mode, opts['$[]']("mode")];
      for (const m0 of ms) {
        let m = m0;
        if (m !== nil && m !== false) {
          if (mode !== nil) $raise(Opal.ArgumentError, 'mode given multiple times');
          try {
            m = $coerce_to_or_raise(m, Opal.String, "to_str");
          } catch (e) {
            if (!e || !e.$$is_exception) throw e;
            $pop_exception(e);
          }
          if (m.$$is_string) {
            if (m.indexOf(':') !== -1) {
              let parts = m.$split(':');
              m = parts[0];
              ext_enc = parts.length > 1 ? parts[1] : nil;
              int_enc = parts.length > 2 ? parts[2] : nil;
            }
            if (m.length === 0) $raise(Opal.ArgumentError, 'mode is a empty string');
            if (!(/^[w][bt]{0,1}x{0,1}[+]{0,1}$/.test(m)) && !(/^[ra]([bt]{0,1}[+]{0,1}|[+]{0,1}[bt]{0,1})$/.test(m))) {
              $raise(Opal.ArgumentError, "invalid access mode " + m);
            }
            flags |= Opal.mode_to_flags(m);
            mode = m;
          } else {
            flags |= $coerce_to_or_raise(m, Opal.Integer, "to_int");
          }
        }
      }

      if (opts['$key?']("flags")) flags |= $coerce_to_or_raise(opts['$[]']("flags"), Opal.Integer, "to_int");
      if ($platform.windows && flags === #{::File::TRUNC}) $raise(#{::Errno::EINVAL}, 'Invalid argument');
      opts['$[]=']("flags", flags);
      opts['$[]=']("mode", mode);
      if (ext_enc !== nil) opts['$[]=']("external_encoding", ext_enc);
      if (int_enc !== nil) opts['$[]=']("internal_encoding", int_enc);

      let fd;
      if (!path.$$is_number) {
        if (!$platform.io_open_path) $platform.not_implemented("opening files by path");
        path = coerce_to_path(path);
        opts['$[]=']("path", path);
        if (perm === nil || perm === false) perm = 0o666;
        try {
          fd = $platform.io_open_path(path.toString(), flags, perm);
        } catch (e) {
          if (e && e.$$is_exception && e['$is_a?'](#{::Errno::EPERM})) $raise(#{::Errno::EACCES});
          throw e;
        }
      } else {
        fd = path;
      }
      return #{::IO}.$$prototype['$initialize'].apply(self, [fd, nil, opts]);
    }
  end

  def atime
    # Returns the last access time (a Time object) for file, or epoch if file has not been accessed.
    `self.$stat()['$atime']()`
  end

  def birthtime
    # Returns the birth time for file.
    `self.$stat()['$birthtime']()`
  end

  if `$platform.fchmod`
    def chmod(mode_int)
      # Changes permission bits on file to the bit pattern represented by mode_int.
      %x{
        mode_int = $coerce_to_or_raise(mode_int, Opal.Integer, "to_int");
        if (mode_int < 0 || mode_int > 4294967295) $raise(Opal.RangeError, 'mode_int out of range');
        $platform.fchmod(self.fd, mode_int);
        return 0;
      }
    end
  else
    alias chmod __not_implemented__
  end

  if `$platform.fchown`
    def chown(owner_int, group_int)
      # Changes the owner and group of file to the given numeric owner and group id’s.
      # Only a process with superuser privileges may change the owner of a file.
      # The current owner of a file may change the file’s group to any group to which the owner belongs.
      # A nil or -1 owner or group id is ignored. Follows symbolic links.
      %x{
        if (owner_int !== nil && owner_int !== false) owner_int = $coerce_to_or_raise(owner_int, Opal.Integer, "to_int");
        if (group_int !== nil && group_int !== false) group_int = $coerce_to_or_raise(group_int, Opal.Integer, "to_int");
        if (owner_int !== nil && owner_int < 0) owner_int = nil;
        if (group_int !== nil && group_int < 0) group_int = nil;
        if (owner_int === nil || group_int === nil) {
          let s = self.$stat();
          if (owner_int === nil) owner_int = s['$uid']();
          if (group_int === nil) group_int = s['$gid']();
        }
        $platform.fchown(self.fd, owner_int, group_int);
        return 0;
      }
    end
  else
    alias chown __not_implemented__
  end

  def ctime
    # Returns the change time for file (that is,
    # the time directory information about the file was changed, not the file itself).
    `self.$stat()['$ctime']()`
  end

  if `$platform.flock`
    def flock(locking_constant)
      # Locks or unlocks file self according to the given locking_constant,
      # a bitwise OR of the values in the table below.
      `$platform.flock(self.fs, locking_constant)`
    end
  else
    alias flock __not_implemented__
  end

  if `$platform.lstat`
    def lstat
      # Like File#stat, but does not follow the last symbolic link; instead,
      # returns a File::Stat object for the link itself
      `self.$$class.$lstat(self.path)`
    end
  else
    alias lstat __not_implemented__
  end

  def mtime
    # Returns the modification time for file.
    `self.$stat()['$mtime']()`
  end

  def size
    # Returns the size of file in bytes.
    `self.$stat()['$size']()`
  end

  if `$platform.ftruncate`
    def truncate(integer)
      # Truncates file to at most integer bytes. The file must be opened for writing.
      %x{
        check_writable(self);
        integer = $coerce_to_or_raise(integer, Opal.Integer, "to_int");
        if (integer < 0) $raise(#{::Errno::EINVAL}, 'integer must be >= 0');
        $platform.ftruncate(self.fd, integer);
        return 0;
      }
    end
  else
    alias truncate __not_implemented__
  end
end

require 'corelib/file/constants'

IO.include ::File::Constants

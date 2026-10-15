# helpers: platform, coerce_to, coerce_to_or_nil, coerce_to_or_raise, str, mode_to_flags, raise, yield1, hash_new, hash_get, to_ary
# backtick_javascript: true

require 'io/buffer'

class ::IO
  include ::Enumerable

  SEEK_SET = 0
  SEEK_CUR = 1
  SEEK_END = 2

  READABLE = 1
  PRIORITY = 2
  WRITABLE = 4

  %x{
    const DEFAULT_BUFFER_SIZE = #{::IO::Buffer::DEFAULT_SIZE};

    function check_readable(io) {
      if (io.closed === "read" || io.closed === "both" ) #{raise IOError, 'closed for reading'};
    }

    function check_writable(io) {
      if (io.closed === "write" || io.closed === "both" ) #{raise IOError, 'not opened for writing'};
    }

    function is_nil(v) {
      return v === nil || v === undefined || v === null;
    }

    function truthy(v) {
      return !(v === nil || v === false || v === undefined || v === null);
    }

    function check_open(io) {
      if (io.closed === "both") #{raise IOError, 'closed stream'};
    }

    function flags_readonly(flags) {
      const o = Opal.File.Constants;
      return ((flags & o.RDWR == o.RDWR) || (flags & o.WRONLY == o.WRONLY) || (flags & o.APPEND == o.APPEND)) ?
        false : true;
    }

    // code for '\r' is 13, code for '\n' is 10
    function is_sep(sep_bytes, sep_len, data_view, pos, check_rn) {
      let byte = data_view.getUint8(pos);
      if (check_rn && 13 === byte && 10 === data_view.getUint8(pos + 1)) {
        return true;
      }
      if (sep_bytes[0] === byte) {
        for (let i = 1; i < sep_len; i++) {
          if (sep_bytes[i] !== data_view.getUint8(pos + i)) return false;
        }
        return true;
      }
      return false;
    }

    function open_args_to_opts(open_args) {
      let opts = $hash_new();
      for (const arg of open_args) {
        if (arg.$$is_string) {
          opts['$[]=']('mode', arg);
        } else if (arg.$$is_hash) {
          if (arg['$key?']('binmode')) opts['$[]=']('binmode', $hash_get(arg, 'binmode'));
          if (arg['$key?']('textmode')) opts['$[]=']('textmode', $hash_get(arg, 'textmode'));
          if (arg['$key?']('encoding')) opts['$[]=']('encoding', $hash_get(arg, 'encoding'));
          if (arg['$key?']('flags')) opts['$[]=']('flags', $hash_get(arg, 'flags'));
          if (arg['$key?']('mode')) opts['$[]=']('mode', $hash_get(arg, 'mode'));
          if (arg['$key?']('perm')) opts['$[]=']('perm', $hash_get(arg, 'perm'));
        }
      }
      return opts;
    }

    function common_read(p, l, f, o, binary) {
      let io;
      try {
        let path = $coerce_to_or_raise(p, Opal.String, "to_path");
        if (path[0] === '|') $raise(Opal.NotImplementedError, "read with '|' is not available");

        let opts = o;
        let open_args = $hash_get(opts, 'open_args');
        if (!is_nil(open_args)) opts = open_args_to_opts(open_args);

        opts['$[]=']('path', path);
        if (binary) opts['$[]=']('binmode', true);

        if (Opal.File['$directory?'](path)) $raise(#{::Errno::EISDIR});
        let fd = $platform.io_open_path(path.toString(), #{::File::Constants::RDONLY});
        io = Opal.IO.$new(fd, nil, opts);
        if (!is_nil(f)) io['$pos='](f);
        return io.$read(l);
      } finally {
        if (io) io.$close();
      }
    }

    function common_write(p, d, f, o, binary) {
      let io;
      try {
        let path = $coerce_to_or_raise(p, Opal.String, "to_path");
        if (path[0] === '|') $raise(Opal.NotImplementedError, "write with '|' is not available");

        let opts = o, offset = f;
        if (offset.$$is_hash && Object.keys(opts.$$s || {}).length === 0) {
          offset = nil;
        } else if (offset.$$is_hash) {
          opts = offset;
          offset = nil;
        } else if (truthy(offset)) {
          offset = $coerce_to_or_raise(offset, Opal.Integer, "to_int");
        }
        let offset_given = truthy(offset) && offset >= 0;

        let flags = nil;

        let open_args = $hash_get(opts, 'open_args');
        if (!is_nil(open_args)) opts = open_args_to_opts(open_args);

        opts['$[]=']('path', path);
        let mode = $hash_get(opts, 'mode');

        if (truthy(mode)) {
          let mcoerced = $coerce_to_or_nil(mode, Opal.String, "to_str");
          mode = (mcoerced !== nil) ? mcoerced : mode;
          if (mode.$$is_string) {
            if (mode.includes(':')) mode = mode.split(':')[0];
            if (mode === '') $raise(Opal.ArgumentError, 'mode is a empty string');
            if (mode === 'r') $raise(Opal.IOError, 'not opened for writing');
            flags = Opal.mode_to_flags(mode);
          } else {
            flags = $coerce_to_or_raise(mode, Opal.Integer, "to_int");
          }
        }

        if (is_nil(open_args)) {
          let opt_flags = $hash_get(opts, 'flags');
          if (truthy(opt_flags)) flags = truthy(flags) ? (flags | opt_flags) : opt_flags;
          if (is_nil(flags)) flags = #{::File::Constants::WRONLY} | #{::File::Constants::CREAT};

          if (!offset_given && (flags & #{::File::Constants::APPEND}) !== #{::File::Constants::APPEND}) {
            flags |= #{::File::Constants::TRUNC};
          }
          if (flags_readonly(flags)) flags |= #{::File::Constants::WRONLY};
          opts['$[]=']('flags', flags);
        }

        let perm = $hash_get(opts, 'perm');
        perm = truthy(perm) ? $coerce_to_or_raise(perm, Opal.Integer, "to_int") : 0o666;

        let fd = $platform.io_open_path(path.toString(), flags, perm);
        io = Opal.IO.$new(fd, nil, opts);
        if (binary) io.$binmode();
        if (offset_given) io['$pos='](offset);
        return io.$write(d);
      } finally {
        if (io) io.$close();
      }
    }
  }

  class << self
    if `$platform.io_open_path`
      def binread(path, length = nil, offset = 0, **opts)
        # Behaves like IO.read, except that the stream is opened in binary mode with ASCII-8BIT encoding.
        `common_read(path, length, offset, opts, true)`
      end

      def binwrite(path, data, offset = nil, **opts)
        # Behaves like IO.write, except that the stream is opened in binary mode with ASCII-8BIT encoding.
        `common_write(path, data, offset, opts, true)`
      end
    else
      alias binread __not_implemented__
      alias binwrite __not_implemented__
    end

    if `$platform.io_open_path`
      def copy_stream(src, dst, src_length = nil, src_offset = nil)
        # Copies from the given src to the given dst, returning the number of bytes copied.
        %x{
          let src_opened = false, dest_opened = false, rpartial;
          if (!src['$is_a?'](Opal.IO) && src['$respond_to?']('to_path')) src = src.$to_path();
          let src_io;
          if (src.$$is_string) {
            let fd = $platform.io_open_path(src.toString(), #{::File::Constants::RDONLY});
            src_opened = true;
            src_io = Opal.IO.$new(fd, 'r');
          } else {
            if (src['$respond_to?']('read')) {
              rpartial = false;
            } else if (src['$respond_to?']('readpartial')) {
              rpartial = true;
            } else {
              $raise(Opal.TypeError, 'src must respond to :read or :readpartial');
            }
            src_io = src;
          }
          if (!dst['$is_a?'](Opal.IO) && dst['$respond_to?']('to_path')) dst = dst.$to_path();
          let dst_io;
          if (dst.$$is_string) {
            let fd = $platform.io_open_path(dst.toString(), #{::File::Constants::CREAT} | #{::File::Constants::WRONLY});
            dest_opened = true;
            dst_io = Opal.IO.$new(fd, 'w');
          } else {
            if (!dst['$respond_to?']('write')) $raise(Opal.TypeError, 'dst must respond to :write');
            dst_io = dst;
          }

          let bsizes = [src_io, dst_io].map(function (io) {
            let size = io['$respond_to?']('stat') ? io.$stat().$blksize() : nil;
            return (size !== nil && size > 0) ? size : 1024;
          });

          let bsize = Math.min(bsizes[0], bsizes[1]);
          if (truthy(src_length)) bsize = Math.min(bsize, src_length);
          let total_bytes = 0, src_orig_pos = nil;
          if (truthy(src_offset)) {
            if (src_io['$respond_to?']('stat') && src_io.$stat()['$pipe?']()) $raise(#{::Errno::ESPIPE});
            if (!src_opened && src_io['$respond_to?']('pos')) src_orig_pos = src_io.pos;
            src_io['$pos='](src_offset);
          }

          let data;
          try {
            do {
              if (truthy(src_length) && (total_bytes + bsize) > src_length) bsize = src_length - total_bytes;
              if (rpartial) {
                try { data = src_io.$readpartial(bsize, nil); } catch { $gvars['!'] = nil; data = nil; }
              } else {
                data = src_io.$read(bsize, nil);
              }
              if (truthy(data)) total_bytes += dst_io.$write(data);
            } while (truthy(data) && (!truthy(src_length) || total_bytes < src_length));
          } finally {
            if (truthy(src_offset) && !src_opened && src_io['$respond_to?']('pos=')) src_io['$pos='](src_orig_pos);
            if (src_opened) src_io.$close();
            if (dest_opened) dst_io.$close();
          }

          return total_bytes;
        }
      end
    else
      alias copy_stream __not_implemented__
    end

    alias for_fd new # Synonym for IO.new.

    if `$platform.io_open_path`
      def foreach(path, sep = $/, limit = nil, **opts, &block)
        # Calls the block with each successive line read from the stream.
        return enum_for(:foreach, path, sep, limit, **opts) unless block_given?
        %x{
          path = $coerce_to_or_raise(path, Opal.String, "to_path");

          if (sep['$is_a?'](Opal.Integer) && is_nil(limit)) {
            limit = sep;
            sep = $gvars['/'] ?? nil;
          }
          if (!is_nil(sep)) sep = $coerce_to_or_raise(sep, Opal.String, "to_str");

          if (truthy(limit)) {
            limit = $coerce_to_or_raise(limit, Opal.Integer, "to_int");
            if (limit < 0) {
              limit = nil;
            } else if (limit === 0) {
              $raise(Opal.ArgumentError, 'limit must be greater than 0');
            }
          }

          let io;
          try {
            let mode = opts['$delete']('mode');
            mode = truthy(mode) ? mode.split(':')[0] : 'r';
            let flags = Opal.mode_to_flags(mode);
            let fd = $platform.io_open_path(path.toString(), flags);
            let chomp = opts['$delete']('chomp');
            opts['$[]=']('path', path);
            io = Opal.IO.$new(fd, mode, opts);
            Opal.send(io, 'each', [sep, limit, $hash_new('chomp', chomp)], block);
            $gvars['_'] = nil;
          } finally {
            if (io) io.$close();
          }
          return nil;
        }
      end
    else
      alias foreach __not_implemented__
    end

    def open(fd, mode, **opts, &block)
      # Creates a new IO object, via IO.new with the given arguments.
      # With no block given, returns the IO object.
      # With a block given, calls the block with the IO object and returns the block’s value.
      %x{
        let io = Opal.IO.$new(fd, mode, opts);
        if (block === nil) return io;
        function close_ignoring_ioerror() {
          try {
            io.$close();
          } catch (e) {
            if (e.$$class !== Opal.IOError) throw e;
            $gvars['!'] = nil;
          }
        }
        let result;
        try {
          result = block(io);
        } catch (e) {
          close_ignoring_ioerror();
          throw e;
        }
        close_ignoring_ioerror();
        return result;
      }
    end

    if `$platform.io_pipe`
      def pipe(ext_enc = nil, int_enc = nil, **opts, &block)
        # Creates a pair of pipe endpoints, read_io and write_io, connected to each other.
        %x{
          if (truthy(ext_enc) && !ext_enc['$is_a?'](Opal.Encoding)) {
            ext_enc = $coerce_to_or_raise(ext_enc, Opal.String, "to_str");
            if (is_nil(int_enc)) {
              let parts = ext_enc.split(':');
              ext_enc = parts[0];
              int_enc = parts[1] ?? nil;
            }
            if (ext_enc.includes('|')) ext_enc = ext_enc.split('|')[1];
            ext_enc = Opal.Encoding.$find(ext_enc);
          }
          if (truthy(int_enc) && !int_enc['$is_a?'](Opal.Encoding)) {
            int_enc = Opal.Encoding.$find($coerce_to_or_raise(int_enc, Opal.String, "to_str"));
          }

          if (is_nil(ext_enc)) ext_enc = #{::Encoding.default_external};
          if (is_nil(int_enc)) int_enc = #{::Encoding.default_internal};
          if (ext_enc === int_enc) int_enc = nil;

          let fds = $platform.io_pipe();
          let read_fd = fds[0], write_fd = fds[1];

          let write_io = self.$allocate();
          write_io.$initialize(write_fd, 'w');
          write_io.$set_encoding(nil);
          write_io.pipe = true;

          let read_io = self.$allocate();
          read_io.$initialize(read_fd, 'r', $hash_new('external_encoding', ext_enc, 'internal_encoding', int_enc));
          read_io.pipe = true;

          if (block === nil) return [read_io, write_io];
          try {
            return block(read_io, write_io);
          } finally {
            read_io.$close();
            write_io.$close();
          }
        }
      end
    else
      alias pipe __not_implemented__
    end

    if `$platform.io_popen`
      def popen(env = {}, cmd = nil, mode = nil, **opts, &block)
        # Executes the given command cmd as a subprocess whose $stdin and $stdout are connected to a new stream io.
        %x{
          let js_opts = { stdio: 'pipe' };
          let args = null;
          if (env.$$is_hash) {
            js_opts.env = {};
            Opal.send(env, 'each', [], function (k, v) {
              js_opts.env[k.$to_s()] = v.$to_s();
            });
          } else {
            if (is_nil(mode) && truthy(cmd)) mode = cmd;
            cmd = env;
            env = nil;
          }
          if (cmd.$$is_array) {
            let command = cmd.shift();
            args = cmd.map(function (a) { return a.$to_s(); });
            cmd = command;
          }
          if (cmd === '-') $raise(Opal.NotImplementedError, "popen with fork '-' is not available");
          mode = truthy(mode) ? $coerce_to_or_raise(mode, Opal.String, "to_str") : 'r';
          js_opts.shell = true;
          if (opts['$key?']('chdir')) js_opts.cwd = $hash_get(opts, 'chdir');
          if (opts['$key?']('err')) {
            let err = $hash_get(opts, 'err');
            if (err.$$is_array && err[0] === 'child' && (err[1] === 'out' || err[1] === 1)) js_opts.err = 'out';
          }
          let res = $platform.io_popen(cmd.toString(), args, mode.toString(), js_opts);
          let fd = res[0], pid = res[1];
          let io = self.$new(fd, mode, opts);
          io.pid = pid;
          io.pipe = true;
          if (block === nil) return io;
          try {
            return block(io);
          } finally {
            io.$close();
          }
        }
      end
    else
      alias popen __not_implemented__
    end

    def read(path, length = nil, offset = 0, **opts)
      # Opens the stream, reads and returns some or all of its content, and closes the stream;
      # returns nil if no bytes were read.
      `common_read(path, length, offset, opts, false)`
    end

    if `$platform.io_open_path`
      def readlines(path, sep = $/, limit = nil, **opts)
        # Returns an array of all lines read from the stream.
        %x{
          path = $coerce_to_or_raise(path, Opal.String, "to_path");

          if (sep['$is_a?'](Opal.Integer) && is_nil(limit)) {
            limit = sep;
            sep = $gvars['/'] ?? nil;
          }
          if (!is_nil(sep)) sep = $coerce_to_or_raise(sep, Opal.String, "to_str");

          if (truthy(limit)) {
            limit = $coerce_to_or_raise(limit, Opal.Integer, "to_int");
            if (limit < 0) {
              limit = nil;
            } else if (limit === 0) {
              $raise(Opal.ArgumentError, 'limit must be greater than 0');
            }
          }

          let io;
          try {
            let mode = opts['$delete']('mode');
            mode = truthy(mode) ? mode.split(':')[0] : 'r';
            let flags = Opal.mode_to_flags(mode);
            let fd = $platform.io_open_path(path.toString(), flags);
            let chomp = opts['$delete']('chomp');
            opts['$[]=']('path', path);
            io = Opal.IO.$new(fd, mode, opts);
            return io.$readlines(sep, limit, $hash_new('chomp', chomp));
          } finally {
            if (io) io.$close();
          }
        }
      end
    else
      alias readlines __not_implemented__
    end

    # Invokes system call select(2), which monitors multiple file descriptors,
    # waiting until one or more of the file descriptors becomes ready for some class of I/O operation.
    alias select __not_implemented__

    if `$platform.io_open_path`
      def sysopen(path, mode = nil, perm = nil)
        # Opens the file at the given path with the given mode and permissions; returns the integer file descriptor.
        %x{
          path = $coerce_to_or_raise(path, Opal.String, "to_path");
          mode = truthy(mode) ? mode.split(':')[0] : 'r';
          if (is_nil(perm)) perm = 0o666;
          let flags = Opal.mode_to_flags(mode);
          return $platform.io_open_path(path.toString(), flags, perm);
        }
      end
    else
      alias sysopen __not_implemented__
    end

    def try_convert(object)
      # Attempts to convert object into an IO object via method to_io; returns the new IO object if successful, or nil otherwise:
      `$coerce_to_or_nil(object, #{::IO}, "to_io")`
    end

    if `$platform.io_open_path`
      def write(path, data, offset = nil, **opts)
        # Opens the stream, writes the given data to it, and closes the stream; returns the number of bytes written.
        `common_write(path, data, offset, opts, false)`
      end
    else
      alias write __not_implemented__
    end
  end

  def initialize(fd, mode = nil, opts = {})
    # Creates and returns a new IO object (file stream) from a file descriptor.
    # flags should be mode
    %x{
      if (!opts.$$is_hash) $raise(Opal.ArgumentError, 'opts must be a Hash');
      if (mode.$$is_hash) {
        opts = mode;
        mode = nil;
      }

      self.autoclose = truthy(opts['$fetch']('autoclose', true));
      self.buffer = #{::IO::Buffer}.$new();
      fd = $coerce_to_or_raise(fd, Opal.Integer, "to_int");
      if (fd < 0) $raise(#{::Errno::EBADF});
      self.fd = fd;
      self.close_on_exec = self.fd > 2;
      self.sync = self.fd === 2;
      self.nonblock = false;
      self.lineno = 0;
      self.pos = 0;

      self.path = $hash_get(opts, 'path');
      if (self.path === undefined) self.path = nil;

      let flags = $hash_get(opts, 'flags');
      flags = is_nil(flags) ? 0 : flags;
      let arg_mode = mode;
      let ext_enc = nil, int_enc = nil, textmode = nil;
      self.binmode = nil;
      mode = nil;

      for (let m of [arg_mode, $hash_get(opts, 'mode')]) {
        if (!is_nil(m)) {
          if (!is_nil(mode)) $raise(Opal.ArgumentError, 'mode given multiple times');
          let mcoerced = $coerce_to_or_nil(m, Opal.String, "to_str");
          m = (mcoerced !== nil) ? mcoerced : m;
          if (m.$$is_string) {
            if (m.includes(':')) {
              let parts = m.split(':');
              m = parts[0];
              ext_enc = parts[1] ?? nil;
              int_enc = parts[2] ?? nil;
            }
            if (m === '') $raise(Opal.ArgumentError, 'mode is a empty string');
            self.binmode = m.includes('b');
            textmode = m.includes('t'); // only used for args checking
            if ((truthy(self.binmode) || truthy(textmode)) && (opts['$key?']('binmode') || opts['$key?']('textmode'))) {
              $raise(Opal.ArgumentError, 'mode given multiple times');
            }
            mode = m;
            flags |= Opal.mode_to_flags(mode);
          } else {
            flags |= $coerce_to_or_raise(m, Opal.Integer, "to_int");
          }
        }
      }

      if (typeof self.binmode === 'object' && self.binmode !== null && self.binmode !== nil) console.error('DBG2', mode.$$name || mode, new Error().stack.split('\n').slice(1,8).join(' | '));
      if (!truthy(self.binmode)) self.binmode = truthy($hash_get(opts, 'binmode'));
      if (!truthy(textmode)) textmode = truthy($hash_get(opts, 'textmode'));

      if (truthy(self.binmode) && truthy(textmode)) $raise(Opal.ArgumentError, 'choose either binmode or textmode');

      const fc = Opal.File.Constants;
      if ((flags & fc.RDWR) === fc.RDWR) {
        self.opened = 'duplex';
      } else if ((flags & fc.WRONLY) === fc.WRONLY) {
        self.opened = 'write';
        self.closed = 'read';
      } else {
        self.opened = 'read';
        self.closed = 'write';
      }
      self.flags = flags; // need to store flags for #reopen

      if (!is_nil(ext_enc) && (opts['$key?']('encoding') || opts['$key?']('external_encoding'))) {
        $raise(Opal.ArgumentError, 'encoding specified twice');
      }

      if (is_nil(ext_enc)) {
        ext_enc = $hash_get(opts, 'external_encoding');
        if (opts['$key?']('encoding')) {
          if (opts['$key?']('external_encoding')) {
            $gvars['stderr'].$puts("warning: Ignoring encoding parameter '" + $hash_get(opts, 'encoding').$upcase() + "': external_encoding is used");
          } else if (opts['$key?']('internal_encoding')) {
            $gvars['stderr'].$puts("warning: Ignoring encoding parameter '" + $hash_get(opts, 'encoding').$upcase() + "': internal_encoding is used");
          } else {
            ext_enc = $hash_get(opts, 'encoding');
          }
        }
        if (ext_enc === undefined) ext_enc = nil;
      }

      let enc_def_ext = #{::Encoding.default_external};
      let enc_def_int = #{::Encoding.default_internal};

      let use_bom = false;

      if (!is_nil(ext_enc) && !ext_enc['$is_a?'](Opal.Encoding)) {
        ext_enc = $coerce_to_or_raise(ext_enc, Opal.String, "to_str");
        if (ext_enc.includes(':')) {
          let parts = ext_enc.split(':');
          ext_enc = parts[0];
          int_enc = parts[1] ?? nil;
        }
        if (ext_enc.startsWith('BOM|')) {
          use_bom = true;
          ext_enc = ext_enc.split('|')[1];
        }
        ext_enc = Opal.Encoding.$find(ext_enc);
      }

      if (opts['$key?']('internal_encoding')) {
        if (!is_nil(int_enc)) $raise(Opal.ArgumentError, 'internal encoding given multiple times');
        int_enc = $hash_get(opts, 'internal_encoding');
      }

      if (use_bom) self.$set_encoding_by_bom();

      if (is_nil(self.ext_enc)) {
        self.ext_enc = (!is_nil(ext_enc) || (is_nil(enc_def_int) && mode === 'r')) ? ext_enc
          : self.binmode ? #{::Encoding::BINARY}
          : is_nil(enc_def_int) ? nil
          : enc_def_ext;
      }

      if (!is_nil(int_enc) && !int_enc['$is_a?'](Opal.Encoding)) {
        int_enc = $coerce_to_or_raise(int_enc, Opal.String, "to_str");
        if (int_enc !== '-') int_enc = Opal.Encoding.$find(int_enc);
      }
      self.int_enc = (!is_nil(int_enc) && (int_enc === '-' || int_enc === self.ext_enc)) ? nil
        : !is_nil(int_enc) ? int_enc
        : (enc_def_ext === enc_def_int || self.ext_enc === #{::Encoding::BINARY}) ? nil
        : enc_def_int;

      let nl = $hash_get(opts, 'newline');
      if (!is_nil(nl) && self.binmode) $raise(Opal.ArgumentError, 'newline decorator with binary mode');
      self.write_lsep = nl === 'cr' ? '\r' : (nl === 'crlf' ? '\r\n' : '\n');

      if (self.fd) {
        let r = $to_ary($platform.io_open(self.fd, self.flags));
        self.tty = r[0] ?? nil;
        self.pipe = r[1] ?? nil;
        self.file = r[2] ?? nil;
      }
      return nil;
    }
  end

  def <<(object)
    # Writes the given object to self, which must be opened for writing (see Access Modes);
    # returns self; if object is not a string, it is converted via method to_s:
    write(object)
    self
  end

  def advise(advice, offset = 0, len = 0)
    # Invokes Posix system call posix_fadvise(2), which announces an intention to access
    # data from the current file in a particular manner.
    `check_open(self)`
    raise(TypeError, 'advice must be a Symbol') unless advice.is_a?(::Symbol)
    offset = `$coerce_to_or_raise(offset, Opal.Integer, "to_int")`
    len = `$coerce_to_or_raise(len, Opal.Integer, "to_int")`
    __not_implemented__ unless %i[dontneed noreuse normal random sequential willneed wontneed].include?(advice)
    # just a noop here until engines provide APIs accordingly
    nil
  end

  def autoclose=(bool)
    # Sets auto-close flag.
    @autoclose = !!bool
  end

  def autoclose?
    # Returns true if the underlying file descriptor of ios will be closed at its finalization or at calling close,
    # otherwise false.
    @autoclose
  end

  def binmode
    # Sets the stream’s data mode as binary
    `check_open(self)`
    @ext_enc = ::Encoding::BINARY
    @int_enc = nil
    @binmode = true
    self
  end

  def binmode?
    # Returns true if the stream is on binary mode, false otherwise.
    `check_open(self)`
    @binmode
  end

  def close
    # Closes the stream for both reading and writing if open for either or both; returns nil.
    %x{
      if (self['$closed?']()) return nil;
      let status = (self.fd && truthy(self.autoclose)) ? $platform.io_close(self.fd) : nil;
      if (status !== nil && status !== undefined) {
        // must have been a #popen
        $gvars['?'] = #{::Process::Status}.$new({ status: status, flags: 4 }, self.pid ?? nil);
      }
      self.closed = 'both';
      self.pid = nil;
      return nil;
    }
  end

  def close_on_exec=(bool)
    # Sets a close-on-exec flag.
    raise ::IOError if closed?
    @close_on_exec = !!bool
  end

  def close_on_exec?
    # Returns true if the stream will be closed on exec, false otherwise.
    raise ::IOError if closed?
    @close_on_exec
  end

  def close_read
    # Closes the stream for reading if open for reading; returns nil
    raise ::IOError if @opened == :write
    return if @closed == :read || closed?
    return close if @closed == :write || @opened == :read
    @closed = :read
    nil
  end

  def close_write
    # Closes the stream for writing if open for writing; returns nil.
    raise ::IOError if @opened == :read
    return if @closed == :write || closed?
    flush
    return close if @closed == :read || @opened == :write
    @closed = :write
    nil
  end

  def closed?
    # Returns true if the stream is closed for both reading and writing, false otherwise.
    @closed == :both
  end

  def each(sep = $/, limit = nil, chomp: false, &block)
    # Calls the block with each remaining line read from the stream; returns self.
    return enum_for(:each, sep, limit, chomp: chomp) unless block_given?
    %x{
      if (!is_nil(sep) && limit === nil && sep['$is_a?'](Opal.Numeric)) {
        limit = sep;
        sep = $gvars['/'] ?? nil;
      }
      if (limit !== nil && limit !== false && limit < 1) {
        $raise(Opal.ArgumentError, 'if limit is given, it must be greater than 0');
      }

      let global_last_line = $gvars['_'];

      let got_text = false, line;
      while ((line = self.$gets(sep, limit, $hash_new('chomp', chomp))) !== nil) {
        if (!got_text && sep === '' && /^\n+$/.test(line)) continue;
        got_text = true;
        $yield1(block, line);
      }

      $gvars['_'] = global_last_line;
      return self;
    }
  end

  def each_byte(&block)
    # Calls the given block with each byte (0..255) in the stream; returns self.
    return enum_for :each_byte unless block_given?
    %x{
      let byte;
      while ((byte = self.$getbyte()) !== nil) {
        $yield1(block, byte);
      }
      return self;
    }
  end

  def each_char(&block)
    # Calls the given block with each character in the stream; returns self.
    return enum_for :each_char unless block_given?
    %x{
      let chr;
      while ((chr = self.$getc()) !== nil) {
        $yield1(block, chr);
      }
      return self;
    }
  end

  def each_codepoint(&block)
    # Calls the given block with each codepoint in the stream; returns self
    return enum_for :each_codepoint unless block_given?
    %x{
      let chr;
      while ((chr = self.$getc()) !== nil) {
        $yield1(block, chr.$ord());
      }
      return self;
    }
  end

  alias each_line each

  if `$platform.io_pipe_eof`
    def eof
      # Returns true if the stream is positioned at its end, false otherwise;
      %x{
        check_readable(self);
        if (truthy(self.file)) return self.$stat().$size() <= self.pos;
        if (truthy(self.pipe)) return $platform.io_pipe_eof(self.fd);
        return false;
      }
    end
    alias eof? eof
  else
    alias eof __not_implemented__
  end

  alias eof? eof

  def external_encoding
    # Returns the Encoding object that represents the encoding of the stream,
    # or nil if the stream is in write mode and no encoding is specified.
    return @ext_enc if @opened != :read
    @ext_enc || ::Encoding.default_external
  end

  def fcntl(integer_cmd, argument = nil)
    # Invokes Posix system call fcntl(2), which provides a mechanism for issuing low-level commands to
    # control or query a file-oriented I/O stream. Arguments and results are platform dependent.
    `check_open(self)`
    case integer_cmd
    when 1
      flags = 0
      flags |= 1 if close_on_exec?
      return flags
    end
    -1
  end

  if `$platform.io_fdatasync`
    def fdatasync
      # Immediately writes to disk all data buffered in the stream, via the operating system’s: fdatasync(2),
      # if supported, otherwise via fsync(2), if supported; otherwise raises an exception.
      `check_open(self)`
      `$platform.io_fdatasync(self.fd)`
      0
    end
  else
    alias fdatasync __not_implemented__
  end

  def fileno
    # Returns the integer file descriptor for the stream.
    `check_open(self)`
    @fd
  end

  def flush
    # Flushes data buffered in self to the operating system
    # (but does not necessarily flush data buffered in the operating system)
    `check_open(self)`
    # noop
    self
  end

  if `$platform.io_fsync`
    def fsync
      # Immediately writes to disk all data buffered in the stream, via the operating system’s fsync(2).
      # Raises an exception if the operating system does not support fsync(2).
      `check_open(self)`
      `$platform.io_fsync(self.fd)`
      0
    end
  else
    alias fsync __not_implemented__
  end

  if `$platform.io_read`
    def getbyte
      # Reads and returns the next byte (in range 0..255) from the stream; returns nil if already at end-of-stream.
      %x{
        check_readable(self);
        if (self.$eof()) return nil;
        let bytes_read = $platform.io_read(self.fd, self.buffer, 0, self.pos, 1, self.file);
        self.pos += bytes_read;
        if (bytes_read > 0) return self.buffer.data_view.getUint8(0);
        return nil;
      }
    end
  else
    alias getbyte __not_implemented__
  end

  if `$platform.io_read`
    def getc
      # Reads and returns the next 1-character string from the stream; returns nil if already at end-of-stream.
      %x{
        check_readable(self);
        if (self.$eof()) return nil;

        // allow for multi byte characters with up to 16 bytes
        let bytes_read = $platform.io_read(self.fd, self.buffer, 0, self.pos, 16, self.file);
        if (bytes_read < 1) return nil;
        let chr = self.buffer.$get_raw_string(0, 16, self.ext_enc, false);
        chr = chr[0]; // the first one should be valid
        self.pos += chr.$bytesize();
        return chr;
      }
    end
  else
    alias getc __not_implemented__
  end

  if `$platform.io_read`
    def gets(sep = $/, limit = nil, chomp: false)
      # Reads and returns a line from the stream; assigns the return value to $_.
      %x{
        try {
          check_readable(self);
          if (self.$eof()) return ($gvars['_'] = nil);

          let paragraph_mode = false;

          if (!is_nil(sep)) {
            if (limit === nil && !sep.$$is_string) {
              try {
                limit = $coerce_to_or_raise(sep, Opal.Integer, "to_int");
                sep = $gvars['/'] ?? nil;
              } catch {
                $gvars['!'] = nil;
                sep = $coerce_to_or_raise(sep, Opal.String, "to_str");
              }
            } else if (sep === '') {
              sep = $gvars['/'] ?? nil;
              paragraph_mode = true;
            } else {
              sep = $coerce_to_or_raise(sep, Opal.String, "to_str");
            }
          }

          limit = (limit === nil) ? Infinity : $coerce_to_or_raise(limit, Opal.Integer, "to_int");
          if (limit < 0) {
            limit = Infinity;
          } else if (limit === 0) {
            return $str('', self.ext_enc);
          }

          // get separator as bytes in external encoding
          let sep_bytes = nil, sep_len = 0;
          if (!is_nil(sep)) {
            sep_bytes = $str(sep, self.ext_enc).$bytes();
            sep_len = sep_bytes.length;
          }

          let bytes_read = 0,
            total_bytes_read = 0,
            buffer_size = self.buffer.$size(),
            read_len = (self.tty || self.pipe) ? 1 : Math.min(limit, buffer_size),
            start_pos = self.pos,
            temp_pos = self.pos,
            sep_pos = 0,
            found_sep = false,
            i = 0,
            check_rn = (sep === '\n');

          // Read additional up to 16 bytes above limit into the buffer to
          // account for multi byte character combinations that may have been
          // cut off. These are only for @buffer.get_raw_string to be able to
          // return a valid string, so don't count these bytes later on.
          let real_read_len = (self.tty || self.pipe) ? 1 : Math.min(read_len + 16, buffer_size);

          let dv, line;
          while (true) {
            // fill buffer
            dv = self.buffer.data_view;
            temp_pos += bytes_read;
            bytes_read = $platform.io_read(self.fd, self.buffer, total_bytes_read, temp_pos, real_read_len, self.file);
            if (bytes_read > read_len) bytes_read = read_len; // Don't count the extra 16 bytes
            if (bytes_read > 0) {
              total_bytes_read += bytes_read;
              // lets look for the separator bytes
              if (sep !== nil) {
                for (i = total_bytes_read - bytes_read; i < total_bytes_read; i++) {
                  found_sep = is_sep(sep_bytes, sep_len, dv, i, check_rn);
                  if (found_sep) {
                    // chomp pos, end of text, beginning of separator
                    sep_pos = i;
                    // end of separator, maybe beginning of next separtor or text
                    i += sep_len;
                    if (check_rn && 13 === dv.getUint8(sep_pos) && 10 === dv.getUint8(i)) i++;
                    if (paragraph_mode) { // check for second separator
                      if (i < total_bytes_read && is_sep(sep_bytes, sep_len, dv, i, check_rn)) {
                        i += sep_len;
                        if (check_rn && 13 === dv.getUint8(sep_pos) && 10 === dv.getUint8(i)) i++;
                      } else {
                        found_sep = false;
                        // special case if a sep has been found at the end that is not a paragraph sep
                        if (i >= total_bytes_read) break;
                      }
                    }
                    if (found_sep) break;
                  }
                }
              } else {
                i = total_bytes_read;
              }
            }
            if (found_sep || bytes_read < read_len || limit <= total_bytes_read) {
              let str_end = (found_sep && chomp !== nil && chomp !== false) ? sep_pos : i;
              let str_len = Math.min(limit, str_end);
              line = self.buffer.$get_raw_string(0, str_len, !is_nil(self.ext_enc) ? self.ext_enc : #{::Encoding.default_external}, true);
              if (paragraph_mode) {
                // skip additional empty paragraphs
                while (i < total_bytes_read && is_sep(sep_bytes, sep_len, dv, i)) { i += sep_len; }
              }
              self.pos = start_pos + ((limit === Infinity) ? i : Math.max(line.$bytesize(), i));
              break;
            } else if (total_bytes_read === self.buffer.$size()) {
              // skip back a bit to correctly identify separator/paragraph across buffer border
              i -= sep_len;
              self.buffer.$resize(self.buffer.$size() + buffer_size);
            }
          }

          if (line !== nil) {
            if (!is_nil(self.int_enc)) {
              line.$force_encoding(self.int_enc);
            } else {
              let def_int = #{::Encoding.default_internal};
              if (def_int !== nil &&
                  (self.ext_enc !== #{::Encoding::BINARY} || #{::Encoding.default_external} !== #{::Encoding::BINARY})) {
                line.$force_encoding(def_int);
              }
            }

            self.lineno = self.lineno + 1;
          }

          $gvars['.'] = self.lineno;
          if (sep !== ' ') $gvars['_'] = line;
          return line;
        } finally {
          // shrink buffer to original size, freeing memory
          if (self.buffer.$size() !== DEFAULT_BUFFER_SIZE) self.buffer.$resize(DEFAULT_BUFFER_SIZE);
        }
      }
    end
  else
    alias gets __not_implemented__
  end

  if `$platform.io_open && $platform.io_open_path`
    def initialize_copy(other)
      `check_open(other)`

      @fd = `$platform.io_open_path(self.path.toString(), self.flags)` if path
      @tty = `$platform.io_open(self.fd, self.flags)` if @fd

      @autoclose = true
      @close_on_exec = true
    end
  else
    alias initialize_copy __not_implemented__
  end

  def inspect
    # Returns a string representation of self.
    "<#{self.class.name}:fd #{@fd}#{' (closed)' if closed?}>"
  end

  def internal_encoding
    # Returns the Encoding object that represents the encoding of the internal string,
    # if conversion is specified, or nil otherwise.
    @int_enc
  end

  if `$platform.ioctl`
    def ioctl(integer_cmd, argument)
      # Invokes Posix system call ioctl(2), which issues a low-level command to an I/O device.
      `check_open(self)`
      `$platform.ioctl(integer_cmd, argument)`
    end
  else
    alias ioctl __not_implemented__
  end

  def isatty
    # Returns true if the stream is associated with a terminal device (tty), false otherwise.
    `check_open(self)`
    @tty
  end

  def lineno
    # Returns the current line number for the stream.
    `check_readable(self)`
    @lineno
  end

  def lineno=(number)
    # Sets and returns the line number for the stream.
    %x{
      check_readable(self);
      if (!number['$is_a?'](Opal.Numeric)) number = $coerce_to_or_raise(number, Opal.Integer, "to_int");
      if (number['$is_a?'](Opal.Float)) number = number.$floor();
      self.lineno = number;
      return number;
    }
  end

  def path
    # Returns the path associated with the IO, or nil if there is no path associated with the IO.
    # It is not guaranteed that the path exists on the filesystem.
    `$str(self.path, self.path.$encoding())` if @path
  end

  def pathconf(p1)
    nil
  end

  def pid
    # Returns the process ID of a child process associated with the stream,
    # which will have been set by IO#popen, or nil if the stream was not created by IO#popen.
    `check_open(self)`
    @pid
  end

  def pos
    # Returns the current position (in bytes) in self
    `check_open(self)`
    @pos
  end

  def pos=(number)
    # Seeks to the given new_position (in bytes).
    %x{
      check_open(self);
      number = $coerce_to_or_raise(number, Opal.Integer, "to_int");
      if (number < 0) $raise(#{::Errno::EINVAL}, 'position must be >= 0');
      self.$stat().$size();
      self.pos = number;
      return number;
    }
  end

  if `$platform.io_read`
    def pread(length, offset, out_string = nil)
      # Behaves like IO#readpartial, except that it:
      # - Reads at the given offset (in bytes).
      # - Disregards, and does not modify, the stream’s position (see Position).
      # - Bypasses any user space buffering in the stream.
      %x{
        if (out_string !== nil) {
          // requires mutable Strings
          $raise(Opal.NotImplementedError, 'out_string buffer is currently not supported');
        }

        try {
          check_readable(self);
          if (length !== nil && length < 0) $raise(Opal.ArgumentError, 'invalid length');

          let enc = #{::Encoding::BINARY};
          if (length === 0) return $str('', enc);

          // the true limit will be the smaller of:
          // - max JS String size, which is Number.MAX_SAFE_INTEGER
          // - max ArrayBuffer size, which is implementation dependend
          let read_end = length === nil ? Infinity : offset + length,
            read_len = self.buffer.$size(),
            bytes_read = 0,
            total_bytes_read = 0;
          while (offset < read_end) {
            if ((offset + read_len) > read_end) read_len = read_end - offset;
            let s = self.buffer.$size();
            if (s < (total_bytes_read + read_len)) self.buffer.$resize(s + read_len);
            bytes_read = $platform.io_read(self.fd, self.buffer, total_bytes_read, offset, read_len, self.file);
            total_bytes_read += bytes_read;
            offset += bytes_read;
            if (bytes_read < read_len) $raise(Opal.EOFError);
          }
          if (bytes_read === 0) return $str('', enc);
          return self.buffer.$get_raw_string(0, total_bytes_read, enc, false);
        } finally {
          // shrink buffer to original size, freeing memory
          if (self.buffer.$size() !== DEFAULT_BUFFER_SIZE) self.buffer.$resize(DEFAULT_BUFFER_SIZE);
        }
      }
    end
  else
    alias pread __not_implemented__
  end

  def print(*objects)
    # Writes the given objects to the stream; returns nil. Appends the output record
    # separator $OUTPUT_RECORD_SEPARATOR ($\), if it is not nil.
    %x{
      check_writable(self);
      if (objects.length === 0) objects = [$gvars['_']];
      let lidx = objects.length - 1;
      let wsep = !is_nil($gvars[',']) ? $gvars[','] : (!is_nil($gvars['\\']) ? $gvars['\\'] : nil);
      for (let idx = 0; idx < objects.length; idx++) {
        if (idx === lidx) self.$write(objects[idx]);
        else self.$write(objects[idx], wsep);
      }
      if (!is_nil($gvars['\\'])) self.$write($gvars['\\']);
      return nil;
    }
  end

  def printf(format_string, *objects)
    # Formats and writes objects to the stream.
    `check_writable(self)`
    write format(format_string, *objects)
    nil
  end

  def putc(object)
    `check_open(self)`
    c = if object.is_a?(::String)
          object[0]
        else
          raise(TypeError, 'object of wrong type') unless object.respond_to?(:to_int)
          obj = object.to_int
          code = `obj & 0xff`
          code.chr
        end
    write c
    object
  end

  def puts(*args)
    # Writes the given objects to the stream, which must be open for writing; returns nil.
    # Writes a newline after each that does not already end with a newline sequence.
    # If called without arguments, writes a newline.
    %x{
      check_writable(self);
      if (args.length === 0) {
        self.$write(self.write_lsep);
        return nil;
      }
      for (let arg of args) {
        let ary = $coerce_to_or_nil(arg, Opal.Array, "to_ary");
        if (ary !== nil) arg = ary;
        if (arg.$$is_array) {
          if (arg.length !== 0) {
            let flat;
            try { flat = arg.$flatten(); } catch { $gvars['!'] = nil; flat = arg; }
            for (let a of flat) {
              if (a['$=='](arg)) self.$write('[...]');
              else self.$puts(a);
            }
          }
        } else {
          let line = $coerce_to_or_raise(arg, Opal.String, "to_s");
          if (!line.endsWith("\n")) line += self.write_lsep;
          self.$write(line);
        }
      }
      return nil;
    }
  end

  def pwrite(object, offset)
    # Behaves like IO#write, except that it:
    # Writes at the given offset (in bytes).
    # Disregards, and does not modify, the stream’s position (see Position).
    # Bypasses any user space buffering in the stream.
    %x{
      check_writable(self);
      let string = $coerce_to_or_raise(object, Opal.String, "to_s");
      let total_wsize = 0;
      let ext_enc;
      if (!is_nil(self.ext_enc)) {
        ext_enc = self.ext_enc;
      } else if (truthy(self.binmode)) { // || string.binary_encoding == ::Encoding::BINARY
        ext_enc = string.$binary_encoding();
      } else {
        ext_enc = #{::Encoding.default_external};
      }
      if (offset > 0) {
        let fsz = self.$stat().$size();
        if (fsz < offset) {
          let s_dif = offset - fsz;
          let e_buf = #{::IO::Buffer}.$new(s_dif);
          total_wsize = $platform.io_write(self.fd, e_buf, 0, fsz, s_dif);
        }
      }
      Opal.send(ext_enc, 'each_byte_buffer', [string, self.buffer], function (write_len) {
        let bytes_written = $platform.io_write(self.fd, self.buffer, 0, offset, write_len);
        if (bytes_written < write_len) $raise(Opal.IOError, 'could not write all data');
        offset += write_len;
        total_wsize += write_len;
      });
      return total_wsize;
    }
  end

  if `$platform.io_read`
    def read(length = nil, out_string = nil)
      # Reads bytes from the stream; the stream must be opened for reading:
      # If length is nil, reads all bytes using the stream’s data mode.
      # Otherwise reads up to length bytes in binary mode.
      # Returns a string (either a new string or the given out_string
      # [currently not supported by opal]) containing the bytes read.
      # The encoding of the string depends on both length and out_string.
      %x{
        if (out_string !== nil) {
          // requires mutable Strings
          $raise(Opal.NotImplementedError, 'out_string buffer is currently not supported');
        }

        try {
          check_readable(self);
          let xenc, binm;
          if (length !== nil && length !== Infinity) {
            if (!length['$is_a?'](Opal.Integer)) {
              if (!length['$respond_to?']('to_int')) {
                $raise(Opal.TypeError, 'length cannot be converted to int');
              }
              length = length.$to_int();
            }
            if (length < 0) $raise(Opal.ArgumentError, 'invalid length');
            xenc = #{::Encoding::BINARY};
            binm = true;
            if (self.$eof()) return nil;
          } else {
            xenc = !is_nil(self.ext_enc) ? self.ext_enc : #{::Encoding.default_external};
            if (self.$eof()) return $str('', xenc);
            binm = self.binmode;
            length = Infinity;
          }

          // the true length limit will be the smaller of:
          // - max JS String size, which is Number.MAX_SAFE_INTEGER
          // - max ArrayBuffer size, which is implementation dependent
          let read_end = self.pos + length,
            read_len = self.buffer.$size(),
            bytes_read = 0,
            total_bytes_read = 0;
          while (self.pos < read_end) {
            if ((self.pos + read_len) > read_end) read_len = read_end - self.pos;
            let s = self.buffer.$size();
            if (s < (total_bytes_read + read_len)) self.buffer.$resize(s + read_len);
            bytes_read = $platform.io_read(self.fd, self.buffer, total_bytes_read, self.pos, read_len, self.file);
            total_bytes_read += bytes_read;
            self.pos += bytes_read;
            if (bytes_read < read_len) break;
          }
          if (length !== nil && length !== Infinity && bytes_read === 0) return $str('', xenc);
          let result = self.buffer.$get_raw_string(0, total_bytes_read, xenc, false);
          if (!is_nil(self.int_enc) && !truthy(binm)) result.$force_encoding(self.int_enc);
          return result;
        } finally {
          // shrink buffer to original size, freeing memory
          if (self.buffer.$size() !== DEFAULT_BUFFER_SIZE) self.buffer.$resize(DEFAULT_BUFFER_SIZE);
        }
      }
    end

    def readbyte
      # Reads and returns the next byte (in range 0..255) from the stream;
      # raises EOFError if already at end-of-stream.
      %x{
        check_readable(self);
        let b = self.$getbyte();
        if (self.$eof()) $raise(Opal.EOFError);
        return b;
      }
    end

    def readchar
      # Reads and returns the next 1-character string from the stream; raises EOFError if already at end-of-stream.
      %x{
        check_readable(self);
        let c = self.$getc();
        if (self.$eof()) $raise(Opal.EOFError);
        if (truthy(self.binmode)) return $str(c, #{::Encoding::BINARY});
        if (!is_nil(self.int_enc)) return $str(c, self.int_enc);
        if (!is_nil(self.ext_enc)) return $str(c, self.ext_enc);
        return c;
      }
    end

    def readline(sep = $/, limit = nil, chomp: false)
      # Reads a line as with IO#gets, but raises EOFError if already at end-of-stream.
      %x{
        if (self.$eof()) $raise(Opal.EOFError, 'end of file reached');
        return self.$gets(sep, limit, $hash_new('chomp', chomp));
      }
    end

    def readlines(sep = $/, limit = nil, chomp: false)
      # Reads and returns all remaining line from the stream; does not modify $_.
      %x{
        check_readable(self);

        let global_last_line = $gvars['_'];
        let res = self.$each(sep, limit, $hash_new('chomp', chomp)).$to_a();
        if (!sep['$==']($gvars['/'])) $gvars['_'] = global_last_line;
        return res;
      }
    end

    def readpartial(length, out_string = nil)
      # Reads up to length bytes from the stream; returns a string (either a new string or the given out_string).
      sysread(length, out_string)
    end

    def set_encoding_by_bom
      # If the stream begins with a BOM (byte order marker),
      # consumes the BOM and sets the external encoding accordingly;
      # returns the result encoding if found, or nil otherwise
      %x{
        if (self.opened === 'write' || self.closed === 'read' || self['$closed?']()) return nil;
        if (!truthy(self.binmode)) $raise(Opal.ArgumentError, 'ASCII incompatible encoding needs binmode');
        if (!is_nil(self.ext_enc) && !is_nil(self.int_enc)) $raise(Opal.ArgumentError, 'encoding conversion is set');

        let encoding = nil;

        // read up to 4 bytes
        let bytes_read = $platform.io_read(self.fd, self.buffer, 0, 0, 4, self.file);

        // get the read bytes
        let bom = [];
        Opal.send(self.buffer, 'each_byte', [0, bytes_read], function (byte) {
          bom.push(byte);
        });

        function bom_eq(b) {
          if (bom.length !== b.length) return false;
          for (let i = 0; i < b.length; i++) if (bom[i] !== b[i]) return false;
          return true;
        }

        if (bom.length === 4) {
          // check for 4 byte BOMS
          if (bom_eq([0x00, 0x00, 0xFE, 0xFF])) encoding = #{::Encoding::UTF_32BE};
          else if (bom_eq([0xFF, 0xFE, 0x00, 0x00])) encoding = #{::Encoding::UTF_32LE};
          else if (bom_eq([0xDD, 0x73, 0x66, 0x73])) encoding = false; // UTF-EBCDIC
          else if (bom_eq([0x84, 0x31, 0x95, 0x33])) encoding = false; // GB18030
          if (is_nil(encoding)) bom.pop(); // 4 -> 3
        }

        if (bom.length === 3) {
          // check for 3 byte BOMS
          if (bom_eq([0xEF, 0xBB, 0xBF])) encoding = #{::Encoding::UTF_8};
          else if (bom_eq([0x2B, 0x2F, 0x76])) encoding = false; // UTF-7
          else if (bom_eq([0xF7, 0x64, 0x4C])) encoding = false; // UTF-1
          else if (bom_eq([0x0E, 0xFE, 0xFF])) encoding = false; // SCSU
          else if (bom_eq([0xFB, 0xEE, 0x28])) encoding = false; // BOCU-1
          if (is_nil(encoding)) bom.pop(); // 3 -> 2
        }

        if (bom.length === 2) {
          // check for 2 byte BOMS
          if (bom_eq([0xFE, 0xFF])) encoding = #{::Encoding::UTF_16BE};
          else if (bom_eq([0xFF, 0xFE])) encoding = #{::Encoding::UTF_16LE};
        }

        if (truthy(encoding)) {
          self.pos = bom.length;
          self.ext_enc = encoding;
          return encoding;
        }

        return nil;
      }
    end

    def sysread(length, out_string = nil)
      # Behaves like IO#readpartial, except that it uses low-level system functions.
      %x{
        if (out_string !== nil) {
          // requires mutable Strings
          $raise(Opal.NotImplementedError, 'out_string buffer is currently not supported');
        }

        try {
          check_readable(self);
          if (length !== nil && length < 0) $raise(Opal.ArgumentError, 'invalid length');

          let enc = #{::Encoding::BINARY};
          if (length === 0) return $str('', enc);

          if (self.$eof()) $raise(Opal.EOFError);

          // the true limit will be the smaller of:
          // - max JS String size, which is Number.MAX_SAFE_INTEGER
          // - max ArrayBuffer size, which is implementation dependend
          let read_end = length === nil ? Infinity : self.pos + length,
            read_len = self.buffer.$size(),
            bytes_read = 0,
            total_bytes_read = 0;
          while (self.pos < read_end) {
            if ((self.pos + read_len) > read_end) read_len = read_end - self.pos;
            let s = self.buffer.$size();
            if (s < (total_bytes_read + read_len)) self.buffer.$resize(s + read_len);
            bytes_read = $platform.io_read(self.fd, self.buffer, total_bytes_read, self.pos, read_len, self.file);
            total_bytes_read += bytes_read;
            self.pos += bytes_read;
            if (bytes_read < read_len) break;
          }
          if (bytes_read === 0) return $str('', enc);
          return self.buffer.$get_raw_string(0, total_bytes_read, enc, false);
        } finally {
          // shrink buffer to original size, freeing memory
          if (self.buffer.$size() !== DEFAULT_BUFFER_SIZE) self.buffer.$resize(DEFAULT_BUFFER_SIZE);
        }
      }
    end
  else
    alias read __not_implemented__
    alias readbyte __not_implemented__
    alias readchar __not_implemented__
    alias readline __not_implemented__
    alias readlines __not_implemented__
    alias set_encoding_by_bom __not_implemented__
    alias sysread __not_implemented__
  end

  if `$platform.io_open_path`
    def reopen(path_or_io, mode = nil, **opts)
      # Reassociates the stream with another stream, which may be of a different class.
      # This method may be used to redirect an existing stream to a new destination.
      %x{
        let other_io = nil, path = nil;
        if (path_or_io['$is_a?'](Opal.IO)) {
          other_io = path_or_io;
        } else if (truthy(path_or_io)) {
          other_io = $coerce_to_or_nil(path_or_io, Opal.IO, "to_io");
          if (is_nil(other_io)) path = $coerce_to_or_raise(path_or_io, Opal.String, "to_path");
        }

        if (self.fd && (self.opened === 'duplex' || self.opened === 'write') && self.closed !== 'write' && !self['$closed?']()) {
          self.$fsync();
        }

        if (!is_nil(path)) {
          mode = truthy(mode) ? mode.split(':')[0] : 'r';
          if (self.fd && !self['$closed?']()) $platform.io_close(self.fd);
          try {
            self.fd = $platform.io_open_path(path.toString(), Opal.mode_to_flags(mode));
          } catch (e) {
            if (e.$$class !== #{::Errno::ENOENT}) throw e;
            $gvars['!'] = nil;
            if (!(self.opened === 'write' || self.opened === 'duplex')) throw e;
            self.fd = $platform.io_open_path(path.toString(), Opal.mode_to_flags('w+'));
          }
          self.path = path;
          self.pos = 0;
        } else if (!is_nil(other_io)) {
          if (self['$closed?']()) $raise(Opal.IOError, 'closed stream');
          if (other_io['$closed?']()) $raise(Opal.IOError, 'other closed stream');
          if ((other_io.opened === 'duplex' || other_io.opened === 'write') && other_io.closed !== 'write') {
            other_io.$fsync();
          }
          self.path = other_io.$path();
          if (truthy(self.path)) {
            if (self.fd && !self['$closed?']()) $platform.io_close(self.fd);
            try {
              self.fd = $platform.io_open_path(self.path.toString(), other_io.flags);
            } catch (e) {
              if (e.$$class !== #{::Errno::ENOENT}) throw e;
              $gvars['!'] = nil;
              self.fd = $platform.io_open_path(self.path.toString(), Opal.mode_to_flags('w+'));
            }
          } else {
            self.fd = other_io.$fileno();
          }
          self['$pos='](other_io.pos);
          self.opened = other_io.opened;
          self.binmode = other_io.binmode;
        } else if (truthy(self.path)) {
          if (self.fd && !self['$closed?']()) $platform.io_close(self.fd);
          try {
            self.fd = $platform.io_open_path(path.toString(), self.flags);
          } catch (e) {
            if (e.$$class !== #{::Errno::ENOENT}) throw e;
            $gvars['!'] = nil;
            self.fd = $platform.io_open_path(path.toString(), Opal.mode_to_flags('w+'));
          }
        }

        if (self.opened === 'duplex') {
          self.closed = false;
        } else if (self.opened === 'read') {
          self.closed = 'write';
        } else if (self.opened === 'write') {
          self.closed = 'read';
        }

        if (truthy(self.binmode)) self.binmode = self.$binmode();
        self.close_on_exec = self.fd > 2;

        return self;
      }
    end
  else
    alias reopen __not_implemented__
  end

  def rewind
    # Repositions the stream to its beginning, setting both the position and the line number to zero.
    `check_open(self)`
    @lineno = 0
    @pos = 0
  end

  def seek(offset, whence = SEEK_SET)
    # Seeks to the position given by integer offset (see Position) and constant whence.
    sysseek(offset, whence)
    0
  end

  def set_encoding(ext_enc, int_enc = nil, **enc_opts)
    %x{
      if (int_enc.$$is_hash) {
        enc_opts = int_enc;
        int_enc = nil;
      }

      let is_stdio = self.fd && self.fd < 3;
      let enc_def_int = #{::Encoding.default_internal};

      if (truthy(self.binmode) && self.opened === 'read') {
        self.ext_enc = #{::Encoding.default_external};
      } else if (is_nil(ext_enc) && (is_nil(enc_def_int) || is_stdio)) {
        self.ext_enc = nil;
      } else if (is_nil(ext_enc)) {
        self.ext_enc = #{::Encoding.default_external};
      } else if (ext_enc['$is_a?'](Opal.Encoding)) {
        self.ext_enc = ext_enc;
      } else {
        ext_enc = $coerce_to_or_raise(ext_enc, Opal.String, "to_str");
        if (is_nil(int_enc)) {
          let parts = ext_enc.split(':');
          ext_enc = parts[0];
          int_enc = parts[1] ?? nil;
        }
        self.ext_enc = Opal.Encoding.$find(ext_enc);
      }

      if (is_nil(int_enc) && (is_nil(enc_def_int) || is_stdio)) {
        int_enc = nil;
      } else if (is_nil(int_enc)) {
        int_enc = enc_def_int;
      } else if (int_enc['$is_a?'](Opal.Encoding)) {
        // keep int_enc
      } else {
        int_enc = Opal.Encoding.$find($coerce_to_or_raise(int_enc, Opal.String, "to_str"));
      }
      self.int_enc = int_enc === self.ext_enc ? nil : int_enc;
      return self;
    }
  end

  if `$platform.io_fstat`
    def stat
      # Returns status information for ios as an object of type File::Stat.
      `check_open(self)`
      ::File::Stat.new(@path, `$platform.io_fstat(self.fd)`)
    end
  else
    alias stat __not_implemented__
  end

  def sync
    # Returns the current sync mode of the stream. When sync mode is true,
    # all output is immediately flushed to the underlying operating system
    # and is not buffered by Ruby internally.
    `check_open(self)`
    @sync
  end

  def sync=(bool)
    # Sets the sync mode for the stream to the given value; returns the given value.
    `check_open(self)`
    @sync = !!bool
  end

  def sysseek(offset, whence = ::IO::SEEK_SET)
    # Behaves like IO#seek, except that it:
    # Uses low-level system functions.
    # Returns the new position.
    %x{
      check_open(self);
      let sz = self.$stat().$size();
      offset = $coerce_to_or_raise(offset, Opal.Integer, "to_int");
      let new_pos = nil;
      if (whence === 0 || whence === 'SET') {
        if (offset < 0) $raise(#{::Errno::EINVAL}, 'wrong value for offset');
        new_pos = offset;
      } else if (whence === 1 || whence === 'CUR') {
        new_pos = self.pos + offset;
      } else if (whence === 2 || whence === 'END') {
        new_pos = sz + offset;
      } else if (truthy(whence)) {
        $raise(#{::Errno::EINVAL}, 'wrong value for whence');
      }
      self.pos = new_pos;
      return new_pos;
    }
  end

  def syswrite(object)
    # Writes the given object to self, which must be opened for writing (see Modes);
    # returns the number bytes written. If object is not a string is converted via method to_s.
    %x{
      check_writable(self);
      let string = $coerce_to_or_raise(object, Opal.String, "to_s");
      let total_wsize = 0;
      Opal.send(string.$binary_encoding(), 'each_byte_buffer', [string, self.buffer], function (write_len) {
        let bytes_written = $platform.io_write(self.fd, self.buffer, 0, self.pos, write_len);
        if (bytes_written < write_len) $raise(Opal.IOError, 'could not write all data');
        self.pos += write_len;
        total_wsize += write_len;
      });
      if (self.sync && $platform.io_fsync) self.$fsync();
      return total_wsize;
    }
  end

  alias tell pos

  # Get the internal timeout duration or nil if it was not set.
  #   or
  # Sets the internal timeout to the specified duration or nil.
  # The timeout applies to all blocking operations where possible.
  attr_accessor :timeout

  alias to_i fileno

  def to_io
    self
  end

  alias to_path path

  alias tty? isatty

  # Pushes back (“unshifts”) the given data onto the stream’s buffer,
  # placing the data so that it is next to be read; returns nil
  alias ungetbyte __not_implemented__

  # Pushes back (“unshifts”) the given data onto the stream’s buffer,
  # placing the data so that it is next to be read; returns nil 
  alias ungetc __not_implemented__

  def write(*objects)
    # Writes each of the given objects to self, which must be opened for writing (see Access Modes);
    # returns the total number bytes written; each of objects that is not a string is converted via method to_s.
    %x{
      let total_wsize = 0;
      for (const obj of objects) {
        if (is_nil(obj)) continue;
        let str = $coerce_to_or_raise(obj, Opal.String, "to_s");
        // syswrite will use the str binary_encoding, encode accordingly
        if (!is_nil(self.ext_enc) && self.ext_enc !== #{::Encoding::BINARY}) str = $str(str, self.ext_enc);
        if (str === '') continue;
        total_wsize += self.$syswrite(str);
      }
      return total_wsize;
    }
  end
end

require 'corelib/file/constants'

::STDIN = $stdin = ::IO.new(0, 'r').set_encoding(nil, nil)
::STDOUT = $stdout = ::IO.new(1, 'w').set_encoding(nil, nil)
::STDERR = $stderr = ::IO.new(2, 'w').set_encoding(nil, nil)

# backtick_javascript: true
# Tempfile: a StringIO-backed string that also owns a unique path -
# the shape opal's node platform can offer: writes go to the string,
# an empty file at the path is made at new, its content lands on
# flush, and unlink removes it. Code
# written against CRuby's Tempfile for the common uses (rack's upload
# files, rewindable input, multipart spooling) gets #path, #write,
# #rewind, #size, #flush, #unlink and #close here.
#
# Not covered: real file semantics (the object is a string; other
# processes only see the written content after a flush), encoding
# options, and the unlink-on-GC-finalizer behavior - unlinked files
# are removed by at_exit instead.
require 'delegate'
require 'stringio'
require 'tmpdir'

class Tempfile < DelegateClass(StringIO)
  # Tracks the files not yet unlinked; one at_exit per process removes
  # whatever their owners forgot (CRuby does this with an object
  # space finalizer, which opal has no equivalent of).
  class Reaper # :nodoc:
    @files   = {}
    @installed = false

    class << self
      def register(tempfile)
        @files[tempfile] = tempfile.path
        install
      end

      def installed?
        @installed
      end

      def install
        return if @installed
        @installed = true
        at_exit { clean }
      end

      def clean
        @files.each_value do |path|
          begin
            File.delete(path) if path && File.exist?(path)
          rescue StandardError
            nil
          end
        end
        @files = {}
      end
    end
  end

  # Tempfile.new(basename, opts = {}) - opts may carry :tmpdir, like
  # rack's multipart factory passes it. With a block, yields the file
  # and returns the file (CRuby's other shape, where the block's
  # value is returned and the file left behind, is not followed).
  def self.new(*args, **opts, &block)
    file = super
    yield file if block
    file
  end

  # Tempfile.create(basename, opts = {}) { |f| ... } - the file is
  # flushed, closed and unlinked after the block.
  def self.create(*args, **opts)
    file = new(*args, **opts)
    return file unless block_given?
    begin
      yield file
    ensure
      file.flush
      file.close
      file.unlink
    end
  end

  def initialize(*args, **collected)
    opts = {}
    opts.update(collected)
    opts.update(args.pop) if args.last.is_a?(Hash)
    basename = args.shift.to_s
    basename = 'ruby' if basename.empty?
    # CRuby's older shape passes the tmpdir positionally.
    positional = args.shift.to_s
    tmpdir = opts[:tmpdir]
    tmpdir = positional unless tmpdir && !positional.empty?
    tmpdir = tmpdir.nil? || tmpdir.empty? ? (ENV['TMPDIR'] || Dir.tmpdir) : tmpdir
    stamp  = "#{basename}-#{(rand * (2**48)).floor.to_s(16).rjust(12, '0')}-#{`process.pid`}"
    @path = File.join(tmpdir, stamp)
    # like CRuby: the path exists from new on, even before content;
    # flushing is what makes it hold the written string.
    begin
      File.write(@path, '')
    rescue StandardError
      nil
    end
    super(StringIO.new)
    Tempfile::Reaper.register(self)
  end

  attr_reader :path

  def binmode
    self
  end

  def open(*)
    self
  end

  def chmod(mode)
    begin
      File.chmod(mode, @path) if @path && File.exist?(@path)
    rescue StandardError
      nil
    end
    0
  end

  # byte size of the written string, like CRuby's (#size, not
  # StringIO's character count).
  def size
    __getobj__.string.bytesize
  end
  alias filesize size
  alias bytesize size

  # materialize the string as the file on disk.
  def flush
    File.write(@path, __getobj__.string) if @path
    self
  rescue StandardError
    self
  end

  def close
    flush
  end

  def close!
    unlink
    close
  end

  def unlink
    return if @path.nil?
    begin
      File.delete(@path) if File.exist?(@path)
    rescue StandardError
      nil
    end
    @path = nil
  end
  alias delete unlink

  def close_on_unlink(*)
    # rack 3 does not use it; keep the call shape.
    false
  end
end

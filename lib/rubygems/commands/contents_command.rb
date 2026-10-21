# frozen_string_literal: true

require_relative "../command"
require_relative "../version_option"

class Gem::Commands::ContentsCommand < Gem::Command
  include Gem::VersionOption

  def initialize
    super "contents", "Display the contents of the installed gems",
          specdirs: [], lib_only: false, prefix: true,
          show_install_dir: false

    add_version_option

    add_option("--all",
               "Contents for all gems") do |all, options|
      options[:all] = all
    end

    add_option("-s", "--spec-dir a,b,c", Array,
               "Search for gems under specific paths") do |spec_dirs, options|
      options[:specdirs] = spec_dirs
    end

    add_option("-l", "--[no-]lib-only",
               "Only return files in the Gem's lib_dirs") do |lib_only, options|
      options[:lib_only] = lib_only
    end

    add_option("--[no-]prefix",
               "Don't include installed path prefix") do |prefix, options|
      options[:prefix] = prefix
    end

    add_option("--[no-]show-install-dir",
               "Show only the gem install dir") do |show, options|
      options[:show_install_dir] = show
    end

    @path_kind = nil
    @spec_dirs = nil
    @version   = nil
  end

  def arguments # :nodoc:
    "GEMNAME       name of gem to list contents for"
  end

  def defaults_str # :nodoc:
    "--no-lib-only --prefix"
  end

  def description # :nodoc:
    <<-EOF
The contents command lists the files in an installed gem.  The listing can
be given as full file names, file names without the installed directory
prefix or only the files that are requireable.
    EOF
  end

  def usage # :nodoc:
    "#{program_name} GEMNAME [GEMNAME ...]"
  end

  def execute
    @version   = options[:version] || Gem::Requirement.default
    @spec_dirs = specification_directories
    @path_kind = path_description @spec_dirs

    names = gem_names

    names.each do |name|
      found =
        if options[:show_install_dir]
          gem_install_dir name
        else
          gem_contents name
        end

      terminate_interaction 1 unless found || names.length > 1
    end
  end

  def files_in(spec)
    if spec.default_gem?
      files_in_default_gem spec
    else
      files_in_gem spec
    end
  end

  def files_in_gem(spec)
    gem_path = spec.full_gem_path

    if options[:lib_only]
      # raw_require_paths rather than require_paths, since the latter prepends
      # the absolute extension_dir, which would escape the glob base
      require_paths = spec.raw_require_paths
      return [] if require_paths.empty?

      glob = "{#{require_paths.join ","}}/**/*"
    else
      glob = "**/*"
    end

    Dir.glob(glob, base: gem_path).map do |file|
      [gem_path, file]
    end
  end

  # Opal: upstream cannot glob a default gem, because its files are not under
  # a gem directory but in the interpreter's own library path: it asks
  # $LOAD_PATH.resolve_feature_path where requiring each file lands, and
  # RbConfig::CONFIG["bindir"] where the gem's executables live. Neither is
  # here - there is no RbConfig, Opal's $LOAD_PATH has no resolve_feature_path,
  # and nothing installs a default gem, for Gem.default_specifications_dir
  # stays empty unless someone writes a gemspec into it. Such a spec is listed
  # as the ordinary directory on disk that it is.
  def files_in_default_gem(spec)
    files_in_gem spec
  end

  def gem_contents(name)
    spec = spec_for name

    return false unless spec

    files = files_in spec

    show_files files

    true
  end

  def gem_install_dir(name)
    spec = spec_for name

    return false unless spec

    say spec.gem_dir

    true
  end

  def gem_names # :nodoc:
    if options[:all]
      Gem::Specification.map(&:name)
    else
      get_all_gem_names
    end
  end

  def path_description(spec_dirs) # :nodoc:
    if spec_dirs.empty?
      "default gem paths"
    else
      "specified path"
    end
  end

  def show_files(files)
    files.sort.each do |prefix, basename|
      absolute_path = File.join(prefix, basename)
      next if File.directory? absolute_path

      if options[:prefix]
        say absolute_path
      else
        say basename
      end
    end
  end

  def spec_for(name)
    spec = Gem::Specification.find_all_by_name(name, @version).first

    return spec if spec

    say "Unable to find gem '#{name}' in #{@path_kind}"

    if Gem.configuration.verbose
      say "\nDirectories searched:"
      @spec_dirs.sort.each {|dir| say dir }
    end

    nil
  end

  def specification_directories # :nodoc:
    options[:specdirs].flat_map do |i|
      Gem::SpecificationRecord.dirs_with_abi([i, File.join(i, "specifications")])
    end
  end
end

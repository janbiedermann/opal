require 'spec_helper'
require 'rubygems'
require 'bundler'

describe 'Bundler::LockfileParser' do
  LOCK = <<~LOCK
    GEM
      remote: https://rubygems.org/
      specs:
        hello (1.0.0)
        world (0.5)
          hello (~> 1.0)

    PLATFORMS
      ruby
      x86_64-linux

    CHECKSUMS
      hello (1.0.0) sha256=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6

    DEPENDENCIES
      hello!
      world

    RUBY VERSION
       ruby 3.2.0p0

    BUNDLED WITH
       4.1.0
  LOCK

  before :each do
    @parser = Bundler::LockfileParser.new(LOCK)
  end

  it "reads the locked specs, their sources and their nested dependencies" do
    @parser.specs.map(&:full_name).sort.should == ["hello-1.0.0", "world-0.5"]
    world = @parser.specs.find {|s| s.name == "world" }
    world.dependencies.map {|d| [d.name, d.requirement.to_s] }.should == [["hello", "~> 1.0"]]
    @parser.specs.map {|s| s.source.class }.uniq.should == [Bundler::Source::Rubygems]
  end

  it "reads the sources with their remotes and the platforms" do
    source = @parser.sources.first
    source.class.should == Bundler::Source::Rubygems
    source.remotes.map(&:to_s).should == ["https://rubygems.org/"]
    @parser.platforms.map(&:to_s).sort.should == ["ruby", "x86_64-linux"]
    # Opal's local platform is the plain "ruby" one (the runtime is not tied
    # to a machine architecture), so that is the most specific match.
    @parser.most_specific_locked_platform.to_s.should == "ruby"
  end

  it "reads the dependencies, the versions of Bundler and Ruby, and the checksums flag" do
    @parser.dependencies.keys.sort.should == ["hello", "world"]
    @parser.dependencies["hello"].requirement.to_s.should == ">= 0"
    @parser.bundler_version.to_s.should == "4.1.0"
    @parser.ruby_version.should == "ruby 3.2.0p0"
    @parser.checksums.should == true
  end

  it "registers the CHECKSUMS section in the checksum store of its source" do
    store = @parser.sources.first.checksum_store
    checksum = store.store.dig("hello-1.0.0", "sha256")
    checksum.class.should == Bundler::Checksum
    checksum.digest.should == "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6"
    checksum.to_lock.should == "sha256=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6"
  end

  it "round-trips a locked GEM source through to_lock" do
    @parser.sources.first.to_lock.should == "GEM\n  remote: https://rubygems.org/\n  specs:\n"
  end

  it "answers GitError for a lock with a GIT section" do
    lock = "GIT\n  remote: https://github.com/hello/hello\n  revision: 0\n  specs:\n    hello (1.0)\n\n" \
      "PLATFORMS\n  ruby\n\nDEPENDENCIES\n  hello\n"
    -> { Bundler::LockfileParser.new(lock) }.should raise_error(Bundler::GitError)
  end

  it "answers PluginError for a lock with a PLUGIN SOURCE section" do
    lock = "PLUGIN SOURCE\n  remote: hello\n  specs:\n\nPLATFORMS\n  ruby\n\nDEPENDENCIES\n"
    -> { Bundler::LockfileParser.new(lock) }.should raise_error(Bundler::PluginError)
  end
end

describe 'Bundler::SourceList' do
  before :each do
    @list = Bundler::SourceList.new
  end

  it "has one implicit global rubygems source that allows the local one" do
    @list.default_source.class.should == Bundler::Source::Rubygems
    @list.default_source.no_remotes?.should == true
    @list.implicit_global_source?.should == true
    @list.default_source.specs.class.should == Bundler::Index
  end

  it "keeps explicit rubygems sources apart from the default one" do
    explicit = @list.add_rubygems_source("remotes" => ["https://rubygems.org/"])
    explicit.remotes.map(&:to_s).should == ["https://rubygems.org/"]
    @list.non_global_rubygems_sources.should == [explicit]
    @list.get(explicit).equal?(explicit).should == true
    @list.default_source.equal?(explicit).should == false
    @list.non_default_explicit_sources.should == [explicit]
  end

  it "adds a path source and answers it from source_list_for" do
    path = @list.add_path_source("path" => "vendor/gems/hello", "root_path" => Dir.pwd)
    path.class.should == Bundler::Source::Path
    @list.path_sources.should == [path]
    @list.source_list_for(path).should == @list.path_sources
  end

  it "answers GitError for git sources - the git source is not ported" do
    -> { @list.add_git_source("uri" => "https://github.com/hello/hello") }.
      should raise_error(Bundler::GitError)
  end
end

describe 'Bundler::Source::Path' do
  before :each do
    @source = Bundler::Source::Path.from_lock(
      "remote" => "vendor/gems/hello", "root_path" => Dir.pwd
    )
  end

  it "keeps the path and identifiers from the remote it was given" do
    # (the to_lock path is relative to Bundler.root, exercised under a Gemfile)
    @source.path.to_s.should == "vendor/gems/hello"
    @source.to_s.should == "source at `vendor/gems/hello`"
  end

  it "hashes and compares by path" do
    other = Bundler::Source::Path.from_lock(
      "remote" => "vendor/gems/hello", "root_path" => Dir.pwd
    )
    @source.eql?(other).should == true
    @source.hash.should == other.hash
  end

  it "can lock specs that carry it as their source" do
    spec = Bundler::LazySpecification.new("hello", Gem::Version.new("1.0"), "ruby", @source)
    @source.can_lock?(spec).should == true
  end
end

describe 'Bundler::Checksum' do
  it "reads a lock checksum and writes it back" do
    checksum = Bundler::Checksum.from_lock(
      "sha256=#{'deadbeef' * 8}", "Gemfile.lock:7:17"
    )
    checksum.algo.should == "sha256"
    checksum.digest.should == "deadbeef" * 8
    checksum.to_lock.should == "sha256=#{'deadbeef' * 8}"
  end

  it "registers under the full name in the store and round-trips through to_lock" do
    store = Bundler::Checksum::Store.new
    tuple = Gem::NameTuple.new("hello", Gem::Version.new("1.0.0"), Gem::Platform::RUBY)
    store.register(tuple, Bundler::Checksum.from_lock("sha256=#{'ab' * 32}", "Gemfile.lock:7:17"))
    store.missing?(tuple).should == false
    store.to_lock(tuple).should == "hello (1.0.0) sha256=#{'ab' * 32}"
  end
end

describe 'Bundler::URINormalizer' do
  it "appends a missing trailing slash to the path" do
    Bundler::URINormalizer.normalize_suffix("https://example.com").
      should == "https://example.com/"
    Bundler::URINormalizer.normalize_suffix("https://example.com/api").
      should == "https://example.com/api/"
  end

  it "does not touch a path without a final segment that already ends with a slash" do
    Bundler::URINormalizer.normalize_suffix("https://example.com/").
      should == "https://example.com/"
  end
end

describe 'Bundler::URICredentialsFilter' do
  it "removes the password from a credential-carrying URI string" do
    filtered = Bundler::URICredentialsFilter.
      credential_filtered_string("cloning https://user:sekret@github.com/hello/hello", "https://user:sekret@github.com/hello/hello")
    filtered.should == "cloning https://user@github.com/hello/hello"
  end

  it "leaves a credential-less string alone" do
    Bundler::URICredentialsFilter.
      credential_filtered_string("cloning https://github.com/hello/hello", "https://github.com/hello/hello").
      should == "cloning https://github.com/hello/hello"
  end
end

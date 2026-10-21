# backtick_javascript: true
require 'spec_helper'
require 'rubygems'
require 'rubygems/remote_fetcher'
require 'rubygems/resolver'
require 'rubygems/source'
require 'digest'
require 'fileutils'
require_relative 'support/http_fixture'

# The remote half of Gem::Source: the resolver set it picks for a server, the two
# index formats it reads, the marshalled spec dump it fetches for one gem, and the
# .gem it downloads. The fixture server is the one in support/http_fixture.rb; the
# bodies of the index files are built here, so the example says what a real server
# would put on the wire.

describe 'Gem::Source over the Node transport' do
  before :all do
    skip 'this runner has no HTTP transport' unless Gem::HTTPTransport.available?

    @info_helper = "1.0.0 \n1.1.0 helper_dep:~> 1.0\n1.2.0.pre.1 \n"
    @info_other = "0.1-java\n"
    @versions = format(
      "helper 1.0.0,1.1.0,1.2.0.pre.1 %s\nother 0.1-java %s\n",
      Digest::MD5.hexdigest(@info_helper), Digest::MD5.hexdigest(@info_other)
    )

    # a marshal index carries the version and the platform as objects, the way
    # `gem generate_index` dumps them, not as their strings
    @specs_gz = Gem::Util.gzip Marshal.dump([
      ['helper', Gem::Version.new('1.0.0'), Gem::Platform::RUBY],
      ['helper', Gem::Version.new('1.1.0'), Gem::Platform::RUBY],
      ['other', Gem::Version.new('0.1'), Gem::Platform.new('java')],
    ])
    @latest_gz = Gem::Util.gzip Marshal.dump([
      ['helper', Gem::Version.new('1.1.0'), Gem::Platform::RUBY],
      ['other', Gem::Version.new('0.1'), Gem::Platform.new('java')],
    ])
    @prerelease_gz = Gem::Util.gzip Marshal.dump([['helper', Gem::Version.new('1.2.0.pre.1'), Gem::Platform::RUBY]])
    # a .gem built here, for the source the install example reads: the installer
    # has to unpack a package it downloaded, so the bytes have to be a real gem
    @info_tiny = "0.1.0 \n"
    build_dir = tmp 'remote_build_dir'
    FileUtils.mkdir_p File.join(build_dir, 'lib')
    File.write File.join(build_dir, 'lib', 'tiny.rb'), "module Tiny\nend\n"
    tiny = Gem::Specification.new 'tiny', '0.1.0'
    tiny.summary = 'the tiny gem'
    tiny.authors = ['Opal']
    tiny.files = ['lib/tiny.rb']
    tiny.require_paths = ['lib']
    Dir.chdir build_dir do
      @tiny_built = Gem::Package.build(tiny)
    end
    @tiny_bytes = File.binread File.join(build_dir, @tiny_built)

    # written by CRuby: Opal dumps an object with its ivars where CRuby writes a
    # user-defined body, and the quick index only ever carries the latter
    @spec_rz = File.binread File.expand_path('fixtures/helper-1.0.0.gemspec.rz', __dir__)
    @gem_bytes = File.binread File.expand_path('fixtures/cruby-tiny-0.1.0.gem', __dir__)

    @port = GemsHTTPFixture.start(
      '/ci/names' => { body: "helper\nother\n", etag: '"names-1"' },
      '/ci/versions' => { body: @versions, etag: '"versions-1"' },
      '/ci/info/helper' => { body: @info_helper, etag: '"info-1"' },
      '/ci/info/other' => { body: @info_other },
      # the marshal index source has no versions file, which is what sends the
      # resolver set back to the marshal format
      '/marshal/versions' => { body: 'no compact index here', status: 404 },
      '/marshal/specs.4.8.gz' => { body: @specs_gz, type: 'application/octet-stream' },
      '/marshal/latest_specs.4.8.gz' => { body: @latest_gz, type: 'application/octet-stream' },
      '/marshal/prerelease_specs.4.8.gz' => { body: @prerelease_gz, type: 'application/octet-stream' },
      '/marshal/quick/Marshal.4.8/helper-1.0.0.gemspec.rz' => {
        body: @spec_rz, type: 'application/octet-stream',
      },
      '/gems/cruby-tiny-0.1.0.gem' => { body: @gem_bytes, type: 'application/octet-stream' },
      # the compact index the install example reads: one gem, with the .gem to
      # download under the path the source builds from its name tuple
      '/ciinstall/names' => { body: "tiny\n" },
      '/ciinstall/versions' => { body: "tiny 0.1.0 #{Digest::MD5.hexdigest(@info_tiny)}\n" },
      '/ciinstall/info/tiny' => { body: @info_tiny },
      '/ciinstall/gems/tiny-0.1.0.gem' => { body: @tiny_bytes, type: 'application/octet-stream' }
    )
    @base = "http://127.0.0.1:#{@port}"

    # the cache of a remote source lives under Gem.spec_cache_dir, which is the
    # developer's own until a spec says otherwise
    @saved_cache = ENV['GEM_SPEC_CACHE']
    ENV['GEM_SPEC_CACHE'] = tmp 'gems_source_spec_cache'
    Gem.clear_paths
  end

  after :all do
    GemsHTTPFixture.stop
    ENV['GEM_SPEC_CACHE'] = @saved_cache
    Gem.clear_paths
  end

  def tuples(source, type)
    source.load_specs(type).map {|tuple| [tuple.name, tuple.version.to_s, tuple.platform.to_s] }
  end

  it 'reads a server that publishes a compact index through the API set' do
    set = Gem::Source.new("#{@base}/ci/").dependency_resolver_set

    set.class.should == Gem::Resolver::APISet
    set.dep_uri.to_s.should == "#{@base}/ci/info/"
    set.uri.to_s.should == "#{@base}/ci/"
  end

  it 'reads a server that does not through the marshal index set' do
    Gem::Source.new("#{@base}/marshal/").dependency_resolver_set.class
      .should == Gem::Resolver::IndexSet
  end

  it 'puts the trailing slash back on a source URI that has none' do
    # Gem::Source#enforce_trailing_slash merges "/" onto the path, and a source
    # given as host plus one path segment arrives with no trailing slash. The
    # merge is what the ported RFC 3986 pattern used to refuse, see
    # spec/opal/stdlib/uri/parse_relative_ref_spec.rb.
    source = Gem::Source.new "#{@base}/ci"

    source.dependency_resolver_set.class.should == Gem::Resolver::APISet
    tuples(source, :released).should == [
      ['helper', '1.0.0', 'ruby'], ['helper', '1.1.0', 'ruby'], ['other', '0.1', 'java'],
    ]
  end

  it 'lists the gems of the compact index by kind' do
    source = Gem::Source.new "#{@base}/ci/"

    tuples(source, :released).should == [
      ['helper', '1.0.0', 'ruby'], ['helper', '1.1.0', 'ruby'], ['other', '0.1', 'java'],
    ]
    tuples(source, :prerelease).should == [['helper', '1.2.0.pre.1', 'ruby']]
    tuples(source, :latest).should == [['helper', '1.1.0', 'ruby'], ['other', '0.1', 'java']]
  end

  it 'lists the gems of the marshal index by kind' do
    source = Gem::Source.new "#{@base}/marshal/"

    tuples(source, :released).should == [
      ['helper', '1.0.0', 'ruby'], ['helper', '1.1.0', 'ruby'], ['other', '0.1', 'java'],
    ]
    tuples(source, :prerelease).should == [['helper', '1.2.0.pre.1', 'ruby']]
    tuples(source, :latest).should == [['helper', '1.1.0', 'ruby'], ['other', '0.1', 'java']]
  end

  it 'fetches the specification of one gem from the marshal quick index' do
    spec = Gem::Source.new("#{@base}/marshal/")
      .fetch_spec Gem::NameTuple.new('helper', '1.0.0')

    spec.class.should == Gem::Specification
    spec.name.should == 'helper'
    spec.version.to_s.should == '1.0.0'
    spec.summary.should == 'the helper gem'
    # the CRuby payload carries a created_at Time, which the marshal reader here
    # decodes from the two packed words CRuby writes
    spec.date.should be_kind_of(Time)
  end

  it 'answers a specification from the compact index without fetching its gemspec' do
    set = Gem::Source.new("#{@base}/ci/").dependency_resolver_set
    request = Gem::Resolver::DependencyRequest.new Gem::Dependency.new('helper', '~> 1.0'), nil
    found = set.find_all request

    found.map {|api| [api.class.name, api.version.to_s] }.should == [
      ['Gem::Resolver::APISpecification', '1.0.0'],
      ['Gem::Resolver::APISpecification', '1.1.0'],
    ]

    spec = found.last.spec
    spec.name.should == 'helper'
    spec.version.to_s.should == '1.1.0'
    spec.dependencies.map {|d| [d.name, d.requirement.to_s] }.should == [['helper_dep', '~> 1.0']]
    found.last.installable_platform?.should == true
  end

  it 'fetches a name tuple the compact index lists, and its content address' do
    set = Gem::Source.new("#{@base}/ci/").dependency_resolver_set
    request = Gem::Resolver::DependencyRequest.new Gem::Dependency.new('other', '>= 0'), nil
    api = set.find_all(request).first

    api.version.to_s.should == '0.1'
    api.platform.to_s.should == 'java'
    api.spec.platform.to_s.should == 'java'
  end

  it 'downloads the gem a source lists into a directory' do
    dir = tmp 'gems_source_download'
    FileUtils.mkdir_p dir
    spec = Gem::Specification.new 'cruby-tiny', '0.1.0'
    spec.summary = 'A tiny gem.'
    spec.authors = ['Opal']

    Gem::Source.new("#{@base}/").download spec, dir

    path = File.join dir, 'cache', 'cruby-tiny-0.1.0.gem'
    File.exist?(path).should == true
    File.size(path).should == @gem_bytes.bytesize
    rm_r dir
  end

  it 'refuses to list a source that answers nothing' do
    -> { Gem::Source.new("#{@base}/nowhere/").load_specs(:released) }
      .should raise_error(Gem::RemoteFetcher::FetchError, /Bad response/)
  end

  it 'installs the gem its index offers, down to the files on disk' do
    # the whole M5 path in one go: the compact index answers for the gem, the
    # .gem is downloaded into the cache of the gem home, and the install unpacks
    # the package there. The compact index is the set that needs no second
    # fetch: its information line carries the dependencies and the requirements,
    # so no quick index is asked for. Everything stays on the fixture's port.
    home = tmp 'remote_install_home'
    saved_home, saved_path = ENV['GEM_HOME'], ENV['GEM_PATH']
    saved_sources = Gem.sources.to_a
    ENV['GEM_HOME'] = home
    ENV['GEM_PATH'] = home
    Gem.sources = ["#{@base}/ciinstall/"]

    begin
      installed = Gem::DependencyInstaller.new(domain: :remote, install_dir: home).install 'tiny'
      installed.map(&:full_name).should == ['tiny-0.1.0']

      File.exist?(File.join(home, 'specifications', 'tiny-0.1.0.gemspec')).should == true
      File.exist?(File.join(home, 'gems', 'tiny-0.1.0', 'lib', 'tiny.rb')).should == true
      # the downloaded .gem stays in the cache of the home it was installed into
      File.exist?(File.join(home, 'cache', 'tiny-0.1.0.gem')).should == true
    ensure
      Gem.sources = saved_sources
      ENV['GEM_HOME'], ENV['GEM_PATH'] = saved_home, saved_path
      Gem.clear_paths
      Gem::Specification.reset
      rm_r home
    end
  end
end

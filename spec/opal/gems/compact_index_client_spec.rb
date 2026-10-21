require 'spec_helper'
require 'rubygems'
require 'rubygems/compact_index_client'
require 'digest'
require 'fileutils'

# The compact index client: the files it keeps, the conditional requests that
# keep them small, and the parsing of the three index files. The fetcher here is
# a stand-in, so the examples say what the client does rather than what a server
# answers; the reads over the transport are in remote_source_spec.rb.

class FakeFetcher
  attr_reader :calls

  # the routes are the paths the client asks for, named the way the compact
  # index names them; a route that carries an ETag answers 304 to the request
  # that comes back with it, as the fixture server of the remote specs does
  def initialize(routes)
    @routes = routes
    @calls = []
  end

  def call(path, headers = {})
    @calls << [path, headers]
    route = @routes.fetch(path) { raise "no fixture for #{path}" }
    if route[:etag] && headers['If-None-Match'] == route[:etag]
      return Gem::Net::HTTP.response_for(304, '', {}, '')
    end
    response_headers = (route[:headers] || {}).dup
    response_headers['ETag'] = route[:etag] if route[:etag]
    Gem::Net::HTTP.response_for route[:status] || 200, '', response_headers, route[:body].to_s
  end

  def paths
    @calls.map {|(path, _headers)| path }
  end
end

describe 'Gem::CompactIndexClient' do
  before :each do
    @dir = tmp 'compact_index'
    @fetcher = nil
  end

  after :each do
    rm_r @dir
  end

  def info_body
    "1.0.0 \n1.1.0 helper_dep:~> 1.0\n"
  end

  def versions_body
    helper_checksum = Digest::MD5.hexdigest(info_body)
    other_checksum = Digest::MD5.hexdigest("0.1-java\n")
    "helper 1.0.0,1.1.0 #{helper_checksum}\nother 0.1-java #{other_checksum}\n"
  end

  def index_routes
    {
      'names' => { body: "helper\nother\n", etag: '"names-1"' },
      'versions' => { body: versions_body, etag: '"versions-1"' },
      'info/helper' => { body: info_body, etag: '"info-1"' },
      'info/other' => { body: "0.1-java\n" },
    }
  end

  def client(routes, directory = @dir)
    @fetcher = FakeFetcher.new routes
    Gem::CompactIndexClient.new directory, @fetcher
  end

  # the path the cache keeps the ETag of one gem's info file under
  def info_etag_path(name)
    File.join @dir, 'info-etags', "#{name}-#{Digest::MD5.hexdigest(name).downcase}"
  end

  def read_info(name)
    File.read File.join(@dir, 'info', name)
  end

  it 'reads the names and the versions of the index' do
    gem_client = client index_routes

    names = gem_client.names
    versions = gem_client.versions

    names.should == %w[helper other]
    versions['helper'].should == [['helper', '1.0.0'], ['helper', '1.1.0']]
    # a platform version is listed with its suffix, and the parser splits it
    versions['other'].should == [['other', '0.1', 'java']]
    @fetcher.paths.should == %w[names versions]
  end

  it 'writes the files it read under the cache directory' do
    client(index_routes).versions

    File.read(File.join(@dir, 'versions')).should == versions_body
    File.read(File.join(@dir, 'versions.etag')).should == 'versions-1'
  end

  it 'parses the info line into a version, a platform, dependencies and requirements' do
    gem_client = client index_routes

    gem_client.info('helper').should == [
      ['helper', '1.0.0', nil, [], []],
      ['helper', '1.1.0', nil, [['helper_dep', ['~> 1.0']]], []],
    ]
    gem_client.info('other').should == [['other', '0.1', 'java', [], []]]
  end

  it 'asks with the ETag it stored and keeps the cached file on a 304' do
    client(index_routes).versions

    second = client index_routes
    second.versions['helper'].should == [['helper', '1.0.0'], ['helper', '1.1.0']]
    @fetcher.calls.first[0].should == 'versions'
    @fetcher.calls.first[1]['If-None-Match'].should == '"versions-1"'
    File.read(File.join(@dir, 'versions')).should == versions_body
  end

  it 'reads a cached info file again only when the versions index disagrees with it' do
    client(index_routes).info('helper')
    @fetcher.paths.should == %w[versions info/helper]

    # the cached file hashes to what the versions index says about it, so the
    # second client reads the disk
    second = client index_routes
    second.info('helper').map {|row| row[1] }.should == %w[1.0.0 1.1.0]
    @fetcher.paths.should == ['versions']

    # an index that disagrees about the checksum sends it back to the server
    routes = index_routes.merge('versions' => { body: "helper 1.0.0,1.1.0 deadbeef\n" })
    third = client routes
    third.info('helper').map {|row| row[1] }.should == %w[1.0.0 1.1.0]
    @fetcher.paths.should == %w[versions info/helper]
  end

  it 'fetches one info file without reading the versions index' do
    gem_client = client index_routes

    gem_client.fetch_info('helper').first.should == ['helper', '1.0.0', nil, [], []]
    @fetcher.paths.should == ['info/helper']
  end

  it 'appends the range the server sends instead of refetching the whole file' do
    original = "1.0.0 \n"
    tail = "1.1.0\n"
    # the range starts one byte before the end of the cache, so the answer
    # repeats that byte and the updater shaves it off again
    ranged = original[-1] + tail

    FileUtils.mkdir_p File.join(@dir, 'info')
    File.write File.join(@dir, 'info', 'helper'), original
    FileUtils.mkdir_p File.join(@dir, 'info-etags')
    File.write info_etag_path('helper'), 'info-1'

    routes = index_routes
    routes['info/helper'] = {
      body: ranged, status: 206, etag: '"info-2"',
      headers: { 'digest' => "sha-256=:#{Digest(:SHA256).base64digest(original + tail)}:" },
    }

    gem_client = client routes
    gem_client.info('helper').map {|row| row[1] }.should == %w[1.0.0 1.1.0]
    read_info('helper').should == original + tail
    @fetcher.calls.find {|(path, _headers)| path == 'info/helper' }[1]['Range']
      .should == "bytes=#{original.bytesize - 1}-"
    File.read(info_etag_path('helper')).should == 'info-2'
  end

  it 'refuses an answer whose digest does not match the body it carried' do
    FileUtils.mkdir_p File.join(@dir, 'info')
    File.write File.join(@dir, 'info', 'helper'), "1.0.0 \n"
    FileUtils.mkdir_p File.join(@dir, 'info-etags')
    File.write info_etag_path('helper'), 'info-1'

    routes = index_routes
    routes['info/helper'] = { body: "1.1.0\n", status: 206, headers: { 'digest' => 'sha-256=:not the digest:' } }

    gem_client = client routes
    -> { gem_client.info('helper') }
      .should raise_error(Gem::CompactIndexClient::Updater::MismatchedChecksumError, /does not match the checksum/)
  end

  it 'writes the whole file back when the server answers a range with the file' do
    routes = index_routes.merge('info/helper' => { body: "1.0.0 \n1.1.0\n", status: 200 })

    FileUtils.mkdir_p File.join(@dir, 'info')
    File.write File.join(@dir, 'info', 'helper'), 'stale'

    gem_client = client routes
    gem_client.info('helper').map {|row| row[1] }.should == %w[1.0.0 1.1.0]
    read_info('helper').should == "1.0.0 \n1.1.0\n"
  end

  it 'says it is available only when the versions index lists something' do
    client(index_routes.merge('versions' => { body: '' })).available?.should == false
    client(index_routes).available?.should == true
  end

  it 'forgets what it fetched on reset, and fetches it again' do
    gem_client = client index_routes
    gem_client.names
    gem_client.names
    @fetcher.paths.should == ['names']

    gem_client.reset!
    gem_client.names
    @fetcher.paths.should == %w[names names]
  end
end

describe 'Gem::CompactIndexClient::HTTPFetcher' do
  # the fetcher in front of the client, and a stand-in RemoteFetcher in front of
  # that: the stand-in answers in the classes the compact index code reads a
  # response through, so the redirects and refusals below are the ported ones
  class FakeRemoteFetcher
    attr_reader :requests

    def initialize(responses)
      @responses = responses
      @requests = []
    end

    def request(uri, request_class)
      request = request_class.new uri
      yield request if block_given?
      @requests << [uri.to_s, request.headers]
      @responses.shift or raise "no response left for #{uri}"
    end
  end

  def fetcher(responses, base = 'https://example.test/')
    @remote = FakeRemoteFetcher.new responses
    Gem::CompactIndexClient::HTTPFetcher.new base, @remote
  end

  def response(status, body = '', headers = {})
    Gem::Net::HTTP.response_for status, '', headers, body
  end

  it 'keeps the base URI of the index and makes the path relative to it' do
    fetcher([response(200, 'index')]).call 'versions'

    @remote.requests.first[0].should == 'https://example.test/versions'
  end

  it 'hands the headers it was given to the request' do
    fetcher([response(200, 'index')]).call 'versions', 'Range' => 'bytes=4-'

    @remote.requests.first[1]['range'].should == 'bytes=4-'
  end

  it 'follows a redirect, and carries the credentials of the URI across it' do
    fetcher([response(301, '', 'location' => 'https://example.test/moved/versions'),
             response(200, 'index')], 'https://usr:pass@example.test/').call 'versions'

    @remote.requests.map(&:first).should == [
      'https://usr:pass@example.test/versions',
      'https://usr:pass@example.test/moved/versions',
    ]
  end

  it 'refuses a redirect that leaves https' do
    -> { fetcher([response(302, '', 'location' => 'http://example.test/versions')]).call('versions') }
      .should raise_error(Gem::RemoteFetcher::FetchError, /non-https resource/)
  end

  it 'stops after ten redirects' do
    responses = Array.new(11) { response(302, '', 'location' => '/again') }
    -> { fetcher(responses).call('versions') }
      .should raise_error(Gem::RemoteFetcher::FetchError, /too many redirects/)
  end

  it 'names what the server said when it answers an error' do
    -> { fetcher([response(404, 'gone', 'x-error-message' => 'no such gem')]).call('versions') }
      .should raise_error(Gem::RemoteFetcher::FetchError, /bad response no such gem 404/)
  end

  it 'refuses an answer with no body where the cache is written from one' do
    -> { fetcher([response(204)]).call('versions') }
      .should raise_error(Gem::RemoteFetcher::FetchError, /bad response/)
  end

  it 'asks again without the range when the local cache is longer than the file' do
    fetcher([response(416), response(200, 'whole file')])
      .call('versions', 'Range' => 'bytes=100-', 'If-None-Match' => '"x"')

    @remote.requests.size.should == 2
    @remote.requests.last[1]['range'].should be_nil
    @remote.requests.last[1]['if-none-match'].should be_nil
  end
end

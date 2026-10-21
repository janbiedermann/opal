# backtick_javascript: true
require 'spec_helper'
require 'rubygems'
require 'rubygems/remote_fetcher'
require 'fileutils'
require_relative 'support/http_fixture'

# The half of M5 that reads over the network, and the net/http names the ported
# code reads an answer through.
#
# The fixture server runs on a Node Worker (see support/http_fixture.rb), so the
# suite needs the Node runner: an example skips when the platform has no
# transport to load (Gem::HTTPTransport.available?).

describe 'Gem::RemoteFetcher over the Node transport' do
  before :all do
    skip 'this runner has no HTTP transport' unless Gem::HTTPTransport.available?
    @port = GemsHTTPFixture.start
    @base = "http://127.0.0.1:#{@port}"
  end

  after :all do
    GemsHTTPFixture.stop
  end

  before :each do
    @fetcher = Gem::RemoteFetcher.new
  end

  after :each do
    @fetcher.close_all
  end

  it 'reads a body' do
    Gem::HTTPTransport.fetch("http://127.0.0.1:#{@port}/info/rake").body.should == "rake,13.2.1\nrake,13.1.0\n"
  end

  it 'keeps the bytes of a body and labels it ASCII-8BIT' do
    data = @fetcher.fetch_path("#{@base}/bytes")
    data.bytes.should == [0x00, 0xff, 0xc3, 0xa9, 0x41]
    data.size.should == 5
    data.encoding.should == Encoding::BINARY
  end

  it 'answers the response, not the body, for a head request' do
    response = @fetcher.fetch_path("#{@base}/info/rake", nil, true)
    response.should be_kind_of(Gem::Net::HTTPOK)
    response.code.should == '200'
    response.body.should == ''
  end

  it 'follows a redirect to a relative location' do
    @fetcher.fetch_path("#{@base}/redirect-once").should == "rake,13.2.1\nrake,13.1.0\n"
  end

  it 'stops following a redirect after ten hops' do
    -> { @fetcher.fetch_path("#{@base}/redirect-loop") }
      .should raise_error(Gem::RemoteFetcher::FetchError, /too many redirects/)
  end

  it 'refuses a redirect with no location to follow' do
    -> { @fetcher.fetch_path("#{@base}/redirect-no-location") }
      .should raise_error(Gem::RemoteFetcher::FetchError, /no redirect location/)
  end

  it 'raises with the status and the server X-Error-Message header' do
    -> { @fetcher.fetch_path("#{@base}/missing") }
      .should raise_error(Gem::RemoteFetcher::FetchError, /Bad response no such gem 404/)
  end

  it 'gunzips a body whose URL ends in .gz' do
    @fetcher.fetch_path("#{@base}/versions.4.gz").should == 'the index'
  end

  it 'keeps a cached copy when the server answers 304' do
    dir = tmp('gems_remote_fetcher')
    path = File.join dir, 'cond.txt'
    FileUtils.mkdir_p dir
    File.write path, 'kept'

    mtime = File.stat(path).mtime
    @fetcher.cache_update_path("#{@base}/cond", path).should == 'kept'
    File.read(path).should == 'kept'
    mtime.should be_kind_of(Time)
  end

  it 'sends If-Modified-Since for the mtime it was given' do
    dir = tmp('gems_remote_fetcher_mtime')
    FileUtils.mkdir_p dir
    path = File.join dir, 'echo.txt'
    File.write path, 'stale'

    data = @fetcher.cache_update_path("#{@base}/echo", path)
    data.should include('if-modified-since=')
  end

  it 'sends the RubyGems user agent' do
    @fetcher.fetch_path("#{@base}/echo").should include("user-agent=RubyGems/#{Gem::VERSION} ")
  end

  it 'does not send the keep-alive pair the transport keeps for itself' do
    echo = @fetcher.fetch_path("#{@base}/echo")
    echo.should_not include('keep-alive=30')
  end

  it 'sends the credentials of the URI as basic auth' do
    @fetcher.fetch_path("http://usr:p%2Fss@127.0.0.1:#{@port}/auth").should == 'authorized'
    -> { @fetcher.fetch_path("#{@base}/auth") }
      .should raise_error(Gem::RemoteFetcher::FetchError, /Bad response Unauthorized 401/)
  end

  it 'redacts the credentials of a URI in a FetchError' do
    error = nil
    begin
      @fetcher.fetch_path("http://usr:secret@127.0.0.1:#{@port}/missing")
    rescue Gem::RemoteFetcher::FetchError => e
      error = e
    end
    error.message.should_not include('secret')
    error.uri.should include('REDACTED')
    error.original_uri.should include('secret')
  end

  it 'names what went wrong when the host cannot be found' do
    -> { @fetcher.fetch_path('http://no-such-host.invalid/x') }
      .should raise_error(Gem::RemoteFetcher::FetchError, /ENOTFOUND/)
  end

  it 'refuses an s3 source' do
    -> { Gem::RemoteFetcher.new.fetch_path('s3://bucket/gems/x.gem') }
      .should raise_error(Gem::RemoteFetcher::FetchError, /s3 sources are not supported/)
  end

  it 'refuses a scheme it does not know' do
    -> { @fetcher.fetch_path('ftp://example/x') }
      .should raise_error(ArgumentError, /uri scheme is invalid/)
  end

  it 'fetches again after close_all stopped the transport' do
    @fetcher.close_all
    @fetcher.fetch_path("#{@base}/info/rake").should == "rake,13.2.1\nrake,13.1.0\n"
  end
end

describe 'the Gem::Net::HTTP names the ported code reads' do
  it 'puts the status classes where Net::HTTP puts them' do
    Gem::Net::HTTPOK.ancestors.should include(Gem::Net::HTTPSuccess)
    Gem::Net::HTTPFound.ancestors.should include(Gem::Net::HTTPRedirection)
    Gem::Net::HTTPNotModified.ancestors.should include(Gem::Net::HTTPRedirection)
    Gem::Net::HTTPNotFound.ancestors.should include(Gem::Net::HTTPClientError)
  end

  it 'builds the class a status names, and the class of its range otherwise' do
    Gem::Net::HTTP.response_for(200, 'OK', {}, '').should be_kind_of(Gem::Net::HTTPOK)
    Gem::Net::HTTP.response_for(304, 'Not Modified', {}, '').should be_kind_of(Gem::Net::HTTPNotModified)
    Gem::Net::HTTP.response_for(299, 'Odd', {}, '').should be_kind_of(Gem::Net::HTTPSuccess)
    Gem::Net::HTTP.response_for(418, 'teapot', {}, '').should be_kind_of(Gem::Net::HTTPClientError)
  end

  it 'answers no body for a status that forbids one' do
    Gem::Net::HTTP.response_for(304, 'Not Modified', {}, 'x').body.should be_nil
    Gem::Net::HTTP.response_for(204, 'No Content', {}, 'x').body.should be_nil
    Gem::Net::HTTPNotModified.body_permitted?.should == false
    Gem::Net::HTTPOK.body_permitted?.should == true
  end

  it 'reads a header by any spelling and joins one given twice' do
    response = Gem::Net::HTTP.response_for(200, 'OK', { 'x-one' => 'a' }, '')
    response['X-One'].should == 'a'
    response['x-one'].should == 'a'

    fetched = Gem::Net::HTTP.response_for(200, 'OK', { 'set-cookie' => 'a=1, b=2' }, '')
    fetched['set-cookie'].should == 'a=1, b=2'
  end

  it 'keeps the request classes and their spellings' do
    request = Gem::Net::HTTP::Get.new('/info/rake')
    request.http_method_name.should == 'GET'
    request.add_field 'Accept', 'text/plain'
    request['accept'].should == 'text/plain'
    request['X-Other'] = 'value'
    request.headers['x-other'].should == 'value'
    Gem::Net::HTTP::Head.new('/info/rake').http_method_name.should == 'HEAD'
  end

  it 'turns credentials into an Authorization header' do
    request = Gem::Net::HTTP::Get.new('/auth')
    request.basic_auth 'usr', 'p/ss'
    request['authorization'].should ==
      "Basic #{`Buffer.from('usr:p/ss').toString('base64')`}"
  end
end

# backtick_javascript: true
require 'spec_helper'
require 'rubygems'
require 'rubygems/remote_fetcher'
require 'fileutils'

# The half of M5 that reads over the network, and the net/http names the ported
# code reads an answer through.
#
# The fixture server runs on a Node Worker (see GemsHTTPFixture below), so the
# suite needs the Node runner: an example skips when the platform has no
# transport to load (Gem::HTTPTransport.available?).

# An HTTP server on a Worker of its own. It cannot run in the process the spec
# runs in: Gem::HTTPTransport parks the main thread in Atomics.wait while a
# request is in flight, so a server on that thread could not answer it.
module GemsHTTPFixture
  SERVER_SOURCE = <<~JS
    const { parentPort, workerData } = require("node:worker_threads");
    const http = require("node:http");
    const zlib = require("node:zlib");

    const server = http.createServer((req, res) => {
      if (req.url === "/info/rake") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("rake,13.2.1\\nrake,13.1.0\\n");
      } else if (req.url === "/bytes") {
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end(Buffer.from([0x00, 0xff, 0xc3, 0xa9, 0x41]));
      } else if (req.url === "/versions.4.gz") {
        // a gzip file served as its bytes: fetch_path gunzips it by the URL
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end(zlib.gzipSync("the index"));
      } else if (req.url === "/redirect-once") {
        res.writeHead(302, { location: "/info/rake" });
        res.end();
      } else if (req.url === "/redirect-loop") {
        res.writeHead(302, { location: "/redirect-loop" });
        res.end();
      } else if (req.url === "/redirect-no-location") {
        res.writeHead(302);
        res.end();
      } else if (req.url === "/missing") {
        res.writeHead(404, { "x-error-message": "no such gem" });
        res.end("not here");
      } else if (req.url === "/cond") {
        if (req.headers["if-modified-since"]) {
          res.writeHead(304);
          res.end();
        } else {
          res.writeHead(200, { "last-modified": "Wed, 01 Jan 2025 00:00:00 GMT" });
          res.end("fresh");
        }
      } else if (req.url === "/auth") {
        const wanted = "Basic " + Buffer.from("usr:p/ss").toString("base64");
        if (req.headers.authorization === wanted) {
          res.writeHead(200);
          res.end("authorized");
        } else {
          res.writeHead(401, { "www-authenticate": "Basic" });
          res.end("denied");
        }
      } else if (req.url === "/echo") {
        const lines = [req.method];
        for (const [name, value] of Object.entries(req.headers)) lines.push(name + "=" + value);
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(lines.join("\\n"));
      } else {
        res.writeHead(500);
        res.end("boom");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      workerData.port.postMessage(server.address().port);
      Atomics.add(workerData.ready, 0, 1);
      Atomics.notify(workerData.ready, 0);
    });
  JS

  class << self
    def start
      %x{
        if (Opal.__gems_fixture_port !== undefined) return Opal.__gems_fixture_port;

        const { MessageChannel, Worker, receiveMessageOnPort } = require("node:worker_threads");
        const ready = new Int32Array(new SharedArrayBuffer(4));
        const { port1, port2 } = new MessageChannel();
        const worker = new Worker(String(#{SERVER_SOURCE}), {
          eval: true,
          workerData: { ready, port: port2 },
          transferList: [port2],
        });
        worker.unref();
        port1.unref();
        // The Worker has to be waited for the way the transport is: this thread
        // is the event loop, and it only reaches the answer by polling the port.
        Atomics.wait(ready, 0, 0, 10000);
        const message = receiveMessageOnPort(port1);
        if (!message) {
          worker.terminate();
          throw new Error("the fixture server did not answer");
        }
        Opal.__gems_fixture_worker = worker;
        Opal.__gems_fixture_port = message.message;
        return message.message;
      }
    end

    def stop
      %x{
        if (Opal.__gems_fixture_worker !== undefined) {
          Opal.__gems_fixture_worker.terminate();
          Opal.__gems_fixture_worker = undefined;
        }
        Opal.__gems_fixture_port = undefined;
      }
    end
  end
end

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

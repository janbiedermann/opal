require 'spec_helper'
require 'rubygems'
require 'rubygems/uri'
require 'bundler'
require 'bundler/fetcher'

describe 'Bundler remote fetch slice' do
  # the Fetcher stack itself reaches the network, and the e2e in
  # spec/lib/gems/bundler_cli.test.mjs drives that loop over the fixture
  # server; what sits here are the units that answer before any byte goes
  # over the wire: Remote's URI handling, Retry's loop, and the Fetcher's
  # class switches.

  it 'keeps a remote URI and anonymizes it for display' do
    remote = Bundler::Source::Rubygems::Remote.new(Gem::URI.parse('http://user:pw@example.com/ci/'))
    remote.uri.to_s.should == 'http://user:pw@example.com/ci/'
    remote.anonymized_uri.to_s.should == 'http://example.com/ci/'
    remote.to_s.should == 'rubygems remote at http://example.com/ci/'
    remote.original_uri.should == nil
  end

  it 'builds a cache slug from host and URI digest' do
    slug = Bundler::Source::Rubygems::Remote.new(Gem::URI.parse('https://example.com/ci/')).cache_slug
    !!(/example\.com\.[0-9a-f]{32}/ =~ slug).should == true
  end

  it 'answers no cooldown when no cooldown is configured' do
    remote = Bundler::Source::Rubygems::Remote.new(Gem::URI.parse('https://example.com/ci/'))
    remote.effective_cooldown.should == nil
  end

  it 'retries a flaky block through Retry' do
    runs = 0
    result = Bundler::Retry.new('spec retry', [], 2, base_delay: 0).attempts do
      runs += 1
      raise 'flaky' if runs < 2
      'ok'
    end
    result.should == 'ok'
    runs.should == 2
  end

  it 'raises the last run of a Retry that never succeeds' do
    runs = 0
    -> {
      Bundler::Retry.new('spec retry', [], 1, base_delay: 0).attempts do
        runs += 1
        raise 'down'
      end
    }.should raise_error(RuntimeError)
    runs.should == 2
  end

  it 'carries the disable_endpoint switch the --full-index flag sets' do
    previous = Bundler::Fetcher.disable_endpoint
    Bundler::Fetcher.disable_endpoint = true
    Bundler::Fetcher.disable_endpoint.should == true
    Bundler::Fetcher.disable_endpoint = previous
  end
end

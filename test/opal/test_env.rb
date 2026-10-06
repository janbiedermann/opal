require 'test/unit'

class TestNodejsEnv < Test::Unit::TestCase

  def shared_test_env_has_key(method)
    assert_equal(false, ENV.send(method, 'should_never_be_set'))
    ENV['foo'] = 'bar'
    assert_equal(true, ENV.send(method, 'foo'))
    assert_equal(false, ENV.send(method, 'bar'))
    ENV.delete 'foo'
    assert_equal(false, ENV.send(method, 'foo'))
  end

  def test_include?
    shared_test_env_has_key('include?')
  end

  def test_has_key?
    shared_test_env_has_key('has_key?')
  end

  def test_member?
    shared_test_env_has_key('member?')
  end

  def test_key?
    shared_test_env_has_key('key?')
  end

  def test_get
    assert_equal(nil, ENV['should_never_be_set'])
    ENV['foo'] = 'bar'
    assert_equal('bar', ENV['foo'])
    assert_equal(nil, ENV['bar'])
    ENV.delete 'foo'
    assert_equal(nil, ENV['foo'])
  end

  def test_delete
    ENV['foo'] = 'bar'
    assert_equal('bar', ENV.delete('foo'))
    assert_equal(nil, ENV.delete('foo'))
  end

  def test_empty
    ENV['foo'] = 'bar'
    assert_equal(false, ENV.empty?)
    ENV.delete 'foo'
  end

  def test_keys
    ENV['foo'] = 'bar'
    assert_includes(ENV.keys, 'foo')
    ENV.delete 'foo'
  end

  def test_to_s
    assert_equal('ENV', ENV.to_s)
  end

  def test_tz_changes_the_time_zone
    old = ENV['TZ']
    ENV['TZ'] = 'Asia/Kolkata'
    assert_equal(19800, Time.local(2012, 11, 8).utc_offset)
    ENV['TZ'] = 'UTC'
    assert_equal(0, Time.local(2012, 11, 8).utc_offset)
  ensure
    old ? ENV['TZ'] = old : ENV.delete('TZ')
  end

end


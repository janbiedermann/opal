# backtick_javascript: true

describe 'Hash' do
  it 'works with object-strings with regards to deleting' do
    h = {`new String('a')` => 'a'}
    k = h.keys.first
    h.delete(k)
    h.inspect.should == '{}'
  end

  it 'compacts nil and JavaScript null and undefined values' do
    h = { a: nil, b: `null`, c: `undefined`, d: 1 }
    expect(h.size).to eq 4
    expect(h.compact.size).to eq 1
    h.compact!
    expect(h.size).to eq 1
  end

  it 'compares recursive hashes without overflowing the stack' do
    a = {}
    b = {}
    a[:self] = a
    b[:self] = b
    (a == b).should == true
    (a.eql?(b)).should == true
    a[:x] = 1
    (a == b).should == false
  end

  it 'compares hashes sharing a recursive value without overflowing the stack' do
    inner = {}
    inner[:self] = inner
    (h1 = { a: inner })
    (h2 = { a: inner })
    (h1 == h2).should == true
  end

  it 'returns a plain Hash without a default from #except' do
    klass = Class.new(Hash)
    h = klass.new(:default)
    h[:bar] = 12
    r = h.except(:foo)
    r.should == { bar: 12 }
    r.class.should == Hash
    r.default.should == nil
    r.default_proc.should == nil
  end

  it 'returns a lambda of arity 1 from #to_proc' do
    p = { a: 1 }.to_proc
    p.lambda?.should == true
    p.arity.should == 1
    p.call(:a).should == 1
    -> { p.call }.should raise_error(ArgumentError)
  end

  it 'shifts the first entry without scanning the whole hash' do
    h = {}
    10_000.times { |i| h[i] = i }
    h.shift.should == [0, 0]
    h.size.should == 9999
    {}.shift.should == nil
  end

  it 'deletes correctly while iterating in the bang methods' do
    h = (1..10).to_a.map { |i| [i, i] }.to_h
    h.delete_if { |k, _| k.even? }.size.should == 5
    h.keep_if { |k, _| k < 4 }.size.should == 2
    h.reject! { |k, _| k == 1 }.should == h
    h.select! { |k, _| k == 3 }.should == nil
    h.compact!.should == nil
    h.should == { 3 => 3 }
  end

  it 'keeps transform_keys! working when new keys collide with old ones' do
    h = { a: 1, b: 2, c: 3, d: 4 }
    h.transform_keys! { |k| k }
    h.should == { a: 1, b: 2, c: 3, d: 4 }
    h = { a: 1, b: 2 }
    h.transform_keys! { |k| k == :a ? :b : :a }
    h.should == { b: 1, a: 2 }
  end
end

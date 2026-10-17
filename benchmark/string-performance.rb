# Benchmarked by tasks/string-performance.mjs
# Warm up adaptively: V8 runs a function in the interpreter first, then
# compiles it (Sparkplug, then TurboFan) once it is called often enough. The
# warm-up therefore keeps calling the method in growing batches until the
# per-call time stops improving, which is what "the method got compiled" looks
# like from the outside.
WARMUP_MIN_CALLS = 5_000
WARMUP_MAX_CALLS = 1_000_000
WARMUP_BATCH_SECONDS = 0.002
WARMUP_STABLE_TRIALS = 3
WARMUP_STABLE_RATIO = 0.02
WARMUP_MAX_SECONDS = 0.5
TRIALS = 3
TRIAL_SECONDS = 0.002

# String#unpack and String#unpack1 live outside opal/mini.
require 'corelib/string/unpack'
require 'corelib/array/pack'

ASCII_WORDS = %w[alpha bravo charlie delta echo foxtrot golf hotel india juliet
  kilo lima mike november oscar papa quebec romeo sierra tango uniform victor
  whiskey xray yankee zulu]
JAPANESE_WORDS = %w[あいうえお かきくけこ さしすせそ たちつてと なにぬねの
  はひふへほ まみむめも やゆよ らりるれろ わをん 日本語 テスト 文字列 性能
  測定 漢字 仮名 句読点]

# A string of exactly +length+ characters: words separated by spaces, with a
# newline instead of the space nearest to the middle. With +tail+, the last
# character is that one instead: the worst case for the methods that scan the
# string and only take the encoding-aware path when they meet a non-ASCII
# character.
def test_string(words, length, tail = nil)
  return (tail || words[0][0, 1]) if length <= 1
  parts = []
  total = 0
  words.cycle do |word|
    break if total >= length
    parts << word
    total += word.length + 1
  end
  parts[-1] = parts[-1][0, length - (total - parts[-1].length - 1)]
  string = parts.join(' ')
  middle = string.length / 2
  space = (0...string.length).min_by { |i| (i - middle).abs } if string[middle] == ' '
  space ||= (1...string.length).find { |i| string[i] == ' ' && (i - middle).abs <= 1 }
  space ||= (0...string.length).find { |i| string[i] == ' ' }
  if space
    string = string[0, space] + '\n' + string[space + 1, string.length - space - 1]
  end
  return string[0, length - 1] + tail if tail
  string
end

# The arguments a method may need, derived from the string being measured.
def arguments_for(string)
  last = string[-1]
  first = string[0]
  {
    one: last,
    five: string[-5, 5] || string,
    first_one: first,
    first_five: string[0, 5],
    set: string[0, 5],
    other: string + 'x',
    pad: 'ab',
    width: string.length + 10,
    sep: string.include?(' ') ? ' ' : last,
    regexp: Regexp.new(Regexp.escape(first)),
    regexp_multi: Regexp.new('[#{first}]'),
    up: string,
    tr_from: string[0, 5],
    tr_to: string[0, 5].upcase,
  }
end

CASES = {
  '%' => ->(s, a) { s % [] },
  '*' => ->(s, a) { s * 2 },
  '+' => ->(s, a) { s + a[:one] },
  '+@' => ->(s, a) { +s },
  '-@' => ->(s, a) { -s },
  '<=>' => ->(s, a) { s <=> s },
  '==' => ->(s, a) { s == s },
  '===' => ->(s, a) { s === s },
  '=~' => ->(s, a) { s =~ a[:regexp] },
  '[]' => ->(s, a) { s[0] },
  '[](i,n)' => ->(s, a) { s[0, 2] },
  'ascii_only?' => ->(s, a) { s.ascii_only? },
  'b' => ->(s, a) { s.b },
  'byteindex' => ->(s, a) { s.byteindex(a[:five]) },
  'byterindex' => ->(s, a) { s.byterindex(a[:five]) },
  'bytes' => ->(s, a) { s.bytes },
  'bytesize' => ->(s, a) { s.bytesize },
  'byteslice' => ->(s, a) { s.byteslice(0, 5) },
  'capitalize' => ->(s, a) { s.capitalize },
  'casecmp' => ->(s, a) { s.casecmp(s) },
  'casecmp?' => ->(s, a) { s.casecmp?(s) },
  'center' => ->(s, a) { s.center(a[:width], a[:pad]) },
  'chars' => ->(s, a) { s.chars },
  'chomp' => ->(s, a) { s.chomp },
  'chop' => ->(s, a) { s.chop },
  'chr' => ->(s, a) { s.chr },
  'codepoints' => ->(s, a) { s.codepoints },
  'count' => ->(s, a) { s.count(a[:set]) },
  'delete' => ->(s, a) { s.delete(a[:set]) },
  'delete_prefix' => ->(s, a) { s.delete_prefix(a[:first_five]) },
  'delete_suffix' => ->(s, a) { s.delete_suffix(a[:five]) },
  'downcase' => ->(s, a) { s.downcase },
  'dump' => ->(s, a) { s.dump },
  'dup' => ->(s, a) { s.dup },
  'each_byte' => ->(s, a) { s.each_byte { |b| b } },
  'each_char' => ->(s, a) { s.each_char { |c| c } },
  'each_codepoint' => ->(s, a) { s.each_codepoint { |c| c } },
  'each_grapheme_cluster' => ->(s, a) { s.each_grapheme_cluster { |c| c } },
  'each_line' => ->(s, a) { s.each_line { |l| l } },
  'empty?' => ->(s, a) { s.empty? },
  'encode' => ->(s, a) { s.encode('UTF-8') },
  'end_with?' => ->(s, a) { s.end_with?(a[:five]) },
  'eql?' => ->(s, a) { s.eql?(s) },
  'equal?' => ->(s, a) { s.equal?(s) },
  'force_encoding' => ->(s, a) { s.force_encoding('UTF-8') },
  'getbyte' => ->(s, a) { s.getbyte(0) },
  'grapheme_clusters' => ->(s, a) { s.grapheme_clusters },
  'gsub(re)' => ->(s, a) { s.gsub(a[:regexp], 'x') },
  'gsub(str)' => ->(s, a) { s.gsub(a[:one], 'x') },
  'hex' => ->(s, a) { s.hex },
  'include?' => ->(s, a) { s.include?(a[:five]) },
  'index(re)' => ->(s, a) { s.index(a[:regexp]) },
  'index(str)' => ->(s, a) { s.index(a[:five]) },
  'inspect' => ->(s, a) { s.inspect },
  'intern' => ->(s, a) { s.intern },
  'length' => ->(s, a) { s.length },
  'lines' => ->(s, a) { s.lines },
  'ljust' => ->(s, a) { s.ljust(a[:width], a[:pad]) },
  'lstrip' => ->(s, a) { s.lstrip },
  'match(re)' => ->(s, a) { s.match(a[:regexp]) },
  'match?(re)' => ->(s, a) { s.match?(a[:regexp]) },
  'next' => ->(s, a) { s.next },
  'oct' => ->(s, a) { s.oct },
  'ord' => ->(s, a) { s.ord },
  'partition' => ->(s, a) { s.partition(a[:sep]) },
  'reverse' => ->(s, a) { s.reverse },
  'rindex(str)' => ->(s, a) { s.rindex(a[:five]) },
  'rjust' => ->(s, a) { s.rjust(a[:width], a[:pad]) },
  'rpartition' => ->(s, a) { s.rpartition(a[:sep]) },
  'rstrip' => ->(s, a) { s.rstrip },
  'scan(re)' => ->(s, a) { s.scan(a[:regexp]) },
  'scrub' => ->(s, a) { s.scrub },
  'split(re)' => ->(s, a) { s.split(a[:regexp]) },
  'split(str)' => ->(s, a) { s.split(a[:one]) },
  'split(whitespace)' => ->(s, a) { s.split },
  'squeeze' => ->(s, a) { s.squeeze },
  'start_with?' => ->(s, a) { s.start_with?(a[:first_five]) },
  'strip' => ->(s, a) { s.strip },
  'sub(re)' => ->(s, a) { s.sub(a[:regexp], 'x') },
  'sub(str)' => ->(s, a) { s.sub(a[:one], 'x') },
  'succ' => ->(s, a) { s.succ },
  'sum' => ->(s, a) { s.sum },
  'swapcase' => ->(s, a) { s.swapcase },
  'to_f' => ->(s, a) { s.to_f },
  'to_i' => ->(s, a) { s.to_i },
  'to_proc' => ->(s, a) { s.to_proc },
  'to_s' => ->(s, a) { s.to_s },
  'to_str' => ->(s, a) { s.to_str },
  'to_sym' => ->(s, a) { s.to_sym },
  'tr' => ->(s, a) { s.tr(a[:tr_from], a[:tr_to]) },
  'tr_s' => ->(s, a) { s.tr_s(a[:tr_from], a[:tr_to]) },
  'unicode_normalize' => ->(s, a) { s.unicode_normalize },
  'unicode_normalized?' => ->(s, a) { s.unicode_normalized? },
  'unpack' => ->(s, a) { s.unpack('C*') },
  'unpack1' => ->(s, a) { s.unpack1('C') },
  'upto' => ->(s, a) { s.upto(s) { |x| x } },
  'valid_encoding?' => ->(s, a) { s.valid_encoding? },
}

def warm(string, arguments, callable)
  calls = 0
  stable = 0
  previous = nil
  started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  while calls < WARMUP_MAX_CALLS &&
      Process.clock_gettime(Process::CLOCK_MONOTONIC) - started < WARMUP_MAX_SECONDS
    # A batch is as many calls as the last rate says it takes to last
    # WARMUP_BATCH_SECONDS, so every batch is measurable and the rate of the
    # next one can be compared with the rate of this one.
    rate = previous || 0.000_001
    batch = (WARMUP_BATCH_SECONDS / rate).ceil
    batch = 100 if batch < 100
    batch = 1_000_000 if batch > 1_000_000
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    batch.times { callable.call(string, arguments) }
    elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start
    calls += batch
    current = elapsed / batch
    stable = (previous && previous > 0 && (previous - current).abs / previous < WARMUP_STABLE_RATIO) ? stable + 1 : 0
    previous = current
    break if stable >= WARMUP_STABLE_TRIALS && calls >= WARMUP_MIN_CALLS
  end
  calls
end

def measure(string, arguments, case_callable)
  warmups = warm(string, arguments, case_callable)
  best = nil
  TRIALS.times do
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    case_callable.call(string, arguments)
    estimate = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start
    iterations = (TRIAL_SECONDS / (estimate > 0 ? estimate : 1e-9)).ceil
    iterations = 1 if iterations < 1
    iterations = 1_000_000 if iterations > 1_000_000
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    iterations.times { case_callable.call(string, arguments) }
    elapsed = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) / iterations
    best = elapsed if best.nil? || elapsed < best
  end
  [best * 1_000_000_000, warmups]
end

lengths = ENV['LENGTHS'].to_s != '' ? ENV['LENGTHS'].split(',').map(&:to_i) : [1, 5, 25, 125]
methods = ENV['METHODS'].to_s != '' ? ENV['METHODS'].split(',') : nil
encodings = [
  ['ascii', ASCII_WORDS, nil],
  ['japanese', JAPANESE_WORDS, nil],
  ['ascii with a japanese last character', ASCII_WORDS, 'あ'],
  # 𠀀 (U+20000) is a surrogate pair in JavaScript, where indexes count
  # UTF-16 units: the worst case for the methods that answer through
  # indexOf/lastIndexOf and only pay for characters when a surrogate pair
  # precedes the match.
  ['ascii with a surrogate-pair last character', ASCII_WORDS, '𠀀'],
]

names = methods || CASES.keys.sort
results = {}
warmup_counts = []
encodings.each do |label, words, tail|
  lengths.each do |length|
    string = test_string(words, length, tail)
    arguments = arguments_for(string)
    names.each do |name|
      callable = CASES[name]
      next unless callable
      value = begin
        elapsed, warmups = measure(string, arguments, callable)
        warmup_counts << warmups
        format('%.1f', elapsed)
      rescue => error
        'n/a'
      end
      results[[name, label, length]] = value
    end
  end
end

warmup_counts.sort!
summary = warmup_counts.empty? ? '' : format('warm-up: %s calls (%s to %s per measurement)',
  warmup_counts[warmup_counts.length / 2], warmup_counts[0], warmup_counts[-1])
puts "String methods, ns per call (#{summary}, best of #{TRIALS} trials)"
encodings.each do |label, _words|
  puts
  puts "#{label} strings"
  puts(['method'].concat(lengths.map { |l| l.to_s.rjust(10) }).join(' '))
  puts(['------'].concat(lengths.map { |l| '-' * 10 }).join(' '))
  names.each do |name|
    next unless CASES[name]
    row = results[[name, label, lengths[0]]] ? [name.ljust(22)] : nil
    next unless row
    lengths.each { |l| row << results[[name, label, l]].rjust(10) }
    puts row.join(' ')
  end
end

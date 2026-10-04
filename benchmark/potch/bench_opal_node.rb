# Baseline: current Opal compiler compiled by Opal (opal-parser), running warm in Node.js.
# backtick_javascript: true
require 'nodejs'
dir = ARGV[0]; only = ARGV[1]
now = -> { `performance.now()` }
med = ->(a) { a.sort[a.size / 2] }
puts "| file | bytes | total_ms | out_bytes |"
puts "|---|---:|---:|---:|"
`require("fs").readdirSync(#{dir})`.select { |f| f.end_with?(".rb") }.sort.map { |f| "#{dir}/#{f}" }.each do |path|
  next if only && !path.include?(only)
  src = File.read(path); name = File.basename(path).sub(/^\d+_/, '')
  runs = src.size > 300_000 ? (ENV["RUNS"] || 3).to_i : (src.size > 30_000 ? 5 : 11)
  warm = src.size > 300_000 ? (ENV["WARM"] || 1).to_i : 3
  ts = []; out = nil
  begin
    (warm + runs).times do |i|
      s = now.call
      out = Opal::Compiler.new(src, file: name).compile
      e = now.call
      ts << (e - s) if i >= warm
    end
    puts "| #{name} | #{`Buffer.byteLength(#{src})`} | #{med.call(ts).round(2)} | #{`Buffer.byteLength(#{out})`} |"
  rescue Exception => e
    puts "| #{name} | #{src.size} | ERROR: #{e.message.lines.first.to_s.strip[0, 90]} |"
  end
end

# Baseline: current Opal compiler (parser gem + rewriters + nodes) on CRuby, warm, in-process.
require 'opal'
require 'opal/compiler'
def t; s = Process.clock_gettime(Process::CLOCK_MONOTONIC); yield; (Process.clock_gettime(Process::CLOCK_MONOTONIC) - s) * 1000; end
def med(a) a.sort[a.size / 2] end
Opal::Parser::WithRubyLexer.diagnostics_consumer = ->(_) {}
dir = ARGV[0]; only = ARGV[1]
puts "| file | bytes | parse_ms | rewrite_ms | codegen_ms | total_ms | out_bytes |"
puts "|---|---:|---:|---:|---:|---:|---:|"
Dir["#{dir}/*.rb"].sort.each do |path|
  next if only && !path.include?(only)
  src = File.read(path); name = File.basename(path).sub(/^\d+_/, '')
  runs = src.size > 300_000 ? 3 : (src.size > 30_000 ? 5 : 11)
  warm = src.size > 300_000 ? 1 : 3
  p_, r_, tot = [], [], []; out = nil
  begin
    (warm + runs).times do |i|
      ast = nil
      pm = t {
        parser = Parser::Ruby32.new(Opal::AST::Builder.new)
        parser.diagnostics.all_errors_are_fatal = true
        parser.diagnostics.consumer = ->(_) {}
        buf = Opal::Parser::SourceBuffer.new(name, 1); buf.source = src
        ast = parser.parse(buf) || Opal::AST::Node.new(:nil)
      }
      rm = t { Opal::Rewriter.new(Opal::AST::Node.new(:top, [ast])).process }
      tm = t { out = Opal::Compiler.new(src, file: name).compile }
      next if i < warm
      p_ << pm; r_ << rm; tot << tm
    end
    pm, rm, tm = med(p_), med(r_), med(tot)
    printf "| %s | %d | %.2f | %.2f | %.2f | %.2f | %d |\n", name, src.bytesize, pm, rm, tm - pm - rm, tm, out.bytesize
  rescue Exception => e
    printf "| %s | %d | ERROR: %s |\n", name, src.bytesize, e.message.lines.first.strip[0, 90]
  end
  $stdout.flush
end

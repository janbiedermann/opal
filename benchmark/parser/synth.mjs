// Synthetic Ruby source generators for the benchmark corpus — stress files
// targeting specific parser constructs (PERFORMANCE_REPORT.md §1's sample
// corpus). Generated in memory and piped via stdin by run.mjs; nothing here
// is written to disk, so the repo doesn't carry multi-MB generated fixtures.

export function bigArray(n = 50000) {
  const items = new Array(n);
  for (let i = 0; i < n; i++) items[i] = i;
  return `x = [${items.join(", ")}]\n`;
}

export function manyLocals(n = 20000) {
  const lines = ["def m"];
  for (let i = 0; i < n; i++) lines.push(`  v${i} = ${i}`);
  lines.push("end");
  return lines.join("\n") + "\n";
}

export function manyMethods(n = 10000) {
  const lines = ["class C"];
  for (let i = 0; i < n; i++) {
    lines.push(`  def m${i}(a, b, c)`);
    lines.push("    a + b + c");
    lines.push("  end");
  }
  lines.push("end");
  return lines.join("\n") + "\n";
}

export function manyStrings(n = 20000) {
  const lines = new Array(n);
  for (let i = 0; i < n; i++) lines[i] = `puts "item #{i} of ${n}: ${i}"`;
  return lines.join("\n") + "\n";
}

export function binopChain(n = 1000) {
  const terms = new Array(n);
  for (let i = 0; i < n; i++) terms[i] = i;
  return `x = ${terms.join(" + ")}\n`;
}

export function methodChain(n = 1000) {
  return `x = a${".foo".repeat(n)}\n`;
}

export function deepNest(depth = 1000) {
  return `x = ${"(".repeat(depth)}1${")".repeat(depth)}\n`;
}

// node.rb x4 concatenated — the "scaling check" mega file (s6 in the report).
export function mega(realFileContent, times = 4) {
  return realFileContent.repeat(times);
}

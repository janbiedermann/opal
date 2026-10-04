// A source map made of the source maps of several files joined together.
// Port of lib/opal/source_map/index.rb.
export class SourceMapIndex {
  constructor(sourceMaps, { join = null } = {}) {
    this.sourceMaps = sourceMaps;
    this.join = join;
  }

  map() {
    let offsetLine = 0;
    let offsetColumn = 0;
    return {
      version: 3,
      sections: this.sourceMaps.map((sourceMap) => {
        const section = { offset: { line: offsetLine, column: offsetColumn }, map: sourceMap.map() };
        let generated = sourceMap.generatedCode;
        if (this.join) generated += this.join;
        const newLines = (generated.match(/\n/g) || []).length;
        const lastLine = generated.slice(generated.lastIndexOf("\n") + 1);
        offsetLine += newLines;
        offsetColumn += lastLine.length;
        return section;
      }),
    };
  }

  toJSON() {
    return this.map();
  }

  toDataUriComment() {
    return `//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(this.map()), "utf8").toString("base64")}`;
  }
}

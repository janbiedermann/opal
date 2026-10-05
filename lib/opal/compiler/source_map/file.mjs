// The source map of a single compiled file. Port of
// stdlib/opal/source_map/file.rb and map.rb.
//
// Lines and columns of the original source come from the fragments' node
// locations (UTF-16 offsets) via the source's line table; generated
// columns are counted in UTF-16 code units, as source map consumers expect.
import { base64Utf8 } from "./vlq.mjs";

function lineStarts(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

export class SourceMapFile {
  // fragments: a list of fragments, or anything with a forEach over them.
  constructor(fragments, file, source, generatedCode = null) {
    this.fragments = fragments;
    this.file = file;
    this.source = source;
    this.generatedCodeValue = generatedCode;
    this.namesMap = new Map();
    this.starts = lineStarts(source);
  }

  get generatedCode() {
    if (this.generatedCodeValue == null) {
      let code = "";
      this.fragments.forEach((fragment) => {
        code += fragment.code;
      });
      this.generatedCodeValue = code;
    }
    return this.generatedCodeValue;
  }

  map({ sourceRoot = "" } = {}) {
    return {
      version: 3,
      sourceRoot,
      sources: [this.file],
      sourcesContent: [this.source],
      names: this.names(),
      mappings: this.mappings,
    };
  }

  toJSON() {
    return this.map();
  }

  toDataUriComment() {
    const json = JSON.stringify(this.map());
    return `//# sourceMappingURL=data:application/json;base64,${base64Utf8(json)}`;
  }

  names() {
    this.build();
    return [...this.namesMap.keys()];
  }

  // [line (1-based), column (0-based)] of a source offset
  position(offset) {
    const line = this.lineIndex(offset);
    return [line + 1, offset - this.starts[line]];
  }

  // The 0-based line of a source offset.
  lineIndex(offset) {
    const starts = this.starts;
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  // The mappings and names, in one pass over the fragments: each line of
  // generated code (split at "\n", and "\r\n" when the fragment's code
  // has a "\r") gets a segment for each fragment piece with code on it,
  // except for fragments skipped in source maps; their code still counts
  // for the generated columns. Segments are relative to the previous one
  // (the generated column to the previous one on the line), as VLQ.
  build() {
    if (this.mappingsValue !== undefined) return;

    const lines = [];
    let line = "";
    let column = 0; // generated column on the line
    let previousColumn = 0;
    let previousLine = 0;
    let previousOriginalColumn = 0;
    let previousName = 0;
    // the position and name of the last fragment's node and scope
    let lastNode;
    let lastScope;
    let lastLocation;
    let originalLine = 0;
    let originalColumn = 0;
    let nameIndex = null;

    const segment = (fragment) => {
      if (fragment.line !== undefined || fragment.sourceMapName !== undefined || fragment.node !== lastNode || fragment.scope !== lastScope || fragment.location !== lastLocation) {
        lastNode = fragment.node;
        lastScope = fragment.scope;
        lastLocation = fragment.location;
        if (fragment.line !== undefined) {
          // a fragment with an explicit position (JS files)
          originalLine = Math.max(0, fragment.line - 1);
          originalColumn = fragment.column || 0;
          lastNode = undefined; // (not cached)
        } else if (lastLocation) {
          const offset = lastLocation.start;
          originalLine = this.lineIndex(offset);
          originalColumn = offset - this.starts[originalLine];
        } else {
          originalLine = 0;
          originalColumn = 0;
        }
        const name = sourceMapName(fragment);
        if (name != null) {
          const key = String(name);
          nameIndex = this.namesMap.get(key);
          if (nameIndex === undefined) {
            nameIndex = this.namesMap.size;
            this.namesMap.set(key, nameIndex);
          }
        } else {
          nameIndex = null;
        }
        if (fragment.sourceMapName !== undefined) lastNode = undefined;
      }

      let code = encode1(column - previousColumn) + "A" + encode1(originalLine - previousLine) + encode1(originalColumn - previousOriginalColumn);
      if (nameIndex !== null) {
        code += encode1(nameIndex - previousName);
        previousName = nameIndex;
      }
      line = line === "" ? code : line + "," + code;
      previousColumn = column;
      previousLine = originalLine;
      previousOriginalColumn = originalColumn;
    };

    this.fragments.forEach((fragment) => {
      const code = fragment.code;
      if (code === "") return;
      const skip = fragment.skipSourceMap && fragment.skipSourceMap();
      let start = 0;
      for (;;) {
        const newline = code.indexOf("\n", start);
        let end = newline === -1 ? code.length : newline;
        if (newline !== -1 && end > start && code.charCodeAt(end - 1) === 13) end -= 1;
        if (end > start) {
          if (!skip) segment(fragment);
          column += end - start;
        }
        if (newline === -1) break;
        lines.push(line);
        line = "";
        column = 0;
        previousColumn = 0;
        start = newline + 1;
      }
    });
    lines.push(line);
    this.mappingsValue = lines.join(";");
  }

  get mappings() {
    this.build();
    return this.mappingsValue;
  }
}

// The VLQ of one number (vlq.mjs's encode of [n]).
const BASE64_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function encode1(n) {
  let vlq = n < 0 ? (-n << 1) + 1 : n << 1;
  if (vlq < 32 && vlq >= 0) return BASE64_DIGITS[vlq];
  let result = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    result += BASE64_DIGITS[digit];
  } while (vlq > 0);
  return result;
}

// The name of the Ruby construct a fragment maps to
// (Fragment#source_map_name).
export function sourceMapName(fragment) {
  if (fragment.sourceMapName !== undefined) return fragment.sourceMapName;
  if (!fragment.node) return null;
  return sourceMapNameFor(fragment, fragment.node);
}

function scopeName(fragment) {
  return fragment.scope ? sourceMapNameFor(fragment, fragment.scope.node) : null;
}

function sourceMapNameFor(fragment, node) {
  switch (node.type) {
    case "OpalTop":
      return { require: "<top (required)>", eval: "(eval)", main: "<main>" }[node.kind];
    case "StatementsNode":
    case "OpalBegin":
    case "OpalKwbegin":
    case "ParenthesesNode":
    case "OpalJsReturn":
      return scopeName(fragment);
    case "BlockNode":
    case "OpalLambdaIter": {
      let scope = fragment.scope;
      let iters = 1;
      while (scope && scope.scopeType === "iter") {
        iters += 1;
        scope = scope.parent;
      }
      const level = iters > 1 ? ` (${iters} levels)` : "";
      return `block${level} in ${scope ? sourceMapNameFor(fragment, scope.node) : ""}`;
    }
    case "SelfNode":
      return "self";
    case "ModuleNode":
      return `<module:${sourceMapNameFor(fragment, node.constant_path)}>`;
    case "ClassNode":
      return `<class:${sourceMapNameFor(fragment, node.constant_path)}>`;
    case "ConstantReadNode":
      return node.name;
    case "ConstantPathNode":
      return node.parent ? `${sourceMapNameFor(fragment, node.parent)}::${node.name}` : node.name;
    case "IntegerNode":
      return node.value;
    case "DefNode":
    case "CallNode":
    case "OpalCall":
      return node.name;
    case "LocalVariableReadNode":
    case "LocalVariableWriteNode":
    case "OpalLvar":
    case "OpalLvasgn":
    case "OpalLvdeclare":
    case "InstanceVariableReadNode":
    case "InstanceVariableWriteNode":
    case "GlobalVariableReadNode":
    case "GlobalVariableWriteNode":
    case "ClassVariableReadNode":
    case "ClassVariableWriteNode":
    case "OpalArgNode":
      return node.name;
    case "StringNode":
    case "XStringNode":
    case "InterpolatedXStringNode":
    case "OpalXstrPart":
      return scopeName(fragment);
    default:
      return null;
  }
}

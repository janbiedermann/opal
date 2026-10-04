// The source map of a single compiled file. Port of
// lib/opal/source_map/file.rb and map.rb.
//
// Lines and columns of the original source come from the fragments' node
// locations (UTF-16 offsets) via the source's line table; generated
// columns are counted in UTF-16 code units, as source map consumers expect.
import { encodeMappings } from "./vlq.mjs";

function lineStarts(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

export class SourceMapFile {
  constructor(fragments, file, source, generatedCode = null) {
    this.fragments = fragments;
    this.file = file;
    this.source = source;
    this.generatedCodeValue = generatedCode;
    this.namesMap = new Map();
    this.starts = lineStarts(source);
  }

  get generatedCode() {
    if (this.generatedCodeValue == null) this.generatedCodeValue = this.fragments.map((f) => f.code).join("");
    return this.generatedCodeValue;
  }

  map({ sourceRoot = "" } = {}) {
    return {
      version: 3,
      sourceRoot,
      sources: [this.file],
      sourcesContent: [this.source],
      names: this.names(),
      mappings: encodeMappings(this.relativeMappings()),
    };
  }

  toJSON() {
    return this.map();
  }

  toDataUriComment() {
    const json = JSON.stringify(this.map());
    return `//# sourceMappingURL=data:application/json;base64,${Buffer.from(json, "utf8").toString("base64")}`;
  }

  names() {
    this.absoluteMappings(); // let the processing happen
    return [...this.namesMap.keys()];
  }

  // [line (1-based), column (0-based)] of a source offset
  position(offset) {
    const starts = this.starts;
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return [low + 1, offset - starts[low]];
  }

  segmentFromFragment(fragment, generatedColumn) {
    const sourceIndex = 0; // always 0, we're dealing with a single file
    const location = fragment.location;
    let originalLine = 0;
    let originalColumn = 0;
    if (fragment.line !== undefined) {
      // a fragment with an explicit position (JS files)
      originalLine = Math.max(0, fragment.line - 1);
      originalColumn = fragment.column || 0;
    } else if (location) {
      const [line, column] = this.position(location.start);
      originalLine = line - 1; // fragments have 1-based lines
      originalColumn = column;
    }

    const name = sourceMapName(fragment);
    if (name != null) {
      const key = String(name);
      if (!this.namesMap.has(key)) this.namesMap.set(key, this.namesMap.size);
      return [generatedColumn, sourceIndex, originalLine, originalColumn, this.namesMap.get(key)];
    }
    return [generatedColumn, sourceIndex, originalLine, originalColumn];
  }

  relativeMappings() {
    if (this.relativeMappingsValue) return this.relativeMappingsValue;

    let reference = [0, 0, 0, 0, 0];
    let referenceNameIndex = 0;
    this.relativeMappingsValue = this.absoluteMappings().map((absoluteMapping) => {
      reference[0] = 0; // reset the generated_column at each new line

      return absoluteMapping.map((absolute) => {
        const segment = [
          absolute[0] - reference[0],
          absolute[1] - (reference[1] || 0),
          absolute[2] - (reference[2] || 0),
          absolute[3] - (reference[3] || 0),
        ];

        if (absolute[4] != null) {
          segment[4] = absolute[4] - (reference[4] != null ? reference[4] : referenceNameIndex);
          referenceNameIndex = absolute[4];
        }

        reference = absolute;
        return segment;
      });
    });
    return this.relativeMappingsValue;
  }

  absoluteMappings() {
    if (this.absoluteMappingsValue) return this.absoluteMappingsValue;

    this.absoluteMappingsValue = this.fragmentsByLine().map((rawSegments) => {
      let generatedColumn = 0;
      const segments = [];
      for (const [generatedCode, fragment] of rawSegments) {
        if (!(fragment.skipSourceMap && fragment.skipSourceMap())) {
          segments.push(this.segmentFromFragment(fragment, generatedColumn));
        }
        generatedColumn += generatedCode.length;
      }
      return segments;
    });
    return this.absoluteMappingsValue;
  }

  fragmentsByLine() {
    const rawMappings = [[]];
    for (const fragment of this.fragments) {
      const code = fragment.code;
      const lines = code.split(/\r/.test(code) ? /\r?\n/ : "\n");
      lines.forEach((line, index) => {
        const rawSegment = [line, fragment];
        if (index === 0 && line.length > 0) {
          rawMappings[rawMappings.length - 1].push(rawSegment);
        } else if (index === 0) {
          // nothing
        } else if (line.length === 0) {
          rawMappings.push([]);
        } else {
          rawMappings.push([rawSegment]);
        }
      });
    }
    return rawMappings;
  }
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

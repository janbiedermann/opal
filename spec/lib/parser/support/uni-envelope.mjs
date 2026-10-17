// Builds a comparable {ast, errors, warnings} envelope from target_js_uni's
// own parser, in the same shape ref-envelope.js produces from @ruby/prism -
// see that file for why the shapes need to match (snake_case keys, byte
// offsets, flags as a sorted name array, node_id excluded).

import { parseWithMetadata, envelopeOffsetsToBytes } from "../../../../lib/opal/parser/index.mjs";
import { buildOptions } from "./build-options.mjs";

const FLOAT_SENTINEL = /^@@F:(.*)@@$/;
const BIGINT_SENTINEL = /^@@(-?\d+)@@$/;

// envelopeOffsetsToBytes() (src/index.js) pre-renders BigInt/Float leaves as
// "@@...@@" sentinel strings for cmd.js's own JSON.stringify + regex-unwrap
// step (see its doc comment). Undo that here so comparison sees plain
// numeric values instead of wire-format sentinels.
function unwrapSentinel(raw) {
  let m = FLOAT_SENTINEL.exec(raw);
  if (m) return String(Number(m[1]));
  m = BIGINT_SENTINEL.exec(raw);
  if (m) return m[1];
  return raw;
}

// newline/static_literal are parser-internal bookkeeping flags with no
// public accessor on the @ruby/prism side (see ref-envelope.js's
// flagNamesFor) - excluded from both sides rather than compared one-sided.
const COMMON_FLAG_NAMES = new Set(["newline", "static_literal"]);

function stripNode(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return unwrapSentinel(value);
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripNode);

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "node_id") continue;
    if (key === "flags" && Array.isArray(child)) {
      const filtered = child.filter((f) => !COMMON_FLAG_NAMES.has(f)).sort();
      if (filtered.length > 0) out.flags = filtered;
      continue;
    }
    out[key] = stripNode(child);
  }
  return out;
}

/**
 * @param {string} source
 * @param {object|null} optsIn same shape buildOptions() takes
 */
export function uniEnvelope(source, optsIn = null) {
  const options = buildOptions(optsIn);
  const envelope = parseWithMetadata(source, options);
  envelopeOffsetsToBytes(envelope, source);
  return {
    ast: stripNode(envelope.ast),
    errors: stripNode(envelope.errors),
    warnings: stripNode(envelope.warnings),
    offsets: envelope.offsets,
    startLine: envelope.start_line,
    versionOk: options === null || options.__versionOk !== false,
  };
}

/** True if `source` parses with no errors under the given options. */
export function parseSuccess(source, optsIn = null) {
  return uniEnvelope(source, optsIn).errors.length === 0;
}

/**
 * Like uniEnvelope(), but with raw numeric offsets throughout (no
 * string-stringification, no flag/node_id stripping) - for callers that do
 * arithmetic on locations (errors-format.js) instead of deep-comparing
 * against another backend.
 */
export function rawEnvelope(source, optsIn = null) {
  const options = buildOptions(optsIn);
  const envelope = parseWithMetadata(source, options);
  envelopeOffsetsToBytes(envelope, source);
  return envelope;
}

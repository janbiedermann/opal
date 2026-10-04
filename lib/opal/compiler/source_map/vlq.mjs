// Base64 VLQ encoding for source map mappings. Port of
// lib/opal/source_map/vlq.rb.
const VLQ_BASE_SHIFT = 5;
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;
const VLQ_BASE_MASK = VLQ_BASE - 1;
const VLQ_CONTINUATION_BIT = VLQ_BASE;

const BASE64_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_VALUES = new Map([...BASE64_DIGITS].map((c, i) => [c, i]));

export function encode(ary) {
  let result = "";
  for (const n of ary) {
    let vlq = n < 0 ? (-n << 1) + 1 : n << 1;
    do {
      let digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) digit |= VLQ_CONTINUATION_BIT;
      result += BASE64_DIGITS[digit];
    } while (vlq > 0);
  }
  return result;
}

export function decode(str) {
  const result = [];
  let i = 0;
  while (i < str.length) {
    let vlq = 0;
    let shift = 0;
    let continuation = true;
    while (continuation) {
      if (i >= str.length) throw new RangeError("unterminated VLQ value");
      let digit = BASE64_VALUES.get(str[i++]);
      if ((digit & VLQ_CONTINUATION_BIT) === 0) continuation = false;
      digit &= VLQ_BASE_MASK;
      vlq += digit * 2 ** shift;
      shift += VLQ_BASE_SHIFT;
    }
    result.push(vlq & 1 ? -Math.floor(vlq / 2) : Math.floor(vlq / 2));
  }
  return result;
}

export function encodeMappings(ary) {
  return ary.map((group) => group.map((segment) => encode(segment)).join(",")).join(";");
}

export function decodeMappings(str) {
  return str.split(";").map((group) => (group === "" ? [] : group.split(",").map((segment) => decode(segment))));
}

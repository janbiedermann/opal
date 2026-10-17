import { pm_buffer_append_string } from "./pm_buffer.mjs";

// pm_integer_base_t
export const PM_INTEGER_BASE_DEFAULT = 0;
export const PM_INTEGER_BASE_BINARY = 1;
export const PM_INTEGER_BASE_OCTAL = 2;
export const PM_INTEGER_BASE_DECIMAL = 3;
export const PM_INTEGER_BASE_HEXADECIMAL = 4;
export const PM_INTEGER_BASE_UNKNOWN = 5;

// A pm_integer_t is represented as a plain JS `bigint`.
//
// Deviation: the C implementation represents an arbitrary-precision integer
// as a manually-managed array of 32-bit words (with Karatsuba multiplication,
// manual long addition/subtraction, and manual base conversion for
// stringification) because C has no native arbitrary-precision integer type.
// JS's `bigint` already provides exact, arbitrary-precision arithmetic
// natively, so none of that machinery is needed here: parsing, comparing,
// reducing a ratio, and stringifying are all native bigint operations.

// Parse an integer from a string. This assumes that the format of the integer
// has already been validated, as internal validation checks are not performed
// here. Returns the parsed value as a bigint (always non-negative: unary `-`
// is parsed separately and applied afterward by the caller).
//
// Adaptation: the C version takes a pointer to a zeroed pm_integer_t
// out-parameter; here the parsed value is returned directly.
export function pm_integer_parse(base, buffer, start, end) {
    // Ignore unary +. Unary - is parsed differently and will not end up here.
    // Instead, it will modify the parsed integer later.
    if (buffer.charCodeAt(start) === 43 /* '+' */) start++;

    // Determine the multiplier from the base, and skip past any prefixes.
    let multiplier = 10;
    switch (base) {
        case PM_INTEGER_BASE_DEFAULT:
            while (buffer.charCodeAt(start) === 48 /* '0' */) start++; // 01 -> 1
            break;
        case PM_INTEGER_BASE_BINARY:
            start += 2; // 0b
            multiplier = 2;
            break;
        case PM_INTEGER_BASE_OCTAL:
            start++; // 0
            if (buffer.charCodeAt(start) === 95 /* '_' */ || buffer.charCodeAt(start) === 111 /* 'o' */ || buffer.charCodeAt(start) === 79 /* 'O' */) start++;
            multiplier = 8;
            break;
        case PM_INTEGER_BASE_DECIMAL:
            if (buffer.charCodeAt(start) === 48 /* '0' */ && (end - start) > 1) start += 2; // 0d
            break;
        case PM_INTEGER_BASE_HEXADECIMAL:
            start += 2; // 0x
            multiplier = 16;
            break;
        case PM_INTEGER_BASE_UNKNOWN:
            if (buffer.charCodeAt(start) === 48 /* '0' */ && (end - start) > 1) {
                switch (buffer.charCodeAt(start + 1)) {
                    case 95 /* '_' */: start += 2; multiplier = 8; break;
                    case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: /* '0'-'7' */ start += 1; multiplier = 8; break;
                    case 98: case 66: /* 'b' 'B' */ start += 2; multiplier = 2; break;
                    case 111: case 79: /* 'o' 'O' */ start += 2; multiplier = 8; break;
                    case 100: case 68: /* 'd' 'D' */ start += 2; break;
                    case 120: case 88: /* 'x' 'X' */ start += 2; multiplier = 16; break;
                    default: break;
                }
            }
            break;
    }

    // It's possible that we've consumed everything at this point if there is an
    // invalid integer. If this is the case, we'll just return 0.
    if (start >= end) return 0n;

    // Strip underscores from the remaining digit text and parse the rest with
    // BigInt, using the radix prefix that matches `multiplier` (always 2, 8,
    // 10, or 16 per the switch above). BigInt's own parser already accepts
    // mixed-case hex digits, so no digit-value lookup table is needed.
    let digits = "";
    for (let cursor = start; cursor < end; cursor++) {
        if (buffer.charCodeAt(cursor) !== 95 /* '_' */) digits += buffer[cursor];
    }

    const prefix = multiplier === 2 ? "0b" : multiplier === 8 ? "0o" : multiplier === 16 ? "0x" : "";
    return BigInt(prefix + digits);
}

// Compare two integers. This function returns -1 if the left integer is less
// than the right integer, 0 if they are equal, and 1 if the left integer is
// greater than the right integer.
export function pm_integer_compare(left, right) {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

// Reduce a ratio of integers to its simplest form. Returns the reduced
// [numerator, denominator] pair (bigints are immutable, so the C version's
// in-place out-parameter mutation becomes a return value here).
export function pm_integers_reduce(numerator, denominator) {
    // Mirrors the C original's guard, which only reduces when both values fit
    // into a single 32-bit word (i.e. this is a no-op for larger integers).
    // Both inputs are always non-negative here: rational literals never carry
    // a sign at this point (unary `-` is applied afterward by the caller).
    if (
        numerator >= 4294967296n ||
        denominator >= 4294967296n ||
        numerator === 0n ||
        denominator === 1n
    ) return [numerator, denominator];

    // Find the greatest common divisor of the numerator and denominator.
    let divisor = numerator;
    let remainder = denominator;

    while (remainder !== 0n) {
        [divisor, remainder] = [remainder, divisor % remainder];
    }

    // Divide the numerator and denominator by the greatest common divisor.
    return [numerator / divisor, denominator / divisor];
}

// Convert an integer to a decimal string.
export function pm_integer_string(buffer, integer) {
    pm_buffer_append_string(buffer, integer.toString());
}

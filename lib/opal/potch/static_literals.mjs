// static_literals.c converted to JavaScript (ES2022).
//
// WARNING/DIAGNOSTIC HOOK: NOT NEEDED IN THIS MODULE.
// This C file never emits diagnostics itself. pm_static_literals_add() merely
// RETURNS the previously-inserted duplicate node (or NULL); it is the caller
// (prism.c: parse_static_literals_hash_key / parse_static_literals_when_clause
// style functions) that inspects the returned node and calls
// pm_parser_warn()/pm_parser_error(). Since we must not import from potch.js
// anyway (cycle), there is no warnFn indirection here at all: the integrator
// wires all warning emission in potch.js where those duplicates are handled.
//
// DEVIATIONS from the C original (all forced by the pointer→offset mapping):
// - C reads the first byte of a node's location directly (`*node->location.start
//   == '-'`) when inspecting float Infinity/zero. Locations are numeric offsets
//   in JS, so pm_static_literal_inspect() takes one EXTRA optional trailing
//   parameter `source` (a plain JS string) which is threaded into the
//   internal metadata object. Integrator: pass `parser.source` as the 6th arg.
//   When omitted, the byte is treated as non-'-'.
// - INT64_MAX/INT64_MIN sentinels in pm_int64_value are represented as the
//   doubles 2**63 / -(2**63). Only small line numbers and the clamp sentinels
//   themselves ever flow through them, so every comparison result matches C.
// - uint32 arithmetic in murmur hashing uses Math.imul/>>>0 to preserve wrap.
// - pm_integer_t (node.value / node.numerator / node.denominator on
//   Integer/Rational/Imaginary nodes) is a plain bigint (see
//   util/pm_integer.js); dedup keys and the positive-literal check below
//   compare/stringify it directly instead of walking a multi-word struct.

import {
    PM_FALSE_NODE,
    PM_FLOAT_NODE,
    PM_IMAGINARY_NODE,
    PM_INTEGER_NODE,
    PM_NIL_NODE,
    PM_RATIONAL_NODE,
    PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT,
    PM_REGULAR_EXPRESSION_FLAGS_EXTENDED,
    PM_REGULAR_EXPRESSION_FLAGS_IGNORE_CASE,
    PM_REGULAR_EXPRESSION_FLAGS_MULTI_LINE,
    PM_REGULAR_EXPRESSION_NODE,
    PM_SOURCE_ENCODING_NODE,
    PM_SOURCE_FILE_NODE,
    PM_SOURCE_LINE_NODE,
    PM_STRING_FLAGS_FORCED_BINARY_ENCODING,
    PM_STRING_FLAGS_FORCED_UTF8_ENCODING,
    PM_STRING_NODE,
    PM_SYMBOL_NODE,
    PM_TRUE_NODE
} from "./ast.mjs";
import {
    PM_BUFFER_ESCAPING_RUBY,
    pm_buffer_append_byte,
    pm_buffer_append_source,
    pm_buffer_append_string,
    pm_buffer_index,
    pm_buffer_insert,
    pm_buffer_length
} from "./util/pm_buffer.mjs";
import { pm_integer_string } from "./util/pm_integer.mjs";
import { pm_newline_list_line_column } from "./util/pm_newline_list.mjs";

// pm_static_literals_t: {
//     integer_nodes: Map<key, node>,       // IntegerNode + SourceLineNode
//     float_nodes: Map<key, node>,         // FloatNode
//     number_nodes: Map<key, node>,        // RationalNode + ImaginaryNode
//     string_nodes: Map<key, node>,        // StringNode + SourceFileNode
//     regexp_nodes: Map<key, node>,        // RegularExpressionNode
//     symbol_nodes: Map<key, node>,        // SymbolNode
//     true_node: node | null,
//     false_node: node | null,
//     nil_node: node | null,
//     source_encoding_node: node | null
// }
// Deviation: C's open-addressing hash table (a pm_node_hash_t per literal
// kind) is a plain `Map` here, keyed by the canonical value strings computed
// below; see pm_literals_map_add.

// pm_static_literals_metadata_t: {
//     newline_list, start_line, encoding_name,
//     source: string | null                // extra field, see deviation note
// }

// ---------------------------------------------------------------------------
// Duplicate detection (C: murmur-hash open addressing; here Maps keyed by
// canonical values that reproduce C's hash + equality fusion exactly)
// ---------------------------------------------------------------------------

// INT64_MAX/INT64_MIN as doubles; see the deviation note at the top of the file.
const INT64_MAX = 2 ** 63;
const INT64_MIN = -(2 ** 63);

// The int64-clamped value of an integer or line node. (C's pm_int64_value.)
//
// Deviation: `node.value` is a plain bigint (see util/pm_integer.js); the
// C original's "does it fit in a single 32-bit word" check becomes a
// magnitude comparison against 2**32, and the exact value is just its
// decimal string (bigint stringifies exactly at any magnitude).
function pm_int64_key_part(metadata, node) {
    switch (node.type) {
        case PM_INTEGER_NODE: {
            const integer = node.value;
            if (integer >= 4294967296n || integer <= -4294967296n) {
                return integer < 0n ? String(INT64_MIN) : String(INT64_MAX);
            }
            return String(integer);
        }
        case PM_SOURCE_LINE_NODE:
            return String(pm_newline_list_line_column(metadata.newline_list, node.location.start, metadata.start_line).line);
        default:
            return "0";
    }
}

// Integer and line nodes share one table in C and compare through the clamped
// int64 value, so a small integer and a line number of the same value are
// duplicates; the key unifies them. (Multi-word integers are astronomically
// larger than any line number, so the clamp and the exact value agree where
// it matters.)
function pm_integer_or_line_key(metadata, node) {
    if (node.type === PM_INTEGER_NODE) {
        // C clamps to INT64_MIN/MAX only when comparing against a line;
        // between integers the comparison is exact. Emitting the exact
        // value keeps both directions consistent for every line value that
        // can actually occur. A bigint's String() is always exact, at any
        // magnitude, so no clamp is needed here.
        return "n" + String(node.value);
    }
    return "n" + pm_int64_key_part(metadata, node);
}

// Floats duplicate only on equal raw double bits (C hashes the bit pattern,
// so -0.0 and 0.0 land in different buckets and are never duplicates).
function pm_float_key(metadata, node) {
    return "f" + node.value + (Object.is(node.value, -0) ? "N" : "");
}

// Rationals compare (denominator, numerator) exactly; imaginaries recurse
// into their numeric node.
function pm_number_key(metadata, node) {
    switch (node.type) {
        case PM_IMAGINARY_NODE:
            return "I" + pm_number_key(metadata, node.numeric);
        case PM_RATIONAL_NODE:
            return "R" + String(node.denominator) + ":" + String(node.numerator);
        case PM_INTEGER_NODE:
            return "n" + String(node.value);
        case PM_FLOAT_NODE:
            return pm_float_key(metadata, node);
        default:
            return "x" + node.type;
    }
}

// Strings, symbols and source files share one table in C. String nodes mix
// their encoding mask into the hash, symbols mix their raw flags, source
// files mix nothing — the key mirrors each case. (C compares the string
// values only, so equal values with equal hashes are duplicates.)
function pm_string_like_key(metadata, node) {
    switch (node.type) {
        case PM_STRING_NODE:
            return "s" + (node.flags & (PM_STRING_FLAGS_FORCED_BINARY_ENCODING | PM_STRING_FLAGS_FORCED_UTF8_ENCODING)) + ":" + (node.unescaped || "");
        case PM_SYMBOL_NODE:
            return "y" + node.flags + ":" + (node.unescaped || "");
        case PM_SOURCE_FILE_NODE:
            return "s0:" + (node.filepath || "");
        default:
            return "x" + node.type;
    }
}

function pm_regexp_key(metadata, node) {
    return "r" + node.flags + ":" + (node.unescaped || "");
}

// Insert into one of the per-type Maps: return the previously-inserted
// duplicate (or null), and replace the entry when asked.
function pm_literals_map_add(map, key, node, replace) {
    const duplicated = map.get(key) ?? null;
    if (duplicated === null || replace) map.set(key, node);
    return duplicated;
}

// Add a node to the set of static literals.
export function pm_static_literals_add(newline_list, start_line, literals, node, replace) {
    const metadata = { newline_list: newline_list, start_line: start_line, encoding_name: null };

    switch (node.type) {
        case PM_INTEGER_NODE:
        case PM_SOURCE_LINE_NODE:
            return pm_literals_map_add(literals.integer_nodes, pm_integer_or_line_key(metadata, node), node, replace);
        case PM_FLOAT_NODE:
            return pm_literals_map_add(literals.float_nodes, pm_float_key(metadata, node), node, replace);
        case PM_RATIONAL_NODE:
        case PM_IMAGINARY_NODE:
            return pm_literals_map_add(literals.number_nodes, pm_number_key(metadata, node), node, replace);
        case PM_STRING_NODE:
        case PM_SOURCE_FILE_NODE:
        case PM_SYMBOL_NODE:
            return pm_literals_map_add(literals.string_nodes, pm_string_like_key(metadata, node), node, replace);
        case PM_REGULAR_EXPRESSION_NODE:
            return pm_literals_map_add(literals.regexp_nodes, pm_regexp_key(metadata, node), node, replace);
        case PM_TRUE_NODE: {
            const duplicated = literals.true_node;
            if ((duplicated === null) || replace) literals.true_node = node;
            return duplicated;
        }
        case PM_FALSE_NODE: {
            const duplicated = literals.false_node;
            if ((duplicated === null) || replace) literals.false_node = node;
            return duplicated;
        }
        case PM_NIL_NODE: {
            const duplicated = literals.nil_node;
            if ((duplicated === null) || replace) literals.nil_node = node;
            return duplicated;
        }
        case PM_SOURCE_ENCODING_NODE: {
            const duplicated = literals.source_encoding_node;
            if ((duplicated === null) || replace) literals.source_encoding_node = node;
            return duplicated;
        }
        default:
            return null;
    }
}

// Free the internal memory associated with the given static literals set.
// A helper to determine if the given node is a static literal that is positive.
// This is used for formatting imaginary nodes.
function pm_static_literal_positive_p(node) {
    switch (node.type) {
        case PM_FLOAT_NODE:
            return node.value > 0;
        case PM_INTEGER_NODE:
            return node.value >= 0n;
        case PM_RATIONAL_NODE:
            return node.numerator >= 0n;
        case PM_IMAGINARY_NODE:
            return pm_static_literal_positive_p(node.numeric);
        default:
            // assert(false && "unreachable"); unreachable in the C original.
            return false;
    }
}

// Read the first byte of the node's location from the source, i.e. the C
// expression `*node->location.start`. See the deviation note at the top.
function location_start_byte(metadata, node) {
    return metadata.source === null || metadata.source === undefined ? 0 : (metadata.source.charCodeAt(node.location.start) || 0);
}

// printf's "%g" conversion for a FloatNode's value: the shortest of fixed or
// exponential notation at 6 significant digits, switching to exponential
// outside the [1e-4, 1e6) range (matching glibc/C's printf, which is what the
// pre-uni build relied on via a real printf call). This one conversion is
// kept as a standalone helper (rather than a general-purpose printf engine)
// since it's the only place left in this codebase that still needs it.
function pm_format_g(value) {
    const precision = 6;
    const num = Number(value);
    if (num === 0) return (Object.is(num, -0) ? "-" : "") + "0";
    if (!isFinite(num)) return num > 0 ? "inf" : "-inf";
    const exponent = Math.floor(Math.log10(Math.abs(num)));
    if (exponent < -4 || exponent >= precision) {
        const text = num.toExponential(Math.max(0, precision - 1));
        return text.replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e");
    }
    let text = num.toPrecision(precision);
    if (text.includes(".")) text = text.replace(/(\.\d*?)0+(?=e|$)/, "$1").replace(/\.$/, "");
    return text;
}

// Create a string-based representation of the given static literal.
function pm_static_literal_inspect_node(buffer, metadata, node) {
    switch (node.type) {
        case PM_FALSE_NODE:
            pm_buffer_append_string(buffer, "false");
            break;
        case PM_FLOAT_NODE: {
            const value = node.value;

            if (value === Infinity || value === -Infinity) {
                if (location_start_byte(metadata, node) === 45 /* '-' */) {
                    pm_buffer_append_byte(buffer, 45);
                }
                pm_buffer_append_string(buffer, "Infinity");
            } else if (value === 0.0) {
                if (location_start_byte(metadata, node) === 45 /* '-' */) {
                    pm_buffer_append_byte(buffer, 45);
                }
                pm_buffer_append_string(buffer, "0.0");
            } else {
                pm_buffer_append_string(buffer, pm_format_g(value));

                // %g will not insert a .0 for 1e100 (we'll get back 1e+100). So
                // we check for the decimal point and add it in here if it's not
                // present.
                if (pm_buffer_index(buffer, ".") === -1) {
                    const exponent_index = pm_buffer_index(buffer, "e");
                    const index = exponent_index === -1 ? pm_buffer_length(buffer) : exponent_index;
                    pm_buffer_insert(buffer, index, ".0");
                }
            }

            break;
        }
        case PM_IMAGINARY_NODE: {
            const numeric = node.numeric;
            pm_buffer_append_string(buffer, "(0");
            if (pm_static_literal_positive_p(numeric)) pm_buffer_append_byte(buffer, 43 /* '+' */);
            pm_static_literal_inspect_node(buffer, metadata, numeric);
            if (numeric.type === PM_RATIONAL_NODE) {
                pm_buffer_append_byte(buffer, 42 /* '*' */);
            }
            pm_buffer_append_string(buffer, "i)");
            break;
        }
        case PM_INTEGER_NODE:
            pm_integer_string(buffer, node.value);
            break;
        case PM_NIL_NODE:
            pm_buffer_append_string(buffer, "nil");
            break;
        case PM_RATIONAL_NODE: {
            const rational = node;
            pm_buffer_append_byte(buffer, 40 /* '(' */);
            pm_integer_string(buffer, rational.numerator);
            pm_buffer_append_byte(buffer, 47 /* '/' */);
            pm_integer_string(buffer, rational.denominator);
            pm_buffer_append_byte(buffer, 41 /* ')' */);
            break;
        }
        case PM_REGULAR_EXPRESSION_NODE: {
            const unescaped = node.unescaped;
            pm_buffer_append_byte(buffer, 47 /* '/' */);
            pm_buffer_append_source(buffer, (unescaped || ""), (unescaped ? unescaped.length : 0), PM_BUFFER_ESCAPING_RUBY);
            pm_buffer_append_byte(buffer, 47 /* '/' */);

            if ((node.flags & PM_REGULAR_EXPRESSION_FLAGS_MULTI_LINE) !== 0) pm_buffer_append_string(buffer, "m");
            if ((node.flags & PM_REGULAR_EXPRESSION_FLAGS_IGNORE_CASE) !== 0) pm_buffer_append_string(buffer, "i");
            if ((node.flags & PM_REGULAR_EXPRESSION_FLAGS_EXTENDED) !== 0) pm_buffer_append_string(buffer, "x");
            if ((node.flags & PM_REGULAR_EXPRESSION_FLAGS_ASCII_8BIT) !== 0) pm_buffer_append_string(buffer, "n");

            break;
        }
        case PM_SOURCE_ENCODING_NODE:
            pm_buffer_append_string(buffer, `#<Encoding:${metadata.encoding_name}>`);
            break;
        case PM_SOURCE_FILE_NODE: {
            const filepath = node.filepath;
            pm_buffer_append_byte(buffer, 34 /* '"' */);
            pm_buffer_append_source(buffer, (filepath || ""), (filepath ? filepath.length : 0), PM_BUFFER_ESCAPING_RUBY);
            pm_buffer_append_byte(buffer, 34 /* '"' */);
            break;
        }
        case PM_SOURCE_LINE_NODE:
            pm_buffer_append_string(buffer, `${Math.trunc(Number(pm_newline_list_line_column(metadata.newline_list, node.location.start, metadata.start_line).line))}`);
            break;
        case PM_STRING_NODE: {
            const unescaped = node.unescaped;
            pm_buffer_append_byte(buffer, 34 /* '"' */);
            pm_buffer_append_source(buffer, (unescaped || ""), (unescaped ? unescaped.length : 0), PM_BUFFER_ESCAPING_RUBY);
            pm_buffer_append_byte(buffer, 34 /* '"' */);
            break;
        }
        case PM_SYMBOL_NODE: {
            const unescaped = node.unescaped;
            pm_buffer_append_byte(buffer, 58 /* ':' */);
            pm_buffer_append_source(buffer, (unescaped || ""), (unescaped ? unescaped.length : 0), PM_BUFFER_ESCAPING_RUBY);
            break;
        }
        case PM_TRUE_NODE:
            pm_buffer_append_string(buffer, "true");
            break;
        default:
            // assert(false && "unreachable"); unreachable in the C original.
            break;
    }
}

// Create a string-based representation of the given static literal.
// Deviation: extra optional trailing `source` parameter (the parser's
// Uint8Array) needed for the C `*node->location.start` byte reads above.
export function pm_static_literal_inspect(buffer, newline_list, start_line, encoding_name, node, source = null) {
    pm_static_literal_inspect_node(
        buffer,
        { newline_list: newline_list, start_line: start_line, encoding_name: encoding_name, source: source },
        node
    );
}

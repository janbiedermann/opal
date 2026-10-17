import { pm_newline_list_append } from "./pm_newline_list.mjs";

// Character kinds (pm_byte_table bit flags)
const PRISM_CHAR_BIT_WHITESPACE = 1 << 0;
const PRISM_CHAR_BIT_INLINE_WHITESPACE = 1 << 1;
const PRISM_CHAR_BIT_REGEXP_OPTION = 1 << 2;

// Number kinds (pm_number_table bit flags)
const PRISM_NUMBER_BIT_BINARY_DIGIT = 1 << 0;
const PRISM_NUMBER_BIT_BINARY_NUMBER = 1 << 1;
const PRISM_NUMBER_BIT_OCTAL_DIGIT = 1 << 2;
const PRISM_NUMBER_BIT_OCTAL_NUMBER = 1 << 3;
const PRISM_NUMBER_BIT_DECIMAL_DIGIT = 1 << 4;
const PRISM_NUMBER_BIT_DECIMAL_NUMBER = 1 << 5;
const PRISM_NUMBER_BIT_HEXADECIMAL_DIGIT = 1 << 6;
const PRISM_NUMBER_BIT_HEXADECIMAL_NUMBER = 1 << 7;

const pm_byte_table = [
//  0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
    0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1, 3, 3, 3, 0, 0, // 0x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 1x
    3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 2x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 3x
    0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, // 4x
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, // 5x
    0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, // 6x
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, // 7x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 8x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 9x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // Ax
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // Bx
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // Cx
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // Dx
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // Ex
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // Fx
];

const pm_number_table = [
    // 0     1     2     3     4     5     6     7     8     9     A     B     C     D     E     F
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 0x
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 1x
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 2x
    0xff, 0xff, 0xfc, 0xfc, 0xfc, 0xfc, 0xfc, 0xfc, 0xf0, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 3x
    0x00, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 4x
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xaa, // 5x
    0x00, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 6x
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 7x
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 8x
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 9x
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Ax
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Bx
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Cx
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Dx
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Ex
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Fx
];

/**
 * Returns the number of characters at the start of the string that match the
 * given kind. Disallows searching past the given maximum number of characters.
 */
function pm_strspn_char_kind(buffer, offset, length, kind) {
    if (length <= 0) return 0;

    let size = 0;
    const maximum = length;

    while (size < maximum && (pm_byte_table[buffer.charCodeAt(offset + size)] & kind)) size++;
    return size;
}

/**
 * Returns the number of characters at the start of the string that are
 * whitespace. Disallows searching past the given maximum number of characters.
 */
export function pm_strspn_whitespace(buffer, offset, length) {
    return pm_strspn_char_kind(buffer, offset, length, PRISM_CHAR_BIT_WHITESPACE);
}

/**
 * Returns the number of characters at the start of the string that are
 * whitespace while also tracking the location of each newline. Disallows
 * searching past the given maximum number of characters.
 */
export function pm_strspn_whitespace_newlines(buffer, offset, length, newline_list) {
    if (length <= 0) return 0;

    let size = 0;
    const maximum = length;

    while (size < maximum && (pm_byte_table[buffer.charCodeAt(offset + size)] & PRISM_CHAR_BIT_WHITESPACE)) {
        if (buffer.charCodeAt(offset + size) === 0x0a /* \n */) {
            pm_newline_list_append(newline_list, offset + size);
        }

        size++;
    }

    return size;
}

/**
 * Returns the number of characters at the start of the string that are inline
 * whitespace. Disallows searching past the given maximum number of characters.
 */
export function pm_strspn_inline_whitespace(buffer, offset, length) {
    return pm_strspn_char_kind(buffer, offset, length, PRISM_CHAR_BIT_INLINE_WHITESPACE);
}

/**
 * Returns the number of characters at the start of the string that are regexp
 * options. Disallows searching past the given maximum number of characters.
 */
export function pm_strspn_regexp_option(buffer, offset, length) {
    return pm_strspn_char_kind(buffer, offset, length, PRISM_CHAR_BIT_REGEXP_OPTION);
}

/**
 * Returns true if the given character matches the given kind.
 */
function pm_char_is_char_kind(b, kind) {
    return (pm_byte_table[b] & kind) !== 0;
}

/**
 * Returns true if the given character is a whitespace character.
 */
export function pm_char_is_whitespace(b) {
    return pm_char_is_char_kind(b, PRISM_CHAR_BIT_WHITESPACE);
}

/**
 * Returns true if the given character is an inline whitespace character.
 */
export function pm_char_is_inline_whitespace(b) {
    return pm_char_is_char_kind(b, PRISM_CHAR_BIT_INLINE_WHITESPACE);
}

/**
 * Scan through the string and return the number of characters at the start of
 * the string that match the given kind. Disallows searching past the given
 * maximum number of characters.
 */
function pm_strspn_number_kind(buffer, offset, length, kind) {
    if (length <= 0) return 0;

    let size = 0;
    const maximum = length;

    while (size < maximum && (pm_number_table[buffer.charCodeAt(offset + size)] & kind)) size++;
    return size;
}

/**
 * Scan through the string and return the number of characters at the start of
 * the string that match the given kind. Disallows searching past the given
 * maximum number of characters.
 *
 * Additionally, report the location of the last invalid underscore character
 * found in the string through the out invalid parameter.
 */
function pm_strspn_number_kind_underscores(buffer, offset, length, kind) {
    if (length <= 0) return { size: 0, invalid: null };

    let size = 0;
    let underscore = false;
    let invalid = null;

    while (size < length && (pm_number_table[buffer.charCodeAt(offset + size)] & kind)) {
        if (buffer.charCodeAt(offset + size) === 0x5f /* _ */) {
            if (underscore) invalid = offset + size;
            underscore = true;
        } else {
            underscore = false;
        }

        size++;
    }

    if (size > 0 && buffer.charCodeAt(offset + size - 1) === 0x5f /* _ */) invalid = offset + size - 1;
    return { size, invalid };
}

/**
 * Returns the number of characters at the start of the string that are binary
 * digits or underscores. Disallows searching past the given maximum number of
 * characters.
 *
 * If multiple underscores are found in a row or if an underscore is
 * found at the end of the number, then the invalid pointer is set to the index
 * of the first invalid underscore.
 */
export function pm_strspn_binary_number(buffer, offset, length) {
    return pm_strspn_number_kind_underscores(buffer, offset, length, PRISM_NUMBER_BIT_BINARY_NUMBER);
}

/**
 * Returns the number of characters at the start of the string that are octal
 * digits or underscores. Disallows searching past the given maximum number of
 * characters.
 *
 * If multiple underscores are found in a row or if an underscore is
 * found at the end of the number, then the invalid pointer is set to the index
 * of the first invalid underscore.
 */
export function pm_strspn_octal_number(buffer, offset, length) {
    return pm_strspn_number_kind_underscores(buffer, offset, length, PRISM_NUMBER_BIT_OCTAL_NUMBER);
}

/**
 * Returns the number of characters at the start of the string that are decimal
 * digits. Disallows searching past the given maximum number of characters.
 */
export function pm_strspn_decimal_digit(buffer, offset, length) {
    return pm_strspn_number_kind(buffer, offset, length, PRISM_NUMBER_BIT_DECIMAL_DIGIT);
}

/**
 * Returns the number of characters at the start of the string that are decimal
 * digits or underscores. Disallows searching past the given maximum number of
 * characters.
 *
 * If multiple underscores are found in a row or if an underscore is
 * found at the end of the number, then the invalid pointer is set to the index
 * of the first invalid underscore
 */
export function pm_strspn_decimal_number(buffer, offset, length) {
    return pm_strspn_number_kind_underscores(buffer, offset, length, PRISM_NUMBER_BIT_DECIMAL_NUMBER);
}

/**
 * Returns the number of characters at the start of the string that are
 * hexadecimal digits. Disallows searching past the given maximum number of
 * characters.
 */
export function pm_strspn_hexadecimal_digit(buffer, offset, length) {
    return pm_strspn_number_kind(buffer, offset, length, PRISM_NUMBER_BIT_HEXADECIMAL_DIGIT);
}

/**
 * Returns the number of characters at the start of the string that are
 * hexadecimal digits or underscores. Disallows searching past the given maximum
 * number of characters.
 *
 * If multiple underscores are found in a row or if an underscore is
 * found at the end of the number, then the invalid pointer is set to the index
 * of the first invalid underscore.
 */
export function pm_strspn_hexadecimal_number(buffer, offset, length) {
    return pm_strspn_number_kind_underscores(buffer, offset, length, PRISM_NUMBER_BIT_HEXADECIMAL_NUMBER);
}

/**
 * Returns true if the given character matches the given kind.
 */
function pm_char_is_number_kind(b, kind) {
    return (pm_number_table[b] & kind) !== 0;
}

/**
 * Returns true if the given character is a binary digit.
 */
export function pm_char_is_binary_digit(b) {
    return pm_char_is_number_kind(b, PRISM_NUMBER_BIT_BINARY_DIGIT);
}

/**
 * Returns true if the given character is an octal digit.
 */
export function pm_char_is_octal_digit(b) {
    return pm_char_is_number_kind(b, PRISM_NUMBER_BIT_OCTAL_DIGIT);
}

/**
 * Returns true if the given character is a decimal digit.
 */
export function pm_char_is_decimal_digit(b) {
    return pm_char_is_number_kind(b, PRISM_NUMBER_BIT_DECIMAL_DIGIT);
}

/**
 * Returns true if the given character is a hexadecimal digit.
 */
export function pm_char_is_hexadecimal_digit(b) {
    return pm_char_is_number_kind(b, PRISM_NUMBER_BIT_HEXADECIMAL_DIGIT);
}

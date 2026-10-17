// Ported from src/regexp.c
// Pointers into the scanned buffer are numeric offsets; `parser.source` here
// is a plain JS string held on the regexp parser object (the scanned source
// is caller-provided and not necessarily the main parser source).

import { pm_encoding_utf_8_char_width } from "./encoding.mjs";

// UNI-BUILD: C copies Onigmo's own limit here (a count of parse-depth
// units, checked against a C-stack-based recursion). This grammar's
// mutual recursion (parse_group -> parse_expression -> parse_item ->
// parse_group -> ...) costs several JS stack frames per depth unit, and
// JS's own call stack is much shallower than the C limit this constant
// was designed for - empirically, `node cmd.js` starts throwing
// `RangeError: Maximum call stack size exceeded` (from the *uncounted*
// recursion inside pm_regexp_parse_group, before this check even runs)
// somewhere around 2100-2250 nested groups. 1000 leaves a comfortable
// margin below that while staying far above any depth a real regex would
// ever legitimately nest to.
const PM_REGEXP_PARSE_DEPTH_MAX = 1000;

// enum { PM_REGEXP_RANGE_QUANTIFIER_STATE_START, ... }
export const PM_REGEXP_RANGE_QUANTIFIER_STATE_START = 0;
export const PM_REGEXP_RANGE_QUANTIFIER_STATE_MINIMUM = 1;
export const PM_REGEXP_RANGE_QUANTIFIER_STATE_MAXIMUM = 2;
export const PM_REGEXP_RANGE_QUANTIFIER_STATE_COMMA = 3;

// typedef enum { PM_REGEXP_OPTION_STATE_INVALID, ... } pm_regexp_option_state_t;
export const PM_REGEXP_OPTION_STATE_INVALID = 0;
export const PM_REGEXP_OPTION_STATE_TOGGLEABLE = 1;
export const PM_REGEXP_OPTION_STATE_ADDABLE = 2;
export const PM_REGEXP_OPTION_STATE_ADDED = 3;
export const PM_REGEXP_OPTION_STATE_REMOVED = 4;

export const PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM = "a".charCodeAt(0);
export const PRISM_REGEXP_OPTION_STATE_SLOT_MAXIMUM = "x".charCodeAt(0);
export const PRISM_REGEXP_OPTION_STATE_SLOTS =
    PRISM_REGEXP_OPTION_STATE_SLOT_MAXIMUM - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM + 1;

// Append an error to the parser.
function pm_regexp_parse_error(parser, start, end, message) {
    parser.error_callback(start, end, message, parser.error_data);
}

// This appends a new string to the list of named captures. This function
// assumes the caller has already checked the validity of the name callback.
function pm_regexp_parser_named_capture(parser, start, end) {
    parser.name_callback(start, end, parser.name_data);
}

// Returns true if the next character is the end of the source.
function pm_regexp_char_is_eof(parser) {
    return parser.cursor >= parser.end;
}

// Optionally accept a char and consume it if it exists.
function pm_regexp_char_accept(parser, char) {
    if (!pm_regexp_char_is_eof(parser) && parser.source[parser.cursor] === char) {
        parser.cursor++;
        return true;
    }
    return false;
}

// Expect a character to be present and consume it. Identical to accept in the
// C original (both consume on match; the caller pairs expect with an error).
const pm_regexp_char_expect = pm_regexp_char_accept;

// This advances the current token to the next instance of the given character.
function pm_regexp_char_find(parser, char) {
    if (pm_regexp_char_is_eof(parser)) {
        return false;
    }

    const raw_end = parser.source.indexOf(char, parser.cursor);
    const search_limit = parser.end;
    const end = (raw_end !== -1 && raw_end < search_limit) ? raw_end : -1;
    if (end === -1) {
        return false;
    }

    parser.cursor = end + 1;
    return true;
}

// Range quantifiers are a special class of quantifiers that look like
//
// * {digit}
// * {digit,}
// * {digit,digit}
// * {,digit}
//
// Unfortunately, if there are any spaces in between, then this just becomes a
// regular character match expression and we have to backtrack. So when this
// function first starts running, we'll create a "save" point and then attempt
// to parse the quantifier. If it fails, we'll restore the save point and
// return.
//
// Note that by the time we've hit this function, the lbrace has already been
// consumed so we're in the start state.
// True if `char` (a one-character string, or undefined past the end of the
// source) is an ASCII digit. String comparison operators are lexicographic
// per UTF-16 code unit, and "0"-"9" are contiguous, so this is exact.
function pm_regexp_char_is_digit(char) {
    return char >= "0" && char <= "9";
}

function pm_regexp_parse_range_quantifier(parser) {
    const savepoint = parser.cursor;

    let state = PM_REGEXP_RANGE_QUANTIFIER_STATE_START;

    while (true) {
        if (parser.cursor >= parser.end) {
            parser.cursor = savepoint;
            return true;
        }

        const char = parser.source[parser.cursor];

        switch (state) {
            case PM_REGEXP_RANGE_QUANTIFIER_STATE_START:
                if (pm_regexp_char_is_digit(char)) {
                    parser.cursor++;
                    state = PM_REGEXP_RANGE_QUANTIFIER_STATE_MINIMUM;
                } else if (char === ",") {
                    parser.cursor++;
                    state = PM_REGEXP_RANGE_QUANTIFIER_STATE_COMMA;
                } else {
                    parser.cursor = savepoint;
                    return true;
                }
                break;
            case PM_REGEXP_RANGE_QUANTIFIER_STATE_MINIMUM:
                if (pm_regexp_char_is_digit(char)) {
                    parser.cursor++;
                } else if (char === ",") {
                    parser.cursor++;
                    state = PM_REGEXP_RANGE_QUANTIFIER_STATE_MAXIMUM;
                } else if (char === "}") {
                    parser.cursor++;
                    return true;
                } else {
                    parser.cursor = savepoint;
                    return true;
                }
                break;
            case PM_REGEXP_RANGE_QUANTIFIER_STATE_COMMA:
                if (pm_regexp_char_is_digit(char)) {
                    parser.cursor++;
                    state = PM_REGEXP_RANGE_QUANTIFIER_STATE_MAXIMUM;
                } else {
                    parser.cursor = savepoint;
                    return true;
                }
                break;
            case PM_REGEXP_RANGE_QUANTIFIER_STATE_MAXIMUM:
                if (pm_regexp_char_is_digit(char)) {
                    parser.cursor++;
                } else if (char === "}") {
                    parser.cursor++;
                    return true;
                } else {
                    parser.cursor = savepoint;
                    return true;
                }
                break;
        }
    }
}

// quantifier : star-quantifier
//            | plus-quantifier
//            | optional-quantifier
//            | range-quantifier
//            | <empty>
//            ;
function pm_regexp_parse_quantifier(parser) {
    while (!pm_regexp_char_is_eof(parser)) {
        switch (parser.source[parser.cursor]) {
            case "*":
            case "+":
            case "?":
                parser.cursor++;
                break;
            case "{":
                parser.cursor++;
                if (!pm_regexp_parse_range_quantifier(parser)) return false;
                break;
            default:
                // In this case there is no quantifier.
                return true;
        }
    }

    return true;
}

// match-posix-class : '[' '[' ':' '^'? CHAR+ ':' ']' ']'
//                   ;
function pm_regexp_parse_posix_class(parser) {
    if (!pm_regexp_char_expect(parser, ":")) {
        return false;
    }

    pm_regexp_char_accept(parser, "^");

    return (
        pm_regexp_char_find(parser, ":") &&
        pm_regexp_char_expect(parser, "]") &&
        pm_regexp_char_expect(parser, "]")
    );
}

// match-char-set : '[' '^'? (match-range | match-char)* ']'
//                ;
function pm_regexp_parse_character_set(parser, depth) {
    pm_regexp_char_accept(parser, "^");

    while (!pm_regexp_char_is_eof(parser) && parser.source[parser.cursor] !== "]") {
        switch (parser.source[parser.cursor++]) {
            case "[":
                pm_regexp_parse_lbracket(parser, depth + 1);
                break;
            case "\\":
                if (!pm_regexp_char_is_eof(parser)) {
                    parser.cursor++;
                }
                break;
            default:
                // do nothing, we've already advanced the cursor
                break;
        }
    }

    return pm_regexp_char_expect(parser, "]");
}

// A left bracket can either mean a POSIX class or a character set.
function pm_regexp_parse_lbracket(parser, depth) {
    if (depth >= PM_REGEXP_PARSE_DEPTH_MAX) {
        pm_regexp_parse_error(parser, parser.start, parser.end, "parse depth limit over");
        return false;
    }

    if ((parser.cursor < parser.end) && parser.source[parser.cursor] === "]") {
        parser.cursor++;
        pm_regexp_parse_error(parser, parser.cursor - 1, parser.cursor, "empty char-class");
        return true;
    }

    const reset = parser.cursor;

    if ((parser.cursor + 2 < parser.end) && parser.source[parser.cursor] === "[" && parser.source[parser.cursor + 1] === ":") {
        parser.cursor++;
        if (pm_regexp_parse_posix_class(parser)) return true;

        parser.cursor = reset;
    }

    return pm_regexp_parse_character_set(parser, depth);
}

// Initialize a new set of options to their default values.
function pm_regexp_options_init(options) {
    options.values.fill(PM_REGEXP_OPTION_STATE_INVALID);
    options.values["i".charCodeAt(0) - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM] = PM_REGEXP_OPTION_STATE_TOGGLEABLE;
    options.values["m".charCodeAt(0) - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM] = PM_REGEXP_OPTION_STATE_TOGGLEABLE;
    options.values["x".charCodeAt(0) - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM] = PM_REGEXP_OPTION_STATE_TOGGLEABLE;
    options.values["d".charCodeAt(0) - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM] = PM_REGEXP_OPTION_STATE_ADDABLE;
    options.values["a".charCodeAt(0) - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM] = PM_REGEXP_OPTION_STATE_ADDABLE;
    options.values["u".charCodeAt(0) - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM] = PM_REGEXP_OPTION_STATE_ADDABLE;
}

// Attempt to add the given option to the set of options. Returns true if it was
// added, false if it was already present.
function pm_regexp_options_add(options, key) {
    if (key >= PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM && key <= PRISM_REGEXP_OPTION_STATE_SLOT_MAXIMUM) {
        key = key - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM;

        switch (options.values[key]) {
            case PM_REGEXP_OPTION_STATE_INVALID:
            case PM_REGEXP_OPTION_STATE_REMOVED:
                return false;
            case PM_REGEXP_OPTION_STATE_TOGGLEABLE:
            case PM_REGEXP_OPTION_STATE_ADDABLE:
                options.values[key] = PM_REGEXP_OPTION_STATE_ADDED;
                return true;
            case PM_REGEXP_OPTION_STATE_ADDED:
                return true;
        }
    }

    return false;
}

// Attempt to remove the given option from the set of options. Returns true if
// it was removed, false if it was already absent.
function pm_regexp_options_remove(options, key) {
    if (key >= PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM && key <= PRISM_REGEXP_OPTION_STATE_SLOT_MAXIMUM) {
        key = key - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM;

        switch (options.values[key]) {
            case PM_REGEXP_OPTION_STATE_INVALID:
            case PM_REGEXP_OPTION_STATE_ADDABLE:
                return false;
            case PM_REGEXP_OPTION_STATE_TOGGLEABLE:
            case PM_REGEXP_OPTION_STATE_ADDED:
            case PM_REGEXP_OPTION_STATE_REMOVED:
                options.values[key] = PM_REGEXP_OPTION_STATE_REMOVED;
                return true;
        }
    }

    return false;
}

// True if the given key is set in the options.
function pm_regexp_options_state(options, key) {
    if (key >= PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM && key <= PRISM_REGEXP_OPTION_STATE_SLOT_MAXIMUM) {
        key = key - PRISM_REGEXP_OPTION_STATE_SLOT_MINIMUM;
        return options.values[key];
    }

    return false;
}

// Groups can have quite a few different patterns for syntax. They basically
// just wrap a set of expressions, but they can potentially have options after a
// question mark. If there _isn't_ a question mark, then it's just a set of
// expressions. If there _is_, then here are the options:
//
// * (?#...)                       - inline comments
// * (?:subexp)                    - non-capturing group
// * (?=subexp)                    - positive lookahead
// * (?!subexp)                    - negative lookahead
// * (?>subexp)                    - atomic group
// * (?~subexp)                    - absence operator
// * (?<=subexp)                   - positive lookbehind
// * (?<!subexp)                   - negative lookbehind
// * (?<name>subexp)               - named capturing group
// * (?'name'subexp)               - named capturing group
// * (?(cond)yes-subexp)           - conditional expression
// * (?(cond)yes-subexp|no-subexp) - conditional expression
// * (?imxdau-imx)                 - turn on and off configuration
// * (?imxdau-imx:subexp)          - turn on and off configuration for an expression
function pm_regexp_parse_group(parser, depth) {
    if (depth >= PM_REGEXP_PARSE_DEPTH_MAX) {
        pm_regexp_parse_error(parser, parser.start, parser.end, "parse depth limit over");
        return false;
    }

    const group_start = parser.cursor;

    const options = { values: new Uint8Array(PRISM_REGEXP_OPTION_STATE_SLOTS) };
    pm_regexp_options_init(options);

    // First, parse any options for the group.
    if (pm_regexp_char_accept(parser, "?")) {
        if (pm_regexp_char_is_eof(parser)) {
            pm_regexp_parse_error(parser, group_start, parser.cursor, "end pattern in group");
            return false;
        }

        switch (parser.source[parser.cursor]) {
            case "#": { // inline comments
                parser.cursor++;
                if (pm_regexp_char_is_eof(parser)) {
                    pm_regexp_parse_error(parser, group_start, parser.cursor, "end pattern in group");
                    return false;
                }

                // UNI-BUILD: C has a slow path here for when
                // parser.encoding_changed && parser.encoding.multibyte, iterating
                // character-by-character because \ can be a trailing byte in some
                // multibyte encodings. encoding_changed is never set in this
                // build (single encoding, no encoding-change callback fires), so
                // that slow path is dropped; this fast path (safe to check
                // backward for \ since it cannot be a trailing character here)
                // always runs.
                let found = pm_regexp_char_find(parser, ")");

                while (found && (parser.start <= parser.cursor - 2) && (parser.source[parser.cursor - 2] === "\\")) {
                    found = pm_regexp_char_find(parser, ")");
                }

                return found;
            }
            case ":": // non-capturing group
            case "=": // positive lookahead
            case "!": // negative lookahead
            case ">": // atomic group
            case "~": // absence operator
                parser.cursor++;
                break;
            case "<":
                parser.cursor++;
                if (pm_regexp_char_is_eof(parser)) {
                    pm_regexp_parse_error(parser, group_start, parser.cursor, "end pattern with unmatched parenthesis");
                    return false;
                }

                switch (parser.source[parser.cursor]) {
                    case "=": // positive lookbehind
                    case "!": // negative lookbehind
                        parser.cursor++;
                        break;
                    default: { // named capture group
                        const start = parser.cursor;
                        if (!pm_regexp_char_find(parser, ">")) {
                            return false;
                        }

                        if (parser.cursor - start === 1) {
                            pm_regexp_parse_error(parser, start, parser.cursor, "group name is empty");
                        }

                        if (parser.name_callback != null) {
                            pm_regexp_parser_named_capture(parser, start, parser.cursor - 1);
                        }

                        break;
                    }
                }
                break;
            case "'": { // named capture group
                parser.cursor++;
                const start = parser.cursor;
                if (!pm_regexp_char_find(parser, "'")) {
                    return false;
                }

                if (parser.name_callback != null) {
                    pm_regexp_parser_named_capture(parser, start, parser.cursor - 1);
                }

                break;
            }
            case "(": // conditional expression
                if (!pm_regexp_char_find(parser, ")")) {
                    return false;
                }
                break;
            case "i": case "m": case "x": case "d": case "a": case "u": // options
                while (!pm_regexp_char_is_eof(parser) && parser.source[parser.cursor] !== "-" && parser.source[parser.cursor] !== ":" && parser.source[parser.cursor] !== ")") {
                    if (!pm_regexp_options_add(options, (parser.source.charCodeAt(parser.cursor) || 0))) {
                        return false;
                    }
                    parser.cursor++;
                }

                if (pm_regexp_char_is_eof(parser)) {
                    return false;
                }

                // If we are at the end of the group of options and there is no
                // subexpression, then we are going to be setting the options
                // for the parent group. In this case we are safe to return now.
                if (parser.source[parser.cursor] === ")") {
                    if (pm_regexp_options_state(options, "x".charCodeAt(0)) === PM_REGEXP_OPTION_STATE_ADDED) {
                        parser.extended_mode = true;
                    }

                    parser.cursor++;
                    return true;
                }

                // If we hit a -, then we're done parsing options.
                if (parser.source[parser.cursor] !== "-") break;

                // falls through
            case "-":
                parser.cursor++;
                while (!pm_regexp_char_is_eof(parser) && parser.source[parser.cursor] !== ":" && parser.source[parser.cursor] !== ")") {
                    if (!pm_regexp_options_remove(options, (parser.source.charCodeAt(parser.cursor) || 0))) {
                        return false;
                    }
                    parser.cursor++;
                }

                if (pm_regexp_char_is_eof(parser)) {
                    return false;
                }

                // If we are at the end of the group of options and there is no
                // subexpression, then we are going to be setting the options
                // for the parent group. In this case we are safe to return now.
                if (parser.source[parser.cursor] === ")") {
                    switch (pm_regexp_options_state(options, "x".charCodeAt(0))) {
                        case PM_REGEXP_OPTION_STATE_ADDED:
                            parser.extended_mode = true;
                            break;
                        case PM_REGEXP_OPTION_STATE_REMOVED:
                            parser.extended_mode = false;
                            break;
                    }

                    parser.cursor++;
                    return true;
                }

                break;
            default:
                parser.cursor++;
                pm_regexp_parse_error(parser, parser.cursor - 1, parser.cursor, "undefined group option");
                break;
        }
    }

    const extended_mode = parser.extended_mode;
    switch (pm_regexp_options_state(options, "x".charCodeAt(0))) {
        case PM_REGEXP_OPTION_STATE_ADDED:
            parser.extended_mode = true;
            break;
        case PM_REGEXP_OPTION_STATE_REMOVED:
            parser.extended_mode = false;
            break;
    }

    // Now, parse the expressions within this group.
    while (!pm_regexp_char_is_eof(parser) && parser.source[parser.cursor] !== ")") {
        if (!pm_regexp_parse_expression(parser, depth + 1)) {
            parser.extended_mode = extended_mode;
            return false;
        }
        pm_regexp_char_accept(parser, "|");
    }

    // Finally, make sure we have a closing parenthesis.
    parser.extended_mode = extended_mode;
    if (pm_regexp_char_expect(parser, ")")) return true;

    pm_regexp_parse_error(parser, group_start, parser.cursor, "end pattern with unmatched parenthesis");
    return false;
}

// item : anchor
//      | match-posix-class
//      | match-char-set
//      | match-char-class
//      | match-char-prop
//      | match-char
//      | match-any
//      | group
//      | quantified
//      ;
function pm_regexp_parse_item(parser, depth) {
    switch (parser.source[parser.cursor]) {
        case "^":
        case "$":
            parser.cursor++;
            return pm_regexp_parse_quantifier(parser);
        case "\\":
            parser.cursor++;
            if (!pm_regexp_char_is_eof(parser)) {
                parser.cursor++;
            }
            return pm_regexp_parse_quantifier(parser);
        case "(":
            parser.cursor++;
            return pm_regexp_parse_group(parser, depth) && pm_regexp_parse_quantifier(parser);
        case "[":
            parser.cursor++;
            return pm_regexp_parse_lbracket(parser, depth) && pm_regexp_parse_quantifier(parser);
        case "*":
        case "?":
        case "+":
            parser.cursor++;
            pm_regexp_parse_error(parser, parser.cursor - 1, parser.cursor, "target of repeat operator is not specified");
            return true;
        case ")":
            parser.cursor++;
            pm_regexp_parse_error(parser, parser.cursor - 1, parser.cursor, "unmatched close parenthesis");
            return true;
        case "#":
            if (parser.extended_mode) {
                if (!pm_regexp_char_find(parser, "\n")) parser.cursor = parser.end;
                return true;
            }
        // falls through
        default: {
            // UNI-BUILD: C falls back to parser.encoding.char_width when
            // parser.encoding_changed; that flag is never set in this build
            // (see the group-comment case above), so this always uses the
            // plain UTF-8 char width.
            const width = pm_encoding_utf_8_char_width(parser.source, parser.cursor, parser.end - parser.cursor);

            if (width === 0) return false; // TODO: add appropriate error
            parser.cursor += width;

            return pm_regexp_parse_quantifier(parser);
        }
    }
}

// expression : item+
//            ;
function pm_regexp_parse_expression(parser, depth) {
    if (depth >= PM_REGEXP_PARSE_DEPTH_MAX) {
        pm_regexp_parse_error(parser, parser.start, parser.end, "parse depth limit over");
        return false;
    }

    if (!pm_regexp_parse_item(parser, depth)) {
        return false;
    }

    while (!pm_regexp_char_is_eof(parser) && parser.source[parser.cursor] !== ")" && parser.source[parser.cursor] !== "|") {
        if (!pm_regexp_parse_item(parser, depth)) {
            return false;
        }
    }

    return true;
}

// pattern : EOF
//         | expression EOF
//         | expression '|' pattern
//         ;
function pm_regexp_parse_pattern(parser) {
    do {
        if (pm_regexp_char_is_eof(parser)) return true;
        if (!pm_regexp_parse_expression(parser, 0)) return false;
    } while (pm_regexp_char_accept(parser, "|"));

    return pm_regexp_char_is_eof(parser);
}

// Parse a regular expression and extract the names of all of the named capture
// groups.
export function pm_regexp_parse(parser, source, size, extended_mode, name_callback, name_data, error_callback, error_data) {
    const state = {
        parser,
        source,
        start: 0,
        cursor: 0,
        end: size,
        extended_mode,
        encoding_changed: parser != null ? parser.encoding_changed : false,
        encoding: parser != null ? parser.encoding : null,
        name_callback,
        name_data,
        error_callback,
        error_data
    };

    // Defense in depth: PM_REGEXP_PARSE_DEPTH_MAX is tuned empirically
    // against this build's actual stack usage (see its definition above),
    // not derived from a portable guarantee. If some other environment
    // still overflows the stack before that counted limit is reached,
    // degrade to a normal parse error instead of crashing the process.
    try {
        pm_regexp_parse_pattern(state);
    } catch (error) {
        if (error instanceof RangeError) {
            pm_regexp_parse_error(state, state.start, state.end, "parse depth limit over");
            return;
        }
        throw error;
    }
}

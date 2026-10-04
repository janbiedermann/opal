// prism.c lines 7090-9735 converted to JavaScript (ES2022).
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on part1/part2, ast.js, node.js, diagnostic.js,
// options.js, token_type.js, encoding.js and the util modules being
// concatenated/imported around it.
//
// Adaptation notes for the integrator:
// - C pointers into parser->source are numeric offsets (see part1). NULL
//   pointers become null for objects and -1 for numeric offsets:
//   next_newline, parser_lex_magic_comment_emacs_marker and every pm_memchr
//   call site below use -1 as the "not found" sentinel.
// - next_newline has no parser parameter in C, so the source buffer is passed
//   explicitly (same pattern as part1's char_is_identifier_utf8):
//   next_newline(source, cursor, length) -> offset or -1.
// - pm_state_stack_t values live on the parser as plain number fields
//   (parser.accepts_block_stack / parser.do_loop_stack) with uint32 wrap
//   semantics ((x << 1 | v) >>> 0, x >>> 1). The generic helpers take and
//   return plain numbers; the parser-specific wrappers assign them directly.
// - C out-params become return values: lex_optional_float_suffix /
//   lex_numeric_prefix return { type, seen_e }; pm_heredoc_strspn_inline_
//   whitespace returns [whitespace, cursor]; the strspn number scanners return
//   { size, invalid } with `invalid` a source offset or null.
// - Encoding callbacks are called as fn(parser.source, offset, n).
// - Magic-comment keys/values are compared case-insensitively via
//   .toLowerCase() === constant_string.
//   encode those constants once at module level below
//   (MAGIC_COMMENT_*_BYTES).
// - escape_unicode indexes parser.source directly: its C `string` pointer
//   parameter becomes a numeric offset so that the error_location == null
//   branch keeps exact start/end offsets.
// - Octal escapes truncate through uint8_t in C (\777 wraps to 255); those
//   shifts are masked with & 0xff explicitly.
// - Magic comments appended to parser.magic_comment_list are plain objects
//   { key_start, value_start, key_length, value_length } where key_start /
//   value_start are numeric offsets into parser.source.
// - pm_slice_ascii_only_p takes a JS string (a slice of the source) plus a
//   length; offset-based call sites pass parser.source.slice(start, end).
// - Token buffers (pm_token_buffer_t / pm_regexp_token_buffer_t) are plain
//   objects:
//     pm_token_buffer_t        := { buffer: pm_buffer_t, cursor: number | null }
//     pm_regexp_token_buffer_t := { base: pm_token_buffer_t, regexp_buffer: pm_buffer_t }
//   Local buffers are created as `{}` and initialized via
//   pm_buffer_init_capacity, mirroring `pm_buffer_t buffer; init(&buffer)`.
// - parser.heredoc_end is an offset or null (C NULL pointer);
//   parser_flush_heredoc_end assigns it to parser.next_start verbatim.
// - parser.current_string is written in place through
//   pm_string_shared_init/pm_string_owned_init exactly like regexp.js does.
// - The LEX(token_type) macro (prism.c:9726) is not defined here; expand it at
//   its use sites as `parser.current.type = X; parser_lex_callback(parser);
//   return;`.
// - parser_lex itself starts at prism.c:9734 and belongs to the next fragment.
//
// Struct shapes referenced below (documented, not declared):
// - pm_magic_comment_t := { key_start, value_start, key_length, value_length }
// - pm_comment_t       := { type, location: { start, end } }
// - pm_context_node_t  := { context, prev }

/******************************************************************************/
/* Local variables                                                            */
/******************************************************************************/

/**
 * Check if any of the currently visible scopes contain a local variable
 * described by the given constant id.
 */
function pm_parser_local_depth_constant_id(parser, constant_id) {
    let scope = parser.current_scope;
    let depth = 0;

    while (scope !== null) {
        if (scope.locals.has(constant_id)) return depth;
        if (scope.closed) break;

        scope = scope.previous;
        depth++;
    }

    return -1;
}

/**
 * Check if any of the currently visible scopes contain a local variable
 * described by the given token. This function implicitly inserts a constant
 * into the constant pool.
 */
function pm_parser_local_depth(parser, token) {
    return pm_parser_local_depth_constant_id(parser, pm_parser_constant_id_token(parser, token));
}

/**
 * Add a constant id to the local table of the current scope.
 */
function pm_parser_local_add(parser, constant_id, start, end, reads) {
    pm_locals_write(parser.current_scope.locals, constant_id, start, end, reads);
}

/**
 * Add a local variable from a location to the current scope.
 */
function pm_parser_local_add_location(parser, start, end, reads) {
    const constant_id = pm_parser_constant_id_location(parser, start, end);
    if (constant_id !== 0) pm_parser_local_add(parser, constant_id, start, end, reads);
    return constant_id;
}

/**
 * Add a local variable from a token to the current scope.
 */
function pm_parser_local_add_token(parser, token, reads) {
    return pm_parser_local_add_location(parser, token.start, token.end, reads);
}

/**
 * Add a local variable from an owned string to the current scope. `bytes`
 * holds the content (a Uint8Array whose first `length` entries hold it).
 */
function pm_parser_local_add_owned(parser, bytes, length) {
    const constant_id = pm_parser_constant_id_owned(parser, bytes, length);
    if (constant_id !== 0) pm_parser_local_add(parser, constant_id, parser.start, parser.start, 1);
    return constant_id;
}

/**
 * Add a local variable from a constant string to the current scope. `str` is
 * a JS string.
 */
function pm_parser_local_add_constant(parser, str, length) {
    const constant_id = pm_parser_constant_id_constant(parser, str, length);
    if (constant_id !== 0) pm_parser_local_add(parser, constant_id, parser.start, parser.start, 1);
    return constant_id;
}

/**
 * Add a parameter name to the current scope and check whether the name of the
 * parameter is unique or not.
 *
 * Returns `true` if this is a duplicate parameter name, otherwise returns
 * false.
 */
function pm_parser_parameter_name_check(parser, name) {
    // We want to check whether the parameter name is a numbered parameter or
    // not.
    pm_refute_numbered_parameter(parser, name.start, name.end);

    // Otherwise we'll fetch the constant id for the parameter name and check
    // whether it's already in the current scope.
    const constant_id = pm_parser_constant_id_token(parser, name);

    if (parser.current_scope.locals.has(constant_id)) {
        // Add an error if the parameter doesn't start with _ and has been seen before
        if ((name.start < name.end) && (parser.source[name.start] !== '_')) {
            pm_parser_err_token(parser, name, PM_ERR_PARAMETER_NAME_DUPLICATED);
        }
        return true;
    }
    return false;
}

/**
 * Pop the current scope off the scope stack.
 */
function pm_parser_scope_pop(parser) {
    const scope = parser.current_scope;
    parser.current_scope = scope.previous;
}

/******************************************************************************/
/* Stack helpers                                                              */
/******************************************************************************/
//
// The stacks themselves (parser.accepts_block_stack / parser.do_loop_stack)
// are plain uint32 numbers on the parser; these helpers pass them through a
// { value } box so they can mutate them.

/**
 * Pushes a value onto the stack.
 */
function pm_state_stack_push(value, bit) {
    return ((value << 1) | (bit & 1)) >>> 0;
}

/**
 * Pops a value off the stack.
 */
function pm_state_stack_pop(value) {
    return value >>> 1;
}

/**
 * Returns the value at the top of the stack.
 */
function pm_state_stack_p(value) {
    return (value & 1) !== 0;
}

function pm_accepts_block_stack_push(parser, value) {
    // Use the negation of the value to prevent stack overflow.
    parser.accepts_block_stack = pm_state_stack_push(parser.accepts_block_stack, !value);
}

function pm_accepts_block_stack_pop(parser) {
    parser.accepts_block_stack = pm_state_stack_pop(parser.accepts_block_stack);
}

function pm_accepts_block_stack_p(parser) {
    return !pm_state_stack_p(parser.accepts_block_stack);
}

function pm_do_loop_stack_push(parser, value) {
    parser.do_loop_stack = pm_state_stack_push(parser.do_loop_stack, value);
}

function pm_do_loop_stack_pop(parser) {
    parser.do_loop_stack = pm_state_stack_pop(parser.do_loop_stack);
}

function pm_do_loop_stack_p(parser) {
    return pm_state_stack_p(parser.do_loop_stack);
}

/******************************************************************************/
/* Lexer check helpers                                                        */
/******************************************************************************/

/**
 * Get the next character in the source starting from +cursor+. If that position
 * is beyond the end of the source then return '\0'.
 */
function peek_at(parser, cursor) {
    if (cursor < parser.end) {
        return (parser.source.charCodeAt(cursor));
    } else {
        return 0; // '\0'
    }
}

/**
 * Get the next character in the source starting from parser->current.end and
 * adding the given offset. If that position is beyond the end of the source
 * then return '\0'.
 */
function peek_offset(parser, offset) {
    return peek_at(parser, parser.current.end + offset);
}

/**
 * Get the next character in the source starting from parser->current.end. If
 * that position is beyond the end of the source then return '\0'.
 */
function peek(parser) {
    return peek_at(parser, parser.current.end);
}

/**
 * If the character to be read matches the given value, then returns true and
 * advances the current pointer.
 */
function match(parser, value) {
    if (peek(parser) === value) {
        parser.current.end++;
        return true;
    }
    return false;
}

/**
 * Return the length of the line ending string starting at +cursor+, or 0 if it
 * is not a line ending. This function is intended to be CRLF/LF agnostic.
 */
function match_eol_at(parser, cursor) {
    if (peek_at(parser, cursor) === 10 /* '\n' */) {
        return 1;
    }
    if (peek_at(parser, cursor) === 13 /* '\r' */ && peek_at(parser, cursor + 1) === 10 /* '\n' */) {
        return 2;
    }
    return 0;
}

/**
 * Return the length of the line ending string starting at
 * `parser->current.end + offset`, or 0 if it is not a line ending. This
 * function is intended to be CRLF/LF agnostic.
 */
function match_eol_offset(parser, offset) {
    return match_eol_at(parser, parser.current.end + offset);
}

/**
 * Return the length of the line ending string starting at parser->current.end,
 * or 0 if it is not a line ending. This function is intended to be CRLF/LF
 * agnostic.
 */
function match_eol(parser) {
    return match_eol_at(parser, parser.current.end);
}

/**
 * Skip to the next newline character or NUL byte. Returns the offset of the
 * newline or -1 (C NULL).
 */
function next_newline(source, cursor, length) {
    const index = source.indexOf("\n", cursor);
    return ((index !== -1) && (index - cursor < length)) ? index : -1;
}

/**
 * This is equivalent to the predicate of warn_balanced in CRuby.
 */
function ambiguous_operator_p(parser, space_seen) {
    return !lex_state_p(parser, PM_LEX_STATE_CLASS | PM_LEX_STATE_DOT | PM_LEX_STATE_FNAME | PM_LEX_STATE_ENDFN) && space_seen && !pm_char_is_whitespace(peek(parser));
}

/**
 * Here we're going to check if this is a "magic" comment, and perform whatever
 * actions are necessary for it here.
 */
function parser_lex_magic_comment_encoding_value(parser, start, end) {
    const encoding = pm_encoding_find(parser.source, start, end);

    if (encoding !== null) {
        if (parser.encoding !== encoding) {
            parser.encoding = encoding;
        }

        // UNI-BUILD: `parser.encoding` is collapsed; keep the declared
        // encoding's family so escape-encoding flag logic can still work,
        // and its canonical name for the potch bridge's Result#encoding.
        const declared = parser.source.slice(start, end);
        parser.source_encoding_family = pm_encoding_family(declared);
        parser.encoding_comment_name = pm_encoding_canonical_name(declared) ?? parser.encoding_comment_name;

        return true;
    }

    return false;
}

// ASCII constants compared case-insensitively against source slices below.
const MAGIC_COMMENT_CODING_BYTES = "coding";
const MAGIC_COMMENT_ENCODING_BYTES = "encoding";
const MAGIC_COMMENT_TRUE_BYTES = "true";
const MAGIC_COMMENT_FALSE_BYTES = "false";
const MAGIC_COMMENT_WARN_INDENT_BYTES = "warn_indent";
const MAGIC_COMMENT_FROZEN_STRING_LITERAL_BYTES = "frozen_string_literal";
const MAGIC_COMMENT_SHAREABLE_CONSTANT_VALUE_BYTES = "shareable_constant_value";
const MAGIC_COMMENT_NONE_BYTES = "none";
const MAGIC_COMMENT_LITERAL_BYTES = "literal";
const MAGIC_COMMENT_EXPERIMENTAL_EVERYTHING_BYTES = "experimental_everything";
const MAGIC_COMMENT_EXPERIMENTAL_COPY_BYTES = "experimental_copy";

/**
 * Look for a specific pattern of "coding" and potentially set the encoding on
 * the parser.
 */
function parser_lex_magic_comment_encoding(parser) {
    let cursor = parser.current.start + 1;
    const end = parser.current.end;

    let separator = false;
    while (true) {
        if (end - cursor <= 6) return;
        switch ((parser.source.charCodeAt(cursor + 6) || 0)) {
            case 67: case 99: cursor += 6; continue; // 'C' 'c'
            case 79: case 111: cursor += 5; continue; // 'O' 'o'
            case 68: case 100: cursor += 4; continue; // 'D' 'd'
            case 73: case 105: cursor += 3; continue; // 'I' 'i'
            case 78: case 110: cursor += 2; continue; // 'N' 'n'
            case 71: case 103: cursor += 1; continue; // 'G' 'g'
            case 61: case 58: // '=' ':'
                separator = true;
                cursor += 6;
                break;
            default:
                cursor += 6;
                if (pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) break;
                continue;
        }
        if ((parser.source.slice(cursor - 6, cursor).toLowerCase() === MAGIC_COMMENT_CODING_BYTES)) break;
        separator = false;
    }

    while (true) {
        do {
            cursor++;
            if (cursor >= end) return;
        } while (pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0)));

        if (separator) break;
        if ((parser.source.charCodeAt(cursor) || 0) !== 61 && (parser.source.charCodeAt(cursor) || 0) !== 58) return; // '=' ':'

        separator = true;
        cursor++;
    }

    const value_start = cursor;
    while (((parser.source[cursor] === '-') || (parser.source[cursor] === '_') || parser.encoding.alnum_char(parser.source, cursor, 1)) && (++cursor < end));

    if (!parser_lex_magic_comment_encoding_value(parser, value_start, cursor)) {
        // If we were unable to parse the encoding value, then we've got an
        // issue because we didn't understand the encoding that the user was
        // trying to use. In this case we'll keep using the default encoding but
        // add an error to the parser to indicate an unsuccessful parse.
        pm_parser_err(parser, value_start, cursor, PM_ERR_INVALID_ENCODING_MAGIC_COMMENT);
    }
}

// pm_magic_comment_boolean_value_t
const PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE = 0;
const PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE = 1;
const PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID = 2;

/**
 * Check if this is a magic comment that includes the frozen_string_literal
 * pragma. If it does, set that field on the parser.
 *
 * (Adaptation: takes the source buffer explicitly because it has no parser
 * parameter in C but must index into parser.source.)
 */
function parser_lex_magic_comment_boolean_value(source, value_start, value_length) {
    if (value_length === 4 && (source.slice(value_start, value_start + 4).toLowerCase() === MAGIC_COMMENT_TRUE_BYTES)) {
        return PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE;
    } else if (value_length === 5 && (source.slice(value_start, value_start + 5).toLowerCase() === MAGIC_COMMENT_FALSE_BYTES)) {
        return PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE;
    } else {
        return PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID;
    }
}

function pm_char_is_magic_comment_key_delimiter(b) {
    return b === 39 /* '\'' */ || b === 34 /* '"' */ || b === 58 /* ':' */ || b === 59 /* ';' */;
}

/**
 * Find an emacs magic comment marker (-*-) within the given bounds. If one is
 * found, it returns an offset to the start of the marker. Otherwise it returns
 * -1 (C NULL).
 */
function parser_lex_magic_comment_emacs_marker(parser, cursor, end) {
    while (true) {
        if (cursor + 3 > end) break;
        cursor = parser.source.indexOf("-", cursor);
        if (cursor === -1 || cursor >= end) break;

        if (cursor + 3 <= end && parser.source[cursor + 1] === '*' && parser.source[cursor + 2] === '-') {
            return cursor;
        }
        cursor++;
    }
    return -1;
}

/**
 * Parse the current token on the parser to see if it's a magic comment and
 * potentially perform some action based on that. A regular expression that this
 * function is effectively matching is:
 *
 *     %r"([^\\s\'\":;]+)\\s*:\\s*(\"(?:\\\\.|[^\"])*\"|[^\"\\s;]+)[\\s;]*"
 *
 * It returns true if it consumes the entire comment. Otherwise it returns
 * false.
 */
function parser_lex_magic_comment(parser, semantic_token_seen) {
    let result = true;

    let start = parser.current.start + 1;
    let end = parser.current.end;
    if (end - start <= 7) return false;

    let cursor;
    let indicator = false;

    if ((cursor = parser_lex_magic_comment_emacs_marker(parser, start, end)) !== -1) {
        start = cursor + 3;

        if ((cursor = parser_lex_magic_comment_emacs_marker(parser, start, end)) !== -1) {
            end = cursor;
            indicator = true;
        } else {
            // If we have a start marker but not an end marker, then we cannot
            // have a magic comment.
            return false;
        }
    }

    cursor = start;
    while (cursor < end) {
        while (cursor < end) {
            const c = parser.source.charCodeAt(cursor) || 0;
            if (!(pm_char_is_magic_comment_key_delimiter(c) || pm_char_is_whitespace(c))) break;
            cursor++;
        }

        const key_start = cursor;
        while (cursor < end) {
            const c = parser.source.charCodeAt(cursor) || 0;
            if (pm_char_is_magic_comment_key_delimiter(c) || pm_char_is_whitespace(c)) break;
            cursor++;
        }

        const key_end = cursor;
        while (cursor < end && pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) cursor++;
        if (cursor === end) break;

        if (parser.source[cursor] === ':') {
            cursor++;
        } else {
            if (!indicator) return false;
            continue;
        }

        while (cursor < end && pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) cursor++;
        if (cursor === end) break;

        let value_start;
        let value_end;

        if (parser.source[cursor] === '"') {
            value_start = ++cursor;
            for (; cursor < end && (parser.source.charCodeAt(cursor) || 0) !== 34; cursor++) {
                if (parser.source[cursor] === '\\' && (cursor + 1 < end)) cursor++;
            }
            value_end = cursor;
            if (cursor < end && (parser.source.charCodeAt(cursor) || 0) === 34) cursor++;
        } else {
            value_start = cursor;
            while (cursor < end) {
                const c = parser.source.charCodeAt(cursor) || 0;
                if (c === 34 || parser.source[cursor] === ';' || pm_char_is_whitespace(c)) break;
                cursor++;
            }
            value_end = cursor;
        }

        if (indicator) {
            while (cursor < end && (parser.source[cursor] === ';' || pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0)))) cursor++;
        } else {
            while (cursor < end && pm_char_is_whitespace((parser.source.charCodeAt(cursor) || 0))) cursor++;
            if (cursor !== end) return false;
        }

        // Here, we need to do some processing on the key to swap out dashes for
        // underscores. We only need to do this if there _is_ a dash in the key.
        const key_length = key_end - key_start;
        // C replaces every '-' with '_' in place; strings are immutable here,
        // so do it with a replacement pass.
        const key = parser.source.slice(key_start, key_end).replace(/-/g, "_");

        // Finally, we can start checking the key against the list of known
        // magic comment keys, and potentially change state based on that.
        const key_source = (key || "");
        const value_length = value_end - value_start;

        // We only want to attempt to compare against encoding comments if it's
        // the first line in the file (or the second in the case of a shebang).
        if (parser.current.start === parser.encoding_comment_start && !parser.encoding_locked) {
            if (
                (key_length === 8 && (key_source.toLowerCase() === MAGIC_COMMENT_ENCODING_BYTES)) ||
                (key_length === 6 && (key_source.toLowerCase() === MAGIC_COMMENT_CODING_BYTES))
            ) {
                result = parser_lex_magic_comment_encoding_value(parser, value_start, value_end);
            }
        }

        if (key_length === 11) {
            if ((key_source.toLowerCase() === MAGIC_COMMENT_WARN_INDENT_BYTES)) {
                switch (parser_lex_magic_comment_boolean_value(parser.source, value_start, value_length)) {
                    case PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID:
                        PM_PARSER_WARN_TOKEN_FORMAT(
                            parser,
                            parser.current,
                            PM_WARN_INVALID_MAGIC_COMMENT_VALUE,
                            key_length,
                            key_source,
                            value_length,
                            parser.source.slice(value_start, value_end)
                        );
                        break;
                    case PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE:
                        parser.warn_mismatched_indentation = false;
                        break;
                    case PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE:
                        parser.warn_mismatched_indentation = true;
                        break;
                }
            }
        } else if (key_length === 21) {
            if ((key_source.toLowerCase() === MAGIC_COMMENT_FROZEN_STRING_LITERAL_BYTES)) {
                // We only want to handle frozen string literal comments if it's
                // before any semantic tokens have been seen.
                if (semantic_token_seen) {
                    pm_parser_warn_token(parser, parser.current, PM_WARN_IGNORED_FROZEN_STRING_LITERAL);
                } else {
                    switch (parser_lex_magic_comment_boolean_value(parser.source, value_start, value_length)) {
                        case PM_MAGIC_COMMENT_BOOLEAN_VALUE_INVALID:
                            PM_PARSER_WARN_TOKEN_FORMAT(
                                parser,
                                parser.current,
                                PM_WARN_INVALID_MAGIC_COMMENT_VALUE,
                                key_length,
                                key_source,
                                value_length,
                                parser.source.slice(value_start, value_end)
                            );
                            break;
                        case PM_MAGIC_COMMENT_BOOLEAN_VALUE_FALSE:
                            parser.frozen_string_literal = PM_OPTIONS_FROZEN_STRING_LITERAL_DISABLED;
                            break;
                        case PM_MAGIC_COMMENT_BOOLEAN_VALUE_TRUE:
                            parser.frozen_string_literal = PM_OPTIONS_FROZEN_STRING_LITERAL_ENABLED;
                            break;
                    }
                }
            }
        } else if (key_length === 24) {
            if ((key_source.toLowerCase() === MAGIC_COMMENT_SHAREABLE_CONSTANT_VALUE_BYTES)) {
                {
                    let cursor = parser.current.start;
                    while ((cursor > parser.start) && ((parser.source[cursor - 1] === ' ') || (parser.source[cursor - 1] === '\t'))) cursor--;

                    if (!((cursor === parser.start) || (parser.source[cursor - 1] === '\n'))) {
                        pm_parser_warn_token(parser, parser.current, PM_WARN_SHAREABLE_CONSTANT_VALUE_LINE);
                    } else if (value_length === 4 && (parser.source.slice(value_start, value_start + 4).toLowerCase() === MAGIC_COMMENT_NONE_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_NONE);
                    } else if (value_length === 7 && (parser.source.slice(value_start, value_start + 7).toLowerCase() === MAGIC_COMMENT_LITERAL_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_LITERAL);
                    } else if (value_length === 23 && (parser.source.slice(value_start, value_start + 23).toLowerCase() === MAGIC_COMMENT_EXPERIMENTAL_EVERYTHING_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_EVERYTHING);
                    } else if (value_length === 17 && (parser.source.slice(value_start, value_start + 17).toLowerCase() === MAGIC_COMMENT_EXPERIMENTAL_COPY_BYTES)) {
                        pm_parser_scope_shareable_constant_set(parser, PM_SCOPE_SHAREABLE_CONSTANT_EXPERIMENTAL_COPY);
                    } else {
                        PM_PARSER_WARN_TOKEN_FORMAT(
                            parser,
                            parser.current,
                            PM_WARN_INVALID_MAGIC_COMMENT_VALUE,
                            key_length,
                            key_source,
                            value_length,
                            parser.source.slice(value_start, value_end)
                        );
                    }
                }
            }
        }

        // When we're done, we want to free the string in case we had to
        // allocate memory for it.

        // Allocate a new magic comment node to append to the parser's list.
        const magic_comment = {
            key_start: key_start,
            value_start: value_start,
            key_length: key_length,
            value_length: value_length
        };
        parser.magic_comment_list.push(magic_comment);
    }

    return result;
}

/******************************************************************************/
/* Context manipulations                                                      */
/******************************************************************************/

// The token types that can terminate each parse context. (C packs the
// token types into a uint32 bitset with a `type < 32` guard; every
// terminator token is < 32, so a Set per context is exactly equivalent.)
const context_terminators = [];
context_terminators[PM_CONTEXT_NONE] = new Set();
context_terminators[PM_CONTEXT_BEGIN] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BEGIN_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BEGIN_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BEGIN_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BLOCK_BRACES] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_BLOCK_KEYWORDS] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_BLOCK_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BLOCK_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_BLOCK_PARAMETERS] = new Set([PM_TOKEN_PIPE]);
context_terminators[PM_CONTEXT_BLOCK_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_CASE_WHEN] = new Set([PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_ELSE]);
context_terminators[PM_CONTEXT_CASE_IN] = new Set([PM_TOKEN_KEYWORD_IN, PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_ELSE]);
context_terminators[PM_CONTEXT_CLASS] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_CLASS_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_CLASS_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_CLASS_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_DEF_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_DEF_PARAMS] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_DEFINED] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_DEFAULT_PARAMS] = new Set([PM_TOKEN_COMMA, PM_TOKEN_PARENTHESIS_RIGHT]);
context_terminators[PM_CONTEXT_ELSE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_ELSIF] = new Set([PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_EMBEXPR] = new Set([PM_TOKEN_EMBEXPR_END]);
context_terminators[PM_CONTEXT_FOR] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_FOR_INDEX] = new Set([PM_TOKEN_KEYWORD_IN]);
context_terminators[PM_CONTEXT_IF] = new Set([PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LAMBDA_BRACES] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_LAMBDA_DO_END] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_LAMBDA_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LAMBDA_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LAMBDA_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_LOOP_PREDICATE] = new Set([PM_TOKEN_KEYWORD_DO, PM_TOKEN_KEYWORD_THEN]);
context_terminators[PM_CONTEXT_MAIN] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_MODULE] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_MODULE_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_MODULE_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_MODULE_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_MULTI_TARGET] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_PARENS] = new Set([PM_TOKEN_PARENTHESIS_RIGHT]);
context_terminators[PM_CONTEXT_POSTEXE] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_PREDICATE] = new Set([PM_TOKEN_KEYWORD_THEN, PM_TOKEN_NEWLINE, PM_TOKEN_SEMICOLON]);
context_terminators[PM_CONTEXT_PREEXE] = new Set([PM_TOKEN_BRACE_RIGHT]);
context_terminators[PM_CONTEXT_RESCUE_MODIFIER] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_SCLASS] = new Set([PM_TOKEN_KEYWORD_END, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ENSURE]);
context_terminators[PM_CONTEXT_SCLASS_ENSURE] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_SCLASS_ELSE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_SCLASS_RESCUE] = new Set([PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_TERNARY] = new Set([PM_TOKEN_EOF]);
context_terminators[PM_CONTEXT_UNLESS] = new Set([PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_UNTIL] = new Set([PM_TOKEN_KEYWORD_END]);
context_terminators[PM_CONTEXT_WHILE] = new Set([PM_TOKEN_KEYWORD_END]);

function context_terminator(context, token) {
    return context_terminators[context].has(token.type);
}

/**
 * Returns the context that the given token is found to be terminating, or
 * returns PM_CONTEXT_NONE.
 */
function context_recoverable(parser, token) {
    let context_node = parser.current_context;

    while (context_node !== null) {
        if (context_terminator(context_node.context, token)) return context_node.context;
        context_node = context_node.prev;
    }

    return PM_CONTEXT_NONE;
}

function context_push(parser, context) {
    const context_node = { context: context, prev: null };

    if (parser.current_context === null) {
        parser.current_context = context_node;
    } else {
        context_node.prev = parser.current_context;
        parser.current_context = context_node;
    }
}

function context_pop(parser) {
    const prev = parser.current_context.prev;
    parser.current_context = prev;
}

function context_p(parser, context) {
    let context_node = parser.current_context;

    while (context_node !== null) {
        if (context_node.context === context) return true;
        context_node = context_node.prev;
    }

    return false;
}

function context_def_p(parser) {
    let context_node = parser.current_context;

    while (context_node !== null) {
        switch (context_node.context) {
            case PM_CONTEXT_DEF:
            case PM_CONTEXT_DEF_PARAMS:
            case PM_CONTEXT_DEF_ENSURE:
            case PM_CONTEXT_DEF_RESCUE:
            case PM_CONTEXT_DEF_ELSE:
                return true;
            case PM_CONTEXT_CLASS:
            case PM_CONTEXT_CLASS_ENSURE:
            case PM_CONTEXT_CLASS_RESCUE:
            case PM_CONTEXT_CLASS_ELSE:
            case PM_CONTEXT_MODULE:
            case PM_CONTEXT_MODULE_ENSURE:
            case PM_CONTEXT_MODULE_RESCUE:
            case PM_CONTEXT_MODULE_ELSE:
            case PM_CONTEXT_SCLASS:
            case PM_CONTEXT_SCLASS_ENSURE:
            case PM_CONTEXT_SCLASS_RESCUE:
            case PM_CONTEXT_SCLASS_ELSE:
                return false;
            default:
                context_node = context_node.prev;
        }
    }

    return false;
}

/**
 * Returns a human readable string for the given context, used in error
 * messages.
 */
function context_human(context) {
    switch (context) {
        case PM_CONTEXT_NONE:
            // assert(false && "unreachable");
            return "";
        case PM_CONTEXT_BEGIN: return "begin statement";
        case PM_CONTEXT_BLOCK_BRACES: return "'{'..'}' block";
        case PM_CONTEXT_BLOCK_KEYWORDS: return "'do'..'end' block";
        case PM_CONTEXT_BLOCK_PARAMETERS: return "'|'..'|' block parameter";
        case PM_CONTEXT_CASE_WHEN: return "'when' clause";
        case PM_CONTEXT_CASE_IN: return "'in' clause";
        case PM_CONTEXT_CLASS: return "class definition";
        case PM_CONTEXT_DEF: return "method definition";
        case PM_CONTEXT_DEF_PARAMS: return "method parameters";
        case PM_CONTEXT_DEFAULT_PARAMS: return "parameter default value";
        case PM_CONTEXT_DEFINED: return "'defined?' expression";
        case PM_CONTEXT_ELSE:
        case PM_CONTEXT_BEGIN_ELSE:
        case PM_CONTEXT_BLOCK_ELSE:
        case PM_CONTEXT_CLASS_ELSE:
        case PM_CONTEXT_DEF_ELSE:
        case PM_CONTEXT_LAMBDA_ELSE:
        case PM_CONTEXT_MODULE_ELSE:
        case PM_CONTEXT_SCLASS_ELSE: return "'else' clause";
        case PM_CONTEXT_ELSIF: return "'elsif' clause";
        case PM_CONTEXT_EMBEXPR: return "embedded expression";
        case PM_CONTEXT_BEGIN_ENSURE:
        case PM_CONTEXT_BLOCK_ENSURE:
        case PM_CONTEXT_CLASS_ENSURE:
        case PM_CONTEXT_DEF_ENSURE:
        case PM_CONTEXT_LAMBDA_ENSURE:
        case PM_CONTEXT_MODULE_ENSURE:
        case PM_CONTEXT_SCLASS_ENSURE: return "'ensure' clause";
        case PM_CONTEXT_FOR: return "for loop";
        case PM_CONTEXT_FOR_INDEX: return "for loop index";
        case PM_CONTEXT_IF: return "if statement";
        case PM_CONTEXT_LAMBDA_BRACES: return "'{'..'}' lambda block";
        case PM_CONTEXT_LAMBDA_DO_END: return "'do'..'end' lambda block";
        case PM_CONTEXT_LOOP_PREDICATE: return "loop predicate";
        case PM_CONTEXT_MAIN: return "top level context";
        case PM_CONTEXT_MODULE: return "module definition";
        case PM_CONTEXT_MULTI_TARGET: return "multiple targets";
        case PM_CONTEXT_PARENS: return "parentheses";
        case PM_CONTEXT_POSTEXE: return "'END' block";
        case PM_CONTEXT_PREDICATE: return "predicate";
        case PM_CONTEXT_PREEXE: return "'BEGIN' block";
        case PM_CONTEXT_BEGIN_RESCUE:
        case PM_CONTEXT_BLOCK_RESCUE:
        case PM_CONTEXT_CLASS_RESCUE:
        case PM_CONTEXT_DEF_RESCUE:
        case PM_CONTEXT_LAMBDA_RESCUE:
        case PM_CONTEXT_MODULE_RESCUE:
        case PM_CONTEXT_RESCUE_MODIFIER:
        case PM_CONTEXT_SCLASS_RESCUE: return "'rescue' clause";
        case PM_CONTEXT_SCLASS: return "singleton class definition";
        case PM_CONTEXT_TERNARY: return "ternary expression";
        case PM_CONTEXT_UNLESS: return "unless statement";
        case PM_CONTEXT_UNTIL: return "until statement";
        case PM_CONTEXT_WHILE: return "while statement";
    }

    // assert(false && "unreachable");
    return "";
}

/******************************************************************************/
/* Specific token lexers                                                      */
/******************************************************************************/

function pm_strspn_number_validate(parser, string, length, invalid) {
    if (invalid !== null) {
        const diag_id = (invalid === string + length - 1) ? PM_ERR_INVALID_NUMBER_UNDERSCORE_TRAILING : PM_ERR_INVALID_NUMBER_UNDERSCORE_INNER;
        pm_parser_err(parser, invalid, invalid + 1, diag_id);
    }
}

function pm_strspn_binary_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_binary_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function pm_strspn_octal_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_octal_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function pm_strspn_decimal_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_decimal_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function pm_strspn_hexadecimal_number_validate(parser, string) {
    const { size, invalid } = pm_strspn_hexadecimal_number(parser.source, string, parser.end - string);
    pm_strspn_number_validate(parser, string, size, invalid);
    return size;
}

function lex_optional_float_suffix(parser) {
    let type = PM_TOKEN_INTEGER;
    let seen_e = false;

    // Here we're going to attempt to parse the optional decimal portion of a
    // float. If it's not there, then it's okay and we'll just continue on.
    if (peek(parser) === 46 /* '.' */) {
        if (pm_char_is_decimal_digit(peek_offset(parser, 1))) {
            parser.current.end += 2;
            parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
            type = PM_TOKEN_FLOAT;
        } else {
            // If we had a . and then something else, then it's not a float
            // suffix on a number it's a method call or something else.
            return { type, seen_e };
        }
    }

    // Here we're going to attempt to parse the optional exponent portion of a
    // float. If it's not there, it's okay and we'll just continue on.
    if ((peek(parser) === 101 /* 'e' */) || (peek(parser) === 69 /* 'E' */)) {
        if ((peek_offset(parser, 1) === 43 /* '+' */) || (peek_offset(parser, 1) === 45 /* '-' */)) {
            parser.current.end += 2;

            if (pm_char_is_decimal_digit(peek(parser))) {
                parser.current.end++;
                parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
            } else {
                pm_parser_err_current(parser, PM_ERR_INVALID_FLOAT_EXPONENT);
            }
        } else if (pm_char_is_decimal_digit(peek_offset(parser, 1))) {
            parser.current.end++;
            parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
        } else {
            return { type, seen_e };
        }

        seen_e = true;
        type = PM_TOKEN_FLOAT;
    }

    return { type, seen_e };
}

function lex_numeric_prefix(parser) {
    let type = PM_TOKEN_INTEGER;
    let seen_e = false;

    if (peek_offset(parser, -1) === 48 /* '0' */) {
        switch ((parser.source.charCodeAt(parser.current.end) || 0)) {
            // 0d1111 is a decimal number
            case 100: // 'd'
            case 68: // 'D'
                parser.current.end++;
                if (pm_char_is_decimal_digit(peek(parser))) {
                    parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_DECIMAL);
                }

                break;

            // 0b1111 is a binary number
            case 98: // 'b'
            case 66: // 'B'
                parser.current.end++;
                if (pm_char_is_binary_digit(peek(parser))) {
                    parser.current.end += pm_strspn_binary_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_BINARY);
                }

                parser.integer_base = PM_INTEGER_BASE_FLAGS_BINARY;
                break;

            // 0o1111 is an octal number
            case 111: // 'o'
            case 79: // 'O'
                parser.current.end++;
                if (pm_char_is_octal_digit(peek(parser))) {
                    parser.current.end += pm_strspn_octal_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_OCTAL);
                }

                parser.integer_base = PM_INTEGER_BASE_FLAGS_OCTAL;
                break;

            // 01111 is an octal number
            case 95: // '_'
            case 48: // '0'
            case 49: // '1'
            case 50: // '2'
            case 51: // '3'
            case 52: // '4'
            case 53: // '5'
            case 54: // '6'
            case 55: // '7'
                parser.current.end += pm_strspn_octal_number_validate(parser, parser.current.end);
                parser.integer_base = PM_INTEGER_BASE_FLAGS_OCTAL;
                break;

            // 0x1111 is a hexadecimal number
            case 120: // 'x'
            case 88: // 'X'
                parser.current.end++;
                if (pm_char_is_hexadecimal_digit(peek(parser))) {
                    parser.current.end += pm_strspn_hexadecimal_number_validate(parser, parser.current.end);
                } else {
                    match(parser, 95 /* '_' */);
                    pm_parser_err_current(parser, PM_ERR_INVALID_NUMBER_HEXADECIMAL);
                }

                parser.integer_base = PM_INTEGER_BASE_FLAGS_HEXADECIMAL;
                break;

            // 0.xxx is a float
            case 46 /* '.' */: {
                ({ type, seen_e } = lex_optional_float_suffix(parser));
                break;
            }

            // 0exxx is a float
            case 101: // 'e'
            // 'E':
            case 69: {
                ({ type, seen_e } = lex_optional_float_suffix(parser));
                break;
            }
        }
    } else {
        // If it didn't start with a 0, then we'll lex as far as we can into a
        // decimal number.
        parser.current.end += pm_strspn_decimal_number_validate(parser, parser.current.end);

        // Afterward, we'll lex as far as we can into an optional float suffix.
        ({ type, seen_e } = lex_optional_float_suffix(parser));
    }

    // At this point we have a completed number, but we want to provide the user
    // with a good experience if they put an additional .xxx fractional
    // component on the end, so we'll check for that here.
    if (peek_offset(parser, 0) === 46 /* '.' */ && pm_char_is_decimal_digit(peek_offset(parser, 1))) {
        const fraction_start = parser.current.end;
        let fraction_end = parser.current.end + 2;
        fraction_end += pm_strspn_decimal_digit(parser.source, fraction_end, parser.end - fraction_end);
        pm_parser_err(parser, fraction_start, fraction_end, PM_ERR_INVALID_NUMBER_FRACTION);
    }

    return { type, seen_e };
}

function lex_numeric(parser) {
    let type = PM_TOKEN_INTEGER;
    parser.integer_base = PM_INTEGER_BASE_FLAGS_DECIMAL;

    if (parser.current.end < parser.end) {
        const prefix = lex_numeric_prefix(parser);
        type = prefix.type;
        const seen_e = prefix.seen_e;

        const end = parser.current.end;
        let suffix_type = type;

        if (type === PM_TOKEN_INTEGER) {
            if (match(parser, 114 /* 'r' */)) {
                suffix_type = PM_TOKEN_INTEGER_RATIONAL;

                if (match(parser, 105 /* 'i' */)) {
                    suffix_type = PM_TOKEN_INTEGER_RATIONAL_IMAGINARY;
                }
            } else if (match(parser, 105 /* 'i' */)) {
                suffix_type = PM_TOKEN_INTEGER_IMAGINARY;
            }
        } else {
            if (!seen_e && match(parser, 114 /* 'r' */)) {
                suffix_type = PM_TOKEN_FLOAT_RATIONAL;

                if (match(parser, 105 /* 'i' */)) {
                    suffix_type = PM_TOKEN_FLOAT_RATIONAL_IMAGINARY;
                }
            } else if (match(parser, 105 /* 'i' */)) {
                suffix_type = PM_TOKEN_FLOAT_IMAGINARY;
            }
        }

        const b = peek(parser);
        if (b !== 0 && (b >= 0x80 || ((b >= 97 /* 'a' */ && b <= 122 /* 'z' */) || (b >= 65 /* 'A' */ && b <= 90 /* 'Z' */)) || b === 95 /* '_' */)) {
            parser.current.end = end;
        } else {
            type = suffix_type;
        }
    }

    return type;
}

function lex_global_variable(parser) {
    if (parser.current.end >= parser.end) {
        pm_parser_err_token(parser, parser.current, PM_ERR_GLOBAL_VARIABLE_BARE);
        return PM_TOKEN_GLOBAL_VARIABLE;
    }

    // True if multiple characters are allowed after the declaration of the
    // global variable. Not true when it starts with "$-".
    let allow_multiple = true;

    // Special global variable names: "$~" (match data), "$*" (argv), "$/"
    // (input record separator), and friends. "$&"/"$$"-style reads double as
    // back references outside of a method-name context. (C used two switch
    // arms over character codes.)
    const c = parser.source[parser.current.end];

    if ("~*$?!@/\\;,=.:<>\"".includes(c)) {
        parser.current.end++;
        return PM_TOKEN_GLOBAL_VARIABLE;
    }

    if ("&`'+".includes(c)) {
        parser.current.end++;
        return lex_state_p(parser, PM_LEX_STATE_FNAME) ? PM_TOKEN_GLOBAL_VARIABLE : PM_TOKEN_BACK_REFERENCE;
    }

    {
        if (c === "0") {
            parser.current.end++;
            let width;

            if ((width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0) {
                do {
                    parser.current.end += width;
                } while ((width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0);

                // $0 isn't allowed to be followed by anything.
                const diag_id = parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 ? PM_ERR_INVALID_VARIABLE_GLOBAL_3_3 : PM_ERR_INVALID_VARIABLE_GLOBAL;
                PM_PARSER_ERR_TOKEN_FORMAT_CONTENT(parser, parser.current, diag_id);
            }

            return PM_TOKEN_GLOBAL_VARIABLE;
        }

        if (c >= "1" && c <= "9") {
            parser.current.end += pm_strspn_decimal_digit(parser.source, parser.current.end, parser.end - parser.current.end);
            return lex_state_p(parser, PM_LEX_STATE_FNAME) ? PM_TOKEN_GLOBAL_VARIABLE : PM_TOKEN_NUMBERED_REFERENCE;
        }

        // "$-" only allows a single following character; every other
        // unrecognized character takes the generic path. (C: case '-' falls
        // through into the switch's default arm.)
        if (c === "-") {
            parser.current.end++;
            allow_multiple = false;
        }
        {
            let width;

            if ((width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0) {
                do {
                    parser.current.end += width;
                } while (allow_multiple && (width = char_is_identifier(parser, parser.current.end, parser.end - parser.current.end)) > 0);
            } else if (pm_char_is_whitespace(peek(parser))) {
                // If we get here, then we have a $ followed by whitespace,
                // which is not allowed.
                pm_parser_err_token(parser, parser.current, PM_ERR_GLOBAL_VARIABLE_BARE);
            } else {
                // If we get here, then we have a $ followed by something that
                // isn't recognized as a global variable.
                const diag_id = parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3 ? PM_ERR_INVALID_VARIABLE_GLOBAL_3_3 : PM_ERR_INVALID_VARIABLE_GLOBAL;
                const end = parser.current.end + parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                PM_PARSER_ERR_FORMAT(parser, parser.current.start, end, diag_id, end - parser.current.start, parser.source.slice(parser.current.start, end));
            }

            return PM_TOKEN_GLOBAL_VARIABLE;
        }
    }
}

/**
 * This function checks if the current token matches a keyword. If it does, it
 * returns the token type. Otherwise, it returns PM_TOKEN_EOF. The arguments are as follows:
 *
 * * `parser` - the parser object
 * * `current_start` - offset of the start of the current token
 * * `value` - the literal string that we're checking for
 * * `vlen` - the length of the token
 * * `state` - the state that we should transition to if the token matches
 * * `type` - the expected token type
 * * `modifier_type` - the expected modifier token type
 */
function lex_keyword(parser, current_start, value, state, type, modifier_type) {
    // memcmp(current_start, value, strlen(value)) == 0
    if (parser.source.startsWith(value, current_start)) {
        const last_state = parser.lex_state;

        if (parser.lex_state & PM_LEX_STATE_FNAME) {
            lex_state_set(parser, PM_LEX_STATE_ENDFN);
        } else {
            lex_state_set(parser, state);
            if (state === PM_LEX_STATE_BEG) {
                parser.command_start = true;
            }

            if ((modifier_type !== PM_TOKEN_EOF) && !(last_state & (PM_LEX_STATE_BEG | PM_LEX_STATE_LABELED | PM_LEX_STATE_CLASS))) {
                lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
                return modifier_type;
            }
        }

        return type;
    }

    return PM_TOKEN_EOF;
}

function lex_identifier(parser, previous_command_start) {
    // Lex as far as we can into the current identifier.
    let width;
    const end = parser.end;
    const current_start = parser.current.start;
    let current_end = parser.current.end;

    
        while ((width = char_is_identifier_utf8(parser.source, current_end, end - current_end)) > 0) {
            current_end += width;
        }
    
    parser.current.end = current_end;

    // Now cache the length of the identifier so that we can quickly compare it
    // against known keywords.
    width = current_end - current_start;

    if (current_end < end) {
        if (((current_end + 1 >= end) || (parser.source[current_end + 1] !== '=')) && (match(parser, 33 /* '!' */) || match(parser, 63 /* '?' */))) {
            // First we'll attempt to extend the identifier by a ! or ?. Then we'll
            // check if we're returning the defined? keyword or just an identifier.
            width++;

            if (
                ((lex_state_p(parser, PM_LEX_STATE_LABEL | PM_LEX_STATE_ENDFN) && !previous_command_start) || lex_state_arg_p(parser)) &&
                (peek(parser) === 58 /* ':' */) && (peek_offset(parser, 1) !== 58 /* ':' */)
            ) {
                // If we're in a position where we can accept a : at the end of an
                // identifier, then we'll optionally accept it.
                lex_state_set(parser, PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED);
                match(parser, 58 /* ':' */);
                return PM_TOKEN_LABEL;
            }

            if (parser.lex_state !== PM_LEX_STATE_DOT) {
                if (width === 8 && (lex_keyword(parser, current_start, "defined?", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_DEFINED, PM_TOKEN_EOF) !== PM_TOKEN_EOF)) {
                    return PM_TOKEN_KEYWORD_DEFINED;
                }
            }

            return PM_TOKEN_METHOD_NAME;
        }

        if (lex_state_p(parser, PM_LEX_STATE_FNAME) && peek_offset(parser, 1) !== 126 /* '~' */ && peek_offset(parser, 1) !== 62 /* '>' */ && (peek_offset(parser, 1) !== 61 /* '=' */ || peek_offset(parser, 2) === 62 /* '>' */) && match(parser, 61 /* '=' */)) {
            // If we're in a position where we can accept a = at the end of an
            // identifier, then we'll optionally accept it.
            return PM_TOKEN_IDENTIFIER;
        }

        if (
            ((lex_state_p(parser, PM_LEX_STATE_LABEL | PM_LEX_STATE_ENDFN) && !previous_command_start) || lex_state_arg_p(parser)) &&
            peek(parser) === 58 /* ':' */ && peek_offset(parser, 1) !== 58 /* ':' */
        ) {
            // If we're in a position where we can accept a : at the end of an
            // identifier, then we'll optionally accept it.
            lex_state_set(parser, PM_LEX_STATE_ARG | PM_LEX_STATE_LABELED);
            match(parser, 58 /* ':' */);
            return PM_TOKEN_LABEL;
        }
    }

    if (parser.lex_state !== PM_LEX_STATE_DOT) {
        let type;
        switch (width) {
            case 2:
                if (lex_keyword(parser, current_start, "do", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_DO, PM_TOKEN_EOF) !== PM_TOKEN_EOF) {
                    if (pm_do_loop_stack_p(parser)) {
                        return PM_TOKEN_KEYWORD_DO_LOOP;
                    }
                    return PM_TOKEN_KEYWORD_DO;
                }

                if ((type = lex_keyword(parser, current_start, "if", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_IF, PM_TOKEN_KEYWORD_IF_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "in", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_IN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "or", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_OR, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 3:
                if ((type = lex_keyword(parser, current_start, "and", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_AND, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "def", PM_LEX_STATE_FNAME, PM_TOKEN_KEYWORD_DEF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "end", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_END, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "END", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_END_UPCASE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "for", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_FOR, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "nil", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_NIL, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "not", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_NOT, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 4:
                if ((type = lex_keyword(parser, current_start, "case", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_CASE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "else", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_ELSE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "next", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_NEXT, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "redo", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_REDO, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "self", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_SELF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "then", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_THEN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "true", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_TRUE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "when", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_WHEN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 5:
                if ((type = lex_keyword(parser, current_start, "alias", PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM, PM_TOKEN_KEYWORD_ALIAS, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "begin", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_BEGIN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "BEGIN", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_BEGIN_UPCASE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "break", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_BREAK, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "class", PM_LEX_STATE_CLASS, PM_TOKEN_KEYWORD_CLASS, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "elsif", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_ELSIF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "false", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_FALSE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "retry", PM_LEX_STATE_END, PM_TOKEN_KEYWORD_RETRY, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "super", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_SUPER, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "undef", PM_LEX_STATE_FNAME | PM_LEX_STATE_FITEM, PM_TOKEN_KEYWORD_UNDEF, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "until", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_UNTIL, PM_TOKEN_KEYWORD_UNTIL_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "while", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_WHILE, PM_TOKEN_KEYWORD_WHILE_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "yield", PM_LEX_STATE_ARG, PM_TOKEN_KEYWORD_YIELD, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 6:
                if ((type = lex_keyword(parser, current_start, "ensure", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_ENSURE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "module", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_MODULE, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "rescue", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_RESCUE, PM_TOKEN_KEYWORD_RESCUE_MODIFIER)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "return", PM_LEX_STATE_MID, PM_TOKEN_KEYWORD_RETURN, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "unless", PM_LEX_STATE_BEG, PM_TOKEN_KEYWORD_UNLESS, PM_TOKEN_KEYWORD_UNLESS_MODIFIER)) !== PM_TOKEN_EOF) return type;
                break;
            case 8:
                if ((type = lex_keyword(parser, current_start, "__LINE__", PM_LEX_STATE_END, PM_TOKEN_KEYWORD___LINE__, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                if ((type = lex_keyword(parser, current_start, "__FILE__", PM_LEX_STATE_END, PM_TOKEN_KEYWORD___FILE__, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
            case 12:
                if ((type = lex_keyword(parser, current_start, "__ENCODING__", PM_LEX_STATE_END, PM_TOKEN_KEYWORD___ENCODING__, PM_TOKEN_EOF)) !== PM_TOKEN_EOF) return type;
                break;
        }
    }

    
    return pm_encoding_utf_8_isupper_char(parser.source, current_start, end - current_start) ? PM_TOKEN_CONSTANT : PM_TOKEN_IDENTIFIER;
}

/**
 * Returns true if the current token that the parser is considering is at the
 * beginning of a line or the beginning of the source.
 */
function current_token_starts_line(parser) {
    return (parser.current.start === parser.start) || (parser.source[parser.current.start - 1] === '\n');
}

/**
 * When we hit a # while lexing something like a string, we need to potentially
 * handle interpolation. This function performs that check. It returns a token
 * type representing what it found. Those cases are:
 *
 * * PM_TOKEN_NOT_PROVIDED - No interpolation was found at this point. The
 *     caller should keep lexing.
 * * PM_TOKEN_STRING_CONTENT - No interpolation was found at this point. The
 *     caller should return this token type.
 * * PM_TOKEN_EMBEXPR_BEGIN - An embedded expression was found. The caller
 *     should return this token type.
 * * PM_TOKEN_EMBVAR - An embedded variable was found. The caller should return
 *     this token type.
 */
function lex_interpolation(parser, pound) {
    // If there is no content following this #, then we're at the end of
    // the string and we can safely return string content.
    if (pound + 1 >= parser.end) {
        parser.current.end = pound + 1;
        return PM_TOKEN_STRING_CONTENT;
    }

    // Now we'll check against the character that follows the #. If it constitutes
    // valid interplation, we'll handle that, otherwise we'll return
    // PM_TOKEN_NOT_PROVIDED.
    switch ((parser.source.charCodeAt(pound + 1) || 0)) {
        case 64 /* '@' */: {
            // In this case we may have hit an embedded instance or class variable.
            if (pound + 2 >= parser.end) {
                parser.current.end = pound + 1;
                return PM_TOKEN_STRING_CONTENT;
            }

            // If we're looking at a @ and there's another @, then we'll skip past the
            // second @.
            let variable = pound + 2;
            if (parser.source[variable] === '@' && pound + 3 < parser.end) variable++;

            if (char_is_identifier_start(parser, variable, parser.end - variable)) {
                // At this point we're sure that we've either hit an embedded instance
                // or class variable. In this case we'll first need to check if we've
                // already consumed content.
                if (pound > parser.current.start) {
                    parser.current.end = pound;
                    return PM_TOKEN_STRING_CONTENT;
                }

                // Otherwise we need to return the embedded variable token
                // and then switch to the embedded variable lex mode.
                lex_mode_push(parser, { mode: PM_LEX_EMBVAR, as: null, prev: null });
                parser.current.end = pound + 1;
                return PM_TOKEN_EMBVAR;
            }

            // If we didn't get a valid interpolation, then this is just regular
            // string content. This is like if we get "#@-". In this case the caller
            // should keep lexing.
            parser.current.end = pound + 1;
            return PM_TOKEN_NOT_PROVIDED;
        }
        case 36 /* '$' */:
            // In this case we may have hit an embedded global variable. If there's
            // not enough room, then we'll just return string content.
            if (pound + 2 >= parser.end) {
                parser.current.end = pound + 1;
                return PM_TOKEN_STRING_CONTENT;
            }

            // This is the character that we're going to check to see if it is the
            // start of an identifier that would indicate that this is a global
            // variable.
            let check = pound + 2;

            if (parser.source[pound + 2] === '-') {
                if (pound + 3 >= parser.end) {
                    parser.current.end = pound + 2;
                    return PM_TOKEN_STRING_CONTENT;
                }

                check++;
            }

            // If the character that we're going to check is the start of an
            // identifier, or we don't have a - and the character is a decimal number
            // or a global name punctuation character, then we've hit an embedded
            // global variable.
            if (
                char_is_identifier_start(parser, check, parser.end - check) ||
                (parser.source[pound + 2] !== '-' && (pm_char_is_decimal_digit((parser.source.charCodeAt(pound + 2) || 0)) || char_is_global_name_punctuation((parser.source.charCodeAt(pound + 2) || 0))))
            ) {
                // In this case we've hit an embedded global variable. First check to
                // see if we've already consumed content. If we have, then we need to
                // return that content as string content first.
                if (pound > parser.current.start) {
                    parser.current.end = pound;
                    return PM_TOKEN_STRING_CONTENT;
                }

                // Otherwise, we need to return the embedded variable token and switch
                // to the embedded variable lex mode.
                lex_mode_push(parser, { mode: PM_LEX_EMBVAR, as: null, prev: null });
                parser.current.end = pound + 1;
                return PM_TOKEN_EMBVAR;
            }

            // In this case we've hit a #$ that does not indicate a global variable.
            // In this case we'll continue lexing past it.
            parser.current.end = pound + 1;
            return PM_TOKEN_NOT_PROVIDED;
        case 123 /* '{' */:
            // In this case it's the start of an embedded expression. If we have
            // already consumed content, then we need to return that content as string
            // content first.
            if (pound > parser.current.start) {
                parser.current.end = pound;
                return PM_TOKEN_STRING_CONTENT;
            }

            parser.enclosure_nesting++;

            // Otherwise we'll skip past the #{ and begin lexing the embedded
            // expression.
            lex_mode_push(parser, { mode: PM_LEX_EMBEXPR, as: null, prev: null });
            parser.current.end = pound + 2;
            parser.command_start = true;
            pm_do_loop_stack_push(parser, false);
            return PM_TOKEN_EMBEXPR_BEGIN;
        default:
            // In this case we've hit a # that doesn't constitute interpolation. We'll
            // mark that by returning the not provided token type. This tells the
            // consumer to keep lexing forward.
            parser.current.end = pound + 1;
            return PM_TOKEN_NOT_PROVIDED;
    }
}

const PM_ESCAPE_FLAG_NONE = 0x0;
const PM_ESCAPE_FLAG_CONTROL = 0x1;
const PM_ESCAPE_FLAG_META = 0x2;
const PM_ESCAPE_FLAG_SINGLE = 0x4;
const PM_ESCAPE_FLAG_REGEXP = 0x8;

/**
 * This is a lookup table for whether or not an ASCII character is printable.
 */
const ascii_printable_chars = [
    false, false, false, false, false, false, false, false, false, true, true, true, true, true, false, false,
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, false, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false
];

function char_is_ascii_printable(b) {
    return (b < 0x80) && ascii_printable_chars[b];
}

/**
 * Return the value that a hexadecimal digit character represents. For example,
 * transform 'a' into 10, 'b' into 11, etc.
 */
function escape_hexadecimal_digit(value) {
    return (value <= 57 /* '9' */) ? (value - 48 /* '0' */) : ((value & 0x7) + 9);
}

/**
 * Scan the 4 digits of a Unicode escape into the value. Returns the number of
 * digits scanned. This function assumes that the characters have already been
 * validated. (`string` is a numeric offset into parser.source.)
 */
function escape_unicode(parser, string, length, error_location) {
    let value = 0;
    for (let index = 0; index < length; index++) {
        if (index !== 0) value <<= 4;
        value |= escape_hexadecimal_digit((parser.source.charCodeAt(string + index) || 0));
    }

    // Here we're going to verify that the value is actually a valid Unicode
    // codepoint and not a surrogate pair.
    if (value >= 0xD800 && value <= 0xDFFF) {
        if (error_location !== null) {
            pm_parser_err(parser, error_location.start, error_location.end, PM_ERR_ESCAPE_INVALID_UNICODE);
        } else {
            pm_parser_err(parser, string, string + length, PM_ERR_ESCAPE_INVALID_UNICODE);
        }
        return 0xFFFD;
    }

    return value >>> 0;
}

/**
 * Escape a single character value based on the given flags.
 */
function escape_byte(value, flags) {
    if (flags & PM_ESCAPE_FLAG_CONTROL) value &= 0x9f;
    if (flags & PM_ESCAPE_FLAG_META) value |= 0x80;
    return value;
}

/**
 * Write a unicode codepoint to the given buffer.
 */
function escape_write_unicode(parser, buffer, flags, start, end, value) {
    // \u escape sequences in string-like structures implicitly change the
    // encoding to UTF-8 if they are >= 0x80 or if they are used in a character
    // literal.
    if (value >= 0x80 || flags & PM_ESCAPE_FLAG_SINGLE) {
        // UNI-BUILD: C sets explicit_encoding to &PM_ENCODING_UTF_8_ENTRY
        // here (a `\u` escape implies UTF-8) and errors on a conflicting
        // prior encoding (PM_ERR_MIXED_ENCODING, unrepresentable in the
        // collapsed model). We store the sentinel "utf8" so
        // parse_unescaped_encoding / parse_symbol_encoding can tell a `\u`
        // escape from a `\xNN` byte escape.
        parser.explicit_encoding = "utf8";
    }

    if (!pm_buffer_append_unicode_codepoint(buffer, value)) {
        pm_parser_err(parser, start, end, PM_ERR_ESCAPE_INVALID_UNICODE);
        // UNI-BUILD: C appends the UTF-8 *bytes* of U+FFFD here, because its
        // buffer is a byte buffer. Ours is a JS string, so appending those
        // three bytes as individual code units (0xEF, 0xBF, 0xBD) would
        // produce three mojibake characters instead of one U+FFFD - append
        // the codepoint itself, as every other replacement-character fallback
        // in this file already does (escape_write_byte_encoded above).
        pm_buffer_append_unicode_codepoint(buffer, 0xfffd);
    }
}

/**
 * When you're writing a byte to the unescape buffer, if the byte is non-ASCII
 * (i.e., the top bit is set) then it locks in the encoding.
 */
function escape_write_byte_encoded(parser, buffer, byte, flags) {
    const regexp_context = (flags & PM_ESCAPE_FLAG_REGEXP) !== 0;

    if (byte >= 0x80) {
        // UNI-BUILD: C sets explicit_encoding to `parser->encoding` here (a
        // `\xNN` byte escape locks the literal to the *source* encoding),
        // in regular expressions too (where it keeps /.../n with escaped
        // non-ASCII bytes from being reported as an encoding mismatch).
        // We store that encoding's family so the flag logic downstream can
        // decide FORCED_UTF8 (source is UTF-8) / FORCED_BINARY (source is
        // US-ASCII) / nothing (source is its own non-ASCII encoding).
        parser.explicit_encoding = parser.source_encoding_family;
    }

    if (!regexp_context && byte >= 0x80) {

        // UNI-BUILD: \xNN / \ONN escapes produce raw "bytes"; when a lead
        // byte starts a valid UTF-8 sequence, consume the following
        // continuation escapes and emit one real code point instead.
        const width = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : byte >= 0xc2 ? 2 : 1;
        if (width === 1) {
            // Lone continuation byte: invalid on its own.
            pm_buffer_append_unicode_codepoint(buffer, 0xfffd);
            return;
        }
        if (width > 1) {
            let pos = parser.current.end;
            const units = [byte];
            while (units.length < width) {
                if ((parser.source.charCodeAt(pos) || 0) !== 92 /* backslash */) break;
                const c1 = (parser.source.charCodeAt(pos + 1) || 0);
                let value = null;
                let next = -1;
                if (c1 === 120 /* x */ || c1 === 88 /* X */) {
                    // Validate the hex digits before decoding: unlike the
                    // reference call sites (escape_read, the named-capture
                    // escaper), escape_hexadecimal_digit never returns -1, so
                    // the old `h1 !== -1` checks were dead and invalid digits
                    // silently became values.
                    const d1 = (parser.source.charCodeAt(pos + 2) || 0);
                    const d2 = (parser.source.charCodeAt(pos + 3) || 0);
                    if (pm_char_is_hexadecimal_digit(d1) && pm_char_is_hexadecimal_digit(d2)) {
                        value = (escape_hexadecimal_digit(d1) << 4) | escape_hexadecimal_digit(d2);
                        next = pos + 4;
                    }
                } else if (c1 >= 48 /* 0 */ && c1 <= 55 /* 7 */) {
                    value = c1 - 48; next = pos + 2;
                    for (let k = 0; k < 2; k++) {
                        const oc = (parser.source.charCodeAt(next) || 0);
                        if (oc >= 48 && oc <= 55) { value = value * 8 + (oc - 48); next++; } else break;
                    }
                }
                if (value === null || (value & 0xc0) !== 0x80) break;
                units.push(value);
                pos = next;
            }
            if (units.length === width) {
                const cp = width === 2
                    ? ((units[0] & 0x1f) << 6) | (units[1] & 0x3f)
                    : width === 3
                        ? ((units[0] & 0x0f) << 12) | ((units[1] & 0x3f) << 6) | (units[2] & 0x3f)
                        : ((units[0] & 0x07) << 18) | ((units[1] & 0x3f) << 12) | ((units[2] & 0x3f) << 6) | (units[3] & 0x3f);
                const min = width === 2 ? 0x80 : width === 3 ? 0x800 : 0x10000;
                if (cp >= min && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)) {
                    pm_buffer_append_unicode_codepoint(buffer, cp);
                    parser.current.end = pos;
                    return;
                }
            }
            // Invalid lead/sequence: single replacement character, mirroring
            // how decoding the byte build's output behaves.
            pm_buffer_append_unicode_codepoint(buffer, 0xfffd);
            return;
        }
    }

    pm_buffer_append_byte(buffer, byte);
}

/**
 * The regular expression engine doesn't support the same escape sequences as
 * Ruby does. So first we have to read the escape sequence, and then we have to
 * format it like the regular expression engine expects it. For example, in Ruby
 * if we have:
 *
 *     /\M-\C-?/
 *
 * then the first byte is actually 255, so we have to rewrite this as:
 *
 *     /\xFF/
 *
 * Note that in this case there is a literal \ byte in the regular expression
 * source so that the regular expression engine will perform its own unescaping.
 */
function escape_write_byte(parser, buffer, regular_expression_buffer, flags, byte) {
    if (flags & PM_ESCAPE_FLAG_REGEXP) {
        pm_buffer_append_string(regular_expression_buffer, `\\x${Math.trunc(Number(byte)).toString(16).toUpperCase().padStart(2, "0")}`);
    }

    escape_write_byte_encoded(parser, buffer, byte, flags);
}

/**
 * Write each byte of the given escaped character into the buffer.
 */
function escape_write_escape_encoded(parser, buffer, regular_expression_buffer, flags) {
    // UNI-BUILD: C computes a UTF-8 *byte* width here and treats width == 1
    // as "a single ASCII byte, still subject to \C-/\M- processing" and
    // width > 1 as "a complete multibyte character - ignore the backslash
    // and copy it through raw". In this build the source is already a
    // UTF-16 string, so the equivalent split is "ASCII code unit" vs
    // "anything else" (a non-ASCII BMP code unit, or a surrogate pair) -
    // `pm_encoding_utf_8_char_width` returns 1 for a lone `«` here, which
    // used to route it through escape_byte and mangle it to U+FFFD.
    const first = parser.source.charCodeAt(parser.current.end) || 0;

    if (first < 0x80) {
        parser.current.end++;
        escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(first, flags));
        return;
    }

    const width = pm_encoding_utf_8_char_width(parser.source, parser.current.end, parser.end - parser.current.end);
    if (width >= 1) {
        // A complete non-ASCII character: the backslash is a no-op here,
        // so copy the character through raw.
        const b = (flags & PM_ESCAPE_FLAG_REGEXP) ? regular_expression_buffer : buffer;
        pm_buffer_append_bytes(b, parser.source.slice(parser.current.end, parser.current.end + width), width);
        parser.current.end += width;
    } else {
        // Assume the next character wasn't meant to be part of this escape
        // sequence since it is invalid. Add an error and move on.
        parser.current.end++;
        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL);
    }
}

/**
 * Warn about using a space or a tab character in an escape, as opposed to using
 * \\s or \\t. Note that we can quite copy the source because the warning
 * message replaces \\c with \\C.
 */
function escape_read_warn(parser, flags, flag, type) {
    const FLAG = (value) => ((value & PM_ESCAPE_FLAG_CONTROL) ? "\\C-" : (value & PM_ESCAPE_FLAG_META) ? "\\M-" : "");

    PM_PARSER_WARN_TOKEN_FORMAT(
        parser,
        parser.current,
        PM_WARN_INVALID_CHARACTER,
        FLAG(flags),
        FLAG(flag),
        type
    );
}

/**
 * Shared body of escape_read's `\cX` and `\C-X` control-escape cases. `\cX`
 * is the short form; `\C-X` requires the literal `-` that `\cX` doesn't -
 * that's the only control-flow difference between them. Once past that,
 * both forms dispatch identically on the following character, with one
 * more small difference preserved via `requires_hyphen`: when that
 * character turns out to be non-printable, `\C-` reports an error range
 * extended by the invalid character's width, while `\c` does not (matching
 * the C original's two separately-written branches exactly).
 */
function escape_read_control(parser, buffer, regular_expression_buffer, flags, requires_hyphen) {
    parser.current.end++;
    if (flags & PM_ESCAPE_FLAG_CONTROL) {
        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL_REPEAT);
    }

    if (requires_hyphen) {
        if (peek(parser) !== 45 /* '-' */) {
            const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
            pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_CONTROL);
            return;
        }
        parser.current.end++;
    }

    if (parser.current.end === parser.end) {
        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL);
        return;
    }

    const peeked = peek(parser); // shadowed `peeked` in C
    switch (peeked) {
        case 63 /* '?' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(0x7f, flags));
            return;
        }
        case 92 /* '\\' */:
            parser.current.end++;

            if (match(parser, 117 /* 'u' */) || match(parser, 85 /* 'U' */)) {
                pm_parser_err(parser, parser.current.start, parser.current.end, PM_ERR_INVALID_ESCAPE_CHARACTER);
                return;
            }

            escape_read(parser, buffer, regular_expression_buffer, flags | PM_ESCAPE_FLAG_CONTROL);
            return;
        case 32 /* ' ' */:
            parser.current.end++;
            escape_read_warn(parser, flags, PM_ESCAPE_FLAG_CONTROL, "\\s");
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_CONTROL));
            return;
        case 9 /* '\t' */:
            parser.current.end++;
            escape_read_warn(parser, flags, 0, "\\t");
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_CONTROL));
            return;
        default: {
            if (!char_is_ascii_printable(peeked)) {
                if (requires_hyphen) {
                    const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                    pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_CONTROL);
                } else {
                    pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_CONTROL);
                }
                return;
            }

            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_CONTROL));
            return;
        }
    }
}

/**
 * Read the value of an escape into the buffer.
 */
function escape_read(parser, buffer, regular_expression_buffer, flags) {
    const peeked = peek(parser);
    switch (peeked) {
        case 92 /* '\\' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(92, flags));
            return;
        }
        case 39 /* '\'' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(39, flags));
            return;
        }
        case 97 /* 'a' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(7 /* '\a' */, flags));
            return;
        }
        case 98 /* 'b' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(8 /* '\b' */, flags));
            return;
        }
        case 101 /* 'e' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(27 /* '\033' */, flags));
            return;
        }
        case 102 /* 'f' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(12 /* '\f' */, flags));
            return;
        }
        case 110 /* 'n' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(10 /* '\n' */, flags));
            return;
        }
        case 114 /* 'r' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(13 /* '\r' */, flags));
            return;
        }
        case 115 /* 's' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(32 /* ' ' */, flags));
            return;
        }
        case 116 /* 't' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(9 /* '\t' */, flags));
            return;
        }
        case 118 /* 'v' */: {
            parser.current.end++;
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(11 /* '\v' */, flags));
            return;
        }
        case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: {
            let value = (parser.source.charCodeAt(parser.current.end) || 0) - 48 /* '0' */;
            parser.current.end++;

            if (pm_char_is_octal_digit(peek(parser))) {
                value = (((value << 3) & 0xff) | ((parser.source.charCodeAt(parser.current.end) || 0) - 48 /* '0' */)); // (uint8_t)(value << 3)
                parser.current.end++;

                if (pm_char_is_octal_digit(peek(parser))) {
                    value = (((value << 3) & 0xff) | ((parser.source.charCodeAt(parser.current.end) || 0) - 48 /* '0' */)); // (uint8_t)(value << 3)
                    parser.current.end++;
                }
            }

            value = escape_byte(value, flags);
            escape_write_byte(parser, buffer, regular_expression_buffer, flags, value);
            return;
        }
        case 120 /* 'x' */: {
            const start = parser.current.end - 1;

            parser.current.end++;
            let byte = peek(parser);

            if (pm_char_is_hexadecimal_digit(byte)) {
                let value = escape_hexadecimal_digit(byte);
                parser.current.end++;

                byte = peek(parser);
                if (pm_char_is_hexadecimal_digit(byte)) {
                    value = (value << 4) | escape_hexadecimal_digit(byte);
                    parser.current.end++;
                }

                value = escape_byte(value, flags);
                if (flags & PM_ESCAPE_FLAG_REGEXP) {
                    if (flags & (PM_ESCAPE_FLAG_CONTROL | PM_ESCAPE_FLAG_META)) {
                        pm_buffer_append_string(regular_expression_buffer, `\\x${Math.trunc(Number(value)).toString(16).toUpperCase().padStart(2, "0")}`);
                    } else {
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    }
                }

                escape_write_byte_encoded(parser, buffer, value, flags);
            } else {
                pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_HEXADECIMAL);
            }

            return;
        }
        case 117 /* 'u' */: {
            const start = parser.current.end - 1;
            parser.current.end++;

            if (parser.current.end === parser.end) {
                const short_start = parser.current.end - 2; // shadowed `start` in C
                PM_PARSER_ERR_FORMAT(parser, short_start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_SHORT, 2, parser.source.slice(short_start, parser.current.end));
            } else if (peek(parser) === 123 /* '{' */) {
                const unicode_codepoints_start = parser.current.end - 2;
                parser.current.end++;

                while (true) {
                    const whitespace = pm_strspn_inline_whitespace(parser.source, parser.current.end, parser.end - parser.current.end);
                    if (whitespace > 0) {
                        parser.current.end += whitespace;
                    } else if (peek(parser) === 92 /* '\\' */ && peek_offset(parser, 1) === 110 /* 'n' */) {
                        // This is super hacky, but it gets us nicer error
                        // messages because we can still pass it off to the
                        // regular expression engine even if we hit an
                        // unterminated regular expression.
                        parser.current.end += 2;
                    } else {
                        break;
                    }
                }

                let extra_codepoints_start = null; // NULL
                let codepoints_count = 0;

                while ((parser.current.end < parser.end) && (parser.source[parser.current.end] !== '}')) {
                    const unicode_start = parser.current.end;
                    const hexadecimal_length = pm_strspn_hexadecimal_digit(parser.source, parser.current.end, parser.end - parser.current.end);

                    if (hexadecimal_length > 6) {
                        // \u{nnnn} character literal allows only 1-6 hexadecimal digits
                        pm_parser_err(parser, unicode_start, unicode_start + hexadecimal_length, PM_ERR_ESCAPE_INVALID_UNICODE_LONG);
                    } else if (hexadecimal_length === 0) {
                        // there are not hexadecimal characters

                        if (flags & PM_ESCAPE_FLAG_REGEXP) {
                            // If this is a regular expression, we are going to
                            // let the regular expression engine handle this
                            // error instead of us.
                            pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                        } else {
                            pm_parser_err(parser, parser.current.end, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE);
                            pm_parser_err(parser, parser.current.end, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_TERM);
                        }

                        return;
                    }

                    parser.current.end += hexadecimal_length;
                    codepoints_count++;
                    if (flags & PM_ESCAPE_FLAG_SINGLE && codepoints_count === 2) {
                        extra_codepoints_start = unicode_start;
                    }

                    const value = escape_unicode(parser, unicode_start, hexadecimal_length, null);
                    escape_write_unicode(parser, buffer, flags, unicode_start, parser.current.end, value);

                    parser.current.end += pm_strspn_inline_whitespace(parser.source, parser.current.end, parser.end - parser.current.end);
                }

                // ?\u{nnnn} character literal should contain only one codepoint
                // and cannot be like ?\u{nnnn mmmm}.
                if (flags & PM_ESCAPE_FLAG_SINGLE && codepoints_count > 1) {
                    pm_parser_err(parser, extra_codepoints_start, parser.current.end - 1, PM_ERR_ESCAPE_INVALID_UNICODE_LITERAL);
                }

                if (parser.current.end === parser.end) {
                    PM_PARSER_ERR_FORMAT(parser, start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_LIST, parser.current.end - start, parser.source.slice(start, parser.current.end));
                } else if (peek(parser) === 125 /* '}' */) {
                    parser.current.end++;
                } else {
                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        // If this is a regular expression, we are going to let
                        // the regular expression engine handle this error
                        // instead of us.
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    } else {
                        pm_parser_err(parser, unicode_codepoints_start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_TERM);
                    }
                }

                if (flags & PM_ESCAPE_FLAG_REGEXP) {
                    pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(unicode_codepoints_start, parser.current.end), parser.current.end - unicode_codepoints_start);
                }
            } else {
                const length = pm_strspn_hexadecimal_digit(parser.source, parser.current.end, Math.min(parser.end - parser.current.end, 4));

                if (length === 0) {
                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    } else {
                        const short_start = parser.current.end - 2; // shadowed `start` in C
                        PM_PARSER_ERR_FORMAT(parser, short_start, parser.current.end, PM_ERR_ESCAPE_INVALID_UNICODE_SHORT, 2, parser.source.slice(short_start, parser.current.end));
                    }
                } else if (length === 4) {
                    const value = escape_unicode(parser, parser.current.end, 4, null);

                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end + 4), parser.current.end + 4 - start);
                    }

                    escape_write_unicode(parser, buffer, flags, start, parser.current.end + 4, value);
                    parser.current.end += 4;
                } else {
                    parser.current.end += length;

                    if (flags & PM_ESCAPE_FLAG_REGEXP) {
                        // If this is a regular expression, we are going to let
                        // the regular expression engine handle this error
                        // instead of us.
                        pm_buffer_append_bytes(regular_expression_buffer, parser.source.slice(start, parser.current.end), parser.current.end - start);
                    } else {
                        pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_UNICODE);
                    }
                }
            }

            return;
        }
        case 99 /* 'c' */:
            return escape_read_control(parser, buffer, regular_expression_buffer, flags, false);
        case 67 /* 'C' */:
            return escape_read_control(parser, buffer, regular_expression_buffer, flags, true);
        case 77 /* 'M' */: {
            parser.current.end++;
            if (flags & PM_ESCAPE_FLAG_META) {
                pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_META_REPEAT);
            }

            if (peek(parser) !== 45 /* '-' */) {
                const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_META);
                return;
            }

            parser.current.end++;
            if (parser.current.end === parser.end) {
                pm_parser_err_current(parser, PM_ERR_ESCAPE_INVALID_META);
                return;
            }

            const peeked = peek(parser); // shadowed `peeked` in C
            switch (peeked) {
                case 92 /* '\\' */:
                    parser.current.end++;

                    if (match(parser, 117 /* 'u' */) || match(parser, 85 /* 'U' */)) {
                        pm_parser_err(parser, parser.current.start, parser.current.end, PM_ERR_INVALID_ESCAPE_CHARACTER);
                        return;
                    }

                    escape_read(parser, buffer, regular_expression_buffer, flags | PM_ESCAPE_FLAG_META);
                    return;
                case 32 /* ' ' */:
                    parser.current.end++;
                    escape_read_warn(parser, flags, PM_ESCAPE_FLAG_META, "\\s");
                    escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_META));
                    return;
                case 9 /* '\t' */:
                    parser.current.end++;
                    escape_read_warn(parser, flags & (~PM_ESCAPE_FLAG_CONTROL & 0xff), PM_ESCAPE_FLAG_META, "\\t");
                    escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_META));
                    return;
                default:
                    if (!char_is_ascii_printable(peeked)) {
                        const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                        pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_META);
                        return;
                    }

                    parser.current.end++;
                    escape_write_byte(parser, buffer, regular_expression_buffer, flags, escape_byte(peeked, flags | PM_ESCAPE_FLAG_META));
                    return;
            }
        }
        case 13 /* '\r' */: {
            if (peek_offset(parser, 1) === 10 /* '\n' */) {
                parser.current.end += 2;
                escape_write_byte_encoded(parser, buffer, escape_byte(10 /* '\n' */, flags));
                return;
            }
            // PRISM_FALLTHROUGH
        }
        default: {
            if ((flags & (PM_ESCAPE_FLAG_CONTROL | PM_ESCAPE_FLAG_META)) && !char_is_ascii_printable(peeked)) {
                const width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);
                pm_parser_err(parser, parser.current.start, parser.current.end + width, PM_ERR_ESCAPE_INVALID_META);
                return;
            }
            if (parser.current.end < parser.end) {
                escape_write_escape_encoded(parser, buffer, regular_expression_buffer, flags);
            } else {
                pm_parser_err_current(parser, PM_ERR_INVALID_ESCAPE_CHARACTER);
            }
            return;
        }
    }
}

/**
 * This function is responsible for lexing either a character literal or the ?
 * operator. The supported character literals are described below.
 *
 * \\a            bell, ASCII 07h (BEL)
 * \\b            backspace, ASCII 08h (BS)
 * \t             horizontal tab, ASCII 09h (TAB)
 * \\n            newline (line feed), ASCII 0Ah (LF)
 * \v             vertical tab, ASCII 0Bh (VT)
 * \f             form feed, ASCII 0Ch (FF)
 * \r             carriage return, ASCII 0Dh (CR)
 * \\e            escape, ASCII 1Bh (ESC)
 * \s             space, ASCII 20h (SPC)
 * \\             backslash
 * \nnn           octal bit pattern, where nnn is 1-3 octal digits ([0-7])
 * \xnn           hexadecimal bit pattern, where nn is 1-2 hexadecimal digits ([0-9a-fA-F])
 * \unnnn         Unicode character, where nnnn is exactly 4 hexadecimal digits ([0-9a-fA-F])
 * \u{nnnn ...}   Unicode character(s), where each nnnn is 1-6 hexadecimal digits ([0-9a-fA-F])
 * \cx or \C-x    control character, where x is an ASCII printable character
 * \M-x           meta character, where x is an ASCII printable character
 * \M-\C-x        meta control character, where x is an ASCII printable character
 * \M-\cx         same as above
 * \\c\M-x        same as above
 * \\c? or \C-?   delete, ASCII 7Fh (DEL)
 */
function lex_question_mark(parser) {
    if (lex_state_end_p(parser)) {
        lex_state_set(parser, PM_LEX_STATE_BEG);
        return PM_TOKEN_QUESTION_MARK;
    }

    if (parser.current.end >= parser.end) {
        pm_parser_err_current(parser, PM_ERR_INCOMPLETE_QUESTION_MARK);
        parser.current_string = parser.source.slice(parser.current.start + 1, parser.current.end);
        parser.current_string_shared = true;
        return PM_TOKEN_CHARACTER_LITERAL;
    }

    if (pm_char_is_whitespace((parser.source.charCodeAt(parser.current.end) || 0))) {
        lex_state_set(parser, PM_LEX_STATE_BEG);
        return PM_TOKEN_QUESTION_MARK;
    }

    lex_state_set(parser, PM_LEX_STATE_BEG);

    if (match(parser, 92 /* '\\' */)) {
        lex_state_set(parser, PM_LEX_STATE_END);

        const buffer = {};
        pm_buffer_init_capacity(buffer, 3);

        escape_read(parser, buffer, null, PM_ESCAPE_FLAG_SINGLE);
        parser.current_string = pm_buffer_value(buffer);
        parser.current_string_shared = false;

        return PM_TOKEN_CHARACTER_LITERAL;
    } else {
        const encoding_width = parser.encoding.char_width(parser.source, parser.current.end, parser.end - parser.current.end);

        // Ternary operators can have a ? immediately followed by an identifier
        // which starts with an underscore. We check for this case here.
        if (
            !(parser.encoding.alnum_char(parser.source, parser.current.end, parser.end - parser.current.end) || peek(parser) === 95 /* '_' */) ||
            (
                (parser.current.end + encoding_width >= parser.end) ||
                !char_is_identifier(parser, parser.current.end + encoding_width, parser.end - (parser.current.end + encoding_width))
            )
        ) {
            lex_state_set(parser, PM_LEX_STATE_END);
            parser.current.end += encoding_width;
            parser.current_string = parser.source.slice(parser.current.start + 1, parser.current.end);
            parser.current_string_shared = true;
            return PM_TOKEN_CHARACTER_LITERAL;
        }
    }

    return PM_TOKEN_QUESTION_MARK;
}

/**
 * Lex a variable that starts with an @ sign (either an instance or class
 * variable).
 */
function lex_at_variable(parser) {
    const type = match(parser, 64 /* '@' */) ? PM_TOKEN_CLASS_VARIABLE : PM_TOKEN_INSTANCE_VARIABLE;
    const end = parser.end;

    let width;
    if ((width = char_is_identifier_start(parser, parser.current.end, end - parser.current.end)) > 0) {
        parser.current.end += width;

        while ((width = char_is_identifier(parser, parser.current.end, end - parser.current.end)) > 0) {
            parser.current.end += width;
        }
    } else if (parser.current.end < end && pm_char_is_decimal_digit((parser.source.charCodeAt(parser.current.end) || 0))) {
        let diag_id = (type === PM_TOKEN_CLASS_VARIABLE) ? PM_ERR_INCOMPLETE_VARIABLE_CLASS : PM_ERR_INCOMPLETE_VARIABLE_INSTANCE;
        if (parser.version <= PM_OPTIONS_VERSION_CRUBY_3_3) {
            diag_id = (type === PM_TOKEN_CLASS_VARIABLE) ? PM_ERR_INCOMPLETE_VARIABLE_CLASS_3_3 : PM_ERR_INCOMPLETE_VARIABLE_INSTANCE_3_3;
        }

        const width = parser.encoding.char_width(parser.source, parser.current.end, end - parser.current.end); // shadowed `width` in C
        PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, diag_id, (parser.current.end + width) - parser.current.start, parser.source.slice(parser.current.start, parser.current.end + width));
    } else {
        const diag_id = (type === PM_TOKEN_CLASS_VARIABLE) ? PM_ERR_CLASS_VARIABLE_BARE : PM_ERR_INSTANCE_VARIABLE_BARE;
        pm_parser_err_token(parser, parser.current, diag_id);
    }

    // If we're lexing an embedded variable, then we need to pop back into the
    // parent lex context.
    if (parser.lex_modes.current.mode === PM_LEX_EMBVAR) {
        lex_mode_pop(parser);
    }

    return type;
}

/**
 * Optionally call out to the lex callback if one is provided.
 */
function parser_lex_callback(parser) {
    if (parser.lex_callback) {
        parser.lex_callback.callback(parser.lex_callback.data, parser, parser.current);
    }
}

/**
 * Return a new comment node of the specified type.
 */
function parser_comment(parser, type) {
    return {
        type: type,
        location: { start: parser.current.start, end: parser.current.end }
    };
}

/**
 * Lex out embedded documentation, and return when we have either hit the end of
 * the file or the end of the embedded documentation. This calls the callback
 * manually because only the lexer should see these tokens, not the parser.
 */
function lex_embdoc(parser) {
    // First, lex out the EMBDOC_BEGIN token.
    let newline = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);

    if (newline === -1) {
        parser.current.end = parser.end;
    } else {
        pm_newline_list_append(parser.newline_list, newline);
        parser.current.end = newline + 1;
    }

    parser.current.type = PM_TOKEN_EMBDOC_BEGIN;
    parser_lex_callback(parser);

    // Now, create a comment that is going to be attached to the parser.
    const comment = parser_comment(parser, PM_COMMENT_EMBDOC);

    // Now, loop until we find the end of the embedded documentation or the end
    // of the file.
    while (parser.current.end + 4 <= parser.end) {
        parser.current.start = parser.current.end;

        // If we've hit the end of the embedded documentation then we'll return
        // that token here.
        if (
            (parser.source[parser.current.end] === '=' && parser.source[parser.current.end + 1] === 'e' && parser.source[parser.current.end + 2] === 'n' && parser.source[parser.current.end + 3] === 'd') &&
            (
                (parser.current.end + 4 === parser.end) || // end of file
                pm_char_is_whitespace((parser.source.charCodeAt(parser.current.end + 4) || 0)) || // whitespace
                ((parser.source.charCodeAt(parser.current.end + 4) || 0) === 0) || // NUL or end of script
                ((parser.source.charCodeAt(parser.current.end + 4) || 0) === 4) || // ^D
                ((parser.source.charCodeAt(parser.current.end + 4) || 0) === 26) // ^Z
            )
        ) {
            newline = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);

            if (newline === -1) {
                parser.current.end = parser.end;
            } else {
                pm_newline_list_append(parser.newline_list, newline);
                parser.current.end = newline + 1;
            }

            parser.current.type = PM_TOKEN_EMBDOC_END;
            parser_lex_callback(parser);

            comment.location.end = parser.current.end;
            parser.comment_list.push(comment);

            return PM_TOKEN_EMBDOC_END;
        }

        // Otherwise, we'll parse until the end of the line and return a line of
        // embedded documentation.
        newline = next_newline(parser.source, parser.current.end, parser.end - parser.current.end);

        if (newline === -1) {
            parser.current.end = parser.end;
        } else {
            pm_newline_list_append(parser.newline_list, newline);
            parser.current.end = newline + 1;
        }

        parser.current.type = PM_TOKEN_EMBDOC_LINE;
        parser_lex_callback(parser);
    }

    pm_parser_err_current(parser, PM_ERR_EMBDOC_TERM);

    comment.location.end = parser.current.end;
    parser.comment_list.push(comment);

    return PM_TOKEN_EOF;
}

/**
 * Set the current type to an ignored newline and then call the lex callback.
 * This happens in a couple places depending on whether or not we have already
 * lexed a comment.
 */
function parser_lex_ignored_newline(parser) {
    parser.current.type = PM_TOKEN_IGNORED_NEWLINE;
    parser_lex_callback(parser);
}

/**
 * This function will be called when a newline is encountered. In some newlines,
 * we need to check if there is a heredoc or heredocs that we have already lexed
 * the body of that we need to now skip past. That will be indicated by the
 * heredoc_end field on the parser.
 *
 * If it is set, then we need to skip past the heredoc body and then clear the
 * heredoc_end field.
 */
function parser_flush_heredoc_end(parser) {
    // assert(parser.heredoc_end <= parser.end): debug-only in C.
    parser.next_start = parser.heredoc_end;
    parser.heredoc_end = null;
}

/**
 * Returns true if the parser has lexed the last token on the current line.
*/
function parser_end_of_line_p(parser) {
    let cursor = parser.current.end;

    while (cursor < parser.end && parser.source[cursor] !== '\n' && parser.source[cursor] !== '#') {
        if (!pm_char_is_inline_whitespace((parser.source.charCodeAt(cursor++) || 0))) return false;
    }

    return true;
}

/**
 * When we're lexing certain types (strings, symbols, lists, etc.) we have
 * string content associated with the tokens. For example:
 *
 *     "foo"
 *
 * In this case, the string content is foo. Since there is no escaping, there's
 * no need to track additional information and the token can be returned as
 * normal. However, if we have escape sequences:
 *
 *     "foo\n"
 *
 * then the bytes in the string are "f", "o", "o", "\", "n", but we want to
 * provide our consumers with the string content "f", "o", "o", "\n". In these
 * cases, when we find the first escape sequence, we initialize a pm_buffer_t
 * to keep track of the string content. Then in the parser, it will
 * automatically attach the string content to the node that it belongs to.
 *
 * pm_token_buffer_t := { buffer: pm_buffer_t, cursor: number | null }
 *
 * pm_regexp_token_buffer_t := {
 *     base: pm_token_buffer_t,
 *     regexp_buffer: pm_buffer_t
 * }
 */

/**
 * Push the given byte into the token buffer.
 */
function pm_token_buffer_push_byte(token_buffer, byte) {
    pm_buffer_append_byte(token_buffer.buffer, byte);
}

function pm_regexp_token_buffer_push_byte(token_buffer, byte) {
    pm_buffer_append_byte(token_buffer.regexp_buffer, byte);
}

/**
 * Return the width of the character at the end of the current token.
 */
function parser_char_width(parser) {
    const width = pm_encoding_utf_8_char_width(parser.source, parser.current.end, parser.end - parser.current.end);

    // TODO: If the character is invalid in the given encoding, then we'll just
    // push one byte into the buffer. This should actually be an error.
    return (width === 0 ? 1 : width);
}

/**
 * Shared core of pm_token_buffer_push_escaped/pm_regexp_token_buffer_push_escaped:
 * push the character at the current token's end into each of `buffers`, then
 * advance past it. The regexp variant just passes two target buffers instead
 * of one.
 */
function pm_token_buffer_push_escaped_into(buffers, parser) {
    const width = parser_char_width(parser);
    const text = parser.source.slice(parser.current.end, parser.current.end + width);
    for (const buffer of buffers) pm_buffer_append_bytes(buffer, text, width);
    parser.current.end += width;
}

/**
 * Push an escaped character into the token buffer.
 */
function pm_token_buffer_push_escaped(token_buffer, parser) {
    pm_token_buffer_push_escaped_into([token_buffer.buffer], parser);
}

function pm_regexp_token_buffer_push_escaped(token_buffer, parser) {
    pm_token_buffer_push_escaped_into([token_buffer.base.buffer, token_buffer.regexp_buffer], parser);
}

function pm_slice_ascii_only_p(value, length) {
    // UNI-BUILD: C tests `byte & 0x80` over a UTF-8 byte stream, where any
    // set high bit means "not ASCII". `value` here is a native UTF-16
    // string, so the equivalent test is "code unit > 0x7F" - `& 0x80`
    // against a full code unit is wrong (e.g. U+0202 is 0x0202, which has
    // bit 0x80 clear even though it's far outside ASCII).
    for (let index = 0; index < length; index++) {
        if ((value.charCodeAt(index) || 0) > 0x7f) return false;
    }

    return true;
}

/**
 * When we're about to return from lexing the current token and we know for sure
 * that we have found an escape sequence, this function is called to copy the
 * contents of the token buffer into the current string on the parser so that it
 * can be attached to the correct node.
 */
function pm_token_buffer_copy(parser, token_buffer) {
    parser.current_string = pm_buffer_value(token_buffer.buffer);
    parser.current_string_shared = false;
}

function pm_regexp_token_buffer_copy(parser, token_buffer) {
    pm_token_buffer_copy(parser, token_buffer.base);
    parser.current_regular_expression_ascii_only = pm_slice_ascii_only_p(pm_buffer_value(token_buffer.regexp_buffer), pm_buffer_length(token_buffer.regexp_buffer));
}

/**
 * When we're about to return from lexing the current token, we need to flush
 * all of the content that we have pushed into the buffer into the current
 * string. If we haven't pushed anything into the buffer, this means that we
 * never found an escape sequence, so we can directly reference the bounds of
 * the current string. Either way, at the return of this function it is expected
 * that parser->current_string is established in such a way that it can be
 * attached to a node.
 */
function pm_token_buffer_flush(parser, token_buffer) {
    if (token_buffer.cursor === null) {
        parser.current_string = parser.source.slice(parser.current.start, parser.current.end);
        parser.current_string_shared = true;
    } else {
        pm_buffer_append_bytes(token_buffer.buffer, parser.source.slice(token_buffer.cursor, parser.current.end), parser.current.end - token_buffer.cursor);
        pm_token_buffer_copy(parser, token_buffer);
    }
}

function pm_regexp_token_buffer_flush(parser, token_buffer) {
    if (token_buffer.base.cursor === null) {
        parser.current_string = parser.source.slice(parser.current.start, parser.current.end);
        parser.current_string_shared = true;
        parser.current_regular_expression_ascii_only = pm_slice_ascii_only_p(parser.source.slice(parser.current.start, parser.current.end), parser.current.end - parser.current.start);
    } else {
        pm_buffer_append_bytes(token_buffer.base.buffer, parser.source.slice(token_buffer.base.cursor, parser.current.end), parser.current.end - token_buffer.base.cursor);
        pm_buffer_append_bytes(token_buffer.regexp_buffer, parser.source.slice(token_buffer.base.cursor, parser.current.end), parser.current.end - token_buffer.base.cursor);
        pm_regexp_token_buffer_copy(parser, token_buffer);
    }
}

const PM_TOKEN_BUFFER_DEFAULT_SIZE = 16;

/**
 * When we've found an escape sequence, we need to copy everything up to this
 * point into the buffer because we're about to provide a string that has
 * different content than a direct slice of the source.
 *
 * It is expected that the parser's current token end will be pointing at one
 * byte past the backslash that starts the escape sequence.
 */
/**
 * Shared bookkeeping for pm_token_buffer_escape/pm_regexp_token_buffer_escape:
 * compute the [start, end) range to copy up through the byte before the
 * current escape sequence, initializing the base buffer's capacity on first
 * use, and advance the cursor. Does not itself append to any buffer, since
 * the two variants write the range into a different number of buffers.
 */
function pm_token_buffer_escape_range(parser, token_buffer) {
    let start;
    if (token_buffer.cursor === null) {
        pm_buffer_init_capacity(token_buffer.buffer, PM_TOKEN_BUFFER_DEFAULT_SIZE);
        start = parser.current.start;
    } else {
        start = token_buffer.cursor;
    }

    const end = parser.current.end - 1;
    // assert(end >= start): debug-only in C.
    token_buffer.cursor = end;

    return { start, end };
}

function pm_token_buffer_escape(parser, token_buffer) {
    const { start, end } = pm_token_buffer_escape_range(parser, token_buffer);
    pm_buffer_append_bytes(token_buffer.buffer, parser.source.slice(start, end), end - start);
}

function pm_regexp_token_buffer_escape(parser, token_buffer) {
    const needs_init = token_buffer.base.cursor === null;
    const { start, end } = pm_token_buffer_escape_range(parser, token_buffer.base);
    if (needs_init) pm_buffer_init_capacity(token_buffer.regexp_buffer, PM_TOKEN_BUFFER_DEFAULT_SIZE);

    const text = parser.source.slice(start, end);
    pm_buffer_append_bytes(token_buffer.base.buffer, text, end - start);
    pm_buffer_append_bytes(token_buffer.regexp_buffer, text, end - start);
}
// #undef PM_TOKEN_BUFFER_DEFAULT_SIZE (kept defined; JS consts cannot be undefined)

/**
 * Effectively the same thing as pm_strspn_inline_whitespace, but in the case of
 * a tilde heredoc expands out tab characters to the nearest tab boundaries.
 *
 * (Adaptation: `cursor` is a { value } box since C passes a pointer-to-pointer.)
 */
function pm_heredoc_strspn_inline_whitespace(parser, cursor, indent) {
    let whitespace = 0;

    switch (indent) {
        case PM_HEREDOC_INDENT_NONE:
            // Do nothing, we can't match a terminator with
            // indentation and there's no need to calculate common
            // whitespace.
            break;
        case PM_HEREDOC_INDENT_DASH:
            // Skip past inline whitespace.
            cursor += pm_strspn_inline_whitespace(parser.source, cursor, parser.end - cursor);
            break;
        case PM_HEREDOC_INDENT_TILDE:
            // Skip past inline whitespace and calculate common
            // whitespace.
            while (cursor < parser.end && pm_char_is_inline_whitespace((parser.source.charCodeAt(cursor) || 0))) {
                if (parser.source[cursor] === '\t') {
                    whitespace = Math.floor(whitespace / PM_TAB_WHITESPACE_SIZE + 1) * PM_TAB_WHITESPACE_SIZE;
                } else {
                    whitespace++;
                }
                cursor++;
            }

            break;
    }

    return [whitespace, cursor];
}

/**
 * Lex past the delimiter of a percent literal. Handle newlines and heredocs
 * appropriately.
 */
function pm_lex_percent_delimiter(parser) {
    const eol_length = match_eol(parser);

    if (eol_length) {
        if (parser.heredoc_end) {
            // If we have already lexed a heredoc, then the newline has already
            // been added to the list. In this case we want to just flush the
            // heredoc end.
            parser_flush_heredoc_end(parser);
        } else {
            // Otherwise, we'll add the newline to the list of newlines.
            pm_newline_list_append(parser.newline_list, parser.current.end + eol_length - 1);
        }

        let delimiter = (parser.source.charCodeAt(parser.current.end) || 0);

        // If our delimiter is \r\n, we want to treat it as if it's \n.
        // For example, %\r\nfoo\r\n should be "foo"
        if (eol_length === 2) {
            delimiter = (parser.source.charCodeAt(parser.current.end + 1) || 0);
        }

        parser.current.end += eol_length;
        return delimiter;
    }

    const delimiter = (parser.source.charCodeAt(parser.current.end) || 0);
    parser.current.end++;
    return delimiter;
}

/**
 * This is a convenience macro that sets the current token type, calls the lex
 * callback, and then returns from the parser_lex function. Not converted as a
 * function because it returns from its caller; expand at use sites as
 * `parser.current.type = X; parser_lex_callback(parser); return;`.
 * (prism.c:9726)
 */

// parser_lex (prism.c:9734) belongs to the next fragment.

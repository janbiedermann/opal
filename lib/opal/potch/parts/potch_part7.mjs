// prism.c lines 20206-22679 converted to JavaScript (ES2022).
//
// This fragment contains the tail of the parser driver:
// - parse_assignment_value/_local/_values, parse_call_operator_write
// - the named-capture machinery for =~ regular expressions
// - parse_expression_infix (the infix operator dispatch)
// - pm_call_node_command_p, parse_expression (THE driver), wrap_statements,
//   parse_program
// - the external API: pm_parser_init, pm_parser_register_encoding_changed_callback,
//   pm_parse, the streaming API, the
//   serialization entry points and the slice query APIs.
//   (pm_parser_free / pm_options_free are intentionally not ported: they only
//   freed memory, which garbage collection handles.)
//
// This is a plain fragment: it declares consts/functions only, no
// import/export. It relies on parts 1-6b, ast.js, node.js, diagnostic.js,
// options.js, token_type.js, encoding.js, regexp.js, static_literals.js,
// serialize.js and the util modules being concatenated/imported around it.
// In particular it defines four of the five functions that src/serialize.js
// imports from ./potch.js: pm_parser_init, pm_parse and
// pm_serialize (pm_parser_free is intentionally not ported).
//
// Adaptation notes for the integrator:
// - Byte access is parser.source[offset]; C NULL pointers become null, and -1
//   stands in for NULL returns of search helpers such as pm_memchr/next_newline.
// - pm_named_capture_escape_hex/octal/unicode/pm_named_capture_escape operate
//   on an explicit Uint8Array plus numeric offsets (the capture name may live
//   in a standalone escape buffer rather than parser.source).
// - escape_unicode is duplicated below as an explicit-buffer variant because
//   part3's version reads parser.source directly; the logic is identical.
// - parse_regular_expression_named_capture computes `base`
//   (source.byteOffset - parser.source.byteOffset) to translate views into
//   parser.source back to absolute offsets. When the content was shared but
//   the name contained escapes, C inserts a shared constant that points into
//   the escape buffer freed immediately afterwards (use-after-free); JS cannot
//   reproduce that, so the bytes are copied and inserted owned instead. The
//   pool hashes by content so ids match C.
// - part6a's pm_slice_is_valid_local hardcodes parser.source; this range needs
//   to validate names living in other buffers, so the logic is duplicated in
//   pm_slice_is_valid_local_bytes with an explicit buffer parameter.
// - pm_strnstr takes the big-buffer Uint8Array explicitly plus the start
//   offset of the search (C took a raw pointer into parser.source).
// - shebang_callback is invoked as callback(next_options, start_offset,
//   length, data) where start_offset is an offset into parser.source (C
//   passed a uint8_t * into the same buffer).
// - Option encodings arrive as standalone strings (from options.js setters,
//   or a shebang callback mutating the copied options), never as offsets into
//   parser.source, so pm_parser_init_shebang and pm_parser_init duplicate the
//   small body of part3's parser_lex_magic_comment_encoding_value with an
//   explicit buffer parameter (pm_parser_init_set_encoding_value).
// - The C streaming API (pm_parse_stream_read/stream_fgets/stream_feof) was
//   never ported; there is no streaming entry point in this build.
// - The `data` parameters of the public serialize/query entry points are
//   string|null per spec. (The C options-blob deserializer was never ported;
//   pm_parse_success_p relied on it and is not ported either.)
// - `pm_options_t options = { 0 }` becomes zero_options() below.
// - xmalloc/memcpy become new Uint8Array/slice()/set(); xfree vanishes (GC);
//   asserts are debug-only in C and omitted.
// - First definitions of constants from other headers used here:
//     PRISM_DEPTH_MAXIMUM (defines.h), PRISM_VERSION_MAJOR/MINOR/PATCH
//     (version.h), PM_STRING_QUERY_* (prism.h), PM_SLICE_TYPE_* (below).

// PRISM_DEPTH_MAXIMUM (include/prism/defines.h)
const PRISM_DEPTH_MAXIMUM = 10000;

// PRISM_VERSION_MAJOR/MINOR/PATCH (include/prism/version.h)
const PRISM_VERSION_MAJOR = 1;
const PRISM_VERSION_MINOR = 9;
const PRISM_VERSION_PATCH = 0;

// typedef enum { ... } pm_string_query_t; (include/prism.h)
const PM_STRING_QUERY_ERROR = -1;
const PM_STRING_QUERY_FALSE = 0;
const PM_STRING_QUERY_TRUE = 1;

/**
 * Parse the value that is going to be written to some kind of variable or
 * method call. We need to handle this separately because the rescue modifier
 * is permitted on the end of these expressions, which is a deviation from its
 * normal binding power.
 *
 * Note that this will only be called after an operator write, as in &&=, ||=,
 * or any of the binary operators that can be written to a variable.
 * (prism.c:20206)
 */
function parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, diag_id, depth) {
    const value = parse_value_expression(parser, binding_power, previous_binding_power === PM_BINDING_POWER_ASSIGNMENT ? accepts_command_call : previous_binding_power < PM_BINDING_POWER_MATCH, false, diag_id, depth + 1);

    // Contradicting binding powers, the right-hand-side value of the assignment
    // allows the `rescue` modifier.
    if (match1(parser, PM_TOKEN_KEYWORD_RESCUE_MODIFIER)) {
        context_push(parser, PM_CONTEXT_RESCUE_MODIFIER);

        const rescue = copyToken(parser.current);
        parser_lex(parser);

        const right = parse_expression(parser, pm_binding_powers[PM_TOKEN_KEYWORD_RESCUE_MODIFIER].right, false, false, PM_ERR_RESCUE_MODIFIER_VALUE, depth + 1);
        context_pop(parser);

        return pm_rescue_modifier_node_create(parser, value, rescue, right);
    }

    return value;
}

/**
 * When a local variable write node is the value being written in a different
 * write, the local variable is considered "used". (prism.c:20231)
 */
function parse_assignment_value_local(parser, node) {
    switch (node.type) {
        case PM_BEGIN_NODE: {
            if (node.statements !== null) parse_assignment_value_local(parser, node.statements);
            break;
        }
        case PM_LOCAL_VARIABLE_WRITE_NODE: {
            pm_locals_read(pm_parser_scope_find(parser, node.depth).locals, node.name);
            break;
        }
        case PM_PARENTHESES_NODE: {
            if (node.body !== null) parse_assignment_value_local(parser, node.body);
            break;
        }
        case PM_STATEMENTS_NODE: {
            for (let index = 0; index < node.body.length; index++) {
                parse_assignment_value_local(parser, node.body[index]);
            }
            break;
        }
        default:
            break;
    }
}

/**
 * Parse the value (or values, through an implicit array) that is going to be
 * written to some kind of variable or method call. We need to handle this
 * separately because the rescue modifier is permitted on the end of the these
 * expressions, which is a deviation from its normal binding power.
 *
 * Additionally, if the value is a local variable write node (e.g., a = a = 1),
 * the "a" is marked as being used so the parser should not warn on it.
 *
 * Note that this will only be called after an = operator, as that is the only
 * operator that allows multiple values after it. (prism.c:20275)
 */
function parse_assignment_values(parser, previous_binding_power, binding_power, accepts_command_call, diag_id, depth) {
    let permitted = true;
    if (previous_binding_power !== PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_USTAR)) permitted = false;

    let value = parse_starred_expression(parser, binding_power, previous_binding_power === PM_BINDING_POWER_ASSIGNMENT ? accepts_command_call : previous_binding_power < PM_BINDING_POWER_MODIFIER, diag_id, depth + 1);
    if (!permitted) pm_parser_err_node(parser, value, PM_ERR_UNEXPECTED_MULTI_WRITE);

    parse_assignment_value_local(parser, value);
    let single_value = true;

    if (previous_binding_power === PM_BINDING_POWER_STATEMENT && (PM_NODE_TYPE_P(value, PM_SPLAT_NODE) || match1(parser, PM_TOKEN_COMMA))) {
        single_value = false;

        const opening = not_provided(parser);
        const array = pm_array_node_create(parser, opening);

        pm_array_node_elements_append(array, value);
        value = array;

        while (accept1(parser, PM_TOKEN_COMMA)) {
            const element = parse_starred_expression(parser, binding_power, false, PM_ERR_ARRAY_ELEMENT, depth + 1);

            pm_array_node_elements_append(array, element);
            if (PM_NODE_TYPE_P(element, PM_MISSING_NODE)) break;

            parse_assignment_value_local(parser, element);
        }
    }

    // Contradicting binding powers, the right-hand-side value of the assignment
    // allows the `rescue` modifier.
    if ((single_value || (binding_power === (PM_BINDING_POWER_MULTI_ASSIGNMENT + 1))) && match1(parser, PM_TOKEN_KEYWORD_RESCUE_MODIFIER)) {
        context_push(parser, PM_CONTEXT_RESCUE_MODIFIER);

        const rescue = copyToken(parser.current);
        parser_lex(parser);

        let accepts_command_call_inner = false;

        // RHS can accept command call iff the value is a call with arguments
        // but without parenthesis.
        if (PM_NODE_TYPE_P(value, PM_CALL_NODE)) {
            const call_node = value;
            if ((call_node.arguments !== null) && (call_node.opening_loc.start === null)) {
                accepts_command_call_inner = true;
            }
        }

        const right = parse_expression(parser, pm_binding_powers[PM_TOKEN_KEYWORD_RESCUE_MODIFIER].right, accepts_command_call_inner, false, PM_ERR_RESCUE_MODIFIER_VALUE, depth + 1);
        context_pop(parser);

        return pm_rescue_modifier_node_create(parser, value, rescue, right);
    }

    return value;
}

/**
 * Ensure a call node that is about to become a call operator node does not
 * have arguments or a block attached. If it does, then we'll need to add an
 * error message and destroy the arguments/block. Ideally we would keep the node
 * around so that consumers would still have access to it, but we don't have a
 * great structure for that at the moment. (prism.c:20340)
 */
function parse_call_operator_write(parser, call_node, operator) {
    if (call_node.arguments !== null) {
        pm_parser_err_token(parser, operator, PM_ERR_OPERATOR_WRITE_ARGUMENTS);
        pm_node_unreference(parser, call_node.arguments);
        call_node.arguments = null;
    }

    if (call_node.block !== null) {
        pm_parser_err_token(parser, operator, PM_ERR_OPERATOR_WRITE_BLOCK);
        pm_node_unreference(parser, call_node.block);
        call_node.block = null;
    }
}

/******************************************************************************/
/* Named captures in regular expressions                                      */
/******************************************************************************/

/**
 * This object is used to pass information between the regular expression
 * parser and the named capture callback. In C it is
 *
 *     typedef struct {
 *         pm_parser_t *parser;
 *         pm_call_node_t *call;
 *         pm_match_write_node_t *match;
 *         pm_constant_id_list_t names;
 *         bool shared;
 *     } parse_regular_expression_named_capture_data_t;
 *
 * Here it is a plain object with the same fields.
 */

// UNI-BUILD: `unescaped` is a JS-string buffer, not a byte buffer, so a
// single escaped byte >= 0x80 can't just be pushed as its own code unit -
// that produces one mojibake character per byte instead of the one real
// codepoint a multi-byte UTF-8 sequence (spelled out here as consecutive
// \xNN/\0NN escapes) decodes to. Mirrors escape_write_byte_encoded's own
// continuation-merging (potch_part3.js), adapted to read against a local
// `source`/`cursor` slice (the capture name text) instead of the live
// parser cursor - same algorithm, different cursor source.
function pm_named_capture_merge_continuation(source, cursor, end, lead_byte) {
    const width = lead_byte >= 0xf0 ? 4 : lead_byte >= 0xe0 ? 3 : lead_byte >= 0xc2 ? 2 : 1;
    if (width === 1) return { codepoint: 0xfffd, cursor };

    let pos = cursor;
    const units = [lead_byte];
    while (units.length < width) {
        if ((source.charCodeAt(pos) || 0) !== 92 /* '\\' */) break;
        const c1 = source.charCodeAt(pos + 1) || 0;
        let value = null;
        let next = -1;

        if (c1 === 120 /* 'x' */ || c1 === 88 /* 'X' */) {
            const d1 = source.charCodeAt(pos + 2) || 0;
            const d2 = source.charCodeAt(pos + 3) || 0;
            if (pm_char_is_hexadecimal_digit(d1) && pm_char_is_hexadecimal_digit(d2)) {
                value = (escape_hexadecimal_digit(d1) << 4) | escape_hexadecimal_digit(d2);
                next = pos + 4;
            }
        } else if (c1 >= 48 /* '0' */ && c1 <= 55 /* '7' */) {
            value = c1 - 48;
            next = pos + 2;
            for (let k = 0; k < 2; k++) {
                const oc = source.charCodeAt(next) || 0;
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
            return { codepoint: cp, cursor: pos };
        }
    }

    // Invalid lead/sequence: single replacement character, no extra
    // escapes consumed beyond the lead byte itself.
    return { codepoint: 0xfffd, cursor };
}

// `cursor` points at the 'x'. Offsets are into `source`. (prism.c:20382)
function pm_named_capture_escape_hex(unescaped, source, cursor, end) {
    cursor++;

    if (cursor < end && pm_char_is_hexadecimal_digit((source.charCodeAt(cursor)))) {
        let value = escape_hexadecimal_digit((source.charCodeAt(cursor)));
        cursor++;

        if (cursor < end && pm_char_is_hexadecimal_digit((source.charCodeAt(cursor)))) {
            value = (value << 4) | escape_hexadecimal_digit((source.charCodeAt(cursor)));
            cursor++;
        }

        if (value >= 0x80) {
            const merged = pm_named_capture_merge_continuation(source, cursor, end, value);
            pm_buffer_append_unicode_codepoint(unescaped, merged.codepoint);
            cursor = merged.cursor;
        } else {
            pm_buffer_append_byte(unescaped, value & 0xff);
        }
    } else {
        pm_buffer_append_string(unescaped, "\\x");
    }

    return cursor;
}

// `cursor` points at the first octal digit. (prism.c:20403)
function pm_named_capture_escape_octal(unescaped, source, cursor, end) {
    let value = (source.charCodeAt(cursor)) - 48; /* '0' */
    cursor++;

    if (cursor < end && pm_char_is_octal_digit((source.charCodeAt(cursor)))) {
        value = ((value << 3) & 0xff) | ((source.charCodeAt(cursor)) - 48); /* '0' */
        cursor++;

        if (cursor < end && pm_char_is_octal_digit((source.charCodeAt(cursor)))) {
            value = ((value << 3) & 0xff) | ((source.charCodeAt(cursor)) - 48); /* '0' */
            cursor++;
        }
    }

    if (value >= 0x80) {
        const merged = pm_named_capture_merge_continuation(source, cursor, end, value);
        pm_buffer_append_unicode_codepoint(unescaped, merged.codepoint);
        cursor = merged.cursor;
    } else {
        pm_buffer_append_byte(unescaped, value & 0xff);
    }

    return cursor;
}

// Copy of part3's escape_unicode that reads an explicit buffer instead of
// parser.source (the capture name may live in a standalone escape buffer).
// `string` is an offset into `source`. When error_location is null the error
// is reported at base + string .. base + string + length (in C these were raw
// pointer values). Behavior is otherwise identical. (prism.c escape_unicode)
function pm_named_capture_escape_unicode_value(parser, source, string, length, error_location, base) {
    let value = 0;
    for (let index = 0; index < length; index++) {
        if (index !== 0) value <<= 4;
        value |= escape_hexadecimal_digit((source.charCodeAt(string + index)));
    }

    // Here we're going to verify that the value is actually a valid Unicode
    // codepoint and not a surrogate pair.
    if (value >= 0xD800 && value <= 0xDFFF) {
        if (error_location !== null) {
            pm_parser_err(parser, error_location.start, error_location.end, PM_ERR_ESCAPE_INVALID_UNICODE);
        } else {
            pm_parser_err(parser, base + string, base + string + length, PM_ERR_ESCAPE_INVALID_UNICODE);
        }
        return 0xFFFD;
    }

    return value >>> 0;
}

// `cursor` points at the 'u'. (prism.c:20422)
function pm_named_capture_escape_unicode(parser, unescaped, source, cursor, end, error_location) {
    const start = cursor - 1;
    cursor++;

    if (cursor >= end) {
        pm_buffer_append_string(unescaped, "\\u");
        return cursor;
    }

    if ((source.charCodeAt(cursor)) !== 123 /* '{' */) {
        const length = pm_strspn_hexadecimal_digit(source, cursor, Math.min(end - cursor, 4));
        const value = pm_named_capture_escape_unicode_value(parser, source, cursor, length, error_location, 0);

        if (!pm_buffer_append_unicode_codepoint(unescaped, value)) {
            pm_buffer_append_bytes(unescaped, source.slice(start, cursor + length), (cursor + length) - start);
        }

        return cursor + length;
    }

    cursor++;
    for (;;) {
        while (cursor < end && (source.charCodeAt(cursor)) === 32 /* ' ' */) cursor++;

        if (cursor >= end) break;
        if ((source.charCodeAt(cursor)) === 125 /* '}' */) {
            cursor++;
            break;
        }

        const length = pm_strspn_hexadecimal_digit(source, cursor, end - cursor);
        if (length === 0) {
            break;
        }
        const value = pm_named_capture_escape_unicode_value(parser, source, cursor, length, error_location, 0);

        pm_buffer_append_unicode_codepoint(unescaped, value);
        cursor += length;
    }

    return cursor;
}

// `cursor` points at the first backslash within source[0..length).
// (prism.c:20466)
function pm_named_capture_escape(parser, unescaped, source, length, cursor, error_location) {
    const end = length;
    pm_buffer_append_bytes(unescaped, source.slice(0, cursor), cursor);

    for (;;) {
        if (++cursor >= end) {
            pm_buffer_append_byte(unescaped, 92); /* '\\' */
            return;
        }

        switch ((source.charCodeAt(cursor))) {
            case 120: // 'x'
                cursor = pm_named_capture_escape_hex(unescaped, source, cursor, end);
                break;
            case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: // '0'..'7'
                cursor = pm_named_capture_escape_octal(unescaped, source, cursor, end);
                break;
            case 117: // 'u'
                cursor = pm_named_capture_escape_unicode(parser, unescaped, source, cursor, end, error_location);
                break;
            default:
                pm_buffer_append_byte(unescaped, 92); /* '\\' */
                break;
        }

        const next_cursor_raw = source.indexOf("\\", cursor);
        if (next_cursor_raw === -1 || next_cursor_raw >= end) break;
        const next_cursor = next_cursor_raw;

        pm_buffer_append_bytes(unescaped, source.slice(cursor, next_cursor), next_cursor - cursor);
        cursor = next_cursor;
    }

    pm_buffer_append_bytes(unescaped, source.slice(cursor, end), end - cursor);
}

// Copy of part6a's pm_slice_is_valid_local that validates bytes in an
// explicit buffer rather than parser.source. Logic is identical.
// (prism.c:16388)
function pm_slice_is_valid_local_bytes(parser, bytes, start, end) {
    const length = end - start;
    if (length === 0) return false;

    // First ensure that it starts with a valid identifier starting character.
    let width;
     if ((bytes.charCodeAt(start) || 0) < 0x80) {
        if (((pm_encoding_unicode_table[(bytes.charCodeAt(start) || 0)] & PRISM_ENCODING_ALPHABETIC_BIT) !== 0) || ((bytes.charCodeAt(start) || 0) === 0x5f)) {
            width = 1;
        } else {
            return false;
        }
    } else {
        width = pm_encoding_utf_8_char_width(bytes, start, length);
        if (!(width > 0)) return false;
    }

    // Next, ensure that it's not an uppercase character.
    
        if (pm_encoding_utf_8_isupper_char(bytes, start, length)) return false;
    

    // Next, iterate through all of the bytes of the string to ensure that they
    // are all valid identifier characters.
    let cursor = start + width;
    while (true) {
        let matched = false;

         if ((bytes.charCodeAt(cursor) || 0) < 0x80) {
            if (((pm_encoding_unicode_table[(bytes.charCodeAt(cursor) || 0)] & PRISM_ENCODING_ALPHANUMERIC_BIT) !== 0) || ((bytes.charCodeAt(cursor) || 0) === 0x5f)) {
                cursor += 1;
                matched = true;
            }
        } else {
            width = pm_encoding_utf_8_char_width(bytes, cursor, end - cursor);
            if (width > 0) {
                cursor += width;
                matched = true;
            }
        }

        if (!matched) break;
    }

    return cursor === end;
}

/**
 * This callback is called when the regular expression parser encounters a named
 * capture group. (prism.c:20506)
 */
function parse_regular_expression_named_capture(capture_start, capture_end, data) {
    const callback_data = data;

    const parser = callback_data.parser;
    const call = callback_data.call;
    const names = callback_data.names;

    // Capture text: `capture_start/end` are relative to the scanned content
    // (C received pointers into it). For shared content the same bytes live
    // at data.base within parser.source; owned content is self-contained.
    let source = callback_data.content.slice(capture_start, capture_end);
    let length = source.length;
    let escaped = false;
    const unescaped = {};
    pm_buffer_init(unescaped);

    // First, we need to handle escapes within the name of the capture group.
    // This is because regular expressions have three different representations
    // in prism. The first is the plain source code. The second is the
    // representation that will be sent to the regular expression engine, which
    // is the value of the "unescaped" field. This is poorly named, because it
    // actually still contains escapes, just a subset of them that the regular
    // expression engine knows how to handle. The third representation is fully
    // unescaped, which is what we need.
    const cursor = (() => { const idx = source.indexOf("\\"); return (idx !== -1 && idx < length) ? idx : -1; })();
    if (cursor !== -1) {
        escaped = true;
        pm_named_capture_escape(parser, unescaped, source, length, cursor, callback_data.shared ? null : call.receiver.location);
        source = pm_buffer_value(unescaped);
        length = pm_buffer_length(unescaped);
    }

    // Offset of `source` within parser.source when it aliases parser.source
    // (shared content without escapes); otherwise it stands in for the raw
    // malloc pointer values that C used here.
    let location;
    let name;

    // If the name of the capture group isn't a valid identifier, we do
    // not add it to the local table.
    if (!pm_slice_is_valid_local_bytes(parser, source, 0, length)) {
        return;
    }

    if (callback_data.shared && !escaped) {
        // Unescaped text aliases the source: the name lives in the source.
        location = { start: callback_data.base + capture_start, end: callback_data.base + capture_end };
        name = pm_parser_constant_id_location(parser, location.start, location.end);
    } else if (callback_data.shared) {
        // Escaped: C frees the escape buffer while the constant pool keeps
        // pointing into it, so copy the bytes out and insert them owned.
        // Location offsets stay where C kept raw malloc pointers.
        location = { start: callback_data.base + capture_start, end: callback_data.base + capture_start + length };

        const memory = source.slice(0, length);
        name = pm_parser_constant_id_owned(parser, memory, length);
    } else {
        // Otherwise, the name is a slice of the malloc-ed owned string,
        // in which case we need to copy it out into a new string.
        location = call.receiver.location;

        const memory = source.slice(0, length);
        name = pm_parser_constant_id_owned(parser, memory, length);
    }

    // Add this name to the list of constants if it is valid, not duplicated,
    // and not a keyword.
    if (name !== 0 && !pm_constant_id_list_includes(names, name)) {
        pm_constant_id_list_append(names, name);

        const depth = pm_parser_local_depth_constant_id(parser, name);
        if (depth === -1) {
            // If the local is not already a local but it is a keyword, then we
            // do not want to add a capture for this.
            if (pm_local_is_keyword(source, length)) {
                return;
            }

            // If the identifier is not already a local, then we will add it to
            // the local table.
            pm_parser_local_add(parser, name, location.start, location.end, 0);
        }

        // Here we lazily create the MatchWriteNode since we know we're
        // about to add a target.
        if (callback_data.match === null) {
            callback_data.match = pm_match_write_node_create(parser, call);
        }

        // Next, create the local variable target and add it to the list of
        // targets for the match.
        const target = pm_local_variable_target_node_create(parser, location, name, depth === -1 ? 0 : (depth >>> 0));
        pm_node_list_append(callback_data.match.targets, target);
    }

}

/**
 * Potentially change a =~ with a regular expression with named captures into a
 * match write node. (prism.c:20598)
 */
function parse_regular_expression_named_captures(parser, content, call, extended_mode, shared, base) {
    const callback_data = {
        parser,
        call,
        match: null,
        names: [],
        content,
        shared,
        base
    };

    const error_data = {
        parser,
        start: call.receiver.location.start,
        end: call.receiver.location.end,
        shared,
        base
    };

    pm_regexp_parse(parser, (content || ""), (content ? content.length : 0), extended_mode, parse_regular_expression_named_capture, callback_data, parse_regular_expression_error, error_data);

    if (callback_data.match !== null) {
        return callback_data.match;
    } else {
        return call;
    }
}

/******************************************************************************/
/* Infix expression parsing                                                   */
/******************************************************************************/

// Case labels of prism.c:20956-20965 (the operator-assignment tokens that share
// one arm of the parse_expression_infix switch).
const PARSE_EXPRESSION_INFIX_OPERATOR_EQUAL = new Set([
    PM_TOKEN_AMPERSAND_EQUAL, PM_TOKEN_CARET_EQUAL, PM_TOKEN_GREATER_GREATER_EQUAL,
    PM_TOKEN_LESS_LESS_EQUAL, PM_TOKEN_MINUS_EQUAL, PM_TOKEN_PERCENT_EQUAL,
    PM_TOKEN_PIPE_EQUAL, PM_TOKEN_PLUS_EQUAL, PM_TOKEN_SLASH_EQUAL,
    PM_TOKEN_STAR_EQUAL, PM_TOKEN_STAR_STAR_EQUAL
]);

// Case labels of prism.c:20666-20672 (the pseudo-constant nodes that get a
// dedicated "unwriteable" error on `=`).
const PARSE_EXPRESSION_INFIX_UNWRITEABLE = new Set([
    PM_SOURCE_ENCODING_NODE, PM_FALSE_NODE, PM_SOURCE_FILE_NODE,
    PM_SOURCE_LINE_NODE, PM_NIL_NODE, PM_SELF_NODE, PM_TRUE_NODE
]);

// Descriptors for parse_compound_write's &&=/||=/op= handling below: the
// "expect expression after X" diagnostic id used throughout, the
// diagnostic for a PM_MULTI_WRITE_NODE receiver, the write-node
// constructor to call per receiver-node "family", and how the
// default/unrecognized-receiver case reports its error (&&=/||= use a
// plain token error; the generic operator case uses a formatted one
// anchored to parser.previous with the current token's human-readable
// type name - prism.c:20956-21044 keeps these as three separate, nearly
// identical switches over node.type; this consolidates them into one
// parameterized by which of these three things varies).
const PARSE_COMPOUND_WRITE_AMPAMPEQ = {
    diag_id: PM_ERR_EXPECT_EXPRESSION_AFTER_AMPAMPEQ,
    multi_write_diag_id: PM_ERR_AMPAMPEQ_MULTI_ASSIGN,
    global_variable_create: pm_global_variable_and_write_node_create,
    class_variable_create: pm_class_variable_and_write_node_create,
    constant_path_create: pm_constant_path_and_write_node_create,
    constant_create: pm_constant_and_write_node_create,
    instance_variable_create: pm_instance_variable_and_write_node_create,
    local_variable_create: pm_local_variable_and_write_node_create,
    index_create: pm_index_and_write_node_create,
    call_create: pm_call_and_write_node_create,
    report_default_error: (parser, token) => pm_parser_err_token(parser, token, PM_ERR_EXPECT_EXPRESSION_AFTER_AMPAMPEQ),
};

const PARSE_COMPOUND_WRITE_PIPEPIPEEQ = {
    diag_id: PM_ERR_EXPECT_EXPRESSION_AFTER_PIPEPIPEEQ,
    multi_write_diag_id: PM_ERR_PIPEPIPEEQ_MULTI_ASSIGN,
    global_variable_create: pm_global_variable_or_write_node_create,
    class_variable_create: pm_class_variable_or_write_node_create,
    constant_path_create: pm_constant_path_or_write_node_create,
    constant_create: pm_constant_or_write_node_create,
    instance_variable_create: pm_instance_variable_or_write_node_create,
    local_variable_create: pm_local_variable_or_write_node_create,
    index_create: pm_index_or_write_node_create,
    call_create: pm_call_or_write_node_create,
    report_default_error: (parser, token) => pm_parser_err_token(parser, token, PM_ERR_EXPECT_EXPRESSION_AFTER_PIPEPIPEEQ),
};

const PARSE_COMPOUND_WRITE_OPERATOR = {
    diag_id: PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR,
    multi_write_diag_id: PM_ERR_OPERATOR_MULTI_ASSIGN,
    global_variable_create: pm_global_variable_operator_write_node_create,
    class_variable_create: pm_class_variable_operator_write_node_create,
    constant_path_create: pm_constant_path_operator_write_node_create,
    constant_create: pm_constant_operator_write_node_create,
    instance_variable_create: pm_instance_variable_operator_write_node_create,
    local_variable_create: pm_local_variable_operator_write_node_create,
    index_create: pm_index_operator_write_node_create,
    call_create: pm_call_operator_write_node_create,
    report_default_error: (parser, token) => PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.previous, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, pm_token_type_human(parser.current.type)),
};

// Shared handler for `target &&= value`, `target ||= value`, and
// `target op= value` (op being any of +-*/%**&|^<<>>). The three cases in
// prism.c differ only in the diagnostic ids used and which write-node
// constructor gets called per target-node type; `ops` (one of the
// PARSE_COMPOUND_WRITE_* descriptors above) carries those.
//
// Deviation: the PM_CALL_NODE case's `parser_lex(parser)` call is hoisted
// to run unconditionally at the top (matching the C `op=` arm's structure)
// rather than once per branch (the C `&&=`/`||=` arms' structure) - proven
// equivalent since nothing between the two call sites in either structure
// reads lexer cursor state (`pm_refute_numbered_parameter`/
// `pm_parser_local_add_location` only read the already-captured
// `message_loc` and `parser.source`/`parser.constant_pool`), and confirmed
// via byte-identical output across every operator kind before/after.
function parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, ops) {
    switch (node.type) {
        case PM_BACK_REFERENCE_READ_NODE:
        case PM_NUMBERED_REFERENCE_READ_NODE:
            PM_PARSER_ERR_NODE_FORMAT_CONTENT(parser, node, PM_ERR_WRITE_TARGET_READONLY);
            // PRISM_FALLTHROUGH
        case PM_GLOBAL_VARIABLE_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.global_variable_create(parser, node, token, value);
        }
        case PM_CLASS_VARIABLE_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.class_variable_create(parser, node, token, value);
        }
        case PM_CONSTANT_PATH_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            const write = ops.constant_path_create(parser, node, token, value);
            return parse_shareable_constant_write(parser, write);
        }
        case PM_CONSTANT_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            const write = ops.constant_create(parser, node, token, value);
            return parse_shareable_constant_write(parser, write);
        }
        case PM_INSTANCE_VARIABLE_READ_NODE: {
            parser_lex(parser);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.instance_variable_create(parser, node, token, value);
        }
        case PM_IT_LOCAL_VARIABLE_READ_NODE: {
            const name = pm_parser_local_add_constant(parser, "it", 2);
            parser_lex(parser);

            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            const result = ops.local_variable_create(parser, node, token, value, name, 0);

            pm_node_unreference(parser, node);
            return result;
        }
        case PM_LOCAL_VARIABLE_READ_NODE: {
            if (pm_token_is_numbered_parameter(parser.source, node.location.start, node.location.end)) {
                PM_PARSER_ERR_FORMAT(parser, node.location.start, node.location.end, PM_ERR_PARAMETER_NUMBERED_RESERVED, parser.source.slice(node.location.start, node.location.end));
                pm_node_unreference(parser, node);
            }

            parser_lex(parser);

            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.local_variable_create(parser, node, token, value, node.name, node.depth);
        }
        case PM_CALL_NODE: {
            parser_lex(parser);

            // If we have a vcall (a method with no arguments and no
            // receiver that could have been a local variable) then we
            // will transform it into a local variable write.
            if (PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_VARIABLE_CALL)) {
                const message_loc = node.message_loc;
                pm_refute_numbered_parameter(parser, message_loc.start, message_loc.end);

                const constant_id = pm_parser_local_add_location(parser, message_loc.start, message_loc.end, 1);
                const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
                return ops.local_variable_create(parser, node, token, value, constant_id, 0);
            }

            // If there is no call operator and the message is "[]" then
            // this is an aref expression, and we can transform it into
            // an aset expression.
            if (PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_INDEX)) {
                const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
                return ops.index_create(parser, node, token, value);
            }

            // If this node cannot be writable, then we have an error.
            if (pm_call_node_writable_p(parser, node)) {
                node.name = parse_write_name(parser, node.name);
            } else {
                pm_parser_err_node(parser, node, PM_ERR_WRITE_TARGET_UNEXPECTED);
            }

            parse_call_operator_write(parser, node, token);
            const value = parse_assignment_value(parser, previous_binding_power, binding_power, accepts_command_call, ops.diag_id, depth + 1);
            return ops.call_create(parser, node, token, value);
        }
        case PM_MULTI_WRITE_NODE: {
            parser_lex(parser);
            pm_parser_err_token(parser, token, ops.multi_write_diag_id);
            return node;
        }
        default:
            parser_lex(parser);

            // In this case we have a compound-assignment sign, but we don't
            // know what it's for. We need to treat it as an error. For now,
            // we'll mark it as an error and just skip right past it.
            ops.report_default_error(parser, token);
            return node;
    }
}

function parse_expression_infix(parser, node, previous_binding_power, binding_power, accepts_command_call, depth) {
    const token = copyToken(parser.current);

    if (token.type === PM_TOKEN_EQUAL) {
        // PRISM_FALLTHROUGH expansion: in C a PM_CALL_NODE label falls through
        // into the PM_CASE_WRITABLE arm after vcall bookkeeping.
        if (node.type === PM_CALL_NODE) {
            // If we have no arguments to the call node and we need this
            // to be a target then this is either a method call or a
            // local variable write. This _must_ happen before the value
            // is parsed because it could be referenced in the value.
            const call_node = node;
            if (PM_NODE_FLAG_P(call_node, PM_CALL_NODE_FLAGS_VARIABLE_CALL)) {
                pm_parser_local_add_location(parser, call_node.message_loc.start, call_node.message_loc.end, 0);
            }
        }

        if ((node.type === PM_CALL_NODE) || PM_CASE_WRITABLE.has(node.type)) {
            // When we have `it = value`, we need to add `it` as a local
            // variable before parsing the value, in case the value
            // references the variable.
            if (PM_NODE_TYPE_P(node, PM_IT_LOCAL_VARIABLE_READ_NODE)) {
                pm_parser_local_add_location(parser, node.location.start, node.location.end, 0);
            }

            parser_lex(parser);
            const value = parse_assignment_values(parser, previous_binding_power, PM_NODE_TYPE_P(node, PM_MULTI_TARGET_NODE) ? PM_BINDING_POWER_MULTI_ASSIGNMENT + 1 : binding_power, accepts_command_call, PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL, depth + 1);

            if (PM_NODE_TYPE_P(node, PM_MULTI_TARGET_NODE) && previous_binding_power !== PM_BINDING_POWER_STATEMENT) {
                pm_parser_err_node(parser, node, PM_ERR_UNEXPECTED_MULTI_WRITE);
            }

            return parse_write(parser, node, token, value);
        } else if (node.type === PM_SPLAT_NODE) {
            const multi_target = pm_multi_target_node_create(parser);
            pm_multi_target_node_targets_append(parser, multi_target, node);

            parser_lex(parser);
            const value = parse_assignment_values(parser, previous_binding_power, PM_BINDING_POWER_MULTI_ASSIGNMENT + 1, accepts_command_call, PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL, depth + 1);
            return parse_write(parser, multi_target, token, value);
        } else if (PARSE_EXPRESSION_INFIX_UNWRITEABLE.has(node.type)) {
            // In these special cases, we have specific error messages
            // and we will replace them with local variable writes.
            parser_lex(parser);
            const value = parse_assignment_values(parser, previous_binding_power, binding_power, accepts_command_call, PM_ERR_EXPECT_EXPRESSION_AFTER_EQUAL, depth + 1);
            return parse_unwriteable_write(parser, node, token, value);
        } else {
            // In this case we have an = sign, but we don't know what
            // it's for. We need to treat it as an error. We'll mark it
            // as an error and skip past it.
            parser_lex(parser);
            pm_parser_err_token(parser, token, PM_ERR_EXPRESSION_NOT_WRITABLE);
            return node;
        }
    } else if (token.type === PM_TOKEN_AMPERSAND_AMPERSAND_EQUAL) {
        return parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, PARSE_COMPOUND_WRITE_AMPAMPEQ);
    } else if (token.type === PM_TOKEN_PIPE_PIPE_EQUAL) {
        return parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, PARSE_COMPOUND_WRITE_PIPEPIPEEQ);
    } else if (PARSE_EXPRESSION_INFIX_OPERATOR_EQUAL.has(token.type)) {
        return parse_compound_write(parser, node, token, previous_binding_power, binding_power, accepts_command_call, depth, PARSE_COMPOUND_WRITE_OPERATOR);
    } else if (token.type === PM_TOKEN_AMPERSAND_AMPERSAND || token.type === PM_TOKEN_KEYWORD_AND) {
        parser_lex(parser);

        const right = parse_expression(parser, binding_power, parser.previous.type === PM_TOKEN_KEYWORD_AND, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_and_node_create(parser, node, token, right);
    } else if (token.type === PM_TOKEN_KEYWORD_OR || token.type === PM_TOKEN_PIPE_PIPE) {
        parser_lex(parser);

        const right = parse_expression(parser, binding_power, parser.previous.type === PM_TOKEN_KEYWORD_OR, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_or_node_create(parser, node, token, right);
    } else if (token.type === PM_TOKEN_EQUAL_TILDE) {
        // Note that we _must_ parse the value before adding the local
        // variables in order to properly mirror the behavior of Ruby. For
        // example,
        //
        //     /(?<foo>bar)/ =~ foo
        //
        // In this case, `foo` should be a method call and not a local yet.
        parser_lex(parser);
        const argument = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);

        // By default, we're going to create a call node and then return it.
        const call = pm_call_node_binary_create(parser, node, token, argument, 0);
        let result = call;

        // If the receiver of this =~ is a regular expression node, then we
        // need to introduce local variables for it based on its named
        // capture groups.
        if (PM_NODE_TYPE_P(node, PM_INTERPOLATED_REGULAR_EXPRESSION_NODE)) {
            // It's possible to have an interpolated regular expression node
            // that only contains strings. This is because it can be split
            // up by a heredoc. In this case we need to concat the unescaped
            // strings together and then parse them as a regular expression.
            const parts = node.parts;

            let interpolated = false;
            let total_length = 0;

            for (let index = 0; index < parts.length; index++) {
                const part = parts[index];
                if (PM_NODE_TYPE_P(part, PM_STRING_NODE)) {
                    total_length += (part.unescaped ? part.unescaped.length : 0);
                } else {
                    interpolated = true;
                    break;
                }
            }

            if (!interpolated && total_length > 0) {
                // UNI-BUILD: unescaped fields are plain strings; join them.
                let memory = "";
                for (let index = 0; index < parts.length; index++) {
                    memory += parts[index].unescaped || "";
                }

                result = parse_regular_expression_named_captures(parser, memory, call, PM_NODE_FLAG_P(node, PM_REGULAR_EXPRESSION_FLAGS_EXTENDED), false, 0);
            }
        } else if (PM_NODE_TYPE_P(node, PM_REGULAR_EXPRESSION_NODE)) {
            // If we have a regular expression node, then we can just parse
            // the named captures directly off the unescaped string.
            const content = node.unescaped;
            // C checks `content->type == PM_STRING_SHARED`; the lexer records
            // the same distinction on the node.
            const shared = node.unescaped_shared === true;
            result = parse_regular_expression_named_captures(parser, content, call, PM_NODE_FLAG_P(node, PM_REGULAR_EXPRESSION_FLAGS_EXTENDED), shared, shared ? node.content_loc.start : 0);
        }

        return result;
    } else if (
        token.type === PM_TOKEN_UAMPERSAND ||
        token.type === PM_TOKEN_USTAR ||
        token.type === PM_TOKEN_USTAR_STAR ||
        // The only times this will occur are when we are in an error state,
        // but we'll put them in here so that errors can propagate.
        token.type === PM_TOKEN_BANG_EQUAL ||
        token.type === PM_TOKEN_BANG_TILDE ||
        token.type === PM_TOKEN_EQUAL_EQUAL ||
        token.type === PM_TOKEN_EQUAL_EQUAL_EQUAL ||
        token.type === PM_TOKEN_LESS_EQUAL_GREATER ||
        token.type === PM_TOKEN_CARET ||
        token.type === PM_TOKEN_PIPE ||
        token.type === PM_TOKEN_AMPERSAND ||
        token.type === PM_TOKEN_GREATER_GREATER ||
        token.type === PM_TOKEN_LESS_LESS ||
        token.type === PM_TOKEN_MINUS ||
        token.type === PM_TOKEN_PLUS ||
        token.type === PM_TOKEN_PERCENT ||
        token.type === PM_TOKEN_SLASH ||
        token.type === PM_TOKEN_STAR ||
        token.type === PM_TOKEN_STAR_STAR
    ) {
        parser_lex(parser);
        const operator = copyToken(parser.previous);
        switch (node.type) {
            case PM_RESCUE_MODIFIER_NODE: {
                if (PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_AND_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_OR_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            default:
                break;
        }

        const argument = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_call_node_binary_create(parser, node, token, argument, 0);
    } else if (token.type === PM_TOKEN_GREATER || token.type === PM_TOKEN_GREATER_EQUAL || token.type === PM_TOKEN_LESS || token.type === PM_TOKEN_LESS_EQUAL) {
        if (PM_NODE_TYPE_P(node, PM_CALL_NODE) && PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_COMPARISON)) {
            PM_PARSER_WARN_TOKEN_FORMAT_CONTENT(parser, parser.current, PM_WARN_COMPARISON_AFTER_COMPARISON);
        }

        parser_lex(parser);
        const argument = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        return pm_call_node_binary_create(parser, node, token, argument, PM_CALL_NODE_FLAGS_COMPARISON);
    } else if (token.type === PM_TOKEN_AMPERSAND_DOT || token.type === PM_TOKEN_DOT) {
        parser_lex(parser);
        const operator = copyToken(parser.previous);
        const arguments_ = {
                    opening_loc: { start: null, end: null },
                    arguments: null,
                    closing_loc: { start: null, end: null },
                    block: null,
                    has_forwarding: false
                };

        // This if statement handles the foo.() syntax.
        if (match1(parser, PM_TOKEN_PARENTHESIS_LEFT)) {
            parse_arguments_list(parser, arguments_, true, false, depth + 1);
            return pm_call_node_shorthand_create(parser, node, operator, arguments_);
        }

        switch (node.type) {
            case PM_RESCUE_MODIFIER_NODE: {
                if (PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.rescue_expression, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_AND_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            case PM_OR_NODE: {
                if (PM_NODE_TYPE_P(node.right, PM_MATCH_PREDICATE_NODE) || PM_NODE_TYPE_P(node.right, PM_MATCH_REQUIRED_NODE)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, operator, PM_ERR_EXPECT_EOL_AFTER_STATEMENT, pm_token_type_human(operator.type));
                }
                break;
            }
            default:
                break;
        }

        let message;

        if (
            PM_CASE_OPERATOR.has(parser.current.type) ||
            PM_CASE_KEYWORD.has(parser.current.type) ||
            parser.current.type === PM_TOKEN_CONSTANT ||
            parser.current.type === PM_TOKEN_IDENTIFIER ||
            parser.current.type === PM_TOKEN_METHOD_NAME
        ) {
            parser_lex(parser);
            message = copyToken(parser.previous);
        } else {
            PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_EXPECT_MESSAGE, pm_token_type_human(parser.current.type));
            message = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
        }

        parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
        const call = pm_call_node_call_create(parser, node, operator, message, arguments_);

        if (
            (previous_binding_power === PM_BINDING_POWER_STATEMENT) &&
            arguments_.arguments === null &&
            arguments_.opening_loc.start === null &&
            match1(parser, PM_TOKEN_COMMA)
        ) {
            return parse_targets_validate(parser, call, PM_BINDING_POWER_INDEX, depth + 1);
        } else {
            return call;
        }
    } else if (token.type === PM_TOKEN_DOT_DOT || token.type === PM_TOKEN_DOT_DOT_DOT) {
        parser_lex(parser);

        let right = null;
        if (token_begins_expression_p(parser.current.type)) {
            right = parse_expression(parser, binding_power, false, false, PM_ERR_EXPECT_EXPRESSION_AFTER_OPERATOR, depth + 1);
        }

        return pm_range_node_create(parser, node, token, right);
    } else if (token.type === PM_TOKEN_KEYWORD_IF_MODIFIER) {
        const keyword = copyToken(parser.current);
        parser_lex(parser);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_IF_PREDICATE, depth + 1);
        return pm_if_node_modifier_create(parser, node, keyword, predicate);
    } else if (token.type === PM_TOKEN_KEYWORD_UNLESS_MODIFIER) {
        const keyword = copyToken(parser.current);
        parser_lex(parser);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_UNLESS_PREDICATE, depth + 1);
        return pm_unless_node_modifier_create(parser, node, keyword, predicate);
    } else if (token.type === PM_TOKEN_KEYWORD_UNTIL_MODIFIER) {
        parser_lex(parser);
        const statements = pm_statements_node_create(parser);
        pm_statements_node_body_append(parser, statements, node, true);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_UNTIL_PREDICATE, depth + 1);
        return pm_until_node_modifier_create(parser, token, predicate, statements, PM_NODE_TYPE_P(node, PM_BEGIN_NODE) ? PM_LOOP_FLAGS_BEGIN_MODIFIER : 0);
    } else if (token.type === PM_TOKEN_KEYWORD_WHILE_MODIFIER) {
        parser_lex(parser);
        const statements = pm_statements_node_create(parser);
        pm_statements_node_body_append(parser, statements, node, true);

        const predicate = parse_value_expression(parser, binding_power, true, false, PM_ERR_CONDITIONAL_WHILE_PREDICATE, depth + 1);
        return pm_while_node_modifier_create(parser, token, predicate, statements, PM_NODE_TYPE_P(node, PM_BEGIN_NODE) ? PM_LOOP_FLAGS_BEGIN_MODIFIER : 0);
    } else if (token.type === PM_TOKEN_QUESTION_MARK) {
        context_push(parser, PM_CONTEXT_TERNARY);
        const current_block_exits = [];
        const previous_block_exits = push_block_exits(parser, current_block_exits);

        const qmark = copyToken(parser.current);
        parser_lex(parser);

        const true_expression = parse_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_TERNARY_EXPRESSION_TRUE, depth + 1);

        if (parser.recovering) {
            // If parsing the true expression of this ternary resulted in a syntax
            // error that we can recover from, then we're going to put missing nodes
            // and tokens into the remaining places. We want to be sure to do this
            // before the `expect` function call to make sure it doesn't
            // accidentally move past a ':' token that occurs after the syntax
            // error.
            const colon = { type: PM_TOKEN_MISSING, start: parser.previous.end, end: parser.previous.end };
            const false_expression = pm_missing_node_create(parser, colon.start, colon.end);

            context_pop(parser);
            pop_block_exits(parser, previous_block_exits);

            return pm_if_node_ternary_create(parser, node, qmark, true_expression, colon, false_expression);
        }

        accept1(parser, PM_TOKEN_NEWLINE);
        expect1(parser, PM_TOKEN_COLON, PM_ERR_TERNARY_COLON);

        const colon = copyToken(parser.previous);
        const false_expression = parse_expression(parser, PM_BINDING_POWER_DEFINED, false, false, PM_ERR_TERNARY_EXPRESSION_FALSE, depth + 1);

        context_pop(parser);
        pop_block_exits(parser, previous_block_exits);

        return pm_if_node_ternary_create(parser, node, qmark, true_expression, colon, false_expression);
    } else if (token.type === PM_TOKEN_COLON_COLON) {
        parser_lex(parser);
        const delimiter = copyToken(parser.previous);

        if (parser.current.type === PM_TOKEN_CONSTANT) {
            parser_lex(parser);
            let path;

            if (
                (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) ||
                (accepts_command_call && (token_begins_expression_p(parser.current.type) || match3(parser, PM_TOKEN_UAMPERSAND, PM_TOKEN_USTAR, PM_TOKEN_USTAR_STAR)))
            ) {
                // If we have a constant immediately following a '::' operator, then
                // this can either be a constant path or a method call, depending on
                // what follows the constant.
                //
                // If we have parentheses, then this is a method call. That would
                // look like Foo::Bar().
                const message = copyToken(parser.previous);
                const arguments_ = {
                    opening_loc: { start: null, end: null },
                    arguments: null,
                    closing_loc: { start: null, end: null },
                    block: null,
                    has_forwarding: false
                };

                parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
                path = pm_call_node_call_create(parser, node, delimiter, message, arguments_);
            } else {
                // Otherwise, this is a constant path. That would look like Foo::Bar.
                path = pm_constant_path_node_create(parser, node, delimiter, parser.previous);
            }

            // If this is followed by a comma then it is a multiple assignment.
            if (previous_binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                return parse_targets_validate(parser, path, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return path;
        } else if (
            PM_CASE_OPERATOR.has(parser.current.type) ||
            PM_CASE_KEYWORD.has(parser.current.type) ||
            parser.current.type === PM_TOKEN_IDENTIFIER ||
            parser.current.type === PM_TOKEN_METHOD_NAME
        ) {
            parser_lex(parser);
            const message = copyToken(parser.previous);

            // If we have an identifier following a '::' operator, then it is for
            // sure a method call.
            const arguments_ = {
                    opening_loc: { start: null, end: null },
                    arguments: null,
                    closing_loc: { start: null, end: null },
                    block: null,
                    has_forwarding: false
                };
            parse_arguments_list(parser, arguments_, true, accepts_command_call, depth + 1);
            const call = pm_call_node_call_create(parser, node, delimiter, message, arguments_);

            // If this is followed by a comma then it is a multiple assignment.
            if (previous_binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
                return parse_targets_validate(parser, call, PM_BINDING_POWER_INDEX, depth + 1);
            }

            return call;
        } else if (parser.current.type === PM_TOKEN_PARENTHESIS_LEFT) {
            // If we have a parenthesis following a '::' operator, then it is the
            // method call shorthand. That would look like Foo::(bar).
            const arguments_ = {
                    opening_loc: { start: null, end: null },
                    arguments: null,
                    closing_loc: { start: null, end: null },
                    block: null,
                    has_forwarding: false
                };
            parse_arguments_list(parser, arguments_, true, false, depth + 1);

            return pm_call_node_shorthand_create(parser, node, delimiter, arguments_);
        } else {
            expect1(parser, PM_TOKEN_CONSTANT, PM_ERR_CONSTANT_PATH_COLON_COLON_CONSTANT);
            return pm_constant_path_node_create(parser, node, delimiter, parser.previous);
        }
    } else if (token.type === PM_TOKEN_KEYWORD_RESCUE_MODIFIER) {
        context_push(parser, PM_CONTEXT_RESCUE_MODIFIER);
        parser_lex(parser);
        accept1(parser, PM_TOKEN_NEWLINE);

        const value = parse_expression(parser, binding_power, true, false, PM_ERR_RESCUE_MODIFIER_VALUE, depth + 1);
        context_pop(parser);

        return pm_rescue_modifier_node_create(parser, node, token, value);
    } else if (token.type === PM_TOKEN_BRACKET_LEFT) {
        parser_lex(parser);

        const arguments_ = {
                    opening_loc: { start: null, end: null },
                    arguments: null,
                    closing_loc: { start: null, end: null },
                    block: null,
                    has_forwarding: false
                };
        arguments_.opening_loc = { start: parser.previous.start, end: parser.previous.end };

        if (!accept1(parser, PM_TOKEN_BRACKET_RIGHT)) {
            pm_accepts_block_stack_push(parser, true);
            parse_arguments(parser, arguments_, false, PM_TOKEN_BRACKET_RIGHT, depth + 1);
            pm_accepts_block_stack_pop(parser);
            expect1(parser, PM_TOKEN_BRACKET_RIGHT, PM_ERR_EXPECT_RBRACKET);
        }

        arguments_.closing_loc = { start: parser.previous.start, end: parser.previous.end };

        // If we have a comma after the closing bracket then this is a multiple
        // assignment and we should parse the targets.
        if (previous_binding_power === PM_BINDING_POWER_STATEMENT && match1(parser, PM_TOKEN_COMMA)) {
            const aref = pm_call_node_aref_create(parser, node, arguments_);
            return parse_targets_validate(parser, aref, PM_BINDING_POWER_INDEX, depth + 1);
        }

        // If we're at the end of the arguments, we can now check if there is a
        // block node that starts with a {. If there is, then we can parse it and
        // add it to the arguments.
        let block = null;
        if (accept1(parser, PM_TOKEN_BRACE_LEFT)) {
            block = parse_block(parser, depth + 1);
            pm_arguments_validate_block(parser, arguments_, block);
        } else if (pm_accepts_block_stack_p(parser) && accept1(parser, PM_TOKEN_KEYWORD_DO)) {
            block = parse_block(parser, depth + 1);
        }

        if (block !== null) {
            if (arguments_.block !== null) {
                pm_parser_err_node(parser, block, PM_ERR_ARGUMENT_AFTER_BLOCK);
                if (arguments_.arguments === null) {
                    arguments_.arguments = pm_arguments_node_create(parser);
                }
                pm_arguments_node_arguments_append(arguments_.arguments, arguments_.block);
            }

            arguments_.block = block;
        }

        return pm_call_node_aref_create(parser, node, arguments_);
    } else if (token.type === PM_TOKEN_KEYWORD_IN) {
        const previous_pattern_matching_newlines = parser.pattern_matching_newlines;
        parser.pattern_matching_newlines = true;

        const operator = copyToken(parser.current);
        parser.command_start = false;
        lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
        parser_lex(parser);

        const captures = [];
        const pattern = parse_pattern(parser, captures, PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_IN, depth + 1);

        parser.pattern_matching_newlines = previous_pattern_matching_newlines;

        return pm_match_predicate_node_create(parser, node, pattern, operator);
    } else if (token.type === PM_TOKEN_EQUAL_GREATER) {
        const previous_pattern_matching_newlines = parser.pattern_matching_newlines;
        parser.pattern_matching_newlines = true;

        const operator = copyToken(parser.current);
        parser.command_start = false;
        lex_state_set(parser, PM_LEX_STATE_BEG | PM_LEX_STATE_LABEL);
        parser_lex(parser);

        const captures = [];
        const pattern = parse_pattern(parser, captures, PM_PARSE_PATTERN_TOP | PM_PARSE_PATTERN_MULTI, PM_ERR_PATTERN_EXPRESSION_AFTER_HROCKET, depth + 1);

        parser.pattern_matching_newlines = previous_pattern_matching_newlines;

        return pm_match_required_node_create(parser, node, pattern, operator);
    } else {
        // assert(false && "unreachable") in C; debug-only.
        return null;
    }
}

/**
 * Determine if a given call node looks like a "command", which means it has
 * arguments but does not have parentheses. (prism.c:21565)
 */
function pm_call_node_command_p(node) {
    return (
        (node.opening_loc.start === null) &&
        (node.block === null || PM_NODE_TYPE_P(node.block, PM_BLOCK_ARGUMENT_NODE)) &&
        (node.arguments !== null || node.block !== null)
    );
}

/**
 * Parse an expression at the given point of the parser using the given binding
 * power to parse subsequent chains. If this function finds a syntax error, it
 * will append the error message to the parser's error list.
 *
 * Consumers of this function should always check parser->recovering to
 * determine if they need to perform additional cleanup. (prism.c:21582)
 */
function parse_expression(parser, binding_power, accepts_command_call, accepts_label, diag_id, depth) {
    if (depth >= PRISM_DEPTH_MAXIMUM) {
        pm_parser_err_current(parser, PM_ERR_NESTING_TOO_DEEP);
        return pm_missing_node_create(parser, parser.current.start, parser.current.end);
    }

    let node = parse_expression_prefix(parser, binding_power, accepts_command_call, accepts_label, diag_id, depth);

    switch (node.type) {
        case PM_MISSING_NODE:
            // If we found a syntax error, then the type of node returned by
            // parse_expression_prefix is going to be a missing node.
            return node;
        case PM_PRE_EXECUTION_NODE:
        case PM_POST_EXECUTION_NODE:
        case PM_ALIAS_GLOBAL_VARIABLE_NODE:
        case PM_ALIAS_METHOD_NODE:
        case PM_MULTI_WRITE_NODE:
        case PM_UNDEF_NODE:
            // These expressions are statements, and cannot be followed by
            // operators (except modifiers).
            if (pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                return node;
            }
            break;
        case PM_CALL_NODE:
            // If we have a call node, then we need to check if it looks like a
            // method call without parentheses that contains arguments. If it
            // does, then it has different rules for parsing infix operators,
            // namely that it only accepts composition (and/or) and modifiers
            // (if/unless/etc.).
            if ((pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_COMPOSITION) && pm_call_node_command_p(node)) {
                return node;
            }
            break;
        case PM_SYMBOL_NODE:
            // If we have a symbol node that is being parsed as a label, then we
            // need to immediately return, because there should never be an
            // infix operator following this node.
            if (pm_symbol_node_label_p(parser, node)) {
                return node;
            }
            break;
        default:
            break;
    }

    // Otherwise we'll look and see if the next token can be parsed as an infix
    // operator. If it can, then we'll parse it using parse_expression_infix.
    let current_binding_powers;
    let current_token_type;

    while (
        (
            current_token_type = parser.current.type,
            current_binding_powers = pm_binding_powers[current_token_type],
            binding_power <= current_binding_powers.left &&
            current_binding_powers.binary
        )
     ) {
        node = parse_expression_infix(parser, node, binding_power, current_binding_powers.right, accepts_command_call, depth + 1);

        if (context_terminator(parser.current_context.context, parser.current)) {
            // If this token terminates the current context, then we need to
            // stop parsing the expression, as it has become a statement.
            return node;
        }

        switch (node.type) {
            case PM_MULTI_WRITE_NODE:
                // Multi-write nodes are statements, and cannot be followed by
                // operators except modifiers.
                if (pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                    return node;
                }
                break;
            case PM_CLASS_VARIABLE_WRITE_NODE:
            case PM_CONSTANT_PATH_WRITE_NODE:
            case PM_CONSTANT_WRITE_NODE:
            case PM_GLOBAL_VARIABLE_WRITE_NODE:
            case PM_INSTANCE_VARIABLE_WRITE_NODE:
            case PM_LOCAL_VARIABLE_WRITE_NODE:
                // These expressions are statements, by virtue of the right-hand
                // side of their write being an implicit array.
                if (PM_NODE_FLAG_P(node, PM_WRITE_NODE_FLAGS_IMPLICIT_ARRAY) && pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                    return node;
                }
                break;
            case PM_CALL_NODE:
                // These expressions are also statements, by virtue of the
                // right-hand side of the expression (i.e., the last argument to
                // the call node) being an implicit array.
                if (PM_NODE_FLAG_P(node, PM_CALL_NODE_FLAGS_IMPLICIT_ARRAY) && pm_binding_powers[parser.current.type].left > PM_BINDING_POWER_MODIFIER) {
                    return node;
                }
                break;
            default:
                break;
        }

        // If the operator is nonassoc and we should not be able to parse the
        // upcoming infix operator, break.
        if (current_binding_powers.nonassoc) {
            // If this is a non-assoc operator and we are about to parse the
            // exact same operator, then we need to add an error.
            if (match1(parser, current_token_type)) {
                PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_NON_ASSOCIATIVE_OPERATOR, pm_token_type_human(parser.current.type), pm_token_type_human(current_token_type));
                break;
            }

            // If this is an endless range, then we need to reject a couple of
            // additional operators because it violates the normal operator
            // precedence rules. Those patterns are:
            //
            //     1.. & 2
            //     1.. * 2
            //
            if (PM_NODE_TYPE_P(node, PM_RANGE_NODE) && node.right === null) {
                if (match4(parser, PM_TOKEN_UAMPERSAND, PM_TOKEN_USTAR, PM_TOKEN_DOT, PM_TOKEN_AMPERSAND_DOT)) {
                    PM_PARSER_ERR_TOKEN_FORMAT(parser, parser.current, PM_ERR_NON_ASSOCIATIVE_OPERATOR, pm_token_type_human(parser.current.type), pm_token_type_human(current_token_type));
                    break;
                }

                if (PM_BINDING_POWER_TERM <= pm_binding_powers[parser.current.type].left) {
                    break;
                }
            } else if (current_binding_powers.left <= pm_binding_powers[parser.current.type].left) {
                break;
            }
        }

        if (accepts_command_call) {
            // A command-style method call is only accepted on method chains.
            // Thus, we check whether the parsed node can continue method chains.
            // The method chain can continue if the parsed node is one of the following five kinds:
            // (1) index access: foo[1]
            // (2) attribute access: foo.bar
            // (3) method call with parenthesis: foo.bar(1)
            // (4) method call with a block: foo.bar do end
            // (5) constant path: foo::Bar
            switch (node.type) {
                case PM_CALL_NODE: {
                    if (
                        // (1) foo[1]
                        !(
                            node.call_operator_loc.start === null &&
                            node.message_loc.start !== null &&
                            (parser.source.charCodeAt(node.message_loc.start)) === 91 /* '[' */ &&
                            (parser.source.charCodeAt(node.message_loc.end - 1)) === 93 /* ']' */
                        ) &&
                        // (2) foo.bar
                        !(
                            node.call_operator_loc.start !== null &&
                            node.arguments === null &&
                            node.block === null &&
                            node.opening_loc.start === null
                        ) &&
                        // (3) foo.bar(1)
                        !(
                            node.call_operator_loc.start !== null &&
                            node.opening_loc.start !== null
                        ) &&
                        // (4) foo.bar do end
                        !(
                            node.block !== null && PM_NODE_TYPE_P(node.block, PM_BLOCK_NODE)
                        )
                     ) {
                        accepts_command_call = false;
                    }
                    break;
                }
                // (5) foo::Bar
                case PM_CONSTANT_PATH_NODE:
                    break;
                default:
                    accepts_command_call = false;
                    break;
            }
        }
    }

    return node;
}

/**
 * ruby -p, ruby -n, ruby -a, and ruby -l options will mutate the AST. We
 * perform that mutation here. (prism.c:21770)
 */
function wrap_statements(parser, statements) {
    if (PM_PARSER_COMMAND_LINE_OPTION_P(parser)) {
        if (statements === null) {
            statements = pm_statements_node_create(parser);
        }

        const arguments_ = pm_arguments_node_create(parser);
        pm_arguments_node_arguments_append(
            arguments_,
            pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$_", 2))
        );

        pm_statements_node_body_append(parser, statements, pm_call_node_fcall_synthesized_create(
            parser,
            arguments_,
            pm_parser_constant_id_constant(parser, "print", 5)
        ), true);
    }

    if (PM_PARSER_COMMAND_LINE_OPTION_N(parser)) {
        if (PM_PARSER_COMMAND_LINE_OPTION_A(parser)) {
            if (statements === null) {
                statements = pm_statements_node_create(parser);
            }

            const arguments_ = pm_arguments_node_create(parser);
            pm_arguments_node_arguments_append(
                arguments_,
                pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$;", 2))
            );

            const receiver = pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$_", 2));
            const call = pm_call_node_call_synthesized_create(parser, receiver, "split", arguments_);

            const write = pm_global_variable_write_node_synthesized_create(
                parser,
                pm_parser_constant_id_constant(parser, "$F", 2),
                call
            );

            pm_statements_node_body_prepend(statements, write);
        }

        const arguments_ = pm_arguments_node_create(parser);
        pm_arguments_node_arguments_append(
            arguments_,
            pm_global_variable_read_node_synthesized_create(parser, pm_parser_constant_id_constant(parser, "$/", 2))
        );

        if (PM_PARSER_COMMAND_LINE_OPTION_L(parser)) {
            const keywords = pm_keyword_hash_node_create(parser);
            pm_keyword_hash_node_elements_append(keywords, pm_assoc_node_create(
                parser,
                pm_symbol_node_synthesized_create(parser, "chomp"),
                { type: PM_TOKEN_NOT_PROVIDED, start: parser.start, end: parser.start },
                pm_true_node_synthesized_create(parser)
            ));

            pm_arguments_node_arguments_append(arguments_, keywords);
            pm_node_flag_set(arguments_, PM_ARGUMENTS_NODE_FLAGS_CONTAINS_KEYWORDS);
        }

        const wrapped_statements = pm_statements_node_create(parser);
        pm_statements_node_body_append(parser, wrapped_statements, pm_while_node_synthesized_create(
            parser,
            pm_call_node_fcall_synthesized_create(parser, arguments_, pm_parser_constant_id_constant(parser, "gets", 4)),
            statements
        ), true);

        statements = wrapped_statements;
    }

    return statements;
}

/**
 * Parse the top-level program node. (prism.c:21849)
 */
function parse_program(parser) {
    // If the current scope is NULL, then we want to push a new top level scope.
    // The current scope could exist in the event that we are parsing an eval
    // and the user has passed into scopes that already exist.
    if (parser.current_scope === null) {
        pm_parser_scope_push(parser, true);
    }

    const current_block_exits = [];
    const previous_block_exits = push_block_exits(parser, current_block_exits);

    parser_lex(parser);
    let statements = parse_statements(parser, PM_CONTEXT_MAIN, 0);

    if (statements !== null && !parser.parsing_eval) {
        // If we have statements, then the top-level statement should be
        // explicitly checked as well. We have to do this here because
        // everywhere else we check all but the last statement.
        pm_void_statement_check(parser, statements.body[statements.body.length - 1]);
    }

    const locals = pm_locals_order(parser, parser.current_scope.locals, true);
    pm_parser_scope_pop(parser);

    // At the top level, see if we need to wrap the statements in a program
    // node with a while loop based on the options.
    if (parser.command_line & (PM_OPTIONS_COMMAND_LINE_P | PM_OPTIONS_COMMAND_LINE_N)) {
        statements = wrap_statements(parser, statements);
    } else {
        flush_block_exits(parser, previous_block_exits);
    }


    // If this is an empty file, then we're still going to parse all of the
    // statements in order to gather up all of the comments and such. Here we'll
    // correct the location information.
    if (statements === null) {
        statements = pm_statements_node_create(parser);
        pm_statements_node_location_set(statements, parser.start, parser.start);
    }

    return pm_program_node_create(parser, locals, statements);
}

/******************************************************************************/
/* External functions                                                         */
/******************************************************************************/

/**
 * A vendored version of strnstr that is used to find a substring within a
 * string with a given length. This function is used to search for the Ruby
 * engine name within a shebang when the -x option is passed to Ruby.
 *
 * The only modification that we made here is that we don't do NULL byte checks
 * because we know the little parameter will not have a NULL byte and we allow
 * the big parameter to have them.
 *
 * Adaptation: `big` is the buffer and `big_start` the offset the search starts
 * at (C passed a pointer into parser.source). Returns the offset of the match
 * or -1 for NULL. (prism.c:21910)
 */
function pm_strnstr(big, big_start, little, big_length) {
    // The first occurrence of `little` at or after `big_start` counts only if
    // it ends within the window; later occurrences end further right, so one
    // indexOf probes the whole space.
    const index = big.indexOf(little, big_start);
    return (index !== -1 && index + little.length <= big_start + big_length) ? index : -1;
}

/**
 * Potentially warn the user if the shebang that has been found to include
 * "ruby" has a carriage return at the end, as that can cause problems on some
 * platforms.
 *
 * (The _WIN32 variant of this macro is a no-op in C; this port follows the
 * POSIX version.) (prism.c:21929)
 */
function pm_parser_warn_shebang_carriage_return(parser, start, length) {
    if (length > 2 && parser.source[start + length - 2] === '\r' && parser.source[start + length - 1] === '\n') {
        pm_parser_warn(parser, start, start + length, PM_WARN_SHEBANG_CARRIAGE_RETURN);
    }
}

// Copy of part3's parser_lex_magic_comment_encoding_value with an explicit
// buffer: option encodings are standalone pm_string_t buffers whose bytes are
// not offsets into parser.source. Logic is identical.
function pm_parser_init_set_encoding_value(parser, encoding_source, encoding_length) {
    const encoding = pm_encoding_find(encoding_source, 0, encoding_length);

    if (encoding !== null) {
        if (parser.encoding !== encoding) {
            parser.encoding = encoding;
        }

        // UNI-BUILD: see parser_lex_magic_comment_encoding_value.
        const declared = String(encoding_source).slice(0, encoding_length);
        parser.source_encoding_family = pm_encoding_family(declared);
        parser.encoding_comment_name = pm_encoding_canonical_name(declared) ?? parser.encoding_comment_name;

        return true;
    }

    return false;
}

/**
 * Process the shebang when initializing the parser. This function assumes that
 * the shebang_callback option has already been checked for nullability.
 *
 * Adaptation: `engine` is an offset into parser.source; the callback receives
 * (next_options, start_offset, length, data). (prism.c:21941)
 */
function pm_parser_init_shebang(parser, options, engine, length) {
    const switches = pm_strnstr(parser.source, engine, " -", length);
    if (switches === -1) return;

    // pm_options_t next_options = *options; (struct copy in C; shallow is
    // correct here — the port's option fields are strings/numbers)
    const next_options = { ...options };
    options.shebang_callback(
        next_options,
        switches + 1,
        length - (switches - engine) - 1,
        options.shebang_callback_data
    );

    const encoding_source = next_options.encoding || "";
    if (encoding_source.length > 0) {
        pm_parser_init_set_encoding_value(parser, encoding_source, encoding_source.length);
    }

    parser.command_line = next_options.command_line;
    parser.frozen_string_literal = next_options.frozen_string_literal;
}

/**
 * Initialize a parser with the given start and end pointers.
 *
 * Adaptation: `source` is the Uint8Array of the whole input, stored as
 * parser.source; parser.start is 0 and parser.end is size. (prism.c:21967)
 */
function pm_parser_init(parser, source, size, options) {
    // *parser = (pm_parser_t) { ... }; (field-by-field in C declaration/init order)
    parser.node_id = 0;
    parser.lex_state = PM_LEX_STATE_BEG;
    parser.enclosure_nesting = 0;
    parser.lambda_enclosure_nesting = -1;
    parser.brace_nesting = 0;
    parser.do_loop_stack = 0;
    parser.accepts_block_stack = 0;
    const initial_lex_mode = { mode: PM_LEX_DEFAULT, as: {} };
    parser.lex_modes = { stack: [initial_lex_mode], current: initial_lex_mode };
    parser.source = source; // extra field per conventions: the whole input
    parser.start = 0;
    parser.end = size;
    parser.previous = { type: PM_TOKEN_EOF, start: 0, end: 0 };
    parser.current = { type: PM_TOKEN_EOF, start: 0, end: 0 };
    parser.next_start = null;
    parser.heredoc_end = null;
    parser.data_loc = { start: null, end: null };
    parser.comment_list = [];
    parser.magic_comment_list = [];
    parser.warning_list = [];
    parser.error_list = [];
    parser.current_scope = null;
    parser.current_context = null;
    parser.current_hash_keys = null;
    parser.encoding = PM_ENCODING_UTF_8_ENTRY;
    // UNI-BUILD: the encoding model is collapsed - `parser.encoding` is one
    // shared entry regardless of the source's declared encoding. A few
    // spots still need to know the *family* of that declared encoding
    // (whether a `\xNN` byte escape forces a string/symbol/regexp to UTF-8,
    // ASCII-8BIT, or its own encoding depends on it - see
    // parse_unescaped_encoding / parse_symbol_encoding). Track just that
    // here: "utf8" | "us-ascii" | "other", defaulting to UTF-8.
    parser.source_encoding_family = "utf8";
    // UNI-BUILD: the canonical name of the source's declared encoding (magic
    // comment or `encoding:` option), for the potch bridge to report as
    // Prism::Result#encoding. Mirrors the real library serializing
    // parser->encoding->name. Defaults to UTF-8.
    parser.encoding_comment_name = "UTF-8";
    parser.encoding_comment_start = 0;
    parser.lex_callback = null;
    parser.filepath = "";
    parser.constant_pool = {};
    parser.newline_list = {};
    parser.integer_base = 0;
    // A FRESH empty string object here (C copies the PM_STRING_EMPTY struct
    // value); do not alias the shared singleton that part2/part3 rebind.
    parser.current_string = "";
    parser.current_string_shared = true;
    parser.start_line = 1;
    parser.explicit_encoding = null;
    parser.version = PM_OPTIONS_VERSION_UNSET; // zero-initialized in C
    parser.command_line = 0;
    parser.parsing_eval = false;
    parser.partial_script = false;
    parser.command_start = true;
    parser.recovering = false;
    parser.encoding_locked = false;
    parser.pattern_matching_newlines = false;
    parser.in_keyword_arg = false;
    parser.current_block_exits = null;
    parser.semantic_token_seen = false;
    parser.frozen_string_literal = PM_OPTIONS_FROZEN_STRING_LITERAL_UNSET;
    parser.current_regular_expression_ascii_only = false;
    parser.warn_mismatched_indentation = true;

    // Initialize the constant pool. We're going to completely guess as to the
    // number of constants that we'll need based on the size of the input. The
    // ratio we chose here is actually less arbitrary than you might think.
    //
    // We took ~50K Ruby files and measured the size of the file versus the
    // number of constants that were found in those files. Then we found the
    // average and standard deviation of the ratios of constants/bytesize. Then
    // we added 1.34 standard deviations to the average to get a ratio that
    // would fit 75% of the files (for a two-tailed distribution). This works
    // because there was about a 0.77 correlation and the distribution was
    // roughly normal.
    //
    // This ratio will need to change if we add more constants to the constant
    // pool for another node type.
    const constant_size = (size / 95) | 0;
    pm_constant_pool_init(parser.constant_pool, constant_size < 4 ? 4 : constant_size);

    // Initialize the newline list. Similar to the constant pool, we're going to
    // guess at the number of newlines that we'll need based on the size of the
    // input.
    const newline_size = (size / 22) | 0;
    pm_newline_list_init(parser.newline_list, 0, newline_size < 4 ? 4 : newline_size);

    // If options were provided to this parse, establish them here.
    if (options !== null) {
        // filepath option — keep as a plain JS string in this port. C does
        // a pm_string_t struct copy here; in JS it is just a string, so a
        // missing/non-string filepath means "no filepath", i.e. "" (the
        // default set above) rather than `{...undefined}` === `{}`, which
        // would later stringify to the literal "[object Object]".
        parser.filepath = typeof options.filepath === "string" ? options.filepath : parser.filepath;

        // line option
        if (options.line !== undefined) parser.start_line = options.line;

        // encoding option
        const encoding_source = options.encoding || "";
        if (encoding_source.length > 0) {
            pm_parser_init_set_encoding_value(parser, encoding_source, encoding_source.length);
        }

        // In C `options` is a fully zero-initialized struct, so every field
        // always holds a valid value; a JS `options` object can be partial
        // (e.g. cmd.js builds one with only the fields the caller supplied),
        // so coalesce each missing field back to the parser default set
        // above rather than overwriting it with `undefined` - notably,
        // `parser.version = undefined` makes every `parser.version >= X`
        // check silently false and skips the UNSET->LATEST promotion below.

        // encoding_locked option
        parser.encoding_locked = options.encoding_locked ?? parser.encoding_locked;

        // frozen_string_literal option
        parser.frozen_string_literal = options.frozen_string_literal ?? parser.frozen_string_literal;

        // command_line option
        parser.command_line = options.command_line ?? parser.command_line;

        // version option
        parser.version = options.version ?? parser.version;

        // partial_script
        parser.partial_script = options.partial_script ?? parser.partial_script;

        // scopes option
        parser.parsing_eval = options.scopes_count > 0;
        if (parser.parsing_eval) parser.warn_mismatched_indentation = false;

        for (let scope_index = 0; scope_index < options.scopes_count; scope_index++) {
            const scope = pm_options_scope_get(options, scope_index);
            pm_parser_scope_push(parser, scope_index === 0);

            // Scopes given from the outside are not allowed to have numbered
            // parameters.
            parser.current_scope.parameters = scope.forwarding | PM_SCOPE_PARAMETERS_IMPLICIT_DISALLOWED;

            for (let local_index = 0; local_index < scope.locals_count; local_index++) {
                const local = pm_options_scope_local_get(scope, local_index);

                const local_text = local || "";
                pm_parser_local_add_owned(parser, local_text, local_text.length);
            }
        }
    }

    // Now that we have established the user-provided options, check if
    // a version was given and parse as the latest version otherwise.
    if (parser.version === PM_OPTIONS_VERSION_UNSET) {
        parser.version = PM_OPTIONS_VERSION_LATEST;
    }

    pm_accepts_block_stack_push(parser, true);

    // Skip past the UTF-8 BOM if it exists.
    // UNI-BUILD: the C check reads the three UTF-8 bytes of the BOM; here the
    // BOM is a single code unit (U+FEFF), so detection uses startsWith and the
    // skip is one unit wide.
    if (source.startsWith("\uFEFF")) {
        parser.current.end += 1;
        parser.encoding_comment_start += 1;

        // UNI-BUILD: C re-points the encoding at UTF-8 when the BOM is found
        // and the encoding differs; the encoding is always the UTF-8-emulating
        // entry here, so there is nothing to change.
    }

    // If the -x command line flag is set, or the first shebang of the file does
    // not include "ruby", then we'll search for a shebang that does include
    // "ruby" and start parsing from there.
    let search_shebang = PM_PARSER_COMMAND_LINE_OPTION_X(parser);

    // If the first two bytes of the source are a shebang, then we will do a bit
    // of extra processing.
    //
    // First, we'll indicate that the encoding comment is at the end of the
    // shebang. This means that when a shebang is present the encoding comment
    // can begin on the second line.
    //
    // Second, we will check if the shebang includes "ruby". If it does, then we
    // we will start parsing from there. We will also potentially warning the
    // user if there is a carriage return at the end of the shebang. We will
    // also potentially call the shebang callback if this is the main script to
    // allow the caller to parse the shebang and find any command-line options.
    // If the shebang does not include "ruby" and this is the main script being
    // parsed, then we will start searching the file for a shebang that does
    // contain "ruby" as if -x were passed on the command line.
    let newline = next_newline(source, parser.current.end, parser.end - parser.current.end);
    const length = (newline !== -1 ? newline : parser.end) - parser.current.end;

    if (length > 2 && parser.source[parser.current.end] === '#' && parser.source[parser.current.end + 1] === '!') {
        let engine;

        if ((engine = pm_strnstr(parser.source, 0, "ruby", length)) !== -1) {
            if (newline !== -1) {
                parser.encoding_comment_start = newline + 1;

                if (options === null || options.main_script) {
                    pm_parser_warn_shebang_carriage_return(parser, 0, length + 1);
                }
            }

            if (options !== null && options.main_script && options.shebang_callback !== undefined && options.shebang_callback !== null) {
                pm_parser_init_shebang(parser, options, engine, length - engine);
            }

            search_shebang = false;
        } else if (options !== null && options.main_script && !parser.parsing_eval) {
            search_shebang = true;
        }
    }

    // Here we're going to find the first shebang that includes "ruby" and start
    // parsing from there.
    if (search_shebang) {
        // If a shebang that includes "ruby" is not found, then we're going to a
        // a load error to the list of errors on the parser.
        let found_shebang = false;

        // This is going to point to the start of each line as we check it.
        // We'll maintain a moving window looking at each line at they come.
        let cursor = parser.start;

        // The newline pointer points to the end of the current line that we're
        // considering. If it is NULL, then we're at the end of the file.
        newline = next_newline(source, cursor, parser.end - cursor);

        while (newline !== -1) {
            pm_newline_list_append(parser.newline_list, newline);

            cursor = newline + 1;
            newline = next_newline(source, cursor, parser.end - cursor);

            const line_length = (newline !== -1 ? newline : parser.end) - cursor;
            if (line_length > 2 && parser.source[cursor] === '#' && parser.source[cursor + 1] === '!') {
                let engine;
                if ((engine = pm_strnstr(parser.source, cursor, "ruby", line_length)) !== -1) {
                    found_shebang = true;

                    if (newline !== -1) {
                        pm_parser_warn_shebang_carriage_return(parser, cursor, line_length + 1);
                        parser.encoding_comment_start = newline + 1;
                    }

                    if (options !== null && options.shebang_callback !== undefined && options.shebang_callback !== null) {
                        pm_parser_init_shebang(parser, options, engine, line_length - (engine - cursor));
                    }

                    break;
                }
            }
        }

        if (found_shebang) {
            parser.previous = { type: PM_TOKEN_EOF, start: cursor, end: cursor };
            parser.current = { type: PM_TOKEN_EOF, start: cursor, end: cursor };
        } else {
            pm_parser_err(parser, parser.start, parser.start, PM_ERR_SCRIPT_NOT_FOUND);
            pm_newline_list_clear(parser.newline_list);
        }
    }

    // The encoding comment can start after any amount of inline whitespace, so
    // here we'll advance it to the first non-inline-whitespace character so
    // that it is ready for future comparisons.
    // parser->encoding_comment_start += pm_strspn_inline_whitespace(...)
    parser.encoding_comment_start += pm_strspn_inline_whitespace(parser.source, parser.encoding_comment_start, parser.end - parser.encoding_comment_start);
}

/**
 * Register a callback that will be called whenever prism changes the encoding
 * it is using to parse based on the magic comment. (prism.c:22228)
 */
function pm_parser_register_encoding_changed_callback(parser, callback) {
    parser.encoding_changed_callback = callback;
}

/**
 * Parse the Ruby source associated with the given parser and return the tree.
 * (prism.c:22292)
 */
function pm_parse(parser) {
    return parse_program(parser);
}

// ---------------------------------------------------------------------------
// Restored public query/success APIs (lost in an earlier over-consumption)
// ---------------------------------------------------------------------------


// The category of slice returned from pm_slice_type. (prism.c:22523 enum —
// these were lost when the query APIs were restored; only the functions came
// back.)
const PM_SLICE_TYPE_ERROR = -1;
const PM_SLICE_TYPE_NONE = 0;
const PM_SLICE_TYPE_LOCAL = 1;
const PM_SLICE_TYPE_CONSTANT = 2;
const PM_SLICE_TYPE_METHOD_NAME = 3;



function pm_slice_type(source, length, encoding_name) {
    // first, get the right encoding object
    // UNI-BUILD: pm_encoding_find ignores its arguments and returns the single
    // UTF-8-emulating entry, so the C byte-encoding of the name is unnecessary.
    const encoding = pm_encoding_find(encoding_name, 0, encoding_name.length);
    if (encoding === null) return PM_SLICE_TYPE_ERROR;

    // check that there is at least one character
    if (length === 0) return PM_SLICE_TYPE_NONE;

    const end = length;
    let width;
    let offset = 0;

    if ((width = encoding.alpha_char(source, offset, length)) !== 0) {
        // valid because alphabetical
    } else if (source[offset] === '_') {
        // valid because underscore
        width = 1;
    } else if (((source.charCodeAt(offset) || 0) >= 0x80) && ((width = encoding.char_width(source, offset, length)) > 0)) {
        // valid because multibyte
    } else {
        // invalid because no match
        return PM_SLICE_TYPE_NONE;
    }

    // determine the type of the slice based on the first character
    let result = encoding.isupper_char(source, 0, end) ? PM_SLICE_TYPE_CONSTANT : PM_SLICE_TYPE_LOCAL;

    // next, iterate through all of the bytes of the string to ensure that they
    // are all valid identifier characters
    offset += width;

    while (offset < end) {
        if ((width = encoding.alnum_char(source, offset, end - offset)) !== 0) {
            // valid because alphanumeric
            offset += width;
        } else if (source[offset] === '_') {
            // valid because underscore
            offset++;
        } else if (((source.charCodeAt(offset) || 0) >= 0x80) && ((width = encoding.char_width(source, offset, end - offset)) > 0)) {
            // valid because multibyte
            offset += width;
        } else {
            // invalid because no match
            break;
        }
    }

    // accept a ! or ? at the end of the slice as a method name
    // (in C this reads the byte at source[end] when the whole slice was
    // consumed, i.e. the caller's terminator; an out-of-bounds read in JS
    // yields undefined, which compares false like a NUL terminator)
    if ((source[offset] === '!') || (source[offset] === '?') || (source[offset] === '=')) {
        offset++;
        result = PM_SLICE_TYPE_METHOD_NAME;
    }

    // valid if we are at the end of the slice
    return offset === end ? result : PM_SLICE_TYPE_NONE;
}

/**
 * Check that the slice is a valid local variable name. (prism.c:22603)
 */


/**
 * Check that the slice is a valid constant name. (prism.c:22623)
 */


// #define B(p)
function pm_string_query_method_name_b(p) {
    return p ? PM_STRING_QUERY_TRUE : PM_STRING_QUERY_FALSE;
}

// #define C1(c): (*source == c)
// C compares the first `length` code units against fixed operator spellings
// (memcmp macros); in JS the same checks are set/some lookups.
const PM_UNARY_METHOD_CHARS = new Set(["&", "`", "!", "^", ">", "<", "-", "%", "|", "+", "/", "*", "~"]);
const PM_BINARY_METHOD_NAMES = ["!=", "!~", "[]", "==", "=~", ">=", ">>", "<=", "<<", "**"];
const PM_TERNARY_METHOD_NAMES = ["===", "<=>", "[]="];

/**
 * Check that the slice is a valid method name. (prism.c:22643)
 */



function pm_string_query_local(source, length, encoding_name) {
    switch (pm_slice_type(source, length, encoding_name)) {
        case PM_SLICE_TYPE_ERROR:
            return PM_STRING_QUERY_ERROR;
        case PM_SLICE_TYPE_NONE:
        case PM_SLICE_TYPE_CONSTANT:
        case PM_SLICE_TYPE_METHOD_NAME:
            return PM_STRING_QUERY_FALSE;
        case PM_SLICE_TYPE_LOCAL:
            return PM_STRING_QUERY_TRUE;
    }

    // assert(false && "unreachable") in C; debug-only.
    return PM_STRING_QUERY_FALSE;
}

function pm_string_query_constant(source, length, encoding_name) {
    switch (pm_slice_type(source, length, encoding_name)) {
        case PM_SLICE_TYPE_ERROR:
            return PM_STRING_QUERY_ERROR;
        case PM_SLICE_TYPE_NONE:
        case PM_SLICE_TYPE_LOCAL:
        case PM_SLICE_TYPE_METHOD_NAME:
            return PM_STRING_QUERY_FALSE;
        case PM_SLICE_TYPE_CONSTANT:
            return PM_STRING_QUERY_TRUE;
    }

    // assert(false && "unreachable") in C; debug-only.
    return PM_STRING_QUERY_FALSE;
}

function pm_string_query_method_name(source, length, encoding_name) {
    switch (pm_slice_type(source, length, encoding_name)) {
        case PM_SLICE_TYPE_ERROR:
            return PM_STRING_QUERY_ERROR;
        case PM_SLICE_TYPE_NONE:
            break;
        case PM_SLICE_TYPE_LOCAL:
            // numbered parameters are not valid method names
            return pm_string_query_method_name_b((length !== 2) || (source[0] !== '_') || (source[1] === '0') || !pm_char_is_decimal_digit((source.charCodeAt(1) || 0)));
        case PM_SLICE_TYPE_CONSTANT:
            // all constants are valid method names
        case PM_SLICE_TYPE_METHOD_NAME:
            // all method names are valid method names
            return PM_STRING_QUERY_TRUE;
    }

    switch (length) {
        case 1:
            return pm_string_query_method_name_b(PM_UNARY_METHOD_CHARS.has(source[0]));
        case 2:
            return pm_string_query_method_name_b(PM_BINARY_METHOD_NAMES.some((s) => source.startsWith(s)));
        case 3:
            return pm_string_query_method_name_b(PM_TERNARY_METHOD_NAMES.some((s) => source.startsWith(s)));
        default:
            return PM_STRING_QUERY_FALSE;
    }
}
